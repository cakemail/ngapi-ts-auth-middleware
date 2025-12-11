import axios from 'axios'
import { ConfigurationError } from '../errors'

let cachedPublicKey: string | null = null
let keyFetchPromise: Promise<string> | null = null

export async function fetchPublicKey(baseUrl: string): Promise<string> {
    // Return cached key if available
    if (cachedPublicKey) {
        return cachedPublicKey
    }

    // If a fetch is already in progress, wait for it
    if (keyFetchPromise) {
        return keyFetchPromise
    }

    // Start fetching the public key
    keyFetchPromise = (async () => {
        try {
            const url = `${baseUrl}/token/pubkey`
            const response = await axios.get(url, {
                timeout: 5000,
            })

            // Handle JSON response with pubkey field
            let publicKeyData: string
            if (response.data && typeof response.data === 'object' && 'pubkey' in response.data) {
                publicKeyData = (response.data as { pubkey: string }).pubkey
            } else {
                throw new ConfigurationError('Invalid public key response from API')
            }

            if (!publicKeyData || publicKeyData.trim() === '') {
                throw new ConfigurationError('Invalid public key response from API')
            }

            cachedPublicKey = publicKeyData
            return cachedPublicKey
        } catch (error) {
            keyFetchPromise = null

            if (axios.isAxiosError(error)) {
                throw new ConfigurationError(
                    `Failed to fetch public key from ${baseUrl}/token/pubkey: ${error.message}`
                )
            }
            throw new ConfigurationError('Failed to fetch public key from API')
        }
    })()

    return keyFetchPromise
}

export function clearPublicKeyCache(): void {
    cachedPublicKey = null
    keyFetchPromise = null
}
