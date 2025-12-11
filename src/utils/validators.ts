import { Account, User } from '../types'

/**
 * Validates that a value has the structure of an Account object
 * @param data The data to validate
 * @returns true if the data appears to be a valid Account
 */
export function isValidAccount(data: unknown): data is Account {
    if (!data || typeof data !== 'object') {
        return false
    }

    const account = data as Record<string, unknown>

    return (
        typeof account.id === 'string' &&
        typeof account.lineage === 'string' &&
        typeof account.status === 'string' &&
        typeof account.name === 'string' &&
        typeof account.address === 'object' &&
        account.address !== null &&
        typeof account.usage_limits === 'object' &&
        account.usage_limits !== null
    )
}

/**
 * Validates that a value has the structure of a User object
 * @param data The data to validate
 * @returns true if the data appears to be a valid User
 */
export function isValidUser(data: unknown): data is User {
    if (!data || typeof data !== 'object') {
        return false
    }

    const user = data as Record<string, unknown>

    return (
        typeof user.id === 'string' &&
        typeof user.email === 'string' &&
        typeof user.status === 'string' &&
        typeof user.first_name === 'string' &&
        typeof user.last_name === 'string' &&
        typeof user.language === 'string' &&
        typeof user.timezone === 'string'
    )
}
