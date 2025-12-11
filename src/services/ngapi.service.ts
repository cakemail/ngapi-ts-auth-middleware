import axios, { AxiosInstance, AxiosError } from 'axios'
import { Account, AccountResponse, User, UserResponse } from '../types'
import { AuthenticationError, AuthorizationError, ConfigurationError } from '../errors'
import { isValidAccount, isValidUser } from '../utils/validators'

export class NgApiService {
    private client: AxiosInstance

    constructor(baseUrl?: string) {
        const apiBaseUrl = baseUrl || process.env.CAKEMAILAPI_BASE_URL || 'https://api.cakemail.dev'

        this.client = axios.create({
            baseURL: apiBaseUrl,
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json',
            },
        })
    }

    async getAccount(accountId: number | string, token: string): Promise<Account> {
        return this.client
            .get<AccountResponse>(`/accounts/${accountId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((response) => {
                // Extract account data from response
                const accountData = response.data?.data || response.data

                // Validate the response structure
                if (!isValidAccount(accountData)) {
                    throw new ConfigurationError('Invalid account data received from API')
                }

                return accountData
            })
            .catch((error: unknown) => {
                if (axios.isAxiosError(error)) {
                    const axiosError = error as AxiosError
                    if (axiosError.response?.status === 401) {
                        throw new AuthenticationError(`Invalid token`)
                    }

                    // API returns 400 with error code 8004 for forbidden access
                    if (axiosError.response?.status === 400) {
                        const errorData = axiosError.response.data as {
                            detail?: Array<{
                                msg?: string
                                type?: string
                                code?: number
                            }>
                        }
                        if (errorData?.detail?.[0]?.code === 8004) {
                            throw new AuthorizationError(`Access denied to account ${accountId}`)
                        }
                    }

                    // Keep 403 check as fallback for compatibility
                    if (axiosError.response?.status === 403) {
                        throw new AuthorizationError(`Access denied to account ${accountId}`)
                    }
                }
                throw error
            })
    }

    async getUserSelf(token: string): Promise<User> {
        return this.client
            .get<UserResponse>('/users/self', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((response) => {
                // Extract user data from response
                const userData = response.data?.data || response.data

                // Validate the response structure
                if (!isValidUser(userData)) {
                    throw new ConfigurationError('Invalid user data received from API')
                }

                return userData
            })
            .catch((error: unknown) => {
                if (axios.isAxiosError(error)) {
                    const axiosError = error as AxiosError
                    if (axiosError.response?.status === 401) {
                        throw new AuthenticationError('Failed to retrieve user data')
                    }
                }
                throw error
            })
    }
}
