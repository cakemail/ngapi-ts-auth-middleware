import { extractToken, extractAccountId } from '../../../src/utils/token-extractor'
import { AuthenticationError } from '../../../src/errors'
import { createMockRequest } from '../../helpers/mock-express'

describe('token-extractor', () => {
    describe('extractToken', () => {
        it('should extract token from valid Authorization header', () => {
            const req = createMockRequest({
                headers: {
                    authorization: 'Bearer my-test-token',
                },
            })

            const token = extractToken(req as any)
            expect(token).toBe('my-test-token')
        })

        it('should throw AuthenticationError when Authorization header is missing', () => {
            const req = createMockRequest({
                headers: {},
            })

            expect(() => extractToken(req as any)).toThrow(AuthenticationError)
            expect(() => extractToken(req as any)).toThrow('Missing Authorization header')
        })

        it('should throw AuthenticationError for invalid format', () => {
            const req = createMockRequest({
                headers: {
                    authorization: 'Invalid format',
                },
            })

            expect(() => extractToken(req as any)).toThrow(AuthenticationError)
            expect(() => extractToken(req as any)).toThrow('Invalid Authorization header format')
        })

        it('should throw AuthenticationError when not Bearer type', () => {
            const req = createMockRequest({
                headers: {
                    authorization: 'Basic my-token',
                },
            })

            expect(() => extractToken(req as any)).toThrow(AuthenticationError)
        })
    })

    describe('extractAccountId', () => {
        it('should extract accountId from query params', () => {
            const req = createMockRequest({
                query: {
                    accountId: '123',
                },
            })

            const accountId = extractAccountId(req as any)
            expect(accountId).toBe(123)
        })

        it('should extract account_id from query params', () => {
            const req = createMockRequest({
                query: {
                    account_id: '456',
                },
            })

            const accountId = extractAccountId(req as any)
            expect(accountId).toBe(456)
        })

        it('should return null when no account ID params present', () => {
            const req = createMockRequest({
                query: {},
            })

            const accountId = extractAccountId(req as any)
            expect(accountId).toBeNull()
        })

        it('should use custom param names', () => {
            const req = createMockRequest({
                query: {
                    aid: '789',
                },
            })

            const accountId = extractAccountId(req as any, ['aid'])
            expect(accountId).toBe(789)
        })

        it('should return null for invalid number format', () => {
            const req = createMockRequest({
                query: {
                    accountId: 'not-a-number',
                },
            })

            const accountId = extractAccountId(req as any)
            expect(accountId).toBeNull()
        })
    })
})
