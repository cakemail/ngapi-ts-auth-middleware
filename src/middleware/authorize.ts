import { Account } from '../types'
import { NgApiService } from '../services/ngapi.service'
import { RedisService } from '../services/redis.service'
import { generateCacheKey, calculateTtlFromToken } from '../utils/cache-key'

export async function authorizeAccount(
    accountId: number,
    token: string,
    apiService: NgApiService,
    redisService: RedisService | null
): Promise<Account> {
    // Check cache first
    if (redisService) {
        const cacheKey = generateCacheKey(token, accountId, 'account')
        const cached = await redisService.get<Account>(cacheKey)
        if (cached) {
            return cached
        }
    }

    // Call API
    const account = await apiService.getAccount(accountId, token)

    // Cache the result
    if (redisService && account) {
        const cacheKey = generateCacheKey(token, accountId, 'account')
        const ttl = calculateTtlFromToken(token)
        await redisService.set(cacheKey, account, ttl)
    }

    return account
}
