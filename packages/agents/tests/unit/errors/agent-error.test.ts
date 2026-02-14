import { describe, it, expect } from 'vitest';
import { AgentError } from '../../../src/errors/agent-error.js';

//concrete test implementation of AgentError
class TestError extends AgentError {
    public readonly code = 'TEST_ERROR';
    public readonly retryable = true;
    public readonly httpStatus = 500;
}

class NonRetryableTestError extends AgentError {
    public readonly code = 'NON_RETRYABLE_ERROR';
    public readonly retryable = false;
    public readonly httpStatus = 400;
}

describe('AgentError', () => {
    describe('constructor', () => {
        it('should create error with message', () => {
            const error = new TestError('Test error message');

            expect(error.message).toBe('Test error message');
            expect(error.name).toBe('TestError');
            expect(error.code).toBe('TEST_ERROR');
            expect(error.retryable).toBe(true);
            expect(error.httpStatus).toBe(500);
        });

        it('should preserve cause error', () => {
            const cause = new Error('Original error');
            const error = new TestError('Wrapped error', cause);

            expect(error.cause).toBe(cause);
            expect(error.message).toBe('Wrapped error');
        });

        it('should append cause stack trace', () => {
            const cause = new Error('Original error');
            const error = new TestError('Wrapped error', cause);

            expect(error.stack).toContain('TestError: Wrapped error');
            expect(error.stack).toContain('Caused by:');
            expect(error.stack).toContain('Original error');
        });

        it('should handle undefined cause', () => {
            const error = new TestError('No cause');

            expect(error.cause).toBeUndefined();
            expect(error.stack).not.toContain('Caused by:');
        });
    });

    describe('toJSON', () => {
        it('should serialize to JSON object', () => {
            const error = new TestError('Test error');
            const json = error.toJSON();

            expect(json).toEqual({
                name: 'TestError',
                code: 'TEST_ERROR',
                message: 'Test error',
                retryable: true,
                httpStatus: 500,
                cause: undefined,
            });
        });

        it('should include cause in JSON when present', () => {
            const cause = new Error('Original error');
            const error = new TestError('Wrapped error', cause);
            const json = error.toJSON();

            expect(json.cause).toBe('Error: Original error');
            expect(json.name).toBe('TestError');
            expect(json.code).toBe('TEST_ERROR');
        });

        it('should reflect retryable = false', () => {
            const error = new NonRetryableTestError('Cannot retry');
            const json = error.toJSON();

            expect(json.retryable).toBe(false);
            expect(json.httpStatus).toBe(400);
        });
    });

    describe('inheritance', () => {
        it('should be instance of Error', () => {
            const error = new TestError('Test');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(AgentError);
        });

        it('should work with instanceof checks', () => {
            const error = new TestError('Test');

            expect(error instanceof Error).toBe(true);
            expect(error instanceof AgentError).toBe(true);
            expect(error instanceof TestError).toBe(true);
        });
    });
});
