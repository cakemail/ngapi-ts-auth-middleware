import { generateCacheKey, calculateTtlFromToken } from '../../../src/utils/cache-key'
import jwt from 'jsonwebtoken'

describe('cache-key', () => {
    describe('generateCacheKey', () => {
        it('should generate consistent cache keys', () => {
            const token = 'my-test-token'
            const accountId = 123

            const key1 = generateCacheKey(token, accountId, 'account')
            const key2 = generateCacheKey(token, accountId, 'account')

            expect(key1).toBe(key2)
        })

        it('should generate different keys for different tokens', () => {
            const token1 = 'token-1'
            const token2 = 'token-2'
            const accountId = 123

            const key1 = generateCacheKey(token1, accountId, 'account')
            const key2 = generateCacheKey(token2, accountId, 'account')

            expect(key1).not.toBe(key2)
        })

        it('should generate different keys for different identifiers', () => {
            const token = 'my-token'

            const key1 = generateCacheKey(token, 123, 'account')
            const key2 = generateCacheKey(token, 456, 'account')

            expect(key1).not.toBe(key2)
        })

        it('should generate different keys for different types', () => {
            const token = 'my-token'
            const id = 123

            const key1 = generateCacheKey(token, id, 'account')
            const key2 = generateCacheKey(token, id, 'user')

            expect(key1).not.toBe(key2)
        })

        it('should include type in the key', () => {
            const token = 'my-token'
            const id = 123

            const accountKey = generateCacheKey(token, id, 'account')
            const userKey = generateCacheKey(token, id, 'user')

            expect(accountKey).toContain(':account')
            expect(userKey).toContain(':user')
        })
    })

    describe('calculateTtlFromToken', () => {
        it('should calculate TTL from valid token', () => {
            const now = Math.floor(Date.now() / 1000)
            const exp = now + 3600 // 1 hour from now

            const payload = {
                account_id: 123,
                exp,
                iat: now,
                iss: 'test',
            }

            const token = jwt.sign(payload, 'secret')
            const ttl = calculateTtlFromToken(token)

            // TTL should be close to 3600 (within 5 seconds for test execution time)
            expect(ttl).toBeGreaterThan(3595)
            expect(ttl).toBeLessThanOrEqual(3600)
        })

        it('should return default TTL for token without exp', () => {
            const payload = {
                account_id: 123,
                iss: 'test',
            }

            const token = jwt.sign(payload, 'secret')
            const ttl = calculateTtlFromToken(token)

            expect(ttl).toBe(3600) // Default 1 hour
        })

        it('should clamp TTL to minimum of 60 seconds', () => {
            const now = Math.floor(Date.now() / 1000)
            const exp = now + 30 // 30 seconds from now

            const payload = {
                account_id: 123,
                exp,
                iat: now,
                iss: 'test',
            }

            const token = jwt.sign(payload, 'secret')
            const ttl = calculateTtlFromToken(token)

            expect(ttl).toBe(60) // Minimum TTL
        })

        it('should clamp TTL to maximum of 24 hours', () => {
            const now = Math.floor(Date.now() / 1000)
            const exp = now + 100000 // Way more than 24 hours

            const payload = {
                account_id: 123,
                exp,
                iat: now,
                iss: 'test',
            }

            const token = jwt.sign(payload, 'secret')
            const ttl = calculateTtlFromToken(token)

            expect(ttl).toBe(86400) // Maximum 24 hours
        })

        it('should return default TTL for invalid token', () => {
            const ttl = calculateTtlFromToken('invalid-token')
            expect(ttl).toBe(3600)
        })
    })
})
