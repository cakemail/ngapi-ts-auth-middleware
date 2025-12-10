import nock from 'nock'
import { fetchPublicKey, clearPublicKeyCache } from '../../../src/utils/fetch-public-key'
import { ConfigurationError } from '../../../src/errors'

describe('fetch-public-key', () => {
    beforeEach(() => {
        clearPublicKeyCache()
        nock.cleanAll()
    })

    afterEach(() => {
        nock.cleanAll()
    })

    describe('fetchPublicKey', () => {
        it('should fetch public key from API (JSON response)', async () => {
            const mockPublicKey = '-----BEGIN PUBLIC KEY-----\nMOCK_KEY\n-----END PUBLIC KEY-----'

            nock('https://api.example.com')
                .get('/token/pubkey')
                .reply(200, { pubkey: mockPublicKey })

            const publicKey = await fetchPublicKey('https://api.example.com')

            expect(publicKey).toBe(mockPublicKey)
        })

        it('should cache fetched public key', async () => {
            const mockPublicKey = '-----BEGIN PUBLIC KEY-----\nMOCK_KEY\n-----END PUBLIC KEY-----'

            nock('https://api.example.com')
                .get('/token/pubkey')
                .once()
                .reply(200, { pubkey: mockPublicKey })

            const publicKey1 = await fetchPublicKey('https://api.example.com')
            const publicKey2 = await fetchPublicKey('https://api.example.com')

            expect(publicKey1).toBe(mockPublicKey)
            expect(publicKey2).toBe(mockPublicKey)
            // Nock will fail if the endpoint is called more than once
        })

        it('should throw ConfigurationError when fetch fails', async () => {
            nock('https://api.example.com').get('/token/pubkey').reply(500, 'Internal Server Error')

            await expect(fetchPublicKey('https://api.example.com')).rejects.toThrow(
                ConfigurationError
            )
            await expect(fetchPublicKey('https://api.example.com')).rejects.toThrow(
                'Failed to fetch public key'
            )
        })

        it('should throw ConfigurationError for invalid response', async () => {
            const baseUrl = 'https://api-test-2.example.com'

            nock(baseUrl).get('/token/pubkey').reply(200, { pubkey: '   ' }) // Empty/whitespace response

            await expect(fetchPublicKey(baseUrl)).rejects.toThrow(ConfigurationError)
        })

        it('should handle concurrent requests', async () => {
            const mockPublicKey = '-----BEGIN PUBLIC KEY-----\nMOCK_KEY\n-----END PUBLIC KEY-----'

            nock('https://api.example.com')
                .get('/token/pubkey')
                .once()
                .reply(200, { pubkey: mockPublicKey })

            // Make multiple concurrent requests
            const [key1, key2, key3] = await Promise.all([
                fetchPublicKey('https://api.example.com'),
                fetchPublicKey('https://api.example.com'),
                fetchPublicKey('https://api.example.com'),
            ])

            expect(key1).toBe(mockPublicKey)
            expect(key2).toBe(mockPublicKey)
            expect(key3).toBe(mockPublicKey)
            // Nock will fail if the endpoint is called more than once
        })

        it('should allow retry after failed fetch', async () => {
            const mockPublicKey = '-----BEGIN PUBLIC KEY-----\nMOCK_KEY\n-----END PUBLIC KEY-----'

            nock('https://api.example.com').get('/token/pubkey').reply(500, 'Internal Server Error')

            nock('https://api.example.com')
                .get('/token/pubkey')
                .reply(200, { pubkey: mockPublicKey })

            // First attempt should fail
            await expect(fetchPublicKey('https://api.example.com')).rejects.toThrow(
                ConfigurationError
            )

            // Second attempt should succeed
            const publicKey = await fetchPublicKey('https://api.example.com')
            expect(publicKey).toBe(mockPublicKey)
        })
    })

    describe('clearPublicKeyCache', () => {
        it('should clear cached public key', async () => {
            const mockPublicKey = '-----BEGIN PUBLIC KEY-----\nMOCK_KEY\n-----END PUBLIC KEY-----'

            nock('https://api.example.com')
                .get('/token/pubkey')
                .twice()
                .reply(200, { pubkey: mockPublicKey })

            await fetchPublicKey('https://api.example.com')
            clearPublicKeyCache()
            await fetchPublicKey('https://api.example.com')

            // Should have called the API twice
        })
    })
})
