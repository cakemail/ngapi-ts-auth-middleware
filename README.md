# Cakemail API Express Auth Middleware

Express TypeScript authentication/authorization middleware for Cakemail's API. This middleware verifies JWT Bearer tokens, authorizes access to impersonated accounts, and provides user/account data to downstream handlers.

## Features

- JWT Bearer token verification using RSA public key
- Account impersonation authorization via API calls
- Automatic user data loading from `/users/self`
- Redis caching to minimize API calls
- Fail-open caching (continues without cache if Redis unavailable)
- Full TypeScript support with strict typing
- Non-intrusive data storage using Express `res.locals`
- Dual package support (CommonJS + ESM)

## Installation

```bash
npm install @cakemail/ngapi-ts-auth-middleware
```

## Quick Start

```typescript
import express from 'express';
import { createAuthMiddleware } from '@cakemail/ngapi-ts-auth-middleware';

const app = express();

// Public key is automatically fetched from {API_BASE_URL}/token/pubkey
const authMiddleware = createAuthMiddleware({
  cacheSecret: process.env.CACHE_SECRET, // Required: Secret for HMAC and encryption
  enableCaching: true,
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    db: parseInt(process.env.REDIS_DB || '0'),
  },
});

// Apply to all routes
app.use(authMiddleware);

// Or apply to specific routes
app.get('/api/resource', authMiddleware, (req, res) => {
  res.json({
    userId: res.locals.user.id,
    userEmail: res.locals.user.email,
    userAccountId: res.locals.user.account.id,
    targetAccountId: res.locals.account.id,
  });
});

app.listen(3000);
```

## Configuration

### AuthMiddlewareConfig

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `cacheSecret` | `string` | **Yes** | - | **Required secret for HMAC cache keys and Redis data encryption. Must be a strong, random value. Keep this secret secure!** |
| `publicKey` | `string | Buffer` | No | Auto-fetched from `{API_BASE_URL}/token/pubkey` | RSA public key for JWT verification (optional, fetched automatically if not provided) |
| `apiBaseUrl` | `string` | No | `process.env.CAKEMAILAPI_BASE_URL` or `https://api.cakemail.dev` | API base URL |
| `enableCaching` | `boolean` | No | `true` | Enable Redis caching |
| `redis` | `RedisConfig` | No | - | Redis connection configuration |
| `accountIdParams` | `string[]` | No | `['accountId', 'account_id']` | Query parameter names for account ID |
| `onError` | `(error, req) => void` | No | - | Custom error handler |
| `jwtOptions` | `JwtOptions` | No | - | JWT verification options |

### RedisConfig

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `host` | `string` | No | `process.env.REDIS_HOST` or `localhost` | Redis host |
| `port` | `number` | No | `process.env.REDIS_PORT` or `6379` | Redis port |
| `db` | `number` | No | `process.env.REDIS_DB` or `0` | Redis database number |
| `password` | `string` | No | `process.env.REDIS_PASSWORD` | Redis password |
| `keyPrefix` | `string` | No | `ngapi:` | Redis key prefix |

### JwtOptions

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `algorithms` | `string[]` | No | `['RS256']` | Allowed JWT algorithms |
| `issuer` | `string` | No | `urn:cakemail` | Expected JWT issuer |
| `clockTolerance` | `number` | No | `10` | Clock tolerance in seconds |

## Environment Variables

The middleware respects the following environment variables:

- `CACHE_SECRET`: **Required** - Secret for HMAC and Redis encryption (generate with `openssl rand -base64 32`)
- `CAKEMAILAPI_BASE_URL`: API base URL (default: `https://api.cakemail.dev`)
- `REDIS_HOST`: Redis host (default: `localhost`)
- `REDIS_PORT`: Redis port (default: `6379`)
- `REDIS_DB`: Redis database (default: `0`)
- `REDIS_PASSWORD`: Redis password (optional)

## Response Locals

The middleware stores authentication data in `res.locals`, following Express best practices for passing data between middleware:

### `res.locals.user: AuthenticatedUser`

Contains the authenticated user's data from `/users/self` and JWT claims:

```typescript
{
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  account: Account;      // User's own account (from JWT)
  scopes: string[];      // User's scopes
  user_key: string;      // User's API key
  // ... other user properties
}
```

### `res.locals.account: Account`

Contains the target account data:
- If `?accountId=X` query parameter is present: authorized impersonated account
- If no query parameter: user's own account (same as `res.locals.user.account`)

```typescript
{
  id: string;
  name: string;
  lineage: string;
  status: string;
  usage_limits: UsageLimits;
  // ... other account properties
}
```

### `res.locals.token: string`

The raw JWT Bearer token string.

## Data Population Guarantees

The middleware guarantees the following:

- **`res.locals.account.id`**: Always the **target** account ID (safe to use for operations)
- **`res.locals.user.account.id`**: Always the **user's own** account ID (never changes with impersonation)

This ensures downstream handlers always know:
1. Which account is being operated on (`res.locals.account.id`)
2. Which user is making the request (`res.locals.user.id`)
3. Which account the user belongs to (`res.locals.user.account.id`)

## Account Impersonation

When a query parameter `accountId` or `account_id` is present, the middleware:

1. Verifies the JWT token
2. Calls `GET /accounts/:accountId` with the Bearer token
3. If returns 200: access is authorized, `res.locals.account` is populated with account data
4. If returns 403/401: throws `AuthorizationError` (403 response)

Example:
```typescript
// User with account 1627783 accessing account 999999
GET /api/resource?accountId=999999
Authorization: Bearer <token>

// Result:
// res.locals.user.account.id = "1627783" (user's own account)
// res.locals.account.id = "999999" (target account)
```

## Caching Strategy

The middleware caches API responses in Redis to minimize API calls:

### Cache Key Format

```
ngapi:{tokenHash}:{accountId|userId}:{type}
```

- `tokenHash`: First 16 characters of SHA256(token)
- `accountId|userId`: Account or user ID
- `type`: `account` or `user`

Example: `ngapi:a3f2c8d1e5f7:1627783:account`

### TTL Strategy

- Cache keys expire when the JWT token expires
- Min TTL: 60 seconds
- Max TTL: 24 hours

### Fail-Open Behavior

If Redis is unavailable:
1. Logs warning to console
2. Continues without caching
3. Makes API calls on every request

This ensures authentication/authorization remains functional even if Redis is down (at the cost of performance).

## Error Handling

The middleware returns the following HTTP error responses:

### 401 Unauthorized

- Missing Authorization header
- Invalid token format
- Expired token
- Invalid token signature

Response:
```json
{
  "error": "Authentication failed",
  "message": "Token has expired"
}
```

### 403 Forbidden

- User does not have access to requested account

Response:
```json
{
  "error": "Authorization failed",
  "message": "Access denied to account 999999"
}
```

### 500 Internal Server Error

- Unexpected errors during authentication/authorization

Response:
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred during authentication"
}
```

### Custom Error Handler

You can provide a custom error handler for logging or monitoring:

```typescript
const authMiddleware = createAuthMiddleware({
  publicKey,
  onError: (error, req) => {
    console.error('Auth error:', {
      error: error.message,
      path: req.path,
      method: req.method,
    });
  },
});
```

## Usage Examples

### Basic Usage

```typescript
import express from 'express';
import { createAuthMiddleware } from '@cakemail/ngapi-ts-auth-middleware';

const app = express();

// Public key is automatically fetched from the API
const authMiddleware = createAuthMiddleware({
  // Optional: specify API base URL (defaults to CAKEMAILAPI_BASE_URL env var)
  // apiBaseUrl: 'https://api.cakemail.dev',
});

app.use(authMiddleware);

app.get('/api/campaigns', (req, res) => {
  // Access authenticated user
  console.log(`User ${res.locals.user.email} accessing account ${res.locals.account.id}`);

  res.json({ campaigns: [] });
});

app.listen(3000);
```

### With Redis Caching

```typescript
const authMiddleware = createAuthMiddleware({
  enableCaching: true,
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    db: parseInt(process.env.REDIS_DB || '0'),
    password: process.env.REDIS_PASSWORD,
  },
});
```

### With Custom Configuration

```typescript
const authMiddleware = createAuthMiddleware({
  // Public key is auto-fetched, but you can provide it manually if needed
  // publicKey: fs.readFileSync('./pubkey.pem'),

  apiBaseUrl: process.env.CAKEMAILAPI_BASE_URL,
  enableCaching: true,
  accountIdParams: ['accountId', 'account_id', 'aid'],
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    keyPrefix: 'myapp:',
  },
  onError: (error, req) => {
    console.error('Auth error:', error, 'Path:', req.path);
  },
  jwtOptions: {
    algorithms: ['RS256'],
    issuer: 'urn:cakemail',
    clockTolerance: 30,
  },
});
```

### Route-Specific Middleware

```typescript
import { createAuthMiddleware } from '@cakemail/ngapi-ts-auth-middleware';

const authMiddleware = createAuthMiddleware({});

// Public routes (no auth)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Protected routes
app.get('/api/*', authMiddleware);

app.get('/api/campaigns', (req, res) => {
  // res.locals.user and res.locals.account are guaranteed to exist here
  res.json({ campaigns: [] });
});
```

## TypeScript Support

The middleware is written in TypeScript with full type definitions. It automatically augments `Express.Locals` so TypeScript knows about `res.locals.user`, `res.locals.account`, and `res.locals.token` without any manual type declarations.

### Automatic Type Augmentation

When you import this package, `Express.Locals` is automatically augmented:

```typescript
import express from 'express';
import { createAuthMiddleware } from '@cakemail/ngapi-ts-auth-middleware';

const app = express();
const authMiddleware = createAuthMiddleware({ cacheSecret: process.env.CACHE_SECRET });

app.get('/api/resource', authMiddleware, (req, res) => {
  // TypeScript automatically knows about these types:
  // - res.locals.user is AuthenticatedUser | undefined
  // - res.locals.account is Account | undefined
  // - res.locals.token is string | undefined

  if (res.locals.user && res.locals.account) {
    res.json({
      userId: res.locals.user.id,
      userEmail: res.locals.user.email,
      accountId: res.locals.account.id,
    });
  }
});
```

No manual type casting or custom type declarations required.

### Importing Types

Types can be imported directly from the package for use in your application:

```typescript
import {
  AuthMiddlewareConfig,
  AuthenticatedUser,
  Account,
  User,
  JwtPayload,
  AuthenticationError,
  AuthorizationError,
} from '@cakemail/ngapi-ts-auth-middleware';
```

## Testing

Run tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

## Security Considerations

1. **HTTPS Only**: Always use HTTPS in production
2. **Public Key Security**: Never expose or commit private keys
3. **Token Expiration**: Tokens should have reasonable expiration times
4. **Cache Key Hashing**: Tokens are hashed in cache keys to prevent leakage
5. **Error Messages**: Error messages don't leak sensitive token information

## Performance

- **Redis Caching**: Reduces API calls by 90%+ for repeated requests
- **Connection Pooling**: ioredis and axios handle connection pooling automatically
- **Lazy Initialization**: Services initialize only when first needed
- **Async Operations**: User and account data fetched in parallel when possible

## License

MIT

## Contributing

Contributions are welcome! Please submit pull requests to the [GitHub repository](https://github.com/cakemail/ngapi-ts-auth-middleware).

## Support

For issues or questions, please file an issue on [GitHub](https://github.com/cakemail/ngapi-ts-auth-middleware/issues).
