//public exports for @i-clavdivs/models

//core types
export type {
    ModelApi,
    ModelInputModality,
    ModelOutputModality,
    ModelCost,
    ModelDefinition,
    MessageRole,
    MessageContent,
    Message,
    ToolDefinition,
    ToolCall,
    CompletionRequest,
    TokenUsage,
    CompletionResponse,
    CompletionChunk,
    AuthMethod,
    ApiKeyAuth,
    BearerTokenAuth,
    OAuthAuth,
    AuthCredential,
    ProviderConfig,
} from './core/types.js';

//core interfaces
export { type IModel, BaseModel } from './core/model.js';
export { type IProvider, BaseProvider, ProviderRegistry } from './core/provider.js';

//providers
export { OpenAIProvider } from './providers/openai.js';
export { AnthropicProvider } from './providers/anthropic.js';

//auth utilities
export {
    loadApiKeyFromEnv,
    createApiKeyAuth,
    createBearerTokenAuth,
    validateApiKey,
    maskApiKey,
} from './auth/api-key.js';
