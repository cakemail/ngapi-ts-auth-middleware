import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

/**
 * Derives a 32-byte encryption key from the provided secret
 */
function deriveKey(secret: string): Buffer {
    return createHash('sha256').update(secret).digest()
}

/**
 * Encrypts data using AES-256-GCM
 * @param data The data to encrypt (will be JSON stringified)
 * @param secret The secret key for encryption
 * @returns Base64-encoded encrypted data with IV and auth tag
 */
export function encrypt(data: unknown, secret: string): string {
    const key = deriveKey(secret)
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, key, iv)

    const plaintext = JSON.stringify(data)
    let encrypted = cipher.update(plaintext, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const authTag = cipher.getAuthTag()

    // Combine iv + authTag + encrypted data
    const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'base64')])
    return combined.toString('base64')
}

/**
 * Decrypts data encrypted with encrypt()
 * @param encryptedData Base64-encoded encrypted data
 * @param secret The secret key for decryption
 * @returns Decrypted and parsed data
 */
export function decrypt<T = unknown>(encryptedData: string, secret: string): T {
    const key = deriveKey(secret)
    const combined = Buffer.from(encryptedData, 'base64')

    // Extract iv, authTag, and encrypted data
    const iv = combined.subarray(0, IV_LENGTH)
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted.toString('base64'), 'base64', 'utf8')
    decrypted += decipher.final('utf8')

    return JSON.parse(decrypted) as T
}
