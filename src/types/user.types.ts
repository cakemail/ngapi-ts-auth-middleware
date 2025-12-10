import { Account } from './account.types'

export interface User {
    id: string
    email: string
    status: string
    created_on: number
    last_activity_on: number
    expires_on: number | null
    first_name: string
    last_name: string
    title: string | null
    language: string
    timezone: string
    office_phone: string | null
    mobile_phone: string | null
}

export interface UserResponse {
    data: User
}

export interface AuthenticatedUser extends User {
    account: Account
    scopes: string[]
    user_key: string
}
