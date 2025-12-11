import express, { Request, Response } from 'express'
import { createAuthMiddleware } from '@cakemail-org/ngapi-ts-auth-middleware'

const app = express()

// Create auth middleware
// Public key will be automatically fetched from {API_BASE_URL}/token/pubkey
const authMiddleware = createAuthMiddleware({
  apiBaseUrl: process.env.CAKEMAILAPI_BASE_URL,
  cacheSecret: process.env.CACHE_SECRET || '', // Required: Secret for HMAC and encryption
  enableCaching: true,
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
})

// Apply auth middleware to all routes
app.use(authMiddleware)

// Example route: Get user info
app.get('/api/me', (req: Request, res: Response) => {
  res.json({
    user: {
      id: res.locals.user.id,
      email: res.locals.user.email,
      name: `${res.locals.user.first_name} ${res.locals.user.last_name}`,
      account: {
        id: res.locals.user.account.id,
        lineage: res.locals.user.account.lineage,
      },
    },
  })
})

// Example route: Get account info
app.get('/api/account', (req: Request, res: Response) => {
  res.json({
    account: {
      id: res.locals.account.id,
      name: res.locals.account.name,
      status: res.locals.account.status,
      lineage: res.locals.account.lineage,
    },
  })
})

// Example route: Check if user is accessing own account
app.get('/api/is-self', (req: Request, res: Response) => {
  const isSelfAccess = res.locals.user.account.id === res.locals.account.id

  res.json({
    isSelfAccess,
    userAccountId: res.locals.user.account.id,
    targetAccountId: res.locals.account.id,
  })
})

// Example route with account impersonation
// Usage: GET /api/campaigns?accountId=999999
app.get('/api/campaigns', (req: Request, res: Response) => {
  // If accountId query param is present, res.locals.account will be the impersonated account
  // Otherwise, res.locals.account is the user's own account

  console.log(
    `User ${res.locals.user.email} (account ${res.locals.user.account.id}) accessing account ${res.locals.account.id}`
  )

  res.json({
    campaigns: [],
    account: {
      id: res.locals.account.id,
      name: res.locals.account.name,
    },
  })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
