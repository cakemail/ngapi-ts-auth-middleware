import express, { Request, Response } from 'express'
import request from 'supertest'
import nock from 'nock'
import fs from 'fs'
import path from 'path'
import { createAuthMiddleware } from '../../src'
import { JwtService } from '../../src/services/jwt.service'

// Mock the JwtService to bypass actual JWT verification for happy path tests
jest.mock('../../src/services/jwt.service')

describe('Auth Middleware - Happy Path Integration Tests', () => {
    const publicKey = fs.readFileSync(path.join(__dirname, '../fixtures/pubkey.pem'))

    const accountPayload = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../fixtures/account-payload-example.json'), 'utf8')
    )

    const userPayload = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../fixtures/user-payload-example.json'), 'utf8')
    )

    const sampleTokenPayload = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../fixtures/sample-token.json'), 'utf8')
    )

    let app: express.Application
    const apiBaseUrl = 'https://api.cakemail.dev'
    const mockToken = 'mock.jwt.token'

    beforeEach(() => {
        app = express()
        nock.cleanAll()

        // Mock JWT service to return sample payload
        const MockedJwtService = JwtService as jest.MockedClass<typeof JwtService>
        MockedJwtService.mockImplementation(
            () =>
                ({
                    verify: jest.fn().mockResolvedValue(sampleTokenPayload),
                }) as any
        )
    })

    afterEach(() => {
        nock.cleanAll()
        jest.clearAllMocks()
    })

    describe('Successful Authentication Flow', () => {
        it('should authenticate valid JWT and load user data without impersonation', async () => {
            // Mock the /users/self API call
            nock(apiBaseUrl).get('/users/self').reply(200, userPayload)

            const authMiddleware = createAuthMiddleware({
                publicKey,
                apiBaseUrl,
                enableCaching: false,
                cacheSecret: 'test-secret-key-for-hmac',
            })

            app.use(authMiddleware)
            app.get('/test', (_req: Request, res: Response) => {
                res.json({
                    success: true,
                    user: res.locals.user,
                    account: res.locals.account,
                    token: res.locals.token ? 'present' : 'missing',
                })
            })

            const response = await request(app)
                .get('/test')
                .set('Authorization', `Bearer ${mockToken}`)

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.user).toBeDefined()
            expect(response.body.user.id).toBe(sampleTokenPayload.id.toString())
            expect(response.body.user.email).toBe(userPayload.data.email)
            expect(response.body.user.scopes).toEqual(sampleTokenPayload.scopes)
            expect(response.body.user.user_key).toBe(sampleTokenPayload.user_key)
            expect(response.body.account).toBeDefined()
            expect(response.body.account.id).toBe(sampleTokenPayload.account_id.toString())
            expect(response.body.account.lineage).toBe(sampleTokenPayload.lineage)
            expect(response.body.token).toBe('present')
        })

        it('should authenticate and authorize account impersonation', async () => {
            const targetAccountId = 1234567

            // Mock the /accounts/:id API call for impersonation
            nock(apiBaseUrl)
                .get(`/accounts/${targetAccountId}`)
                .reply(200, {
                    ...accountPayload,
                    data: {
                        ...accountPayload.data,
                        id: targetAccountId.toString(),
                    },
                })

            // Mock the /users/self API call
            nock(apiBaseUrl).get('/users/self').reply(200, userPayload)

            const authMiddleware = createAuthMiddleware({
                publicKey,
                apiBaseUrl,
                enableCaching: false,
                cacheSecret: 'test-secret-key-for-hmac',
            })

            app.use(authMiddleware)
            app.get('/test', (_req: Request, res: Response) => {
                res.json({
                    success: true,
                    targetAccount: res.locals.account,
                    userOwnAccount: res.locals.user.account,
                })
            })

            const response = await request(app)
                .get('/test')
                .query({ accountId: targetAccountId })
                .set('Authorization', `Bearer ${mockToken}`)

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.targetAccount.id).toBe(targetAccountId.toString())
            expect(response.body.userOwnAccount.id).toBe(sampleTokenPayload.account_id.toString())
            // Verify the guarantee: res.locals.account is target, res.locals.user.account is own
            expect(response.body.targetAccount.id).not.toBe(response.body.userOwnAccount.id)
        })

        it('should deny account impersonation when API returns 400 with error code 8004', async () => {
            const unauthorizedAccountId = 9999999

            // Mock the /accounts/:id API call to return 400 with error code 8004 (actual API behavior)
            nock(apiBaseUrl)
                .get(`/accounts/${unauthorizedAccountId}`)
                .reply(400, {
                    detail: [
                        {
                            msg: 'Forbidden',
                            type: 'bad_request',
                            code: 8004,
                        },
                    ],
                })

            const authMiddleware = createAuthMiddleware({
                publicKey,
                apiBaseUrl,
                enableCaching: false,
                cacheSecret: 'test-secret-key-for-hmac',
            })

            app.use(authMiddleware)
            app.get('/test', (_req: Request, res: Response) => {
                res.json({ success: true })
            })

            const response = await request(app)
                .get('/test')
                .query({ accountId: unauthorizedAccountId })
                .set('Authorization', `Bearer ${mockToken}`)

            expect(response.status).toBe(403)
            expect(response.body.error).toBe('Authorization failed')
        })
    })

    describe('Input Validation', () => {
        it('should reject negative account IDs', async () => {
            // Mock user API call
            nock(apiBaseUrl).get('/users/self').reply(200, userPayload)

            const authMiddleware = createAuthMiddleware({
                publicKey,
                apiBaseUrl,
                enableCaching: false,
                cacheSecret: 'test-secret-key-for-hmac',
            })

            app.use(authMiddleware)
            app.get('/test', (_req: Request, res: Response) => {
                res.json({
                    accountId: res.locals.account.id,
                })
            })

            const response = await request(app)
                .get('/test')
                .query({ accountId: -1 })
                .set('Authorization', `Bearer ${mockToken}`)

            // Should use user's own account (from JWT) since -1 is invalid
            expect(response.status).toBe(200)
            expect(response.body.accountId).toBe(sampleTokenPayload.account_id.toString())
        })

        it('should reject account IDs larger than MAX_SAFE_INTEGER', async () => {
            // Mock user API call
            nock(apiBaseUrl).get('/users/self').reply(200, userPayload)

            const authMiddleware = createAuthMiddleware({
                publicKey,
                apiBaseUrl,
                enableCaching: false,
                cacheSecret: 'test-secret-key-for-hmac',
            })

            app.use(authMiddleware)
            app.get('/test', (_req: Request, res: Response) => {
                res.json({
                    accountId: res.locals.account.id,
                })
            })

            const response = await request(app)
                .get('/test')
                .query({ accountId: Number.MAX_SAFE_INTEGER + 1 })
                .set('Authorization', `Bearer ${mockToken}`)

            // Should use user's own account (from JWT) since the ID is too large
            expect(response.status).toBe(200)
            expect(response.body.accountId).toBe(sampleTokenPayload.account_id.toString())
        })
    })

    describe('Configuration Validation', () => {
        it('should throw error when cacheSecret is missing', () => {
            expect(() => {
                createAuthMiddleware({
                    publicKey,
                    apiBaseUrl,
                    enableCaching: false,
                    // @ts-expect-error: Testing missing required field
                    cacheSecret: undefined,
                })
            }).toThrow('cacheSecret is required')
        })
    })
})
