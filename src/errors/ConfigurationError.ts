export class ConfigurationError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'ConfigurationError'
        Error.captureStackTrace(this, this.constructor)
    }
}
