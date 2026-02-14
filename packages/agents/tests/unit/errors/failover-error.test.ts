import { describe, it, expect } from 'vitest';
import { FailoverError, classifyFailoverReason } from '../../../src/errors/failover-error.js';

describe('FailoverError', () => {
    describe('constructor', () => {
        it('should create error with all parameters', () => {
            const error = new FailoverError(
                'Authentication failed',
                'auth',
                'anthropic',
                'claude-3-5-sonnet-20241022',
                'profile-123'
            );

            expect(error.message).toBe('Authentication failed');
            expect(error.reason).toBe('auth');
            expect(error.provider).toBe('anthropic');
            expect(error.model).toBe('claude-3-5-sonnet-20241022');
            expect(error.profileId).toBe('profile-123');
            expect(error.code).toBe('FAILOVER');
            expect(error.retryable).toBe(true);
        });

        it('should work without profileId', () => {
            const error = new FailoverError('Rate limited', 'rate_limit', 'openai', 'gpt-4');

            expect(error.profileId).toBeUndefined();
            expect(error.reason).toBe('rate_limit');
        });

        it('should preserve cause error', () => {
            const cause = new Error('Network timeout');
            const error = new FailoverError(
                'Request timed out',
                'timeout',
                'google',
                'gemini-pro',
                undefined,
                cause
            );

            expect(error.cause).toBe(cause);
        });
    });

    describe('httpStatus', () => {
        it('should return 401 for auth errors', () => {
            const error = new FailoverError('Auth failed', 'auth', 'test', 'test-model');
            expect(error.httpStatus).toBe(401);
        });

        it('should return 402 for billing errors', () => {
            const error = new FailoverError('No credits', 'billing', 'test', 'test-model');
            expect(error.httpStatus).toBe(402);
        });

        it('should return 429 for rate_limit errors', () => {
            const error = new FailoverError(
                'Too many requests',
                'rate_limit',
                'test',
                'test-model'
            );
            expect(error.httpStatus).toBe(429);
        });

        it('should return 408 for timeout errors', () => {
            const error = new FailoverError('Timed out', 'timeout', 'test', 'test-model');
            expect(error.httpStatus).toBe(408);
        });

        it('should return 413 for context_overflow errors', () => {
            const error = new FailoverError(
                'Context too large',
                'context_overflow',
                'test',
                'test-model'
            );
            expect(error.httpStatus).toBe(413);
        });

        it('should return 400 for format errors', () => {
            const error = new FailoverError('Invalid format', 'format', 'test', 'test-model');
            expect(error.httpStatus).toBe(400);
        });

        it('should return 500 for unknown errors', () => {
            const error = new FailoverError('Unknown error', 'unknown', 'test', 'test-model');
            expect(error.httpStatus).toBe(500);
        });
    });

    describe('shouldRotateProfile', () => {
        it('should return true for auth errors', () => {
            const error = new FailoverError('Auth failed', 'auth', 'test', 'test-model');
            expect(error.shouldRotateProfile).toBe(true);
        });

        it('should return true for billing errors', () => {
            const error = new FailoverError('No credits', 'billing', 'test', 'test-model');
            expect(error.shouldRotateProfile).toBe(true);
        });

        it('should return true for rate_limit errors', () => {
            const error = new FailoverError('Rate limited', 'rate_limit', 'test', 'test-model');
            expect(error.shouldRotateProfile).toBe(true);
        });

        it('should return false for timeout errors', () => {
            const error = new FailoverError('Timeout', 'timeout', 'test', 'test-model');
            expect(error.shouldRotateProfile).toBe(false);
        });

        it('should return false for context_overflow errors', () => {
            const error = new FailoverError('Overflow', 'context_overflow', 'test', 'test-model');
            expect(error.shouldRotateProfile).toBe(false);
        });

        it('should return false for format errors', () => {
            const error = new FailoverError('Bad format', 'format', 'test', 'test-model');
            expect(error.shouldRotateProfile).toBe(false);
        });

        it('should return false for unknown errors', () => {
            const error = new FailoverError('Unknown', 'unknown', 'test', 'test-model');
            expect(error.shouldRotateProfile).toBe(false);
        });
    });

    describe('shouldFallbackModel', () => {
        it('should return true for context_overflow errors', () => {
            const error = new FailoverError('Overflow', 'context_overflow', 'test', 'test-model');
            expect(error.shouldFallbackModel).toBe(true);
        });

        it('should return true for format errors', () => {
            const error = new FailoverError('Bad format', 'format', 'test', 'test-model');
            expect(error.shouldFallbackModel).toBe(true);
        });

        it('should return false for auth errors', () => {
            const error = new FailoverError('Auth failed', 'auth', 'test', 'test-model');
            expect(error.shouldFallbackModel).toBe(false);
        });

        it('should return false for billing errors', () => {
            const error = new FailoverError('No credits', 'billing', 'test', 'test-model');
            expect(error.shouldFallbackModel).toBe(false);
        });

        it('should return false for rate_limit errors', () => {
            const error = new FailoverError('Rate limited', 'rate_limit', 'test', 'test-model');
            expect(error.shouldFallbackModel).toBe(false);
        });

        it('should return false for timeout errors', () => {
            const error = new FailoverError('Timeout', 'timeout', 'test', 'test-model');
            expect(error.shouldFallbackModel).toBe(false);
        });
    });

    describe('toJSON', () => {
        it('should include all failover-specific fields', () => {
            const error = new FailoverError(
                'Auth failed',
                'auth',
                'anthropic',
                'claude-3-5-sonnet',
                'profile-123'
            );
            const json = error.toJSON();

            expect(json).toMatchObject({
                name: 'FailoverError',
                code: 'FAILOVER',
                message: 'Auth failed',
                retryable: true,
                httpStatus: 401,
                reason: 'auth',
                provider: 'anthropic',
                model: 'claude-3-5-sonnet',
                profileId: 'profile-123',
                shouldRotateProfile: true,
                shouldFallbackModel: false,
            });
        });
    });
});

describe('classifyFailoverReason', () => {
    describe('auth errors', () => {
        it('should detect "unauthorized"', () => {
            const error = new Error('Unauthorized access');
            expect(classifyFailoverReason(error)).toBe('auth');
        });

        it('should detect "invalid api key"', () => {
            const error = new Error('Invalid API key provided');
            expect(classifyFailoverReason(error)).toBe('auth');
        });

        it('should detect "401"', () => {
            const error = new Error('401 Authentication required');
            expect(classifyFailoverReason(error)).toBe('auth');
        });

        it('should detect "403"', () => {
            const error = new Error('403 Forbidden');
            expect(classifyFailoverReason(error)).toBe('auth');
        });

        it('should detect "forbidden"', () => {
            const error = new Error('Forbidden resource');
            expect(classifyFailoverReason(error)).toBe('auth');
        });
    });

    describe('billing errors', () => {
        it('should detect "insufficient"', () => {
            const error = new Error('Insufficient credits');
            expect(classifyFailoverReason(error)).toBe('billing');
        });

        it('should detect "quota"', () => {
            const error = new Error('Quota exceeded');
            expect(classifyFailoverReason(error)).toBe('billing');
        });

        it('should detect "402"', () => {
            const error = new Error('402 Payment required');
            expect(classifyFailoverReason(error)).toBe('billing');
        });

        it('should detect "no_credits"', () => {
            const error = new Error('Error: no_credits available');
            expect(classifyFailoverReason(error)).toBe('billing');
        });

        it('should detect "account suspended"', () => {
            const error = new Error('Account suspended for non-payment');
            expect(classifyFailoverReason(error)).toBe('billing');
        });
    });

    describe('rate limit errors', () => {
        it('should detect "rate limit"', () => {
            const error = new Error('Rate limit exceeded');
            expect(classifyFailoverReason(error)).toBe('rate_limit');
        });

        it('should detect "too many requests"', () => {
            const error = new Error('Too many requests');
            expect(classifyFailoverReason(error)).toBe('rate_limit');
        });

        it('should detect "429"', () => {
            const error = new Error('429 Too Many Requests');
            expect(classifyFailoverReason(error)).toBe('rate_limit');
        });

        it('should detect "overloaded"', () => {
            const error = new Error('Server is overloaded');
            expect(classifyFailoverReason(error)).toBe('rate_limit');
        });

        it('should detect "throttle"', () => {
            const error = new Error('Request throttled');
            expect(classifyFailoverReason(error)).toBe('rate_limit');
        });
    });

    describe('timeout errors', () => {
        it('should detect "timeout"', () => {
            const error = new Error('Request timeout');
            expect(classifyFailoverReason(error)).toBe('timeout');
        });

        it('should detect "timed out"', () => {
            const error = new Error('Connection timed out');
            expect(classifyFailoverReason(error)).toBe('timeout');
        });

        it('should detect "deadline"', () => {
            const error = new Error('Deadline exceeded');
            expect(classifyFailoverReason(error)).toBe('timeout');
        });

        it('should detect "408"', () => {
            const error = new Error('408 Request Timeout');
            expect(classifyFailoverReason(error)).toBe('timeout');
        });

        it('should detect "aborterror"', () => {
            const error = new Error('AbortError: Request was aborted');
            expect(classifyFailoverReason(error)).toBe('timeout');
        });
    });

    describe('context overflow errors', () => {
        it('should detect "context"', () => {
            const error = new Error('Context window exceeded');
            expect(classifyFailoverReason(error)).toBe('context_overflow');
        });

        it('should detect "too long"', () => {
            const error = new Error('Input is too long');
            expect(classifyFailoverReason(error)).toBe('context_overflow');
        });

        it('should detect "maximum context"', () => {
            const error = new Error('Maximum context length exceeded');
            expect(classifyFailoverReason(error)).toBe('context_overflow');
        });

        it('should detect "token limit"', () => {
            const error = new Error('Token limit reached');
            expect(classifyFailoverReason(error)).toBe('context_overflow');
        });

        it('should detect "413"', () => {
            const error = new Error('413 Payload Too Large');
            expect(classifyFailoverReason(error)).toBe('context_overflow');
        });
    });

    describe('format errors', () => {
        it('should detect "invalid format"', () => {
            const error = new Error('Invalid format in request');
            expect(classifyFailoverReason(error)).toBe('format');
        });

        it('should detect "malformed"', () => {
            const error = new Error('Malformed JSON');
            expect(classifyFailoverReason(error)).toBe('format');
        });

        it('should detect "parse error"', () => {
            const error = new Error('Parse error in input');
            expect(classifyFailoverReason(error)).toBe('format');
        });

        it('should detect "400"', () => {
            const error = new Error('400 Bad Request');
            expect(classifyFailoverReason(error)).toBe('format');
        });

        it('should detect "invalid_request"', () => {
            const error = new Error('invalid_request: Missing parameter');
            expect(classifyFailoverReason(error)).toBe('format');
        });
    });

    describe('unknown errors', () => {
        it('should return unknown for unclassified errors', () => {
            const error = new Error('Something went wrong');
            expect(classifyFailoverReason(error)).toBe('unknown');
        });

        it('should return unknown for null', () => {
            expect(classifyFailoverReason(null)).toBe('unknown');
        });

        it('should return unknown for undefined', () => {
            expect(classifyFailoverReason(undefined)).toBe('unknown');
        });

        it('should handle non-Error objects', () => {
            expect(classifyFailoverReason('string error')).toBe('unknown');
        });
    });

    describe('case insensitivity', () => {
        it('should detect errors regardless of case', () => {
            expect(classifyFailoverReason(new Error('UNAUTHORIZED'))).toBe('auth');
            expect(classifyFailoverReason(new Error('Rate Limit Exceeded'))).toBe('rate_limit');
            expect(classifyFailoverReason(new Error('TIMEOUT'))).toBe('timeout');
            expect(classifyFailoverReason(new Error('Insufficient QUOTA'))).toBe('billing');
        });
    });
});
