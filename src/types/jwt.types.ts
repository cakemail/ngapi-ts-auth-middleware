export interface JwtPayload {
    account_id: number
    accounts: string
    email: string
    exp: number
    iat: number
    id: number
    iss: string
    lineage: string
    scopes: string[]
    tz: string
    user_key: string
}

export interface DecodedToken extends JwtPayload {
    // JWT payload after verification
}
