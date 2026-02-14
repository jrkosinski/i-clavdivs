//simple api key authentication utilities

import type { AuthCredential } from '../core/types.js';

/**
 * Load api key from environment variable
 */
export function loadApiKeyFromEnv(envVarName: string): string | undefined {
    return process.env[envVarName];
}

/**
 * Create api key credential
 */
export function createApiKeyAuth(key: string): AuthCredential {
    return {
        type: 'api-key',
        key,
    };
}

/**
 * Create bearer token credential
 */
export function createBearerTokenAuth(token: string): AuthCredential {
    return {
        type: 'bearer-token',
        token,
    };
}

/**
 * Validate api key format
 */
export function validateApiKey(key: string, prefix?: string): boolean {
    if (!key || typeof key !== 'string') {
        return false;
    }

    if (prefix && !key.startsWith(prefix)) {
        return false;
    }

    //basic validation: must be non-empty and reasonable length
    return key.length >= 10 && key.length <= 500;
}

/**
 * Mask api key for logging (show only first and last 4 chars)
 */
export function maskApiKey(key: string): string {
    if (key.length <= 8) {
        return '****';
    }
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
