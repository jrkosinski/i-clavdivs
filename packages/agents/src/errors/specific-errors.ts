/**
 * Specific error classes for common agent failure modes
 */

import { AgentError } from './agent-error.js';

/**
 * Authentication failed error
 */
export class AuthenticationError extends AgentError {
  public readonly code = 'AUTH_FAILED';
  public readonly retryable = true;
  public readonly httpStatus = 401;

  constructor(
    message: string,
    public readonly provider: string,
    public readonly profileId?: string,
    cause?: Error,
  ) {
    super(message, cause);
  }
}

/**
 * Billing or quota error
 */
export class BillingError extends AgentError {
  public readonly code = 'BILLING_ERROR';
  public readonly retryable = true;
  public readonly httpStatus = 402;

  constructor(
    message: string,
    public readonly provider: string,
    public readonly profileId?: string,
    cause?: Error,
  ) {
    super(message, cause);
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends AgentError {
  public readonly code = 'RATE_LIMIT';
  public readonly retryable = true;
  public readonly httpStatus = 429;

  constructor(
    message: string,
    public readonly provider: string,
    public readonly retryAfterSeconds?: number,
    cause?: Error,
  ) {
    super(message, cause);
  }
}

/**
 * Context window overflow error
 */
export class ContextOverflowError extends AgentError {
  public readonly code = 'CONTEXT_OVERFLOW';
  public readonly retryable = true;
  public readonly httpStatus = 413;

  constructor(
    message: string,
    public readonly currentTokens: number,
    public readonly maxTokens: number,
    cause?: Error,
  ) {
    super(message, cause);
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      currentTokens: this.currentTokens,
      maxTokens: this.maxTokens,
    };
  }
}

/**
 * Session compaction failed error
 */
export class CompactionFailureError extends AgentError {
  public readonly code = 'COMPACTION_FAILED';
  public readonly retryable = false;
  public readonly httpStatus = 500;

  constructor(
    message: string,
    public readonly sessionId: string,
    cause?: Error,
  ) {
    super(message, cause);
  }
}

/**
 * Request timeout error
 */
export class TimeoutError extends AgentError {
  public readonly code = 'TIMEOUT';
  public readonly retryable = true;
  public readonly httpStatus = 408;

  constructor(
    message: string,
    public readonly timeoutMs: number,
    cause?: Error,
  ) {
    super(message, cause);
  }
}

/**
 * Invalid request format error
 */
export class FormatError extends AgentError {
  public readonly code = 'INVALID_FORMAT';
  public readonly retryable = false;
  public readonly httpStatus = 400;

  constructor(
    message: string,
    public readonly details?: string,
    cause?: Error,
  ) {
    super(message, cause);
  }
}

/**
 * Model not supported error
 */
export class ModelNotSupportedError extends AgentError {
  public readonly code = 'MODEL_NOT_SUPPORTED';
  public readonly retryable = false;
  public readonly httpStatus = 400;

  constructor(
    message: string,
    public readonly model: string,
    public readonly provider: string,
    cause?: Error,
  ) {
    super(message, cause);
  }
}

/**
 * Session not found error
 */
export class SessionNotFoundError extends AgentError {
  public readonly code = 'SESSION_NOT_FOUND';
  public readonly retryable = false;
  public readonly httpStatus = 404;

  constructor(
    message: string,
    public readonly sessionId: string,
    cause?: Error,
  ) {
    super(message, cause);
  }
}
