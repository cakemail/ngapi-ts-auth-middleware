import nock from 'nock'
import { NgApiService } from '../../../src/services/ngapi.service'

describe('NgApiService', () => {
    let service: NgApiService
    const baseUrl = 'https://api.test.cakemail.dev'
    const mockToken = 'test-token'

    beforeEach(() => {
        service = new NgApiService(baseUrl)
        nock.cleanAll()
    })

    afterEach(() => {
        nock.cleanAll()
    })

    describe('constructor', () => {
        it('should create service with custom base URL', () => {
            const customService = new NgApiService('https://custom.api.com')
            expect(customService).toBeInstanceOf(NgApiService)
        })

        it('should use environment variable for base URL', () => {
            process.env.CAKEMAILAPI_BASE_URL = 'https://env.api.com'
            const envService = new NgApiService()
            expect(envService).toBeInstanceOf(NgApiService)
            delete process.env.CAKEMAILAPI_BASE_URL
        })

        it('should use default base URL when not provided', () => {
            delete process.env.CAKEMAILAPI_BASE_URL
            const defaultService = new NgApiService()
            expect(defaultService).toBeInstanceOf(NgApiService)
        })
    })

    describe('getAccount', () => {
        const accountId = 123456
        const validAccountData = {
            id: '123456',
            lineage: '1-2-3-123456',
            status: 'active',
            name: 'Test Account',
            address: {
                address1: '123 Test St',
                address2: null,
                city: 'Montreal',
                country: 'Canada',
                province: 'Quebec',
                postal_code: 'H1H 1H1',
            },
            account_owner: { user_id: null },
            fax: null,
            phone: null,
            website: null,
            logo: 'https://example.com/logo.png',
            usage_limits: {
                starts_on: 1735689600,
                per_campaign: 100000,
                per_month: 10000000,
                remaining: null,
                maximum_contacts: 100000,
                lists: 2,
                users: 2,
                campaign_blueprints: 0,
                automation_conditions: 0,
                use_ab_split: false,
                use_automation_conditions: true,
                use_automations: true,
                use_automation_customwebhooks: true,
                use_behavioral_segmentation: false,
                use_brand: true,
                use_campaign_blueprints: true,
                use_contact_export: true,
                use_custom_merge_tags: true,
                use_email_api: true,
                use_html_editor: true,
                use_list_redirection: true,
                use_smart_email_resource: true,
                use_smart_blueprint: true,
                use_tags_in_automation: true,
                use_tags: true,
                insert_reseller_logo: false,
            },
            last_activity_on: 1765372928,
            created_on: 1737556342,
            partner: false,
            organization: false,
            stripe_customer_id: 'cus_TEST123',
            overrides: {
                bypass_recaptcha: false,
                inject_address: true,
                inject_unsubscribe_link: true,
            },
            metadata: {
                use_html_editor: true,
            },
        }

        it('should fetch account successfully with wrapped response', async () => {
            nock(baseUrl)
                .get(`/accounts/${accountId}`)
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, { data: validAccountData })

            const account = await service.getAccount(accountId, mockToken)
            expect(account).toEqual(validAccountData)
        })

        it('should fetch account successfully with unwrapped response', async () => {
            nock(baseUrl)
                .get(`/accounts/${accountId}`)
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, validAccountData)

            const account = await service.getAccount(accountId, mockToken)
            expect(account).toEqual(validAccountData)
        })

        it('should throw ConfigurationError for invalid account data', async () => {
            nock(baseUrl)
                .get(`/accounts/${accountId}`)
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, { data: { invalid: 'data' } })

            await expect(service.getAccount(accountId, mockToken)).rejects.toThrow(
                'Invalid account data received from API'
            )
        })

        it('should throw AuthenticationError on 401 response', async () => {
            nock(baseUrl).get(`/accounts/${accountId}`).reply(401, { error: 'Unauthorized' })

            await expect(service.getAccount(accountId, mockToken)).rejects.toThrow('Invalid token')
        })

        it('should throw AuthorizationError on 403 response', async () => {
            nock(baseUrl).get(`/accounts/${accountId}`).reply(403, { error: 'Forbidden' })

            await expect(service.getAccount(accountId, mockToken)).rejects.toThrow(
                `Access denied to account ${accountId}`
            )
        })

        it('should re-throw non-401/403 axios errors', async () => {
            nock(baseUrl).get(`/accounts/${accountId}`).reply(500, { error: 'Server error' })

            await expect(service.getAccount(accountId, mockToken)).rejects.toThrow()
        })

        it('should handle network errors', async () => {
            nock(baseUrl).get(`/accounts/${accountId}`).replyWithError('Network error')

            await expect(service.getAccount(accountId, mockToken)).rejects.toThrow('Network error')
        })

        it('should accept string account ID', async () => {
            const stringId = '123456'
            nock(baseUrl)
                .get(`/accounts/${stringId}`)
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, { data: validAccountData })

            const account = await service.getAccount(stringId, mockToken)
            expect(account).toEqual(validAccountData)
        })
    })

    describe('getUserSelf', () => {
        const validUserData = {
            id: '3039763',
            email: 'test@example.com',
            status: 'active',
            created_on: 1737556402,
            last_activity_on: 1765372928,
            expires_on: null,
            first_name: 'Test',
            last_name: 'User',
            title: null,
            language: 'en_US',
            timezone: 'America/Montreal',
            office_phone: null,
            mobile_phone: null,
        }

        it('should fetch user data successfully with wrapped response', async () => {
            nock(baseUrl)
                .get('/users/self')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, { data: validUserData })

            const user = await service.getUserSelf(mockToken)
            expect(user).toEqual(validUserData)
        })

        it('should fetch user data successfully with unwrapped response', async () => {
            nock(baseUrl)
                .get('/users/self')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, validUserData)

            const user = await service.getUserSelf(mockToken)
            expect(user).toEqual(validUserData)
        })

        it('should throw ConfigurationError for invalid user data', async () => {
            nock(baseUrl)
                .get('/users/self')
                .matchHeader('Authorization', `Bearer ${mockToken}`)
                .reply(200, { data: { invalid: 'data' } })

            await expect(service.getUserSelf(mockToken)).rejects.toThrow(
                'Invalid user data received from API'
            )
        })

        it('should throw AuthenticationError on 401 response', async () => {
            nock(baseUrl).get('/users/self').reply(401, { error: 'Unauthorized' })

            await expect(service.getUserSelf(mockToken)).rejects.toThrow(
                'Failed to retrieve user data'
            )
        })

        it('should re-throw non-401 errors', async () => {
            nock(baseUrl).get('/users/self').reply(500, { error: 'Server error' })

            await expect(service.getUserSelf(mockToken)).rejects.toThrow()
        })

        it('should handle network errors', async () => {
            nock(baseUrl).get('/users/self').replyWithError('Network error')

            await expect(service.getUserSelf(mockToken)).rejects.toThrow('Network error')
        })

        it('should handle timeout errors', async () => {
            nock(baseUrl).get('/users/self').delayConnection(6000).reply(200, validUserData)

            await expect(service.getUserSelf(mockToken)).rejects.toThrow()
        })
    })
})
