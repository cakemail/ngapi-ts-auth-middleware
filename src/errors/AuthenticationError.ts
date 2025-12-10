export class AuthenticationError extends Error {
    public readonly statusCode: number

    constructor(message: string, statusCode: number = 401) {
        super(message)
        this.name = 'AuthenticationError'
        this.statusCode = statusCode
        Error.captureStackTrace(this, this.constructor)
    }
}
