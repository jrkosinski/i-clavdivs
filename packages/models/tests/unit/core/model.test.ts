import { describe, it, expect, beforeEach } from 'vitest';
import { BaseModel } from '../../../src/core/model.js';
import type {
    CompletionRequest,
    CompletionResponse,
    CompletionChunk,
    ModelDefinition,
} from '../../../src/core/types.js';

// Create a concrete test implementation of BaseModel
class TestModel extends BaseModel {
    public async complete(request: CompletionRequest): Promise<CompletionResponse> {
        return {
            content: 'test response',
            finishReason: 'stop',
            usage: {
                inputTokens: 10,
                outputTokens: 5,
            },
        };
    }

    public async *stream(
        request: CompletionRequest
    ): AsyncGenerator<CompletionChunk, void, undefined> {
        yield { delta: 'test', done: false };
        yield { delta: '', done: true, finishReason: 'stop' };
    }

    // Expose protected methods for testing
    public testValidateRequest(request: CompletionRequest): void {
        return this._validateRequest(request);
    }

    public testCalculateCost(inputTokens: number, outputTokens: number): number {
        return this._calculateCost(inputTokens, outputTokens);
    }
}

describe('BaseModel', () => {
    let model: TestModel;
    let modelDefinition: ModelDefinition;

    beforeEach(() => {
        modelDefinition = {
            id: 'test-model',
            name: 'Test Model',
            provider: 'test',
            api: 'openai-chat',
            reasoning: false,
            input: ['text'],
            output: ['text'],
            cost: {
                input: 2.5,
                output: 10.0,
            },
            contextWindow: 128_000,
            maxTokens: 4_096,
        };

        model = new TestModel(modelDefinition);
    });

    describe('getDefinition', () => {
        it('should return model definition', () => {
            const definition = model.getDefinition();
            expect(definition).toEqual(modelDefinition);
        });

        it('should return a deep copy, not a reference', () => {
            const definition = model.getDefinition();
            definition.name = 'Modified Name';
            definition.cost.input = 999;

            const definition2 = model.getDefinition();
            expect(definition2.name).toBe('Test Model');
            expect(definition2.cost.input).toBe(2.5);
        });
    });

    describe('_validateRequest', () => {
        it('should not throw for valid request', () => {
            const request: CompletionRequest = {
                messages: [{ role: 'user', content: 'test' }],
                model: 'test-model',
            };

            expect(() => model.testValidateRequest(request)).not.toThrow();
        });

        describe('messages validation', () => {
            it('should throw when messages array is empty', () => {
                const request: CompletionRequest = {
                    messages: [],
                    model: 'test-model',
                };

                expect(() => model.testValidateRequest(request)).toThrow(
                    'request must contain at least one message'
                );
            });

            it('should throw when messages is undefined', () => {
                const request = {
                    model: 'test-model',
                } as CompletionRequest;

                expect(() => model.testValidateRequest(request)).toThrow(
                    'request must contain at least one message'
                );
            });
        });

        describe('maxTokens validation', () => {
            it('should throw when maxTokens exceeds model limit', () => {
                const request: CompletionRequest = {
                    messages: [{ role: 'user', content: 'test' }],
                    model: 'test-model',
                    maxTokens: 5000, // exceeds 4096 limit
                };

                expect(() => model.testValidateRequest(request)).toThrow(
                    'maxTokens 5000 exceeds model limit 4096'
                );
            });

            it('should not throw when maxTokens is within limit', () => {
                const request: CompletionRequest = {
                    messages: [{ role: 'user', content: 'test' }],
                    model: 'test-model',
                    maxTokens: 4000,
                };

                expect(() => model.testValidateRequest(request)).not.toThrow();
            });

            it('should not throw when maxTokens equals limit', () => {
                const request: CompletionRequest = {
                    messages: [{ role: 'user', content: 'test' }],
                    model: 'test-model',
                    maxTokens: 4096,
                };

                expect(() => model.testValidateRequest(request)).not.toThrow();
            });

            it('should not validate when maxTokens is undefined', () => {
                const request: CompletionRequest = {
                    messages: [{ role: 'user', content: 'test' }],
                    model: 'test-model',
                };

                expect(() => model.testValidateRequest(request)).not.toThrow();
            });
        });

        describe('temperature validation', () => {
            it('should throw when temperature is less than 0', () => {
                const request: CompletionRequest = {
                    messages: [{ role: 'user', content: 'test' }],
                    model: 'test-model',
                    temperature: -0.1,
                };

                expect(() => model.testValidateRequest(request)).toThrow(
                    'temperature must be between 0 and 2'
                );
            });

            it('should throw when temperature is greater than 2', () => {
                const request: CompletionRequest = {
                    messages: [{ role: 'user', content: 'test' }],
                    model: 'test-model',
                    temperature: 2.1,
                };

                expect(() => model.testValidateRequest(request)).toThrow(
                    'temperature must be between 0 and 2'
                );
            });

            it('should not throw for temperature = 0', () => {
                const request: CompletionRequest = {
                    messages: [{ role: 'user', content: 'test' }],
                    model: 'test-model',
                    temperature: 0,
                };

                expect(() => model.testValidateRequest(request)).not.toThrow();
            });

            it('should not throw for temperature = 2', () => {
                const request: CompletionRequest = {
                    messages: [{ role: 'user', content: 'test' }],
                    model: 'test-model',
                    temperature: 2,
                };

                expect(() => model.testValidateRequest(request)).not.toThrow();
            });

            it('should not throw for valid temperature values', () => {
                const request: CompletionRequest = {
                    messages: [{ role: 'user', content: 'test' }],
                    model: 'test-model',
                    temperature: 0.7,
                };

                expect(() => model.testValidateRequest(request)).not.toThrow();
            });
        });

        describe('topP validation', () => {
            it('should throw when topP is less than 0', () => {
                const request: CompletionRequest = {
                    messages: [{ role: 'user', content: 'test' }],
                    model: 'test-model',
                    topP: -0.1,
                };

                expect(() => model.testValidateRequest(request)).toThrow(
                    'topP must be between 0 and 1'
                );
            });

            it('should throw when topP is greater than 1', () => {
                const request: CompletionRequest = {
                    messages: [{ role: 'user', content: 'test' }],
                    model: 'test-model',
                    topP: 1.1,
                };

                expect(() => model.testValidateRequest(request)).toThrow(
                    'topP must be between 0 and 1'
                );
            });

            it('should not throw for topP = 0', () => {
                const request: CompletionRequest = {
                    messages: [{ role: 'user', content: 'test' }],
                    model: 'test-model',
                    topP: 0,
                };

                expect(() => model.testValidateRequest(request)).not.toThrow();
            });

            it('should not throw for topP = 1', () => {
                const request: CompletionRequest = {
                    messages: [{ role: 'user', content: 'test' }],
                    model: 'test-model',
                    topP: 1,
                };

                expect(() => model.testValidateRequest(request)).not.toThrow();
            });

            it('should not throw for valid topP values', () => {
                const request: CompletionRequest = {
                    messages: [{ role: 'user', content: 'test' }],
                    model: 'test-model',
                    topP: 0.9,
                };

                expect(() => model.testValidateRequest(request)).not.toThrow();
            });
        });
    });

    describe('_calculateCost', () => {
        it('should calculate cost correctly for typical values', () => {
            // cost.input = 2.5, cost.output = 10.0 (per 1M tokens)
            const cost = model.testCalculateCost(1000, 500);
            // (1000 / 1_000_000) * 2.5 + (500 / 1_000_000) * 10.0
            // = 0.001 * 2.5 + 0.0005 * 10.0
            // = 0.0025 + 0.005
            // = 0.0075
            expect(cost).toBeCloseTo(0.0075, 6);
        });

        it('should calculate cost for 1 million input tokens', () => {
            const cost = model.testCalculateCost(1_000_000, 0);
            expect(cost).toBeCloseTo(2.5, 6);
        });

        it('should calculate cost for 1 million output tokens', () => {
            const cost = model.testCalculateCost(0, 1_000_000);
            expect(cost).toBeCloseTo(10.0, 6);
        });

        it('should return 0 for zero tokens', () => {
            const cost = model.testCalculateCost(0, 0);
            expect(cost).toBe(0);
        });

        it('should handle large token counts accurately', () => {
            const cost = model.testCalculateCost(100_000_000, 50_000_000);
            // (100_000_000 / 1_000_000) * 2.5 + (50_000_000 / 1_000_000) * 10.0
            // = 100 * 2.5 + 50 * 10.0
            // = 250 + 500
            // = 750
            expect(cost).toBeCloseTo(750, 6);
        });

        it('should handle small token counts with precision', () => {
            const cost = model.testCalculateCost(1, 1);
            // (1 / 1_000_000) * 2.5 + (1 / 1_000_000) * 10.0
            // = 0.0000025 + 0.00001
            // = 0.0000125
            expect(cost).toBeCloseTo(0.0000125, 10);
        });
    });
});
