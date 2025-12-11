import Redis from 'ioredis'
import { RedisConfig } from '../types'
import { encrypt, decrypt } from '../utils/encryption'

export class RedisService {
    private client: Redis
    private isConnected: boolean = false
    private encryptionSecret: string

    constructor(config?: RedisConfig, encryptionSecret?: string) {
        if (!encryptionSecret) {
            throw new Error('RedisService requires an encryption secret')
        }
        this.encryptionSecret = encryptionSecret
        this.client = new Redis({
            host: config?.host || process.env.REDIS_HOST || 'localhost',
            port: config?.port || parseInt(process.env.REDIS_PORT || '6379', 10),
            db: config?.db || parseInt(process.env.REDIS_DB || '0', 10),
            password: config?.password || process.env.REDIS_PASSWORD,
            keyPrefix: config?.keyPrefix || 'ngapi:',
            retryStrategy: (times: number) => {
                if (times > 3) {
                    console.warn('Redis: Maximum retry attempts reached, giving up connection')
                    return null
                }
                return Math.min(times * 200, 1000)
            },
            lazyConnect: true,
            maxRetriesPerRequest: 3,
        })

        this.setupEventHandlers()
    }

    private setupEventHandlers(): void {
        this.client.on('connect', () => {
            this.isConnected = true
        })

        this.client.on('ready', () => {
            this.isConnected = true
        })

        this.client.on('error', (error: Error) => {
            console.warn('Redis connection error:', error.message)
            this.isConnected = false
        })

        this.client.on('close', () => {
            this.isConnected = false
        })
    }

    async connect(): Promise<void> {
        if (this.isConnected) {
            return Promise.resolve()
        }

        return this.client
            .connect()
            .then(() => {
                this.isConnected = true
            })
            .catch((error: unknown) => {
                console.warn(
                    'Failed to connect to Redis:',
                    error instanceof Error ? error.message : error
                )
                this.isConnected = false
            })
    }

    async get<T>(key: string): Promise<T | null> {
        const ensureConnected = this.isConnected ? Promise.resolve() : this.connect()

        return ensureConnected
            .then(() => this.client.get(key))
            .then((value) => {
                if (!value) return null
                try {
                    return decrypt<T>(value, this.encryptionSecret)
                } catch (error) {
                    console.warn(
                        'Redis decrypt error:',
                        error instanceof Error ? error.message : error
                    )
                    return null
                }
            })
            .catch((error: unknown) => {
                console.warn('Redis get error:', error instanceof Error ? error.message : error)
                return null
            })
    }

    async set<T>(key: string, value: T, ttl: number): Promise<void> {
        const ensureConnected = this.isConnected ? Promise.resolve() : this.connect()

        return ensureConnected
            .then(() => {
                const encrypted = encrypt(value, this.encryptionSecret)
                return this.client.setex(key, ttl, encrypted)
            })
            .then(() => undefined)
            .catch((error: unknown) => {
                console.warn('Redis set error:', error instanceof Error ? error.message : error)
            })
    }

    async disconnect(): Promise<void> {
        return this.client
            .quit()
            .then(() => {
                this.isConnected = false
            })
            .catch((error: unknown) => {
                console.warn(
                    'Redis disconnect error:',
                    error instanceof Error ? error.message : error
                )
            })
    }
}
