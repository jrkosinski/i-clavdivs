import { describe, it, expect } from 'vitest';
import type {
    IModelApi,
    IModelCompatConfig,
    IModelProviderAuthMode,
    IModelCost,
    IModelDefinitionConfig,
    IModelProviderConfig,
    IBedrockDiscoveryConfig,
    IModelsConfig,
} from '../../src/types.js';

describe('Provider Types', () => {
    describe('IModelApi', () => {
        it('should accept valid API types', () => {
            const validApis: IModelApi[] = [
                'openai-completions',
                'openai-responses',
                'anthropic-messages',
                'google-generative-ai',
                'github-copilot',
                'bedrock-converse-stream',
            ];

            expect(validApis).toHaveLength(6);
        });
    });

    describe('IModelCompatConfig', () => {
        it('should allow optional compatibility flags', () => {
            const config: IModelCompatConfig = {};
            expect(config).toBeDefined();
        });

        it('should accept all compatibility properties', () => {
            const config: IModelCompatConfig = {
                supportsStore: true,
                supportsDeveloperRole: false,
                supportsReasoningEffort: true,
                maxTokensField: 'max_completion_tokens',
            };

            expect(config.supportsStore).toBe(true);
            expect(config.supportsDeveloperRole).toBe(false);
            expect(config.supportsReasoningEffort).toBe(true);
            expect(config.maxTokensField).toBe('max_completion_tokens');
        });
    });

    describe('IModelProviderAuthMode', () => {
        it('should accept valid auth modes', () => {
            const authModes: IModelProviderAuthMode[] = ['api-key', 'aws-sdk', 'oauth', 'token'];

            expect(authModes).toHaveLength(4);
        });
    });

    describe('IModelCost', () => {
        it('should define cost structure', () => {
            const cost: IModelCost = {
                input: 15,
                output: 60,
                cacheRead: 2,
                cacheWrite: 10,
            };

            expect(cost.input).toBe(15);
            expect(cost.output).toBe(60);
            expect(cost.cacheRead).toBe(2);
            expect(cost.cacheWrite).toBe(10);
        });

        it('should accept zero costs for free models', () => {
            const freeCost: IModelCost = {
                input: 0,
                output: 0,
                cacheRead: 0,
                cacheWrite: 0,
            };

            expect(freeCost.input).toBe(0);
        });
    });

    describe('IModelDefinitionConfig', () => {
        it('should define a complete model configuration', () => {
            const modelDef: IModelDefinitionConfig = {
                id: 'gpt-4',
                name: 'GPT-4',
                api: 'openai-completions',
                reasoning: false,
                input: ['text', 'image'],
                cost: {
                    input: 30,
                    output: 60,
                    cacheRead: 3,
                    cacheWrite: 15,
                },
                contextWindow: 128000,
                maxTokens: 4096,
                headers: {
                    'X-Custom-Header': 'value',
                },
                compat: {
                    supportsStore: true,
                },
            };

            expect(modelDef.id).toBe('gpt-4');
            expect(modelDef.reasoning).toBe(false);
            expect(modelDef.input).toContain('text');
            expect(modelDef.input).toContain('image');
        });

        it('should allow minimal model definition', () => {
            const minimalModel: IModelDefinitionConfig = {
                id: 'test-model',
                name: 'Test Model',
                reasoning: false,
                input: ['text'],
                cost: {
                    input: 0,
                    output: 0,
                    cacheRead: 0,
                    cacheWrite: 0,
                },
                contextWindow: 8192,
                maxTokens: 2048,
            };

            expect(minimalModel.id).toBe('test-model');
        });
    });

    describe('IModelProviderConfig', () => {
        it('should define a complete provider configuration', () => {
            const providerConfig: IModelProviderConfig = {
                baseUrl: 'https://api.openai.com/v1',
                apiKey: 'sk-test123',
                auth: 'api-key',
                api: 'openai-completions',
                headers: {
                    'User-Agent': 'i-clavdivs',
                },
                authHeader: true,
                models: [
                    {
                        id: 'gpt-4',
                        name: 'GPT-4',
                        reasoning: false,
                        input: ['text'],
                        cost: {
                            input: 30,
                            output: 60,
                            cacheRead: 3,
                            cacheWrite: 15,
                        },
                        contextWindow: 128000,
                        maxTokens: 4096,
                    },
                ],
            };

            expect(providerConfig.baseUrl).toBe('https://api.openai.com/v1');
            expect(providerConfig.models).toHaveLength(1);
        });

        it('should allow minimal provider configuration', () => {
            const minimalProvider: IModelProviderConfig = {
                baseUrl: 'https://api.example.com',
                models: [],
            };

            expect(minimalProvider.baseUrl).toBe('https://api.example.com');
            expect(minimalProvider.models).toHaveLength(0);
        });
    });

    describe('IBedrockDiscoveryConfig', () => {
        it('should define bedrock discovery options', () => {
            const bedrockConfig: IBedrockDiscoveryConfig = {
                enabled: true,
                region: 'us-east-1',
                providerFilter: ['anthropic', 'amazon'],
                refreshInterval: 3600,
                defaultContextWindow: 200000,
                defaultMaxTokens: 4096,
            };

            expect(bedrockConfig.enabled).toBe(true);
            expect(bedrockConfig.region).toBe('us-east-1');
            expect(bedrockConfig.providerFilter).toContain('anthropic');
        });

        it('should allow empty bedrock configuration', () => {
            const emptyConfig: IBedrockDiscoveryConfig = {};

            expect(emptyConfig).toBeDefined();
        });
    });

    describe('IModelsConfig', () => {
        it('should define complete models configuration', () => {
            const modelsConfig: IModelsConfig = {
                mode: 'merge',
                providers: {
                    openai: {
                        baseUrl: 'https://api.openai.com/v1',
                        apiKey: 'sk-test',
                        models: [],
                    },
                    anthropic: {
                        baseUrl: 'https://api.anthropic.com',
                        apiKey: 'sk-ant-test',
                        models: [],
                    },
                },
                bedrockDiscovery: {
                    enabled: true,
                    region: 'us-west-2',
                },
            };

            expect(modelsConfig.mode).toBe('merge');
            expect(Object.keys(modelsConfig.providers || {})).toHaveLength(2);
        });

        it('should allow replace mode', () => {
            const replaceConfig: IModelsConfig = {
                mode: 'replace',
                providers: {},
            };

            expect(replaceConfig.mode).toBe('replace');
        });
    });
});
