import { User } from '../types'
import { NgApiService } from '../services/ngapi.service'
import { RedisService } from '../services/redis.service'
import { generateCacheKey, calculateTtlFromToken } from '../utils/cache-key'

export async function loadUserData(
    userId: number,
    token: string,
    apiService: NgApiService,
    redisService: RedisService | null
): Promise<User> {
    // Check cache first
    if (redisService) {
        const cacheKey = generateCacheKey(token, userId, 'user')
        const cached = await redisService.get<User>(cacheKey)
        if (cached) {
            return cached
        }
    }

    // Call API
    const user = await apiService.getUserSelf(token)

    // Cache the result
    if (redisService && user) {
        const cacheKey = generateCacheKey(token, userId, 'user')
        const ttl = calculateTtlFromToken(token)
        await redisService.set(cacheKey, user, ttl)
    }

    return user
}
