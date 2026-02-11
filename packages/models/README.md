# @i-clavdivs/models

LLM provider abstraction layer with support for multiple AI providers.

## Features

- **Provider Abstraction**: Clean interface for working with different LLM providers
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Streaming Support**: Built-in streaming for real-time responses
- **Multi-modal**: Support for text and image inputs
- **Tool Calling**: Function/tool calling capabilities
- **Provider Registry**: Manage multiple providers and models in one place

## Supported Providers

- **OpenAI**: GPT-4o, GPT-4o Mini, o1, o1-mini, o3-mini
- **Anthropic**: Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus

## Installation

```bash
pnpm add @i-clavdivs/models
```

## Usage

### Basic Example

```typescript
import { OpenAIProvider, AnthropicProvider } from '@i-clavdivs/models';

//create a provider
const openai = new OpenAIProvider(process.env.OPENAI_API_KEY!);

//get a model
const model = openai.getModel('gpt-4o');

//make a completion request
const response = await model.complete({
    messages: [
        { role: 'user', content: 'Hello! How are you?' }
    ],
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 1000
});

console.log(response.content);
console.log('Tokens used:', response.usage);
```

### Streaming Example

```typescript
const model = openai.getModel('gpt-4o');

//stream responses
for await (const chunk of model.stream({
    messages: [
        { role: 'user', content: 'Write a short poem about coding' }
    ],
    model: 'gpt-4o'
})) {
    if (!chunk.done) {
        process.stdout.write(chunk.delta);
    } else {
        console.log('\n\nDone! Tokens:', chunk.usage);
    }
}
```

### Multi-Provider Registry

```typescript
import { ProviderRegistry, OpenAIProvider, AnthropicProvider } from '@i-clavdivs/models';

const registry = new ProviderRegistry();

//register providers
registry.register(new OpenAIProvider(process.env.OPENAI_API_KEY!));
registry.register(new AnthropicProvider(process.env.ANTHROPIC_API_KEY!));

//get a specific model
const gpt4 = registry.getModel('openai', 'gpt-4o');
const claude = registry.getModel('anthropic', 'claude-3-5-sonnet-20241022');

//list all available models
const allModels = registry.listAllModels();
console.log(allModels.map(m => `${m.provider}/${m.id}`));
```

### Image Support

```typescript
//openai with image
const response = await model.complete({
    messages: [
        {
            role: 'user',
            content: [
                { type: 'text', text: 'What is in this image?' },
                { type: 'image', source: 'https://example.com/image.jpg' }
            ]
        }
    ],
    model: 'gpt-4o'
});
```

### Tool Calling

```typescript
const response = await model.complete({
    messages: [
        { role: 'user', content: 'What is the weather in San Francisco?' }
    ],
    model: 'gpt-4o',
    tools: [
        {
            name: 'get_weather',
            description: 'Get the current weather for a location',
            parameters: {
                type: 'object',
                properties: {
                    location: {
                        type: 'string',
                        description: 'City name'
                    }
                },
                required: ['location']
            }
        }
    ],
    toolChoice: 'auto'
});

if (response.toolCalls) {
    for (const toolCall of response.toolCalls) {
        console.log('Tool:', toolCall.name);
        console.log('Arguments:', toolCall.arguments);
    }
}
```

## API Reference

### Providers

#### `OpenAIProvider`

```typescript
new OpenAIProvider(apiKey: string, baseUrl?: string)
```

#### `AnthropicProvider`

```typescript
new AnthropicProvider(apiKey: string, version?: string)
```

### Provider Methods

- `getModel(modelId: string): IModel | undefined`
- `getModels(): IModel[]`
- `listModels(): ModelDefinition[]`
- `test(): Promise<boolean>`

### Model Methods

- `complete(request: CompletionRequest): Promise<CompletionResponse>`
- `stream(request: CompletionRequest): AsyncGenerator<CompletionChunk>`
- `getDefinition(): ModelDefinition`

### Types

See [src/core/types.ts](src/core/types.ts) for complete type definitions.

Key exported types:
- `ModelDefinition` - Model capabilities and pricing
- `CompletionRequest` - Request parameters
- `CompletionResponse` - Response with content and usage
- `CompletionChunk` - Streaming chunk
- `Message` - Chat message
- `MessageContent` - Multi-modal content
- `ToolDefinition` - Function/tool definition
- `ToolCall` - Tool invocation
- `TokenUsage` - Token consumption stats
- `AuthCredential` - Authentication credentials

### Auth Utilities

```typescript
import { loadApiKeyFromEnv, maskApiKey, validateApiKey } from '@i-clavdivs/models';

//load from environment
const apiKey = loadApiKeyFromEnv('OPENAI_API_KEY');

//validate api key
if (validateApiKey(apiKey, 'sk-')) {
    console.log('Valid OpenAI API key');
}

//mask for logging
console.log('Using key:', maskApiKey(apiKey)); // sk-ab...xyz
```

Available auth utilities:
- `loadApiKeyFromEnv(varName: string): string | undefined`
- `createApiKeyAuth(key: string): AuthCredential`
- `createBearerTokenAuth(token: string): AuthCredential`
- `validateApiKey(key: string, prefix?: string): boolean`
- `maskApiKey(key: string): string`

## Development

```bash
#build
pnpm build

#watch mode
pnpm dev

#type check
pnpm typecheck

#clean
pnpm clean
```

## License

See root LICENSE file.
