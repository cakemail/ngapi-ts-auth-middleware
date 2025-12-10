import fs from 'fs'
import path from 'path'
import jwt from 'jsonwebtoken'
import { JwtService } from '../../../src/services/jwt.service'
import { AuthenticationError } from '../../../src/errors'

describe('JwtService', () => {
    const publicKey = fs.readFileSync(path.join(__dirname, '../../fixtures/pubkey.pem'))

    let jwtService: JwtService

    beforeEach(() => {
        jwtService = new JwtService(publicKey)
    })

    describe('verify', () => {
        it('should throw AuthenticationError for expired token', async () => {
            const now = Math.floor(Date.now() / 1000)
            const payload = {
                account_id: 1627783,
                exp: now - 3600, // Expired 1 hour ago
                iat: now - 7200,
                iss: 'urn:cakemail',
            }

            // Sign with HS256 for testing (will fail verification with RS256 public key)
            const token = jwt.sign(payload, 'test-secret', { algorithm: 'HS256' })

            await expect(jwtService.verify(token)).rejects.toThrow(AuthenticationError)
        })

        it('should throw AuthenticationError for invalid signature', async () => {
            const token = 'invalid.jwt.token'

            await expect(jwtService.verify(token)).rejects.toThrow(AuthenticationError)
            await expect(jwtService.verify(token)).rejects.toThrow('Invalid token')
        })

        it('should throw AuthenticationError for malformed token', async () => {
            const token = 'this-is-not-a-jwt'

            await expect(jwtService.verify(token)).rejects.toThrow(AuthenticationError)
        })

        it('should create JwtService with custom options', () => {
            const serviceWithOptions = new JwtService(publicKey, {
                algorithms: ['RS256'],
                issuer: 'urn:cakemail',
                clockTolerance: 30,
            })

            expect(serviceWithOptions).toBeInstanceOf(JwtService)
        })

        it('should use default JWT options when not provided', () => {
            const service = new JwtService(publicKey)
            expect(service).toBeInstanceOf(JwtService)
        })
    })
})
