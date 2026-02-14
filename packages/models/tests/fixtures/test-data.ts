import type { CompletionRequest, ModelDefinition, ProviderConfig } from '../../src/core/types.js';

// Test model definitions
export const testModelDefinitions: Record<string, ModelDefinition> = {
    'gpt-4o': {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        api: 'openai-chat',
        reasoning: false,
        input: ['text', 'image'],
        output: ['text'],
        cost: {
            input: 2.5,
            output: 10.0,
            cacheRead: 1.25,
            cacheWrite: 3.75,
        },
        contextWindow: 128_000,
        maxTokens: 16_384,
    },
    'claude-3-5-sonnet': {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        api: 'anthropic-messages',
        reasoning: false,
        input: ['text', 'image'],
        output: ['text'],
        cost: {
            input: 3.0,
            output: 15.0,
            cacheRead: 0.3,
            cacheWrite: 3.75,
        },
        contextWindow: 200_000,
        maxTokens: 8_192,
    },
};

// Test provider configs
export const testProviderConfigs: Record<string, ProviderConfig> = {
    openai: {
        id: 'openai',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        auth: {
            type: 'api-key',
            key: 'sk-test-key-12345',
        },
        models: [testModelDefinitions['gpt-4o']!],
    },
    anthropic: {
        id: 'anthropic',
        name: 'Anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        auth: {
            type: 'api-key',
            key: 'sk-ant-test-key-12345',
        },
        models: [testModelDefinitions['claude-3-5-sonnet']!],
    },
};

// Test completion requests
export const testCompletionRequests: Record<string, CompletionRequest> = {
    simple: {
        messages: [
            {
                role: 'user',
                content: 'Hello, how are you?',
            },
        ],
        model: 'gpt-4o',
    },
    withSystem: {
        messages: [
            {
                role: 'system',
                content: 'You are a helpful assistant.',
            },
            {
                role: 'user',
                content: 'What is the capital of France?',
            },
        ],
        model: 'gpt-4o',
    },
    withImage: {
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: 'What is in this image?',
                    },
                    {
                        type: 'image',
                        source: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
                        mimeType: 'image/png',
                    },
                ],
            },
        ],
        model: 'gpt-4o',
    },
    withTools: {
        messages: [
            {
                role: 'user',
                content: 'What is the weather in San Francisco?',
            },
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
                            description: 'The city and state, e.g. San Francisco, CA',
                        },
                        unit: {
                            type: 'string',
                            enum: ['celsius', 'fahrenheit'],
                            description: 'The unit of temperature',
                        },
                    },
                    required: ['location'],
                },
            },
        ],
        toolChoice: 'auto',
    },
    withTemperature: {
        messages: [
            {
                role: 'user',
                content: 'Write a creative story.',
            },
        ],
        model: 'gpt-4o',
        temperature: 0.9,
        maxTokens: 500,
    },
    withStopSequences: {
        messages: [
            {
                role: 'user',
                content: 'Count from 1 to 10.',
            },
        ],
        model: 'gpt-4o',
        stopSequences: ['5', '10'],
    },
};

// Helper to create variations of test data
export function createTestRequest(overrides: Partial<CompletionRequest>): CompletionRequest {
    return {
        ...testCompletionRequests.simple,
        ...overrides,
    };
}

export function createTestModelDefinition(overrides: Partial<ModelDefinition>): ModelDefinition {
    return {
        ...testModelDefinitions['gpt-4o']!,
        ...overrides,
    };
}

export function createTestProviderConfig(overrides: Partial<ProviderConfig>): ProviderConfig {
    return {
        ...testProviderConfigs.openai,
        ...overrides,
    };
}
