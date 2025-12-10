import axios, { AxiosInstance, AxiosError } from 'axios'
import { Account, AccountResponse, User, UserResponse } from '../types'
import { AuthenticationError, AuthorizationError } from '../errors'

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
            .then((response) => response.data as unknown as Account)
            .catch((error: unknown) => {
                if (axios.isAxiosError(error)) {
                    const axiosError = error as AxiosError
                    if (axiosError.response?.status === 401) {
                        throw new AuthenticationError(`Invalid token`)
                    }

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
            .then((response) => response.data as unknown as User)
            .catch((error: unknown) => {
                if (axios.isAxiosError(error)) {
                    const axiosError = error as AxiosError
                    if (axiosError.response?.status === 401) {
                        throw new AuthorizationError('Failed to retrieve user data')
                    }
                }
                throw error
            })
    }
}
