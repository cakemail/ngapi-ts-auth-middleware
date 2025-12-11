import { Request } from 'express'
import { AuthenticationError } from '../errors'

export function extractToken(req: Request): string {
    const authHeader = req.headers.authorization

    if (!authHeader) {
        throw new AuthenticationError('Missing Authorization header')
    }

    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        throw new AuthenticationError(
            'Invalid Authorization header format. Expected: Bearer <token>'
        )
    }

    return parts[1]
}

export function extractAccountId(
    req: Request,
    paramNames: string[] = ['accountId', 'account_id']
): number | null {
    for (const param of paramNames) {
        const value = req.query[param]
        if (value) {
            const parsed = parseInt(value as string, 10)
            if (!isNaN(parsed) && parsed > 0 && parsed <= Number.MAX_SAFE_INTEGER) {
                return parsed
            }
        }
    }
    return null
}
