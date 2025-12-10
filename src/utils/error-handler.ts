import { Request, Response } from 'express'
import { AuthenticationError, AuthorizationError } from '../errors'

export function handleAuthError(
    error: Error,
    req: Request,
    res: Response,
    onError?: (error: Error, req: Request) => void
): void {
    // Call custom error handler if provided
    if (onError) {
        try {
            onError(error, req)
        } catch (handlerError) {
            console.error('Error in custom error handler:', handlerError)
        }
    }

    if (error instanceof AuthenticationError) {
        res.status(error.statusCode).json({
            error: 'Authentication failed',
            message: error.message,
        })
    } else if (error instanceof AuthorizationError) {
        res.status(error.statusCode).json({
            error: 'Authorization failed',
            message: error.message,
        })
    } else {
        console.error('Unexpected auth middleware error:', error)
        res.status(500).json({
            error: 'Internal server error',
            message: 'An unexpected error occurred during authentication',
        })
    }
}
