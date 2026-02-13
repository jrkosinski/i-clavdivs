/**
 * Error classes and utilities for agent system
 */

export { AgentError } from './agent-error.js';
export {
  FailoverError,
  classifyFailoverReason,
  type FailoverReason,
} from './failover-error.js';
export {
  AuthenticationError,
  BillingError,
  RateLimitError,
  ContextOverflowError,
  CompactionFailureError,
  TimeoutError,
  FormatError,
  ModelNotSupportedError,
  SessionNotFoundError,
} from './specific-errors.js';
