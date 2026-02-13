/**
 * Structured failover error with retry and rotation support
 */

import { AgentError } from './agent-error.js';

/**
 * Reasons why an agent execution might fail and trigger failover
 */
export type FailoverReason =
  | 'auth'          // authentication failed (401, 403)
  | 'billing'       // billing issue (402, quota exhausted)
  | 'rate_limit'    // rate limit exceeded (429)
  | 'timeout'       // request timeout (408, deadline)
  | 'context_overflow' // context window exceeded
  | 'format'        // request format error
  | 'unknown';      // unclassified error

/**
 * Error that triggers authentication profile or provider failover
 */
export class FailoverError extends AgentError {
  public readonly code = 'FAILOVER';
  public readonly retryable = true;

  constructor(
    message: string,
    public readonly reason: FailoverReason,
    public readonly provider: string,
    public readonly model: string,
    public readonly profileId?: string,
    cause?: Error,
  ) {
    super(message, cause);
  }

  /**
   * Get HTTP status code based on failover reason
   */
  public get httpStatus(): number {
    return _resolveFailoverStatus(this.reason);
  }

  /**
   * Check if this error should trigger profile rotation
   */
  public get shouldRotateProfile(): boolean {
    return this.reason === 'auth'
        || this.reason === 'billing'
        || this.reason === 'rate_limit';
  }

  /**
   * Check if this error should trigger model fallback
   */
  public get shouldFallbackModel(): boolean {
    return this.reason === 'context_overflow'
        || this.reason === 'format';
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      reason: this.reason,
      provider: this.provider,
      model: this.model,
      profileId: this.profileId,
      shouldRotateProfile: this.shouldRotateProfile,
      shouldFallbackModel: this.shouldFallbackModel,
    };
  }
}

/**
 * Resolve HTTP status code from failover reason
 */
function _resolveFailoverStatus(reason: FailoverReason): number {
  switch (reason) {
    case 'auth':
      return 401;
    case 'billing':
      return 402;
    case 'rate_limit':
      return 429;
    case 'timeout':
      return 408;
    case 'context_overflow':
      return 413;
    case 'format':
      return 400;
    case 'unknown':
    default:
      return 500;
  }
}

/**
 * Classify an error into a failover reason
 * @param error Error to classify
 * @returns Failover reason
 */
export function classifyFailoverReason(error: Error | unknown): FailoverReason {
  if (!error) {
    return 'unknown';
  }

  const errorStr = String(error).toLowerCase();
  const message = error instanceof Error ? error.message.toLowerCase() : errorStr;

  //check for auth errors
  if (_isAuthError(message, errorStr)) {
    return 'auth';
  }

  //check for billing errors
  if (_isBillingError(message, errorStr)) {
    return 'billing';
  }

  //check for rate limit errors
  if (_isRateLimitError(message, errorStr)) {
    return 'rate_limit';
  }

  //check for timeout errors
  if (_isTimeoutError(message, errorStr)) {
    return 'timeout';
  }

  //check for context overflow
  if (_isContextOverflowError(message, errorStr)) {
    return 'context_overflow';
  }

  //check for format errors
  if (_isFormatError(message, errorStr)) {
    return 'format';
  }

  return 'unknown';
}

/**
 * Check if error indicates authentication failure
 */
function _isAuthError(message: string, errorStr: string): boolean {
  const patterns = [
    'unauthorized',
    'invalid api key',
    'invalid_api_key',
    'authentication failed',
    'auth',
    '401',
    '403',
    'forbidden',
    'invalid_authentication',
  ];

  return patterns.some(p => message.includes(p) || errorStr.includes(p));
}

/**
 * Check if error indicates billing issue
 */
function _isBillingError(message: string, errorStr: string): boolean {
  const patterns = [
    'insufficient',
    'quota',
    'credits',
    'billing',
    'payment',
    '402',
    'no_credits',
    'insufficient_quota',
    'account suspended',
  ];

  return patterns.some(p => message.includes(p) || errorStr.includes(p));
}

/**
 * Check if error indicates rate limiting
 */
function _isRateLimitError(message: string, errorStr: string): boolean {
  const patterns = [
    'rate limit',
    'rate_limit',
    'too many requests',
    '429',
    'overloaded',
    'quota_exceeded',
    'throttle',
  ];

  return patterns.some(p => message.includes(p) || errorStr.includes(p));
}

/**
 * Check if error indicates timeout
 */
function _isTimeoutError(message: string, errorStr: string): boolean {
  const patterns = [
    'timeout',
    'timed out',
    'deadline',
    '408',
    'aborterror',
    'connection timeout',
  ];

  return patterns.some(p => message.includes(p) || errorStr.includes(p));
}

/**
 * Check if error indicates context overflow
 */
function _isContextOverflowError(message: string, errorStr: string): boolean {
  const patterns = [
    'context',
    'too long',
    'maximum context',
    'max_tokens',
    'token limit',
    'input too large',
    '413',
  ];

  return patterns.some(p => message.includes(p) || errorStr.includes(p));
}

/**
 * Check if error indicates format issue
 */
function _isFormatError(message: string, errorStr: string): boolean {
  const patterns = [
    'invalid format',
    'malformed',
    'parse error',
    'invalid_request',
    'bad request',
    '400',
  ];

  return patterns.some(p => message.includes(p) || errorStr.includes(p));
}
