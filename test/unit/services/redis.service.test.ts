import { RedisService } from '../../../src/services/redis.service'
import * as encryption from '../../../src/utils/encryption'

jest.mock('ioredis', () => require('ioredis-mock'))

describe('RedisService', () => {
    let redisService: RedisService
    const mockSecret = 'test-secret-key'

    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(async () => {
        if (redisService) {
            await redisService.disconnect()
        }
        jest.restoreAllMocks()
    })

    describe('constructor', () => {
        it('should create RedisService with default config', () => {
            redisService = new RedisService(undefined, mockSecret)
            expect(redisService).toBeInstanceOf(RedisService)
        })

        it('should create RedisService with custom config', () => {
            redisService = new RedisService(
                {
                    host: 'redis.example.com',
                    port: 6380,
                    db: 1,
                    password: 'redis-password',
                    keyPrefix: 'test:',
                },
                mockSecret
            )
            expect(redisService).toBeInstanceOf(RedisService)
        })

        it('should throw error if encryption secret is missing', () => {
            expect(() => {
                new RedisService(undefined, undefined as any)
            }).toThrow('RedisService requires an encryption secret')
        })

        it('should use environment variables for config', () => {
            process.env.REDIS_HOST = 'env-host'
            process.env.REDIS_PORT = '6381'
            process.env.REDIS_DB = '2'
            process.env.REDIS_PASSWORD = 'env-password'

            redisService = new RedisService(undefined, mockSecret)
            expect(redisService).toBeInstanceOf(RedisService)

            delete process.env.REDIS_HOST
            delete process.env.REDIS_PORT
            delete process.env.REDIS_DB
            delete process.env.REDIS_PASSWORD
        })
    })

    describe('connect', () => {
        it('should connect to Redis successfully', async () => {
            redisService = new RedisService(undefined, mockSecret)
            await redisService.connect()
            // Should resolve without error
            expect(console.warn).not.toHaveBeenCalled()
        })

        it('should return immediately if already connected', async () => {
            redisService = new RedisService(undefined, mockSecret)
            await redisService.connect()
            await redisService.connect() // Second call should return immediately
            expect(console.warn).not.toHaveBeenCalled()
        })

        it('should handle connection errors gracefully', async () => {
            redisService = new RedisService(undefined, mockSecret)
            const mockClient = (redisService as any).client

            // Mock connect to fail
            jest.spyOn(mockClient, 'connect').mockRejectedValueOnce(new Error('Connection refused'))

            await redisService.connect()
            expect(console.warn).toHaveBeenCalledWith(
                'Failed to connect to Redis:',
                'Connection refused'
            )
        })

        it('should handle non-Error connection failures', async () => {
            redisService = new RedisService(undefined, mockSecret)
            const mockClient = (redisService as any).client

            jest.spyOn(mockClient, 'connect').mockRejectedValueOnce('string error')

            await redisService.connect()
            expect(console.warn).toHaveBeenCalledWith('Failed to connect to Redis:', 'string error')
        })
    })

    describe('event handlers', () => {
        it('should handle connect event', async () => {
            redisService = new RedisService(undefined, mockSecret)
            const mockClient = (redisService as any).client

            mockClient.emit('connect')
            expect((redisService as any).isConnected).toBe(true)
        })

        it('should handle ready event', async () => {
            redisService = new RedisService(undefined, mockSecret)
            const mockClient = (redisService as any).client

            mockClient.emit('ready')
            expect((redisService as any).isConnected).toBe(true)
        })

        it('should handle error event', async () => {
            redisService = new RedisService(undefined, mockSecret)
            const mockClient = (redisService as any).client

            mockClient.emit('error', new Error('Redis error'))
            expect(console.warn).toHaveBeenCalledWith('Redis connection error:', 'Redis error')
            expect((redisService as any).isConnected).toBe(false)
        })

        it('should handle close event', async () => {
            redisService = new RedisService(undefined, mockSecret)
            const mockClient = (redisService as any).client

            await redisService.connect()
            mockClient.emit('close')
            expect((redisService as any).isConnected).toBe(false)
        })
    })

    describe('get', () => {
        beforeEach(async () => {
            redisService = new RedisService(undefined, mockSecret)
            await redisService.connect()
        })

        it('should retrieve and decrypt value from Redis', async () => {
            const testData = { id: 123, name: 'test' }
            const encryptedData = encryption.encrypt(testData, mockSecret)

            const mockClient = (redisService as any).client
            jest.spyOn(mockClient, 'get').mockResolvedValueOnce(encryptedData)

            const result = await redisService.get<typeof testData>('test:key')
            expect(result).toEqual(testData)
        })

        it('should return null if key not found', async () => {
            const mockClient = (redisService as any).client
            jest.spyOn(mockClient, 'get').mockResolvedValueOnce(null)

            const result = await redisService.get('nonexistent:key')
            expect(result).toBeNull()
        })

        it('should handle decryption errors gracefully', async () => {
            const mockClient = (redisService as any).client
            jest.spyOn(mockClient, 'get').mockResolvedValueOnce('invalid-encrypted-data')

            const result = await redisService.get('test:key')
            expect(result).toBeNull()
            expect(console.warn).toHaveBeenCalledWith('Redis decrypt error:', expect.anything())
        })

        it('should handle non-Error decryption failures', async () => {
            const mockClient = (redisService as any).client
            jest.spyOn(mockClient, 'get').mockResolvedValueOnce('data')
            jest.spyOn(encryption, 'decrypt').mockImplementationOnce(() => {
                throw 'string error'
            })

            const result = await redisService.get('test:key')
            expect(result).toBeNull()
            expect(console.warn).toHaveBeenCalledWith('Redis decrypt error:', 'string error')
        })

        it('should handle Redis get errors gracefully', async () => {
            const mockClient = (redisService as any).client
            jest.spyOn(mockClient, 'get').mockRejectedValueOnce(new Error('Redis unavailable'))

            const result = await redisService.get('test:key')
            expect(result).toBeNull()
            expect(console.warn).toHaveBeenCalledWith('Redis get error:', 'Redis unavailable')
        })

        it('should handle non-Error get failures', async () => {
            const mockClient = (redisService as any).client
            jest.spyOn(mockClient, 'get').mockRejectedValueOnce('string error')

            const result = await redisService.get('test:key')
            expect(result).toBeNull()
            expect(console.warn).toHaveBeenCalledWith('Redis get error:', 'string error')
        })

        it('should connect if not connected before getting', async () => {
            // Create a new service without connecting
            redisService = new RedisService(undefined, mockSecret)
            const testData = { id: 456 }
            const encryptedData = encryption.encrypt(testData, mockSecret)

            const mockClient = (redisService as any).client
            jest.spyOn(mockClient, 'get').mockResolvedValueOnce(encryptedData)

            const result = await redisService.get<typeof testData>('test:key')
            expect(result).toEqual(testData)
        })
    })

    describe('set', () => {
        beforeEach(async () => {
            redisService = new RedisService(undefined, mockSecret)
            await redisService.connect()
        })

        it('should encrypt and store value in Redis', async () => {
            const testData = { id: 789, name: 'test-set' }
            const mockClient = (redisService as any).client
            const setexSpy = jest.spyOn(mockClient, 'setex').mockResolvedValueOnce('OK')

            await redisService.set('test:key', testData, 3600)

            expect(setexSpy).toHaveBeenCalledWith('test:key', 3600, expect.any(String))
            expect(console.warn).not.toHaveBeenCalled()
        })

        it('should handle Redis set errors gracefully', async () => {
            const mockClient = (redisService as any).client
            jest.spyOn(mockClient, 'setex').mockRejectedValueOnce(new Error('Redis unavailable'))

            await redisService.set('test:key', { data: 'test' }, 3600)
            expect(console.warn).toHaveBeenCalledWith('Redis set error:', 'Redis unavailable')
        })

        it('should handle non-Error set failures', async () => {
            const mockClient = (redisService as any).client
            jest.spyOn(mockClient, 'setex').mockRejectedValueOnce('string error')

            await redisService.set('test:key', { data: 'test' }, 3600)
            expect(console.warn).toHaveBeenCalledWith('Redis set error:', 'string error')
        })

        it('should connect if not connected before setting', async () => {
            // Create a new service without connecting
            redisService = new RedisService(undefined, mockSecret)
            const mockClient = (redisService as any).client
            const setexSpy = jest.spyOn(mockClient, 'setex').mockResolvedValueOnce('OK')

            await redisService.set('test:key', { data: 'test' }, 3600)

            expect(setexSpy).toHaveBeenCalled()
            expect(console.warn).not.toHaveBeenCalled()
        })
    })

    describe('disconnect', () => {
        it('should disconnect from Redis successfully', async () => {
            redisService = new RedisService(undefined, mockSecret)
            await redisService.connect()
            await redisService.disconnect()
            expect((redisService as any).isConnected).toBe(false)
        })

        it('should handle disconnect errors gracefully', async () => {
            redisService = new RedisService(undefined, mockSecret)
            const mockClient = (redisService as any).client

            jest.spyOn(mockClient, 'quit').mockRejectedValueOnce(new Error('Disconnect failed'))

            await redisService.disconnect()
            expect(console.warn).toHaveBeenCalledWith(
                'Redis disconnect error:',
                'Disconnect failed'
            )
        })

        it('should handle non-Error disconnect failures', async () => {
            redisService = new RedisService(undefined, mockSecret)
            const mockClient = (redisService as any).client

            jest.spyOn(mockClient, 'quit').mockRejectedValueOnce('string error')

            await redisService.disconnect()
            expect(console.warn).toHaveBeenCalledWith('Redis disconnect error:', 'string error')
        })
    })
})
