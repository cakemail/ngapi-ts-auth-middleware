import { encrypt, decrypt } from '../../../src/utils/encryption'

describe('encryption', () => {
    const testSecret = 'my-secret-key-123'

    describe('encrypt and decrypt', () => {
        it('should encrypt and decrypt string data', () => {
            const data = 'Hello, World!'
            const encrypted = encrypt(data, testSecret)
            const decrypted = decrypt<string>(encrypted, testSecret)

            expect(decrypted).toBe(data)
            expect(encrypted).not.toBe(data)
            expect(typeof encrypted).toBe('string')
        })

        it('should encrypt and decrypt object data', () => {
            const data = { id: 123, name: 'John Doe', active: true }
            const encrypted = encrypt(data, testSecret)
            const decrypted = decrypt<typeof data>(encrypted, testSecret)

            expect(decrypted).toEqual(data)
            expect(encrypted).not.toEqual(data)
        })

        it('should encrypt and decrypt array data', () => {
            const data = [1, 2, 3, 'test', { key: 'value' }]
            const encrypted = encrypt(data, testSecret)
            const decrypted = decrypt<typeof data>(encrypted, testSecret)

            expect(decrypted).toEqual(data)
        })

        it('should encrypt and decrypt null', () => {
            const data = null
            const encrypted = encrypt(data, testSecret)
            const decrypted = decrypt(encrypted, testSecret)

            expect(decrypted).toBeNull()
        })

        it('should encrypt and decrypt boolean values', () => {
            const trueValue = encrypt(true, testSecret)
            const falseValue = encrypt(false, testSecret)

            expect(decrypt<boolean>(trueValue, testSecret)).toBe(true)
            expect(decrypt<boolean>(falseValue, testSecret)).toBe(false)
        })

        it('should encrypt and decrypt numbers', () => {
            const number = 42.567
            const encrypted = encrypt(number, testSecret)
            const decrypted = decrypt<number>(encrypted, testSecret)

            expect(decrypted).toBe(number)
        })

        it('should encrypt and decrypt complex nested objects', () => {
            const data = {
                user: {
                    id: 123,
                    profile: {
                        name: 'Test User',
                        emails: ['test@example.com', 'admin@example.com'],
                        settings: {
                            theme: 'dark',
                            notifications: true,
                        },
                    },
                },
                metadata: {
                    createdAt: '2024-01-01T00:00:00Z',
                    tags: ['tag1', 'tag2'],
                },
            }
            const encrypted = encrypt(data, testSecret)
            const decrypted = decrypt<typeof data>(encrypted, testSecret)

            expect(decrypted).toEqual(data)
        })

        it('should produce different ciphertext for same data with different secrets', () => {
            const data = { test: 'data' }
            const secret1 = 'secret-1'
            const secret2 = 'secret-2'

            const encrypted1 = encrypt(data, secret1)
            const encrypted2 = encrypt(data, secret2)

            expect(encrypted1).not.toBe(encrypted2)
        })

        it('should produce different ciphertext each time due to random IV', () => {
            const data = { test: 'data' }

            const encrypted1 = encrypt(data, testSecret)
            const encrypted2 = encrypt(data, testSecret)

            expect(encrypted1).not.toBe(encrypted2)
            // But both should decrypt to the same data
            expect(decrypt(encrypted1, testSecret)).toEqual(data)
            expect(decrypt(encrypted2, testSecret)).toEqual(data)
        })

        it('should throw error when decrypting with wrong secret', () => {
            const data = { test: 'data' }
            const encrypted = encrypt(data, testSecret)

            expect(() => {
                decrypt(encrypted, 'wrong-secret')
            }).toThrow()
        })

        it('should throw error when decrypting corrupted data', () => {
            const data = { test: 'data' }
            const encrypted = encrypt(data, testSecret)

            // Corrupt the encrypted data
            const corrupted = encrypted.slice(0, -10) + 'CORRUPTED='

            expect(() => {
                decrypt(corrupted, testSecret)
            }).toThrow()
        })

        it('should throw error when decrypting invalid base64', () => {
            expect(() => {
                decrypt('not-valid-base64!!!', testSecret)
            }).toThrow()
        })

        it('should throw error when decrypting data that is too short', () => {
            expect(() => {
                decrypt('YWJj', testSecret) // "abc" in base64, too short for IV + auth tag
            }).toThrow()
        })

        it('should handle empty string encryption', () => {
            const data = ''
            const encrypted = encrypt(data, testSecret)
            const decrypted = decrypt<string>(encrypted, testSecret)

            expect(decrypted).toBe('')
        })

        it('should handle empty object encryption', () => {
            const data = {}
            const encrypted = encrypt(data, testSecret)
            const decrypted = decrypt<object>(encrypted, testSecret)

            expect(decrypted).toEqual({})
        })

        it('should handle empty array encryption', () => {
            const data: never[] = []
            const encrypted = encrypt(data, testSecret)
            const decrypted = decrypt<never[]>(encrypted, testSecret)

            expect(decrypted).toEqual([])
        })

        it('should handle special characters in data', () => {
            const data = 'Special chars: 🔐🚀💾\n\t\r\\\'"'
            const encrypted = encrypt(data, testSecret)
            const decrypted = decrypt<string>(encrypted, testSecret)

            expect(decrypted).toBe(data)
        })

        it('should handle very long strings', () => {
            const data = 'x'.repeat(10000)
            const encrypted = encrypt(data, testSecret)
            const decrypted = decrypt<string>(encrypted, testSecret)

            expect(decrypted).toBe(data)
        })
    })
})
