import { jest } from '@jest/globals';
import { mockPrisma } from './mocks/prisma.js';

jest.unstable_mockModule('../prisma/client.js', () => ({
    __esModule: true,
    default: mockPrisma,
}));

// Suppress console warnings during tests (optional)
global.console = {
    ...console,
    error: jest.fn(),
    warn: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';

// Add custom matchers if needed
expect.extend({
    toBeValidUUID(received) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const pass = uuidRegex.test(received);

        if (pass) {
            return {
                message: () => `expected ${received} not to be a valid UUID`,
                pass: true,
            };
        } else {
            return {
                message: () => `expected ${received} to be a valid UUID`,
                pass: false,
            };
        }
    },

    toBeValidEmail(received) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const pass = emailRegex.test(received);

        if (pass) {
            return {
                message: () => `expected ${received} not to be a valid email`,
                pass: true,
            };
        } else {
            return {
                message: () => `expected ${received} to be a valid email`,
                pass: false,
            };
        }
    },
});

