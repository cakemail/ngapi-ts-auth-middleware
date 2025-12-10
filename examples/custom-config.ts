import express, { Request, Response } from 'express'
import { createAuthMiddleware } from '@cakemail/ngapi-ts-auth-middleware'

const app = express()

// Advanced configuration example
const authMiddleware = createAuthMiddleware({
  // Public key will be automatically fetched from {API_BASE_URL}/token/pubkey
  // You can also provide it manually if needed:
  // publicKey: fs.readFileSync('./pubkey.pem'),

  // API base URL (defaults to env var or https://api.cakemail.dev)
  apiBaseUrl: process.env.CAKEMAILAPI_BASE_URL || 'https://api.cakemail.dev',

  // Enable Redis caching
  enableCaching: true,

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    db: parseInt(process.env.REDIS_DB || '0', 10),
    password: process.env.REDIS_PASSWORD,
    keyPrefix: 'myapp:auth:', // Custom key prefix
  },

  // Custom query parameter names for account ID
  accountIdParams: ['accountId', 'account_id', 'aid'],

  // Custom error handler for logging/monitoring
  onError: (error: Error, req: Request) => {
    console.error('[Auth Error]', {
      message: error.message,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    })

    // Send to monitoring service
    // sendToMonitoring({ error, req });
  },

  // JWT verification options
  jwtOptions: {
    algorithms: ['RS256'],
    issuer: 'urn:cakemail',
    clockTolerance: 30, // Allow 30 seconds clock skew
  },
})

// Public routes (no auth required)
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

app.get('/version', (req: Request, res: Response) => {
  res.json({ version: '1.0.0' })
})

// Protected routes (auth required)
app.use('/api', authMiddleware)

app.get('/api/protected', (req: Request, res: Response) => {
  res.json({
    message: 'This route is protected',
    user: {
      id: res.locals.user.id,
      email: res.locals.user.email,
    },
    account: {
      id: res.locals.account.id,
    },
  })
})

// Example: Scope-based authorization
app.get('/api/admin', authMiddleware, (req: Request, res: Response) => {
  // Check if user has admin scope
  if (!res.locals.user.scopes.includes('admin')) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      message: 'Admin scope required',
    })
  }

  res.json({
    message: 'Admin access granted',
  })
})

// Example: Account-specific resource
app.get('/api/campaigns/:campaignId', authMiddleware, (req: Request, res: Response) => {
  const { campaignId } = req.params

  // The middleware has already verified access to res.locals.account
  // Your business logic can safely use res.locals.account.id
  console.log(`Fetching campaign ${campaignId} for account ${res.locals.account.id}`)

  res.json({
    campaign: {
      id: campaignId,
      accountId: res.locals.account.id,
    },
  })
})

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err)
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server with custom auth config running on port ${PORT}`)
})
