import { Request, Response, NextFunction } from 'express'

export function createMockRequest(overrides?: Partial<Request>): Partial<Request> {
    return {
        headers: {},
        query: {},
        body: {},
        params: {},
        ...overrides,
    }
}

export function createMockResponse(): Partial<Response> {
    const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        locals: {},
    }
    return res
}

export function createMockNext(): NextFunction {
    return jest.fn() as NextFunction
}
