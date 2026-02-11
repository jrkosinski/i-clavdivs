import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseProvider, ProviderRegistry } from '../../../src/core/provider.js';
import { BaseModel } from '../../../src/core/model.js';
import type {
    ProviderConfig,
    ModelDefinition,
    CompletionRequest,
    CompletionResponse,
    CompletionChunk,
    AuthCredential,
} from '../../../src/core/types.js';

// Test model implementation
class TestModel extends BaseModel {
    public async complete(request: CompletionRequest): Promise<CompletionResponse> {
        return {
            content: 'test',
            finishReason: 'stop',
            usage: { inputTokens: 10, outputTokens: 5 },
        };
    }

    public async *stream(
        request: CompletionRequest
    ): AsyncGenerator<CompletionChunk, void, undefined> {
        yield { delta: 'test', done: true, finishReason: 'stop' };
    }
}

// Test provider implementation
class TestProvider extends BaseProvider {
    public async test(): Promise<boolean> {
        return true;
    }

    protected _initializeModels(): void {
        for (const modelDef of this._config.models) {
            const model = new TestModel(modelDef);
            this._models.set(modelDef.id, model);
        }
    }

    // Expose protected methods for testing
    public testBuildAuthHeader(): string {
        return this._buildAuthHeader();
    }

    public testBuildHeaders(): Record<string, string> {
        return this._buildHeaders();
    }
}

describe('BaseProvider', () => {
    let provider: TestProvider;
    let config: ProviderConfig;
    let modelDefinitions: ModelDefinition[];

    beforeEach(() => {
        modelDefinitions = [
            {
                id: 'model-1',
                name: 'Model 1',
                provider: 'test',
                api: 'openai-chat',
                reasoning: false,
                input: ['text'],
                output: ['text'],
                cost: { input: 2.5, output: 10.0 },
                contextWindow: 128_000,
                maxTokens: 4_096,
            },
            {
                id: 'model-2',
                name: 'Model 2',
                provider: 'test',
                api: 'openai-chat',
                reasoning: true,
                input: ['text', 'image'],
                output: ['text'],
                cost: { input: 5.0, output: 20.0 },
                contextWindow: 200_000,
                maxTokens: 8_192,
            },
        ];

        config = {
            id: 'test-provider',
            name: 'Test Provider',
            baseUrl: 'https://api.test.com/v1',
            auth: {
                type: 'api-key',
                key: 'test-key-12345',
            },
            models: modelDefinitions,
        };

        provider = new TestProvider(config);
    });

    describe('constructor and initialization', () => {
        it('should initialize with config', () => {
            expect(provider.getConfig()).toEqual(config);
        });

        it('should initialize models from config', () => {
            const models = provider.getModels();
            expect(models).toHaveLength(2);
        });
    });

    describe('getConfig', () => {
        it('should return provider config', () => {
            const returnedConfig = provider.getConfig();
            expect(returnedConfig).toEqual(config);
        });

        it('should return a deep copy, not a reference', () => {
            const returnedConfig = provider.getConfig();
            returnedConfig.name = 'Modified';
            returnedConfig.auth = {
                type: 'api-key',
                key: 'modified-key',
            };

            const config2 = provider.getConfig();
            expect(config2.name).toBe('Test Provider');
            expect(config2.auth.type).toBe('api-key');
            if (config2.auth.type === 'api-key') {
                expect(config2.auth.key).toBe('test-key-12345');
            }
        });
    });

    describe('getModel', () => {
        it('should return model by id', () => {
            const model = provider.getModel('model-1');
            expect(model).toBeDefined();
            expect(model?.getDefinition().id).toBe('model-1');
        });

        it('should return undefined for non-existent model', () => {
            const model = provider.getModel('non-existent');
            expect(model).toBeUndefined();
        });
    });

    describe('getModels', () => {
        it('should return all models', () => {
            const models = provider.getModels();
            expect(models).toHaveLength(2);
            expect(models[0]).toBeInstanceOf(TestModel);
        });

        it('should return empty array when no models', () => {
            const emptyConfig = { ...config, models: [] };
            const emptyProvider = new TestProvider(emptyConfig);
            expect(emptyProvider.getModels()).toHaveLength(0);
        });
    });

    describe('listModels', () => {
        it('should return model definitions', () => {
            const definitions = provider.listModels();
            expect(definitions).toHaveLength(2);
            expect(definitions[0]?.id).toBe('model-1');
            expect(definitions[1]?.id).toBe('model-2');
        });

        it('should return definitions not model instances', () => {
            const definitions = provider.listModels();
            expect(definitions[0]).not.toBeInstanceOf(BaseModel);
        });
    });

    describe('updateAuth', () => {
        it('should update api-key auth', () => {
            const newAuth: AuthCredential = {
                type: 'api-key',
                key: 'new-key-67890',
            };

            provider.updateAuth(newAuth);

            const config = provider.getConfig();
            expect(config.auth).toEqual(newAuth);
        });

        it('should update to bearer token auth', () => {
            const newAuth: AuthCredential = {
                type: 'bearer-token',
                token: 'bearer-token-123',
            };

            provider.updateAuth(newAuth);

            const config = provider.getConfig();
            expect(config.auth).toEqual(newAuth);
        });

        it('should update to oauth auth', () => {
            const newAuth: AuthCredential = {
                type: 'oauth',
                accessToken: 'access-123',
                refreshToken: 'refresh-456',
            };

            provider.updateAuth(newAuth);

            const config = provider.getConfig();
            expect(config.auth).toEqual(newAuth);
        });
    });

    describe('_buildAuthHeader', () => {
        it('should build header for api-key auth', () => {
            const header = provider.testBuildAuthHeader();
            expect(header).toBe('Bearer test-key-12345');
        });

        it('should build header for bearer-token auth', () => {
            provider.updateAuth({
                type: 'bearer-token',
                token: 'my-bearer-token',
            });

            const header = provider.testBuildAuthHeader();
            expect(header).toBe('Bearer my-bearer-token');
        });

        it('should build header for oauth auth', () => {
            provider.updateAuth({
                type: 'oauth',
                accessToken: 'oauth-access-token',
            });

            const header = provider.testBuildAuthHeader();
            expect(header).toBe('Bearer oauth-access-token');
        });

        it('should throw for unsupported auth type', () => {
            provider.updateAuth({ type: 'unsupported' } as any);

            expect(() => provider.testBuildAuthHeader()).toThrow('unsupported auth type');
        });
    });

    describe('_buildHeaders', () => {
        it('should include Content-Type header', () => {
            const headers = provider.testBuildHeaders();
            expect(headers['Content-Type']).toBe('application/json');
        });

        it('should include Authorization header', () => {
            const headers = provider.testBuildHeaders();
            expect(headers['Authorization']).toBe('Bearer test-key-12345');
        });

        it('should merge custom headers from config', () => {
            const configWithHeaders = {
                ...config,
                headers: {
                    'X-Custom-Header': 'custom-value',
                    'X-Another': 'another-value',
                },
            };

            const providerWithHeaders = new TestProvider(configWithHeaders);
            const headers = providerWithHeaders.testBuildHeaders();

            expect(headers['X-Custom-Header']).toBe('custom-value');
            expect(headers['X-Another']).toBe('another-value');
            expect(headers['Content-Type']).toBe('application/json');
        });

        it('should allow config headers to override defaults', () => {
            const configWithHeaders = {
                ...config,
                headers: {
                    'Content-Type': 'application/xml',
                },
            };

            const providerWithHeaders = new TestProvider(configWithHeaders);
            const headers = providerWithHeaders.testBuildHeaders();

            expect(headers['Content-Type']).toBe('application/xml');
        });
    });
});

describe('ProviderRegistry', () => {
    let registry: ProviderRegistry;
    let provider1: TestProvider;
    let provider2: TestProvider;

    beforeEach(() => {
        registry = new ProviderRegistry();

        const config1: ProviderConfig = {
            id: 'provider-1',
            name: 'Provider 1',
            baseUrl: 'https://api.provider1.com',
            auth: { type: 'api-key', key: 'key1' },
            models: [
                {
                    id: 'model-1a',
                    name: 'Model 1A',
                    provider: 'provider-1',
                    api: 'openai-chat',
                    reasoning: false,
                    input: ['text'],
                    output: ['text'],
                    cost: { input: 1.0, output: 2.0 },
                    contextWindow: 100_000,
                    maxTokens: 2_048,
                },
            ],
        };

        const config2: ProviderConfig = {
            id: 'provider-2',
            name: 'Provider 2',
            baseUrl: 'https://api.provider2.com',
            auth: { type: 'api-key', key: 'key2' },
            models: [
                {
                    id: 'model-2a',
                    name: 'Model 2A',
                    provider: 'provider-2',
                    api: 'anthropic-messages',
                    reasoning: true,
                    input: ['text', 'image'],
                    output: ['text'],
                    cost: { input: 3.0, output: 6.0 },
                    contextWindow: 150_000,
                    maxTokens: 4_096,
                },
            ],
        };

        provider1 = new TestProvider(config1);
        provider2 = new TestProvider(config2);
    });

    describe('register', () => {
        it('should register a provider', () => {
            registry.register(provider1);
            const retrieved = registry.getProvider('provider-1');
            expect(retrieved).toBe(provider1);
        });

        it('should register multiple providers', () => {
            registry.register(provider1);
            registry.register(provider2);

            expect(registry.getProvider('provider-1')).toBe(provider1);
            expect(registry.getProvider('provider-2')).toBe(provider2);
        });

        it('should overwrite provider with same id', () => {
            registry.register(provider1);

            const newProvider1 = new TestProvider({
                ...provider1.getConfig(),
                name: 'Updated Provider 1',
            });

            registry.register(newProvider1);

            const retrieved = registry.getProvider('provider-1');
            expect(retrieved?.getConfig().name).toBe('Updated Provider 1');
        });
    });

    describe('unregister', () => {
        it('should unregister a provider', () => {
            registry.register(provider1);
            registry.unregister('provider-1');

            expect(registry.getProvider('provider-1')).toBeUndefined();
        });

        it('should handle unregistering non-existent provider', () => {
            expect(() => registry.unregister('non-existent')).not.toThrow();
        });
    });

    describe('getProvider', () => {
        it('should return provider by id', () => {
            registry.register(provider1);
            const retrieved = registry.getProvider('provider-1');
            expect(retrieved).toBe(provider1);
        });

        it('should return undefined for non-existent provider', () => {
            expect(registry.getProvider('non-existent')).toBeUndefined();
        });
    });

    describe('getProviders', () => {
        it('should return all registered providers', () => {
            registry.register(provider1);
            registry.register(provider2);

            const providers = registry.getProviders();
            expect(providers).toHaveLength(2);
            expect(providers).toContain(provider1);
            expect(providers).toContain(provider2);
        });

        it('should return empty array when no providers registered', () => {
            expect(registry.getProviders()).toHaveLength(0);
        });
    });

    describe('getModel', () => {
        it('should return model by provider and model id', () => {
            registry.register(provider1);

            const model = registry.getModel('provider-1', 'model-1a');
            expect(model).toBeDefined();
            expect(model?.getDefinition().id).toBe('model-1a');
        });

        it('should return undefined for non-existent provider', () => {
            const model = registry.getModel('non-existent', 'model-1a');
            expect(model).toBeUndefined();
        });

        it('should return undefined for non-existent model', () => {
            registry.register(provider1);

            const model = registry.getModel('provider-1', 'non-existent');
            expect(model).toBeUndefined();
        });
    });

    describe('listAllModels', () => {
        it('should list all models from all providers', () => {
            registry.register(provider1);
            registry.register(provider2);

            const models = registry.listAllModels();
            expect(models).toHaveLength(2);
            expect(models.map((m) => m.id)).toContain('model-1a');
            expect(models.map((m) => m.id)).toContain('model-2a');
        });

        it('should return empty array when no providers registered', () => {
            expect(registry.listAllModels()).toHaveLength(0);
        });

        it('should handle providers with no models', () => {
            const emptyConfig: ProviderConfig = {
                id: 'empty-provider',
                name: 'Empty',
                baseUrl: 'https://api.empty.com',
                auth: { type: 'api-key', key: 'key' },
                models: [],
            };

            const emptyProvider = new TestProvider(emptyConfig);
            registry.register(emptyProvider);

            expect(registry.listAllModels()).toHaveLength(0);
        });
    });
});
