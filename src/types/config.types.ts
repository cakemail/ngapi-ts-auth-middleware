import { Request } from 'express'

export interface RedisConfig {
    host?: string
    port?: number
    db?: number
    password?: string
    keyPrefix?: string
}

export interface JwtOptions {
    algorithms?: string[]
    issuer?: string
    clockTolerance?: number
}

export interface AuthMiddlewareConfig {
    apiBaseUrl?: string
    publicKey?: string | Buffer
    redis?: RedisConfig
    enableCaching?: boolean
    cacheSecret: string
    accountIdParams?: string[]
    onError?: (error: Error, req: Request) => void
    jwtOptions?: JwtOptions
}
