import { loadUserData } from '../../../src/middleware/user-loader'
import { NgApiService } from '../../../src/services/ngapi.service'
import { RedisService } from '../../../src/services/redis.service'
import { User } from '../../../src/types'

describe('user-loader', () => {
    const mockToken = 'mock-jwt-token'
    const mockCacheSecret = 'cache-secret'
    const mockUserId = 3039763

    const mockUser: User = {
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

    describe('loadUserData', () => {
        it('should return cached user if available', async () => {
            mockRedisService.get.mockResolvedValueOnce(mockUser)

            const result = await loadUserData(
                mockUserId,
                mockToken,
                mockApiService,
                mockRedisService,
                mockCacheSecret
            )

            expect(result).toEqual(mockUser)
            expect(mockRedisService.get).toHaveBeenCalledWith(expect.any(String))
            expect(mockApiService.getUserSelf).not.toHaveBeenCalled()
        })

        it('should fetch from API and cache when not in cache', async () => {
            mockRedisService.get.mockResolvedValueOnce(null)
            mockApiService.getUserSelf.mockResolvedValueOnce(mockUser)

            const result = await loadUserData(
                mockUserId,
                mockToken,
                mockApiService,
                mockRedisService,
                mockCacheSecret
            )

            expect(result).toEqual(mockUser)
            expect(mockRedisService.get).toHaveBeenCalled()
            expect(mockApiService.getUserSelf).toHaveBeenCalledWith(mockToken)
            expect(mockRedisService.set).toHaveBeenCalledWith(
                expect.any(String),
                mockUser,
                expect.any(Number)
            )
        })

        it('should fetch from API when Redis service is null', async () => {
            mockApiService.getUserSelf.mockResolvedValueOnce(mockUser)

            const result = await loadUserData(
                mockUserId,
                mockToken,
                mockApiService,
                null,
                mockCacheSecret
            )

            expect(result).toEqual(mockUser)
            expect(mockApiService.getUserSelf).toHaveBeenCalledWith(mockToken)
            expect(mockRedisService.get).not.toHaveBeenCalled()
            expect(mockRedisService.set).not.toHaveBeenCalled()
        })

        it('should not cache when Redis service is null', async () => {
            mockApiService.getUserSelf.mockResolvedValueOnce(mockUser)

            await loadUserData(mockUserId, mockToken, mockApiService, null, mockCacheSecret)

            expect(mockRedisService.set).not.toHaveBeenCalled()
        })

        it('should propagate API errors', async () => {
            mockRedisService.get.mockResolvedValueOnce(null)
            const error = new Error('API error')
            mockApiService.getUserSelf.mockRejectedValueOnce(error)

            await expect(
                loadUserData(
                    mockUserId,
                    mockToken,
                    mockApiService,
                    mockRedisService,
                    mockCacheSecret
                )
            ).rejects.toThrow('API error')
        })
    })
})
