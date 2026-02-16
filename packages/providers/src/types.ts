/**
 * Core provider type definitions.
 * Ported from moltbot for i-clavdivs milestone: agent listens on one channel, sends updates on another.
 */

/**
 * Model API types supported by providers
 */
export type IModelApi =
    | 'openai-completions'
    | 'openai-responses'
    | 'anthropic-messages'
    | 'google-generative-ai'
    | 'github-copilot'
    | 'bedrock-converse-stream';

/**
 * Model compatibility configuration
 */
export interface IModelCompatConfig {
    readonly supportsStore?: boolean;
    readonly supportsDeveloperRole?: boolean;
    readonly supportsReasoningEffort?: boolean;
    readonly maxTokensField?: 'max_completion_tokens' | 'max_tokens';
}

/**
 * Provider authentication modes
 */
export type IModelProviderAuthMode = 'api-key' | 'aws-sdk' | 'oauth' | 'token';

/**
 * Model cost structure (in micro-dollars per token)
 */
export interface IModelCost {
    readonly input: number;
    readonly output: number;
    readonly cacheRead: number;
    readonly cacheWrite: number;
}

/**
 * Model definition configuration
 */
export interface IModelDefinitionConfig {
    readonly id: string;
    readonly name: string;
    readonly api?: IModelApi;
    readonly reasoning: boolean;
    readonly input: ReadonlyArray<'text' | 'image'>;
    readonly cost: IModelCost;
    readonly contextWindow: number;
    readonly maxTokens: number;
    readonly headers?: Record<string, string>;
    readonly compat?: IModelCompatConfig;
}

/**
 * Provider configuration
 */
export interface IModelProviderConfig {
    readonly baseUrl: string;
    readonly apiKey?: string;
    readonly auth?: IModelProviderAuthMode;
    readonly api?: IModelApi;
    readonly headers?: Record<string, string>;
    readonly authHeader?: boolean;
    readonly models: ReadonlyArray<IModelDefinitionConfig>;
}

/**
 * Bedrock discovery configuration
 */
export interface IBedrockDiscoveryConfig {
    readonly enabled?: boolean;
    readonly region?: string;
    readonly providerFilter?: ReadonlyArray<string>;
    readonly refreshInterval?: number;
    readonly defaultContextWindow?: number;
    readonly defaultMaxTokens?: number;
}

/**
 * Models configuration
 */
export interface IModelsConfig {
    readonly mode?: 'merge' | 'replace';
    readonly providers?: Record<string, IModelProviderConfig>;
    readonly bedrockDiscovery?: IBedrockDiscoveryConfig;
}
