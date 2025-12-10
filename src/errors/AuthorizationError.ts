export class AuthorizationError extends Error {
    public readonly statusCode: number

    constructor(message: string, statusCode: number = 403) {
        super(message)
        this.name = 'AuthorizationError'
        this.statusCode = statusCode
        Error.captureStackTrace(this, this.constructor)
    }
}
