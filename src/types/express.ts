import { Account } from './account.types'
import { AuthenticatedUser } from './user.types'

/**
 * Express.Locals augmentation for auth middleware.
 *
 * When this package is imported, TypeScript automatically knows about:
 * - res.locals.account - The target account (may be impersonated)
 * - res.locals.user - The authenticated user with scopes and user_key
 * - res.locals.token - The raw Bearer token string
 */
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Locals {
            account?: Account
            user?: AuthenticatedUser
            token?: string
        }
    }
}

export {}
