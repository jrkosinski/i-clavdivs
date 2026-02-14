import { describe, it, expect } from 'vitest';
import {
  AuthenticationError,
  BillingError,
  RateLimitError,
  ContextOverflowError,
  CompactionFailureError,
  TimeoutError,
  FormatError,
  ModelNotSupportedError,
  SessionNotFoundError,
} from '../../../src/errors/specific-errors.js';

describe('AuthenticationError', () => {
  it('should create auth error with correct properties', () => {
    const error = new AuthenticationError('Invalid API key', 'anthropic', 'profile-1');

    expect(error.code).toBe('AUTH_FAILED');
    expect(error.retryable).toBe(true);
    expect(error.httpStatus).toBe(401);
    expect(error.message).toBe('Invalid API key');
    expect(error.provider).toBe('anthropic');
    expect(error.profileId).toBe('profile-1');
  });

  it('should work without profileId', () => {
    const error = new AuthenticationError('Auth failed', 'openai');

    expect(error.profileId).toBeUndefined();
    expect(error.provider).toBe('openai');
  });
});

describe('BillingError', () => {
  it('should create billing error with correct properties', () => {
    const error = new BillingError('Insufficient credits', 'openai', 'profile-2');

    expect(error.code).toBe('BILLING_ERROR');
    expect(error.retryable).toBe(true);
    expect(error.httpStatus).toBe(402);
    expect(error.message).toBe('Insufficient credits');
    expect(error.provider).toBe('openai');
    expect(error.profileId).toBe('profile-2');
  });
});

describe('RateLimitError', () => {
  it('should create rate limit error with retry-after', () => {
    const error = new RateLimitError('Rate limit exceeded', 'anthropic', 60);

    expect(error.code).toBe('RATE_LIMIT');
    expect(error.retryable).toBe(true);
    expect(error.httpStatus).toBe(429);
    expect(error.message).toBe('Rate limit exceeded');
    expect(error.provider).toBe('anthropic');
    expect(error.retryAfterSeconds).toBe(60);
  });

  it('should work without retry-after', () => {
    const error = new RateLimitError('Too many requests', 'google');

    expect(error.retryAfterSeconds).toBeUndefined();
  });
});

describe('ContextOverflowError', () => {
  it('should create context overflow error with token info', () => {
    const error = new ContextOverflowError('Context too large', 150000, 128000);

    expect(error.code).toBe('CONTEXT_OVERFLOW');
    expect(error.retryable).toBe(true);
    expect(error.httpStatus).toBe(413);
    expect(error.message).toBe('Context too large');
    expect(error.currentTokens).toBe(150000);
    expect(error.maxTokens).toBe(128000);
  });

  it('should include token info in JSON', () => {
    const error = new ContextOverflowError('Overflow', 100000, 80000);
    const json = error.toJSON();

    expect(json.currentTokens).toBe(100000);
    expect(json.maxTokens).toBe(80000);
    expect(json.code).toBe('CONTEXT_OVERFLOW');
  });
});

describe('CompactionFailureError', () => {
  it('should create compaction failure error', () => {
    const error = new CompactionFailureError('Compaction failed', 'session-123');

    expect(error.code).toBe('COMPACTION_FAILED');
    expect(error.retryable).toBe(false);
    expect(error.httpStatus).toBe(500);
    expect(error.message).toBe('Compaction failed');
    expect(error.sessionId).toBe('session-123');
  });
});

describe('TimeoutError', () => {
  it('should create timeout error with duration', () => {
    const error = new TimeoutError('Request timed out', 30000);

    expect(error.code).toBe('TIMEOUT');
    expect(error.retryable).toBe(true);
    expect(error.httpStatus).toBe(408);
    expect(error.message).toBe('Request timed out');
    expect(error.timeoutMs).toBe(30000);
  });
});

describe('FormatError', () => {
  it('should create format error with details', () => {
    const error = new FormatError('Invalid JSON', 'Expected object but got array');

    expect(error.code).toBe('INVALID_FORMAT');
    expect(error.retryable).toBe(false);
    expect(error.httpStatus).toBe(400);
    expect(error.message).toBe('Invalid JSON');
    expect(error.details).toBe('Expected object but got array');
  });

  it('should work without details', () => {
    const error = new FormatError('Bad request');

    expect(error.details).toBeUndefined();
  });
});

describe('ModelNotSupportedError', () => {
  it('should create model not supported error', () => {
    const error = new ModelNotSupportedError(
      'Model not available',
      'gpt-5',
      'openai',
    );

    expect(error.code).toBe('MODEL_NOT_SUPPORTED');
    expect(error.retryable).toBe(false);
    expect(error.httpStatus).toBe(400);
    expect(error.message).toBe('Model not available');
    expect(error.model).toBe('gpt-5');
    expect(error.provider).toBe('openai');
  });
});

describe('SessionNotFoundError', () => {
  it('should create session not found error', () => {
    const error = new SessionNotFoundError('Session does not exist', 'session-456');

    expect(error.code).toBe('SESSION_NOT_FOUND');
    expect(error.retryable).toBe(false);
    expect(error.httpStatus).toBe(404);
    expect(error.message).toBe('Session does not exist');
    expect(error.sessionId).toBe('session-456');
  });
});

describe('error inheritance', () => {
  it('all specific errors should be instances of Error', () => {
    const errors = [
      new AuthenticationError('test', 'test'),
      new BillingError('test', 'test'),
      new RateLimitError('test', 'test'),
      new ContextOverflowError('test', 100, 50),
      new CompactionFailureError('test', 'test'),
      new TimeoutError('test', 1000),
      new FormatError('test'),
      new ModelNotSupportedError('test', 'test', 'test'),
      new SessionNotFoundError('test', 'test'),
    ];

    errors.forEach((error) => {
      expect(error).toBeInstanceOf(Error);
    });
  });
});
