// Test setup file
// This file runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.REDIS_HOST = 'localhost'
process.env.REDIS_PORT = '6379'
process.env.REDIS_DB = '0'
process.env.CAKEMAILAPI_BASE_URL = 'https://api.cakemail.dev'

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    warn: jest.fn(),
    error: jest.fn(),
}
