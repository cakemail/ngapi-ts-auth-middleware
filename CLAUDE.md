# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Express TypeScript authentication/authorization middleware for Cakemail's API (`@cakemail-org/ngapi-ts-auth-middleware`). It verifies JWT Bearer tokens, authorizes account impersonation, loads user data from the API, and caches results in Redis.

**Key responsibility**: Populate `res.locals.user`, `res.locals.account`, and `res.locals.token` for downstream Express handlers.

## Build and Development Commands

### Building
```bash
npm run build              # Full build (clean + cjs + esm + types)
npm run build:cjs          # CommonJS build only
npm run build:esm          # ESM build only
npm run build:types        # TypeScript declarations only
npm run clean              # Remove dist directory
```

The project uses dual-package exports (CommonJS + ESM) with three separate TypeScript configurations:
- `tsconfig.cjs.json` - CommonJS output to `dist/cjs/`
- `tsconfig.esm.json` - ESM output to `dist/esm/`
- `tsconfig.types.json` - Type declarations to `dist/types/`

### Testing
```bash
npm test                   # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report
```

Test files use Jest with ts-jest preset. Test location: `test/**/*.test.ts`

**Coverage requirements**: 80% minimum for branches, functions, lines, and statements (enforced in `jest.config.js`).

**Running a single test**:
```bash
npx jest test/unit/services/jwt.service.test.ts
npx jest -t "test name pattern"
```

### Linting and Formatting
```bash
npm run lint               # Lint TypeScript files
npm run lint:fix           # Lint and auto-fix issues
npm run format             # Format all TypeScript files
npm run format:check       # Check formatting without changes
```

Uses ESLint with TypeScript parser and Prettier integration.

## Architecture Overview

### Middleware Pipeline

The main middleware (`createAuthMiddleware`) executes these steps in order:

1. **Lazy JWT Service Initialization** - Fetches public key from `{API_BASE_URL}/token/pubkey` on first request if not provided in config
2. **Token Extraction** - Extracts Bearer token from `Authorization` header
3. **Authentication** - Verifies JWT signature using RSA public key
4. **Account Resolution** - Determines target account from query params (`accountId`/`account_id`) or JWT claims
5. **Authorization** - For impersonation requests, calls `GET /accounts/:id` to verify access
6. **User Data Loading** - Fetches full user data from `GET /users/self`
7. **Response Population** - Stores data in `res.locals`

**Important guarantee**: `res.locals.account.id` is always the **target** account (safe for operations), while `res.locals.user.account.id` is always the user's **own** account (never changes with impersonation).

### Service Layer

Three core services in `src/services/`:

- **`JwtService`** (`jwt.service.ts`) - JWT verification using jsonwebtoken library
- **`RedisService`** (`redis.service.ts`) - Redis caching with fail-open behavior (continues if Redis unavailable)
- **`NgApiService`** (`ngapi.service.ts`) - HTTP client for Cakemail API calls using axios

Services are initialized once per middleware instance and reused across requests.

### Middleware Functions

Modular middleware logic in `src/middleware/`:

- **`authenticate.ts`** - JWT verification wrapper
- **`authorize.ts`** - Account impersonation authorization (with caching)
- **`user-loader.ts`** - User data fetching from `/users/self` (with caching)
- **`auth.middleware.ts`** - Main orchestrator that composes the pipeline

### Utilities

Helper functions in `src/utils/`:

- **`token-extractor.ts`** - Extract Bearer token and account ID from request
- **`fetch-public-key.ts`** - Fetch RSA public key from API
- **`cache-key.ts`** - Generate HMAC-based cache keys and calculate TTL from token expiry
- **`encryption.ts`** - AES-256-GCM encryption/decryption for Redis cached data
- **`error-handler.ts`** - Centralized error handling with HTTP status codes
- **`validators.ts`** - Runtime validation for Account and User response structures

### Error Types

Custom errors in `src/errors/`:

- **`AuthenticationError`** - Returns 401 (invalid/expired token)
- **`AuthorizationError`** - Returns 403 (no access to account)
- **`ConfigurationError`** - Returns 500 (middleware misconfiguration)

### Type System

TypeScript types in `src/types/`:

- **`config.types.ts`** - Middleware configuration interfaces
- **`jwt.types.ts`** - JWT payload and decoded token types
- **`user.types.ts`** - User and AuthenticatedUser types
- **`account.types.ts`** - Account structure and usage limits
- **`express.ts`** - Express.Locals module augmentation (auto-types `res.locals` for consumers)
- **`index.ts`** - Re-exports all types and imports express augmentation

## Redis Caching Strategy

**Cache key format**: `{tokenHmac}:{accountId|userId}:{type}`
- `tokenHmac` = First 16 chars of HMAC-SHA256(token, cacheSecret)
- `type` = `account` or `user`

**Data encryption**: Cached data is encrypted using AES-256-GCM with the `cacheSecret` (see `src/utils/encryption.ts`).

**TTL calculation**: Cache expires when JWT token expires (min: 60s, max: 24h)

**Fail-open behavior**: If Redis connection fails, middleware continues without caching (logs warning but doesn't block requests).

**Required configuration**: `cacheSecret` is required and used for both HMAC key generation and data encryption.

## Testing Strategy

- **Unit tests**: `test/unit/` - Test individual services and utilities with mocks
- **Integration tests**: `test/integration/` - Test full middleware pipeline with mocked HTTP/Redis
- **Test fixtures**: `test/fixtures/` - Sample JWT tokens, payloads, and public keys
- **Test helpers**: `test/helpers/` - Mock Express request/response objects

Uses `nock` for HTTP mocking, `ioredis-mock` for Redis mocking, and `supertest` for Express testing.

## Important Implementation Details

### Public Key Handling

The middleware auto-fetches the RSA public key from `{API_BASE_URL}/token/pubkey` if not provided in config. The fetch is lazy (happens on first request) and cached in memory for the lifetime of the process.

### Account Impersonation Flow

When `?accountId=X` is present:
1. Decode JWT to get user's account ID
2. If `X` != user's account ID, call `GET /accounts/X` with Bearer token
3. API returns 200 (authorized) or 400 with error code 8004 (denied)
   - Response format for forbidden: `{"detail": [{"msg": "Forbidden", "type": "bad_request", "code": 8004}]}`
4. Middleware stores account data in `res.locals.account`

Without query param: `res.locals.account` = user's own account from JWT.

### Data Storage in res.locals

Following Express best practices, all data is stored in `res.locals` (not `req`):
- `res.locals.user` - Full user data with scopes and user_key
- `res.locals.account` - Target account (may be impersonated)
- `res.locals.token` - Raw Bearer token string

## Environment Variables

Default values (can be overridden in config):
- `CACHE_SECRET` - **Required** for HMAC cache keys and AES-256-GCM encryption (generate with `openssl rand -base64 32`)
- `CAKEMAILAPI_BASE_URL` - API base URL (default: `https://api.cakemail.dev`)
- `REDIS_HOST` - Redis host (default: `localhost`)
- `REDIS_PORT` - Redis port (default: `6379`)
- `REDIS_DB` - Redis database number (default: `0`)
- `REDIS_PASSWORD` - Redis password (optional)

## TypeScript Configuration

The project uses strict TypeScript settings with multiple configurations for different build targets. All strict flags are enabled including `strictNullChecks`, `noUnusedLocals`, and `noImplicitReturns`.

When modifying code, ensure:
- No TypeScript errors (build will fail)
- All exports have proper type definitions
- Types are exported from `src/types/index.ts`
