import express, { Request, Response } from 'express'
import request from 'supertest'
import nock from 'nock'
import fs from 'fs'
import path from 'path'
import { createAuthMiddleware } from '../../src'

describe('Auth Middleware Integration', () => {
    const publicKey = fs.readFileSync(path.join(__dirname, '../fixtures/pubkey.pem'))

    // Fixture files available for future use
    // const accountPayload = JSON.parse(
    //   fs.readFileSync(path.join(__dirname, '../fixtures/account-payload-example.json'), 'utf8')
    // );
    // const userPayload = JSON.parse(
    //   fs.readFileSync(path.join(__dirname, '../fixtures/user-payload-example.json'), 'utf8')
    // );

    let app: express.Application

    beforeEach(() => {
        app = express()
        nock.cleanAll()
    })

    afterEach(() => {
        nock.cleanAll()
    })

    it('should return 401 for missing token', async () => {
        const authMiddleware = createAuthMiddleware({
            publicKey,
            enableCaching: false,
            cacheSecret: 'test-secret-key',
        })

        app.use(authMiddleware)
        app.get('/test', (_req: Request, res: Response) => {
            res.json({ success: true })
        })

        const response = await request(app).get('/test')

        expect(response.status).toBe(401)
        expect(response.body.error).toBe('Authentication failed')
    })

    it('should return 401 for invalid Authorization header format', async () => {
        const authMiddleware = createAuthMiddleware({
            publicKey,
            enableCaching: false,
            cacheSecret: 'test-secret-key',
        })

        app.use(authMiddleware)
        app.get('/test', (_req: Request, res: Response) => {
            res.json({ success: true })
        })

        const response = await request(app).get('/test').set('Authorization', 'Invalid format')

        expect(response.status).toBe(401)
        expect(response.body.error).toBe('Authentication failed')
    })

    it('should return 401 for invalid JWT token', async () => {
        const authMiddleware = createAuthMiddleware({
            publicKey,
            enableCaching: false,
            cacheSecret: 'test-secret-key',
        })

        app.use(authMiddleware)
        app.get('/test', (_req: Request, res: Response) => {
            res.json({ success: true })
        })

        const response = await request(app)
            .get('/test')
            .set('Authorization', 'Bearer invalid.jwt.token')

        expect(response.status).toBe(401)
        expect(response.body.error).toBe('Authentication failed')
    })

    it('should call onError callback when authentication fails', async () => {
        const onErrorMock = jest.fn()

        const authMiddleware = createAuthMiddleware({
            publicKey,
            enableCaching: false,
            cacheSecret: 'test-secret-key',
            onError: onErrorMock,
        })

        app.use(authMiddleware)
        app.get('/test', (_req: Request, res: Response) => {
            res.json({ success: true })
        })

        await request(app).get('/test')

        expect(onErrorMock).toHaveBeenCalled()
        expect(onErrorMock.mock.calls[0][0]).toBeInstanceOf(Error)
    })

    it('should create middleware without public key (will fetch from API)', () => {
        const authMiddleware = createAuthMiddleware({
            apiBaseUrl: 'https://api.cakemail.dev',
            enableCaching: false,
            cacheSecret: 'test-secret-key',
        })

        expect(authMiddleware).toBeInstanceOf(Function)
    })

    it('should create middleware with custom configuration', () => {
        const authMiddleware = createAuthMiddleware({
            publicKey,
            apiBaseUrl: 'https://custom-api.example.com',
            enableCaching: false,
            cacheSecret: 'test-secret-key',
            accountIdParams: ['aid', 'account_id'],
            jwtOptions: {
                algorithms: ['RS256'],
                issuer: 'urn:cakemail',
                clockTolerance: 30,
            },
        })

        expect(authMiddleware).toBeInstanceOf(Function)
    })

    it('should handle errors from API gracefully', async () => {
        const authMiddleware = createAuthMiddleware({
            publicKey,
            apiBaseUrl: 'https://api.cakemail.dev',
            enableCaching: false,
            cacheSecret: 'test-secret-key',
        })

        app.use(authMiddleware)
        app.get('/test', (_req: Request, res: Response) => {
            res.json({ success: true })
        })

        const response = await request(app)
            .get('/test')
            .set('Authorization', 'Bearer invalid-token')

        expect(response.status).toBe(401)
    })
})
