import { Request, Response, NextFunction } from 'express'
import { AuthMiddlewareConfig, Account, AuthenticatedUser } from '../types'
import { JwtService } from '../services/jwt.service'
import { RedisService } from '../services/redis.service'
import { NgApiService } from '../services/ngapi.service'
import { ConfigurationError } from '../errors'
import { extractToken, extractAccountId } from '../utils/token-extractor'
import { handleAuthError } from '../utils/error-handler'
import { fetchPublicKey } from '../utils/fetch-public-key'
import { authenticate } from './authenticate'
import { authorizeAccount } from './authorize'
import { loadUserData } from './user-loader'

export function createAuthMiddleware(config: AuthMiddlewareConfig) {
    // Validate required config
    if (!config.cacheSecret) {
        throw new ConfigurationError('cacheSecret is required in AuthMiddlewareConfig')
    }

    // Initialize services
    const redisService =
        config.enableCaching !== false ? new RedisService(config.redis, config.cacheSecret) : null
    const apiService = new NgApiService(config.apiBaseUrl)
    const baseUrl =
        config.apiBaseUrl || process.env.CAKEMAILAPI_BASE_URL || 'https://api.cakemail.dev'

    // JwtService will be initialized lazily after fetching the public key
    let jwtService: JwtService | null = null
    let keyInitPromise: Promise<void> | null = null

    // If publicKey is provided, initialize JwtService immediately
    if (config.publicKey) {
        jwtService = new JwtService(config.publicKey, config.jwtOptions)
    }

    async function ensureJwtService(): Promise<JwtService> {
        if (jwtService) {
            return jwtService
        }

        // If initialization is in progress, wait for it
        if (keyInitPromise) {
            await keyInitPromise
            if (!jwtService) {
                throw new ConfigurationError('JWT service initialization failed')
            }
            return jwtService
        }

        // Start initialization
        keyInitPromise = (async () => {
            try {
                const publicKey = await fetchPublicKey(baseUrl)
                jwtService = new JwtService(publicKey, config.jwtOptions)
            } catch (error) {
                keyInitPromise = null // Reset so we can retry
                throw error
            }
        })()

        await keyInitPromise
        if (!jwtService) {
            throw new ConfigurationError('JWT service initialization failed')
        }
        return jwtService
    }

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // 1. Ensure JWT service is initialized (fetch public key if needed)
            const service = await ensureJwtService()

            // 2. Extract Bearer token
            const token = extractToken(req)

            // 3. Authenticate (verify JWT)
            const decoded = await authenticate(token, service)

            // 4. Determine target account ID
            const targetAccountId =
                extractAccountId(req, config.accountIdParams) || decoded.account_id

            // 5. Authorize access to target account
            let accountData: Account
            if (targetAccountId !== decoded.account_id) {
                // Impersonation: need to authorize access
                accountData = await authorizeAccount(
                    targetAccountId,
                    token,
                    apiService,
                    redisService,
                    config.cacheSecret
                )
            } else {
                // Self-access: create minimal account from JWT
                accountData = createAccountFromJwt(decoded)
            }

            // 6. Load full user data from /users/self
            const userData = await loadUserData(
                decoded.id,
                token,
                apiService,
                redisService,
                config.cacheSecret
            )

            // 7. Create user's own account representation from JWT
            const userOwnAccount = createAccountFromJwt(decoded)

            // 8. Populate res.locals
            res.locals.token = token
            res.locals.user = createAuthenticatedUser(decoded, userData, userOwnAccount)
            res.locals.account = accountData

            next()
        } catch (error) {
            handleAuthError(error as Error, req, res, config.onError)
        }
    }
}

function createAccountFromJwt(decoded: { account_id: number; lineage: string }): Account {
    return {
        id: decoded.account_id.toString(),
        lineage: decoded.lineage,
        status: 'active',
        name: '',
        address: {
            address1: '',
            address2: null,
            city: '',
            country: '',
            province: '',
            postal_code: '',
        },
        account_owner: {
            user_id: null,
        },
        fax: null,
        phone: null,
        website: null,
        logo: '',
        usage_limits: {
            starts_on: 0,
            per_campaign: 0,
            per_month: 0,
            remaining: null,
            maximum_contacts: 0,
            lists: 0,
            users: 0,
            campaign_blueprints: 0,
            automation_conditions: 0,
            use_ab_split: false,
            use_automation_conditions: false,
            use_automations: false,
            use_automation_customwebhooks: false,
            use_behavioral_segmentation: false,
            use_brand: false,
            use_campaign_blueprints: false,
            use_contact_export: false,
            use_custom_merge_tags: false,
            use_email_api: false,
            use_html_editor: false,
            use_list_redirection: false,
            use_smart_email_resource: false,
            use_smart_blueprint: false,
            use_tags_in_automation: false,
            use_tags: false,
            insert_reseller_logo: false,
        },
        last_activity_on: 0,
        created_on: 0,
        partner: false,
        organization: false,
        stripe_customer_id: '',
        overrides: {
            bypass_recaptcha: false,
            inject_address: false,
            inject_unsubscribe_link: false,
        },
        metadata: {
            use_html_editor: false,
        },
    }
}

function createAuthenticatedUser(
    decoded: { scopes: string[]; user_key: string },
    userData: {
        id: string
        email: string
        status: string
        created_on: number
        last_activity_on: number
        expires_on: number | null
        first_name: string
        last_name: string
        title: string | null
        language: string
        timezone: string
        office_phone: string | null
        mobile_phone: string | null
    },
    userOwnAccount: Account
): AuthenticatedUser {
    return {
        ...userData,
        account: userOwnAccount,
        scopes: decoded.scopes,
        user_key: decoded.user_key,
    }
}
