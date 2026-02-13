/**
 * Core interfaces defining contracts for agent system components
 */

import type {
  IAgentCompactResult,
  IAgentRequest,
  IAgentRunResult,
} from './types.js';

/**
 * Credentials for authenticating with an AI provider
 */
export interface ICredentials {
  /** API key or access token */
  apiKey?: string;
  /** Additional auth metadata (e.g., region, account ID) */
  metadata?: Record<string, unknown>;
  /** OAuth refresh token */
  refreshToken?: string;
  /** Token expiration timestamp */
  expiresAt?: number;
}

/**
 * Authentication provider configuration
 */
export interface IAuthConfig {
  provider: string;
  profileId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Provides authentication credentials for AI providers
 */
export interface IAuthenticationProvider {
  /**
   * Authenticate and retrieve credentials for a provider
   * @param config Authentication configuration
   * @returns Resolved credentials
   */
  authenticate(config: IAuthConfig): Promise<ICredentials>;

  /**
   * Refresh expired credentials if supported
   * @param credentials Current credentials to refresh
   * @returns Refreshed credentials
   */
  refresh?(credentials: ICredentials): Promise<ICredentials>;

  /**
   * Check if credentials are valid and not expired
   * @param credentials Credentials to validate
   * @returns True if valid
   */
  isValid(credentials: ICredentials): boolean;
}

/**
 * Result of a context capacity check
 */
export interface ICapacityResult {
  /** Whether there is sufficient capacity */
  hasCapacity: boolean;
  /** Current token count */
  currentTokens: number;
  /** Maximum allowed tokens */
  maxTokens: number;
  /** Warning message if approaching limit */
  warning?: string;
}

/**
 * Manages conversation context and compaction
 */
export interface IContextManager {
  /**
   * Check if there is sufficient context capacity
   * @param messages Conversation messages
   * @param model Model being used
   * @returns Capacity check result
   */
  checkCapacity(messages: unknown[], model: string): Promise<ICapacityResult>;

  /**
   * Compact conversation history to free up context space
   * @param sessionId Session to compact
   * @returns Compaction result
   */
  compact(sessionId: string): Promise<IAgentCompactResult>;

  /**
   * Estimate token count for messages
   * @param messages Messages to count
   * @param model Model being used
   * @returns Estimated token count
   */
  estimateTokens(messages: unknown[], model: string): Promise<number>;
}

/**
 * Defines when and how to retry failed operations
 */
export interface IFailoverStrategy {
  /**
   * Determine if an error should trigger a retry
   * @param error Error that occurred
   * @param attemptNumber Current attempt number
   * @returns True if should retry
   */
  shouldRetry(error: Error, attemptNumber: number): boolean;

  /**
   * Select the next provider/profile to try
   * @returns Next provider config or null if no more options
   */
  selectNextProvider(): IProviderConfig | null;

  /**
   * Record a failed attempt for learning
   * @param error Error that occurred
   * @param config Provider config that failed
   */
  recordFailure(error: Error, config: IProviderConfig): void;

  /**
   * Record a successful attempt
   * @param config Provider config that succeeded
   */
  recordSuccess(config: IProviderConfig): void;
}

/**
 * Provider/model configuration
 */
export interface IProviderConfig {
  provider: string;
  model: string;
  profileId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Resolves model identifiers to provider configurations
 */
export interface IModelResolver {
  /**
   * Resolve a model identifier to provider config
   * @param modelId Model identifier (e.g., 'claude-3-5-sonnet-20241022')
   * @returns Provider configuration
   */
  resolve(modelId: string): Promise<IProviderConfig>;

  /**
   * Check if a model is supported
   * @param modelId Model identifier
   * @returns True if supported
   */
  isSupported(modelId: string): boolean;

  /**
   * Get default model for a provider
   * @param provider Provider name
   * @returns Default model ID
   */
  getDefaultModel(provider: string): string;
}

/**
 * Stores and retrieves session state
 */
export interface ISessionStore {
  /**
   * Load session state
   * @param sessionId Session identifier
   * @returns Session data or null if not found
   */
  load(sessionId: string): Promise<unknown | null>;

  /**
   * Save session state
   * @param sessionId Session identifier
   * @param data Session data to persist
   */
  save(sessionId: string, data: unknown): Promise<void>;

  /**
   * Delete session data
   * @param sessionId Session identifier
   */
  delete(sessionId: string): Promise<void>;

  /**
   * Check if session exists
   * @param sessionId Session identifier
   * @returns True if exists
   */
  exists(sessionId: string): Promise<boolean>;
}

/**
 * Handles streaming events from agent execution
 */
export interface IStreamHandler {
  /**
   * Called when a message starts
   * @param event Message start event
   */
  onMessageStart?(event: IMessageStartEvent): void;

  /**
   * Called when text content is streamed
   * @param event Text delta event
   */
  onTextDelta?(event: ITextDeltaEvent): void;

  /**
   * Called when text content ends
   * @param event Text end event
   */
  onTextEnd?(event: ITextEndEvent): void;

  /**
   * Called when a tool execution starts
   * @param event Tool start event
   */
  onToolStart?(event: IToolStartEvent): void;

  /**
   * Called when a tool execution completes
   * @param event Tool result event
   */
  onToolResult?(event: IToolResultEvent): void;

  /**
   * Called when an error occurs
   * @param event Error event
   */
  onError?(event: IErrorEvent): void;

  /**
   * Called when execution completes
   * @param event Completion event
   */
  onComplete?(event: ICompleteEvent): void;
}

/**
 * Event fired when message starts
 */
export interface IMessageStartEvent {
  sessionId: string;
  messageId: string;
  timestamp: number;
}

/**
 * Event fired when text delta arrives
 */
export interface ITextDeltaEvent {
  sessionId: string;
  messageId: string;
  text: string;
  timestamp: number;
}

/**
 * Event fired when text ends
 */
export interface ITextEndEvent {
  sessionId: string;
  messageId: string;
  timestamp: number;
}

/**
 * Event fired when tool execution starts
 */
export interface IToolStartEvent {
  sessionId: string;
  toolCallId: string;
  toolName: string;
  timestamp: number;
}

/**
 * Event fired when tool execution completes
 */
export interface IToolResultEvent {
  sessionId: string;
  toolCallId: string;
  toolName: string;
  result: unknown;
  timestamp: number;
}

/**
 * Event fired when error occurs
 */
export interface IErrorEvent {
  sessionId: string;
  error: Error;
  timestamp: number;
}

/**
 * Event fired when execution completes
 */
export interface ICompleteEvent {
  sessionId: string;
  result: IAgentRunResult;
  timestamp: number;
}

/**
 * Main orchestrator for agent execution
 */
export interface IAgentRunner {
  /**
   * Execute an agent request
   * @param request Agent execution request
   * @returns Execution result
   */
  run(request: IAgentRequest): Promise<IAgentRunResult>;

  /**
   * Abort an active agent execution
   * @param sessionId Session to abort
   * @returns True if aborted
   */
  abort(sessionId: string): Promise<boolean>;

  /**
   * Check if an agent execution is active
   * @param sessionId Session to check
   * @returns True if active
   */
  isActive(sessionId: string): boolean;
}
