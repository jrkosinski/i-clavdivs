import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    loadApiKeyFromEnv,
    createApiKeyAuth,
    createBearerTokenAuth,
    validateApiKey,
    maskApiKey,
} from '../../../src/auth/api-key.js';

describe('loadApiKeyFromEnv', () => {
    const TEST_VAR = 'TEST_API_KEY';
    const originalEnv = process.env[TEST_VAR];

    afterEach(() => {
        if (originalEnv === undefined) {
            delete process.env[TEST_VAR];
        } else {
            process.env[TEST_VAR] = originalEnv;
        }
    });

    it('should return api key when environment variable is set', () => {
        process.env[TEST_VAR] = 'test-key-12345';
        expect(loadApiKeyFromEnv(TEST_VAR)).toBe('test-key-12345');
    });

    it('should return undefined when environment variable is not set', () => {
        delete process.env[TEST_VAR];
        expect(loadApiKeyFromEnv(TEST_VAR)).toBeUndefined();
    });

    it('should return empty string when environment variable is empty', () => {
        process.env[TEST_VAR] = '';
        expect(loadApiKeyFromEnv(TEST_VAR)).toBe('');
    });
});

describe('createApiKeyAuth', () => {
    it('should create api-key auth credential', () => {
        const key = 'sk-test-12345';
        const auth = createApiKeyAuth(key);

        expect(auth).toEqual({
            type: 'api-key',
            key: 'sk-test-12345',
        });
    });

    it('should preserve exact key value', () => {
        const key = 'complex-key-with-special-chars-!@#$%';
        const auth = createApiKeyAuth(key);

        expect(auth.key).toBe(key);
        expect(auth.type).toBe('api-key');
    });
});

describe('createBearerTokenAuth', () => {
    it('should create bearer-token auth credential', () => {
        const token = 'bearer-token-12345';
        const auth = createBearerTokenAuth(token);

        expect(auth).toEqual({
            type: 'bearer-token',
            token: 'bearer-token-12345',
        });
    });

    it('should preserve exact token value', () => {
        const token = 'jwt.token.signature';
        const auth = createBearerTokenAuth(token);

        expect(auth.token).toBe(token);
        expect(auth.type).toBe('bearer-token');
    });
});

describe('validateApiKey', () => {
    describe('invalid inputs', () => {
        it('should return false for null', () => {
            expect(validateApiKey(null as any)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(validateApiKey(undefined as any)).toBe(false);
        });

        it('should return false for non-string types', () => {
            expect(validateApiKey(123 as any)).toBe(false);
            expect(validateApiKey({} as any)).toBe(false);
            expect(validateApiKey([] as any)).toBe(false);
        });

        it('should return false for empty string', () => {
            expect(validateApiKey('')).toBe(false);
        });
    });

    describe('length validation', () => {
        it('should return false for key shorter than 10 chars', () => {
            expect(validateApiKey('short')).toBe(false);
            expect(validateApiKey('123456789')).toBe(false); // 9 chars
        });

        it('should return true for key with exactly 10 chars', () => {
            expect(validateApiKey('1234567890')).toBe(true); // 10 chars
        });

        it('should return true for key with valid length', () => {
            expect(validateApiKey('sk-test-12345')).toBe(true);
            expect(validateApiKey('a'.repeat(100))).toBe(true);
        });

        it('should return true for key with exactly 500 chars', () => {
            expect(validateApiKey('a'.repeat(500))).toBe(true);
        });

        it('should return false for key longer than 500 chars', () => {
            expect(validateApiKey('a'.repeat(501))).toBe(false);
        });
    });

    describe('prefix validation', () => {
        it('should return true when key starts with prefix', () => {
            expect(validateApiKey('sk-test-12345', 'sk-')).toBe(true);
            expect(validateApiKey('api-key-value', 'api-')).toBe(true);
        });

        it('should return false when key does not start with prefix', () => {
            expect(validateApiKey('test-12345', 'sk-')).toBe(false);
            expect(validateApiKey('sk_wrong_prefix', 'sk-')).toBe(false);
        });

        it('should validate length even with prefix check', () => {
            expect(validateApiKey('sk-short', 'sk-')).toBe(false); // too short
            expect(validateApiKey('sk-' + 'a'.repeat(498), 'sk-')).toBe(false); // too long
        });

        it('should work without prefix parameter', () => {
            expect(validateApiKey('any-valid-key-here')).toBe(true);
        });
    });
});

describe('maskApiKey', () => {
    it('should return **** for keys 8 chars or shorter', () => {
        expect(maskApiKey('')).toBe('****');
        expect(maskApiKey('a')).toBe('****');
        expect(maskApiKey('12345')).toBe('****');
        expect(maskApiKey('12345678')).toBe('****');
    });

    it('should show first 4 and last 4 chars for longer keys', () => {
        expect(maskApiKey('123456789')).toBe('1234...6789');
        expect(maskApiKey('abcdefghijk')).toBe('abcd...hijk');
    });

    it('should mask typical api keys correctly', () => {
        expect(maskApiKey('sk-test-12345')).toBe('sk-t...2345');
        expect(maskApiKey('api-key-value-secret')).toBe('api-...cret');
    });

    it('should handle very long keys', () => {
        const longKey = 'a'.repeat(100);
        const masked = maskApiKey(longKey);
        expect(masked).toBe('aaaa...aaaa');
        expect(masked.length).toBe(11); // 4 + ... + 4
    });

    it('should preserve special characters in visible portions', () => {
        expect(maskApiKey('sk-!@#$%^&*()')).toBe('sk-!...&*()');
    });
});
