import { createHmac } from 'crypto'
import jwt from 'jsonwebtoken'
import { JwtPayload } from '../types'

export function generateCacheKey(
    token: string,
    identifier: string | number,
    type: 'account' | 'user',
    secret: string
): string {
    const tokenHmac = createHmac('sha256', secret).update(token).digest('hex').substring(0, 16)
    return `${tokenHmac}:${identifier}:${type}`
}

export function calculateTtlFromToken(token: string): number {
    try {
        const decoded = jwt.decode(token) as JwtPayload | null
        if (!decoded || !decoded.exp) {
            return 3600 // Default 1 hour
        }

        const now = Math.floor(Date.now() / 1000)
        const ttl = decoded.exp - now

        // Ensure TTL is positive and reasonable
        return Math.max(60, Math.min(ttl, 86400)) // Between 1 min and 24 hours
    } catch (error) {
        console.warn('Failed to calculate TTL from token:', error)
        return 3600 // Default 1 hour
    }
}
