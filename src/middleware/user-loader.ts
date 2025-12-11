import { User } from '../types'
import { NgApiService } from '../services/ngapi.service'
import { RedisService } from '../services/redis.service'
import { generateCacheKey, calculateTtlFromToken } from '../utils/cache-key'

export async function loadUserData(
    userId: number,
    token: string,
    apiService: NgApiService,
    redisService: RedisService | null,
    cacheSecret: string
): Promise<User> {
    // Check cache first
    if (redisService) {
        const cacheKey = generateCacheKey(token, userId, 'user', cacheSecret)
        const cached = await redisService.get<User>(cacheKey)
        if (cached) {
            return cached
        }
    }

    // Call API
    const user = await apiService.getUserSelf(token)

    // Cache the result
    if (redisService && user) {
        const cacheKey = generateCacheKey(token, userId, 'user', cacheSecret)
        const ttl = calculateTtlFromToken(token)
        await redisService.set(cacheKey, user, ttl)
    }

    return user
}
