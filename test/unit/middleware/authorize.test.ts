import { authorizeAccount } from '../../../src/middleware/authorize'
import { NgApiService } from '../../../src/services/ngapi.service'
import { RedisService } from '../../../src/services/redis.service'
import { Account } from '../../../src/types'

describe('authorize', () => {
    const mockToken = 'mock-jwt-token'
    const mockCacheSecret = 'cache-secret'
    const mockAccountId = 1627783

    const mockAccount: Account = {
        id: '1627783',
        lineage: '1-131010-133315-1586434-1627783',
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
        account_owner: {
            user_id: null,
        },
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

    let mockApiService: jest.Mocked<NgApiService>
    let mockRedisService: jest.Mocked<RedisService>

    beforeEach(() => {
        mockApiService = {
            getAccount: jest.fn(),
            getUserSelf: jest.fn(),
        } as any

        mockRedisService = {
            get: jest.fn(),
            set: jest.fn(),
            connect: jest.fn(),
            disconnect: jest.fn(),
        } as any
    })

    describe('authorizeAccount', () => {
        it('should return cached account if available', async () => {
            mockRedisService.get.mockResolvedValueOnce(mockAccount)

            const result = await authorizeAccount(
                mockAccountId,
                mockToken,
                mockApiService,
                mockRedisService,
                mockCacheSecret
            )

            expect(result).toEqual(mockAccount)
            expect(mockRedisService.get).toHaveBeenCalledWith(expect.any(String))
            expect(mockApiService.getAccount).not.toHaveBeenCalled()
        })

        it('should fetch from API and cache when not in cache', async () => {
            mockRedisService.get.mockResolvedValueOnce(null)
            mockApiService.getAccount.mockResolvedValueOnce(mockAccount)

            const result = await authorizeAccount(
                mockAccountId,
                mockToken,
                mockApiService,
                mockRedisService,
                mockCacheSecret
            )

            expect(result).toEqual(mockAccount)
            expect(mockRedisService.get).toHaveBeenCalled()
            expect(mockApiService.getAccount).toHaveBeenCalledWith(mockAccountId, mockToken)
            expect(mockRedisService.set).toHaveBeenCalledWith(
                expect.any(String),
                mockAccount,
                expect.any(Number)
            )
        })

        it('should fetch from API when Redis service is null', async () => {
            mockApiService.getAccount.mockResolvedValueOnce(mockAccount)

            const result = await authorizeAccount(
                mockAccountId,
                mockToken,
                mockApiService,
                null,
                mockCacheSecret
            )

            expect(result).toEqual(mockAccount)
            expect(mockApiService.getAccount).toHaveBeenCalledWith(mockAccountId, mockToken)
            expect(mockRedisService.get).not.toHaveBeenCalled()
            expect(mockRedisService.set).not.toHaveBeenCalled()
        })

        it('should not cache when Redis service is null', async () => {
            mockApiService.getAccount.mockResolvedValueOnce(mockAccount)

            await authorizeAccount(mockAccountId, mockToken, mockApiService, null, mockCacheSecret)

            expect(mockRedisService.set).not.toHaveBeenCalled()
        })

        it('should propagate API errors', async () => {
            mockRedisService.get.mockResolvedValueOnce(null)
            const error = new Error('API error')
            mockApiService.getAccount.mockRejectedValueOnce(error)

            await expect(
                authorizeAccount(
                    mockAccountId,
                    mockToken,
                    mockApiService,
                    mockRedisService,
                    mockCacheSecret
                )
            ).rejects.toThrow('API error')
        })
    })
})
