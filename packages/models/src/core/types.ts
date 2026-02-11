//core types for model abstraction

/**
 * Supported API types for different LLM providers
 */
export type ModelApi =
    | 'openai-chat'
    | 'anthropic-messages'
    | 'google-generative-ai'
    | 'github-copilot';

/**
 * Input modalities supported by a model
 */
export type ModelInputModality = 'text' | 'image' | 'audio';

/**
 * Output modalities supported by a model
 */
export type ModelOutputModality = 'text' | 'image' | 'audio';

/**
 * Cost structure for model usage
 */
export interface ModelCost {
    //cost per 1M input tokens (USD)
    input: number;
    //cost per 1M output tokens (USD)
    output: number;
    //cost per 1M cached read tokens (USD)
    cacheRead?: number;
    //cost per 1M cached write tokens (USD)
    cacheWrite?: number;
}

/**
 * Model capabilities and configuration
 */
export interface ModelDefinition {
    //unique model identifier
    id: string;
    //human-readable model name
    name: string;
    //provider this model belongs to
    provider: string;
    //api type for this model
    api: ModelApi;
    //supports reasoning/chain-of-thought
    reasoning: boolean;
    //supported input modalities
    input: ModelInputModality[];
    //supported output modalities
    output: ModelOutputModality[];
    //token costs
    cost: ModelCost;
    //maximum context window in tokens
    contextWindow: number;
    //maximum output tokens per request
    maxTokens: number;
    //additional metadata
    metadata?: Record<string, unknown>;
}

/**
 * Message role in a conversation
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * Content part of a message (text or image)
 */
export type MessageContent =
    | { type: 'text'; text: string }
    | { type: 'image'; source: string; mimeType?: string };

/**
 * A message in a conversation
 */
export interface Message {
    role: MessageRole;
    content: string | MessageContent[];
    name?: string;
    toolCallId?: string;
}

/**
 * Tool/function definition
 */
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}

/**
 * Tool call made by the model
 */
export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
}

/**
 * Request parameters for model completion
 */
export interface CompletionRequest {
    //conversation messages
    messages: Message[];
    //model identifier
    model: string;
    //sampling temperature (0-2)
    temperature?: number;
    //maximum tokens to generate
    maxTokens?: number;
    //nucleus sampling parameter
    topP?: number;
    //available tools/functions
    tools?: ToolDefinition[];
    //tool choice strategy
    toolChoice?: 'auto' | 'required' | { type: 'tool'; name: string };
    //stop sequences
    stopSequences?: string[];
    //additional provider-specific options
    options?: Record<string, unknown>;
}

/**
 * Token usage statistics
 */
export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
}

/**
 * Response from model completion
 */
export interface CompletionResponse {
    //generated content
    content: string | MessageContent[];
    //finish reason
    finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';
    //tool calls if any
    toolCalls?: ToolCall[];
    //token usage
    usage: TokenUsage;
    //raw provider response
    raw?: unknown;
}

/**
 * Streaming chunk from model
 */
export interface CompletionChunk {
    //content delta
    delta: string | MessageContent;
    //true if this is the final chunk
    done: boolean;
    //finish reason if done
    finishReason?: CompletionResponse['finishReason'];
    //accumulated usage (sent with final chunk)
    usage?: TokenUsage;
}

/**
 * Authentication methods
 */
export type AuthMethod = 'api-key' | 'bearer-token' | 'oauth';

/**
 * API key authentication
 */
export interface ApiKeyAuth {
    type: 'api-key';
    key: string;
}

/**
 * Bearer token authentication
 */
export interface BearerTokenAuth {
    type: 'bearer-token';
    token: string;
}

/**
 * OAuth authentication
 */
export interface OAuthAuth {
    type: 'oauth';
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
}

/**
 * Authentication credential
 */
export type AuthCredential = ApiKeyAuth | BearerTokenAuth | OAuthAuth;

/**
 * Provider configuration
 */
export interface ProviderConfig {
    //provider identifier
    id: string;
    //provider name
    name: string;
    //base url for api
    baseUrl: string;
    //authentication credential
    auth: AuthCredential;
    //default headers
    headers?: Record<string, string>;
    //available models
    models: ModelDefinition[];
}
