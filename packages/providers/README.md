# @i-clavdivs/providers

AI model provider integrations and authentication configuration for i-clavdivs.

## Overview

This package provides type definitions and utilities for integrating AI model providers. It defines the structure for configuring different LLM providers with their authentication methods, models, and capabilities.

**Note**: This package provides configuration types and utilities. The actual provider implementations (OpenAI, Anthropic, etc.) are in [@i-clavdivs/models](../models/README.md).

## Features

- **Provider configuration types**: Structured definitions for AI providers
- **Model definitions**: Cost, context window, and capability specifications
- **Authentication modes**: API key, OAuth, AWS SDK, token-based auth
- **Model compatibility flags**: Support for different model features
- **Multi-API support**: OpenAI, Anthropic, Google, Bedrock, and custom APIs

## Installation

```bash
pnpm add @i-clavdivs/providers
```

## Supported Model APIs

The package defines interfaces for multiple AI API formats:

- `openai-completions` - OpenAI Chat Completions API
- `openai-responses` - OpenAI Responses API (structured outputs)
- `anthropic-messages` - Anthropic Messages API
- `google-generative-ai` - Google Generative AI API
- `github-copilot` - GitHub Copilot API
- `bedrock-converse-stream` - AWS Bedrock Converse Stream API

## Types

### Provider Configuration

```typescript
interface IModelProviderConfig {
    readonly baseUrl: string;
    readonly apiKey?: string;
    readonly auth?: 'api-key' | 'aws-sdk' | 'oauth' | 'token';
    readonly api?: IModelApi;
    readonly headers?: Record<string, string>;
    readonly authHeader?: boolean;
    readonly models: ReadonlyArray<IModelDefinitionConfig>;
}
```

### Model Definition

```typescript
interface IModelDefinitionConfig {
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
```

### Model Cost

```typescript
interface IModelCost {
    readonly input: number; // Micro-dollars per token
    readonly output: number;
    readonly cacheRead: number;
    readonly cacheWrite: number;
}
```

### Model Compatibility

```typescript
interface IModelCompatConfig {
    readonly supportsStore?: boolean;
    readonly supportsDeveloperRole?: boolean;
    readonly supportsReasoningEffort?: boolean;
    readonly maxTokensField?: 'max_completion_tokens' | 'max_tokens';
}
```

## Usage

### Configuring Providers

```typescript
import type { IModelsConfig } from '@i-clavdivs/providers';

const config: IModelsConfig = {
    mode: 'merge', // or 'replace'
    providers: {
        openai: {
            baseUrl: 'https://api.openai.com/v1',
            apiKey: process.env.OPENAI_API_KEY,
            auth: 'api-key',
            api: 'openai-completions',
            models: [
                {
                    id: 'gpt-4o',
                    name: 'GPT-4o',
                    reasoning: false,
                    input: ['text', 'image'],
                    cost: {
                        input: 2500, // $0.0025/token
                        output: 10000, // $0.01/token
                        cacheRead: 1250,
                        cacheWrite: 3125,
                    },
                    contextWindow: 128000,
                    maxTokens: 16384,
                },
            ],
        },
        anthropic: {
            baseUrl: 'https://api.anthropic.com/v1',
            apiKey: process.env.ANTHROPIC_API_KEY,
            auth: 'api-key',
            api: 'anthropic-messages',
            headers: {
                'anthropic-version': '2023-06-01',
            },
            models: [
                {
                    id: 'claude-sonnet-4-5-20250929',
                    name: 'Claude 3.5 Sonnet',
                    reasoning: false,
                    input: ['text', 'image'],
                    cost: {
                        input: 3000,
                        output: 15000,
                        cacheRead: 300,
                        cacheWrite: 3750,
                    },
                    contextWindow: 200000,
                    maxTokens: 8192,
                },
            ],
        },
    },
};
```

### Bedrock Discovery

For AWS Bedrock, you can enable automatic model discovery:

```typescript
const config: IModelsConfig = {
    bedrockDiscovery: {
        enabled: true,
        region: 'us-east-1',
        providerFilter: ['anthropic', 'meta'],
        refreshInterval: 3600000, // 1 hour
        defaultContextWindow: 200000,
        defaultMaxTokens: 4096,
    },
};
```

## Authentication Modes

### API Key

Standard API key authentication:

```typescript
{
    auth: 'api-key',
    apiKey: process.env.API_KEY,
    authHeader: true
}
```

### OAuth

OAuth token-based authentication:

```typescript
{
    auth: 'oauth',
    apiKey: 'oauth-token'
}
```

### AWS SDK

AWS SDK authentication (for Bedrock):

```typescript
{
    auth: 'aws-sdk',
    baseUrl: 'bedrock-runtime.us-east-1.amazonaws.com'
}
```

### Token

Simple token authentication:

```typescript
{
    auth: 'token',
    apiKey: 'bearer-token'
}
```

## Model Compatibility Flags

Different models support different features:

```typescript
{
    compat: {
        supportsStore: true,              // Message store/history
        supportsDeveloperRole: true,      // Developer role messages
        supportsReasoningEffort: true,    // Reasoning effort parameter
        maxTokensField: 'max_completion_tokens' // or 'max_tokens'
    }
}
```

## Cost Calculations

Costs are specified in micro-dollars (millionths of a dollar) per token:

```typescript
// Example: $0.0025 per token = 2500 micro-dollars
{
    cost: {
        input: 2500,      // $0.0025/token
        output: 10000,    // $0.01/token
        cacheRead: 1250,  // $0.00125/token
        cacheWrite: 3125  // $0.003125/token
    }
}
```

To calculate actual cost:

```typescript
const inputCost = (inputTokens * costConfig.input) / 1_000_000;
const outputCost = (outputTokens * costConfig.output) / 1_000_000;
const totalCost = inputCost + outputCost;
```

## Configuration Modes

### Merge Mode

Adds custom providers to built-in providers:

```typescript
{
    mode: 'merge',
    providers: {
        custom: { /* ... */ }
    }
}
```

### Replace Mode

Completely replaces built-in provider list:

```typescript
{
    mode: 'replace',
    providers: {
        openai: { /* ... */ },
        anthropic: { /* ... */ }
    }
}
```

## Development

```bash
# Build the package
pnpm build

# Run tests
pnpm test

# Watch mode for development
pnpm dev

# Type checking
pnpm typecheck
```

## Related Packages

- [@i-clavdivs/models](../models/README.md) - Provider implementations
- [@i-clavdivs/agents](../agents/README.md) - Agent orchestration using providers

## License

See root project license.
