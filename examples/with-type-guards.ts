import express, { Request, Response, NextFunction } from 'express'
import { createAuthMiddleware, AuthenticatedUser, Account } from '@cakemail/ngapi-ts-auth-middleware'

const app = express()

// Create auth middleware
const authMiddleware = createAuthMiddleware({
    apiBaseUrl: process.env.CAKEMAILAPI_BASE_URL,
    cacheSecret: process.env.CACHE_SECRET || '', // Required: Secret for HMAC and encryption
    enableCaching: true,
})

// Define authenticated response locals type
interface AuthLocals {
    user: AuthenticatedUser
    account: Account
    token: string
}

// Type alias for authenticated responses
type AuthResponse = Response<any, AuthLocals>

// Middleware that ensures authentication
function requireAuth(req: Request, res: Response, next: NextFunction): void {
    if (!res.locals.user || !res.locals.account || !res.locals.token) {
        res.status(401).json({ error: 'Authentication required' })
        return
    }
    next()
}

// Public route
app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' })
})

// Protected routes - use auth middleware first
app.use('/api', authMiddleware)

app.get('/api/profile', requireAuth, (req: Request, res: AuthResponse) => {
    // TypeScript knows res.locals has user, account, and token
    res.json({
        user: {
            id: res.locals.user.id,
            email: res.locals.user.email,
            name: `${res.locals.user.first_name} ${res.locals.user.last_name}`,
        },
        account: {
            id: res.locals.account.id,
            lineage: res.locals.account.lineage,
        },
    })
})

// Example with scope checking
app.get('/api/admin', requireAuth, (req: Request, res: AuthResponse) => {
    if (!res.locals.user.scopes.includes('admin')) {
        res.status(403).json({ error: 'Admin access required' })
        return
    }

    res.json({ message: 'Admin access granted' })
})

// Example with account impersonation check
app.get('/api/account-info', requireAuth, (req: Request, res: AuthResponse) => {
    const isImpersonating = res.locals.user.account.id !== res.locals.account.id

    res.json({
        account: {
            id: res.locals.account.id,
            name: res.locals.account.name,
        },
        isImpersonating,
        userAccount: res.locals.user.account.id,
    })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Server with type guards running on port ${PORT}`)
})
