/**
 * Core type definitions for agent execution
 */

/**
 * Agent execution metadata containing provider, model, and usage information
 */
export interface IAgentExecutionMeta {
    sessionId: string;
    provider: string;
    model: string;
    usage?: IAgentUsage;
}

/**
 * Token usage information for an agent execution
 */
export interface IAgentUsage {
    /** Input tokens consumed */
    input?: number;
    /** Output tokens generated */
    output?: number;
    /** Cache read tokens (if supported by provider) */
    cacheRead?: number;
    /** Cache write tokens (if supported by provider) */
    cacheWrite?: number;
    /** Total tokens used (input + output) */
    total?: number;
}

/**
 * Metadata about an agent execution run
 */
export interface IAgentRunMeta {
    /** Execution duration in milliseconds */
    durationMs: number;
    /** Agent metadata (provider, model, usage) */
    agentMeta?: IAgentExecutionMeta;
    /** Whether the run was aborted */
    aborted?: boolean;
    /** Error information if execution failed */
    error?: IAgentErrorInfo;
    /** Stop reason for the agent run */
    stopReason?: string;
    /** Pending tool calls when stopReason is "tool_calls" */
    pendingToolCalls?: IAgentToolCall[];
}

/**
 * Structured error information
 */
export interface IAgentErrorInfo {
    kind:
        | 'context_overflow'
        | 'compaction_failure'
        | 'role_ordering'
        | 'image_size'
        | 'auth'
        | 'billing'
        | 'rate_limit'
        | 'timeout'
        | 'unknown';
    message: string;
    details?: unknown;
}

/**
 * Represents a pending tool call from the agent
 */
export interface IAgentToolCall {
    id: string;
    name: string;
    arguments: string;
}

/**
 * Result of an agent execution
 */
export interface IAgentRunResult {
    /** Response payloads to send back to user */
    payloads?: IAgentPayload[];
    /** Execution metadata */
    meta: IAgentRunMeta;
    /** Whether agent successfully sent via messaging tools */
    didSendViaMessagingTool?: boolean;
    /** Texts sent via messaging tools */
    messagingToolSentTexts?: string[];
}

/**
 * A single response payload from agent execution
 */
export interface IAgentPayload {
    /** Text content */
    text?: string;
    /** Single media URL */
    mediaUrl?: string;
    /** Multiple media URLs */
    mediaUrls?: string[];
    /** Reply-to message ID */
    replyToId?: string;
    /** Whether this payload represents an error */
    isError?: boolean;
}

/**
 * Result of session compaction operation
 */
export interface IAgentCompactResult {
    ok: boolean;
    compacted: boolean;
    reason?: string;
    result?: {
        summary: string;
        firstKeptEntryId: string;
        tokensBefore: number;
        tokensAfter?: number;
        details?: unknown;
    };
}

/**
 * Agent execution request parameters
 */
export interface IAgentRequest {
    /** Unique session identifier */
    sessionId: string;
    /** Session key for routing/lane assignment */
    sessionKey?: string;
    /** User prompt/message */
    prompt: string;
    /** AI provider (e.g., 'anthropic', 'openai', 'google') */
    provider: string;
    /** Model identifier */
    model: string;
    /** Working directory for agent operations */
    workspaceDir?: string;
    /** Authentication profile ID to use */
    authProfileId?: string;
    /** Maximum tokens for response */
    maxTokens?: number;
    /** Temperature for sampling */
    temperature?: number;
    /** Additional request metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Configuration options for agent runner
 */
export interface IAgentRunnerConfig {
    /** Maximum retry attempts on failure */
    maxRetries?: number;
    /** Enable automatic context compaction on overflow */
    autoCompact?: boolean;
    /** Default provider if not specified in request */
    defaultProvider?: string;
    /** Default model if not specified in request */
    defaultModel?: string;
    /** Context window warning threshold in tokens */
    contextWarningThreshold?: number;
    /** Minimum context window size in tokens */
    contextMinimumTokens?: number;
}
