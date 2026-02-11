import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OpenAIProvider } from '../../../src/providers/openai.js';
import type { CompletionRequest } from '../../../src/core/types.js';
import {
    mockOpenAIResponses,
    createMockResponse,
    createMockStreamResponse,
    createMockErrorResponse,
} from '../../fixtures/mock-responses.js';
import { testCompletionRequests } from '../../fixtures/test-data.js';

describe('OpenAIProvider', () => {
    let provider: OpenAIProvider;
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        provider = new OpenAIProvider('sk-test-key-12345');
        fetchMock = vi.fn();
        global.fetch = fetchMock;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with api key', () => {
            const config = provider.getConfig();
            expect(config.id).toBe('openai');
            expect(config.name).toBe('OpenAI');
            expect(config.auth.type).toBe('api-key');
        });

        it('should use default base url', () => {
            const config = provider.getConfig();
            expect(config.baseUrl).toBe('https://api.openai.com/v1');
        });

        it('should accept custom base url', () => {
            const customProvider = new OpenAIProvider('key', 'https://custom.openai.com');
            expect(customProvider.getConfig().baseUrl).toBe('https://custom.openai.com');
        });

        it('should initialize all OpenAI models', () => {
            const models = provider.listModels();
            expect(models.length).toBeGreaterThan(0);

            const modelIds = models.map((m) => m.id);
            expect(modelIds).toContain('gpt-4o');
            expect(modelIds).toContain('gpt-4o-mini');
            expect(modelIds).toContain('o1');
            expect(modelIds).toContain('o3-mini');
        });
    });

    describe('test', () => {
        it('should return true on successful connection', async () => {
            fetchMock.mockResolvedValueOnce(createMockResponse(mockOpenAIResponses.models.list));

            const result = await provider.test();
            expect(result).toBe(true);
        });

        it('should return false on failed connection', async () => {
            fetchMock.mockResolvedValueOnce(createMockErrorResponse('Unauthorized', 401));

            const result = await provider.test();
            expect(result).toBe(false);
        });

        it('should return false on network error', async () => {
            fetchMock.mockRejectedValueOnce(new Error('Network error'));

            const result = await provider.test();
            expect(result).toBe(false);
        });
    });

    describe('model.complete', () => {
        it('should complete a simple request', async () => {
            fetchMock.mockResolvedValueOnce(
                createMockResponse(mockOpenAIResponses.chat.success)
            );

            const model = provider.getModel('gpt-4o');
            expect(model).toBeDefined();

            const response = await model!.complete(testCompletionRequests.simple);

            expect(response.content).toBe('Hello! How can I help you today?');
            expect(response.finishReason).toBe('stop');
            expect(response.usage.inputTokens).toBe(10);
            expect(response.usage.outputTokens).toBe(9);
        });

        it('should handle tool calls', async () => {
            fetchMock.mockResolvedValueOnce(
                createMockResponse(mockOpenAIResponses.chat.withToolCalls)
            );

            const model = provider.getModel('gpt-4o');
            const response = await model!.complete(testCompletionRequests.withTools);

            expect(response.finishReason).toBe('tool_calls');
            expect(response.toolCalls).toBeDefined();
            expect(response.toolCalls).toHaveLength(1);
            expect(response.toolCalls![0]?.name).toBe('get_weather');
            expect(response.toolCalls![0]?.arguments).toEqual({
                location: 'San Francisco',
                unit: 'celsius',
            });
        });

        it('should handle cached tokens', async () => {
            fetchMock.mockResolvedValueOnce(
                createMockResponse(mockOpenAIResponses.chat.withCache)
            );

            const model = provider.getModel('gpt-4o');
            const response = await model!.complete(testCompletionRequests.simple);

            expect(response.usage.cacheReadTokens).toBe(50);
        });

        it('should send correct request headers', async () => {
            fetchMock.mockResolvedValueOnce(
                createMockResponse(mockOpenAIResponses.chat.success)
            );

            const model = provider.getModel('gpt-4o');
            await model!.complete(testCompletionRequests.simple);

            expect(fetchMock).toHaveBeenCalledWith(
                'https://api.openai.com/v1/chat/completions',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer sk-test-key-12345',
                    }),
                })
            );
        });

        it('should send correct payload structure', async () => {
            fetchMock.mockResolvedValueOnce(
                createMockResponse(mockOpenAIResponses.chat.success)
            );

            const model = provider.getModel('gpt-4o');
            await model!.complete(testCompletionRequests.withTemperature);

            const callArgs = fetchMock.mock.calls[0];
            const body = JSON.parse(callArgs[1].body);

            expect(body).toEqual(
                expect.objectContaining({
                    model: 'gpt-4o',
                    messages: expect.any(Array),
                    temperature: 0.9,
                    max_tokens: 500,
                })
            );
        });

        it('should convert multi-part messages correctly', async () => {
            fetchMock.mockResolvedValueOnce(
                createMockResponse(mockOpenAIResponses.chat.success)
            );

            const model = provider.getModel('gpt-4o');
            await model!.complete(testCompletionRequests.withImage);

            const callArgs = fetchMock.mock.calls[0];
            const body = JSON.parse(callArgs[1].body);

            expect(body.messages[0].content).toEqual([
                { type: 'text', text: 'What is in this image?' },
                {
                    type: 'image_url',
                    image_url: { url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==' },
                },
            ]);
        });

        it('should handle tools and tool choice', async () => {
            fetchMock.mockResolvedValueOnce(
                createMockResponse(mockOpenAIResponses.chat.withToolCalls)
            );

            const model = provider.getModel('gpt-4o');
            await model!.complete(testCompletionRequests.withTools);

            const callArgs = fetchMock.mock.calls[0];
            const body = JSON.parse(callArgs[1].body);

            expect(body.tools).toBeDefined();
            expect(body.tools[0]).toEqual({
                type: 'function',
                function: expect.objectContaining({
                    name: 'get_weather',
                    description: expect.any(String),
                    parameters: expect.any(Object),
                }),
            });
            expect(body.tool_choice).toBe('auto');
        });

        it('should throw error on api error', async () => {
            fetchMock.mockResolvedValueOnce(
                createMockErrorResponse('Invalid API key', 401)
            );

            const model = provider.getModel('gpt-4o');

            await expect(model!.complete(testCompletionRequests.simple)).rejects.toThrow(
                'provider request failed'
            );
        });

        it('should validate request before sending', async () => {
            const model = provider.getModel('gpt-4o');

            const invalidRequest: CompletionRequest = {
                messages: [],
                model: 'gpt-4o',
            };

            await expect(model!.complete(invalidRequest)).rejects.toThrow(
                'request must contain at least one message'
            );

            expect(fetchMock).not.toHaveBeenCalled();
        });
    });

    describe('model.stream', () => {
        it('should stream completion chunks', async () => {
            fetchMock.mockResolvedValueOnce(
                createMockStreamResponse(mockOpenAIResponses.stream.chunks)
            );

            const model = provider.getModel('gpt-4o');
            const stream = model!.stream(testCompletionRequests.simple);

            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            expect(chunks.length).toBeGreaterThan(0);

            // Check first content chunk
            const contentChunks = chunks.filter((c) => c.delta && !c.done);
            expect(contentChunks[0]?.delta).toBe('Hello');
            expect(contentChunks[1]?.delta).toBe('!');

            // Check final chunk
            const finalChunk = chunks[chunks.length - 1];
            expect(finalChunk?.done).toBe(true);
            expect(finalChunk?.finishReason).toBe('stop');
            expect(finalChunk?.usage).toBeDefined();
        });

        it('should send stream: true in payload', async () => {
            fetchMock.mockResolvedValueOnce(
                createMockStreamResponse(mockOpenAIResponses.stream.chunks)
            );

            const model = provider.getModel('gpt-4o');
            const stream = model!.stream(testCompletionRequests.simple);

            // Consume stream
            for await (const _ of stream) {
                // no-op
            }

            const callArgs = fetchMock.mock.calls[0];
            const body = JSON.parse(callArgs[1].body);

            expect(body.stream).toBe(true);
        });

        it('should handle stream errors', async () => {
            fetchMock.mockResolvedValueOnce(createMockErrorResponse('Rate limit', 429));

            const model = provider.getModel('gpt-4o');

            await expect(async () => {
                const stream = model!.stream(testCompletionRequests.simple);
                for await (const _ of stream) {
                    // no-op
                }
            }).rejects.toThrow('provider request failed');
        });
    });

    describe('finish reason mapping', () => {
        it('should map finish reasons correctly', async () => {
            const reasons = [
                { openai: 'stop', expected: 'stop' },
                { openai: 'length', expected: 'length' },
                { openai: 'tool_calls', expected: 'tool_calls' },
                { openai: 'function_call', expected: 'tool_calls' },
                { openai: 'content_filter', expected: 'content_filter' },
                { openai: 'unknown', expected: 'error' },
            ];

            for (const { openai, expected } of reasons) {
                const mockResponse = {
                    ...mockOpenAIResponses.chat.success,
                    choices: [
                        {
                            ...mockOpenAIResponses.chat.success.choices[0],
                            finish_reason: openai,
                        },
                    ],
                };

                fetchMock.mockResolvedValueOnce(createMockResponse(mockResponse));

                const model = provider.getModel('gpt-4o');
                const response = await model!.complete(testCompletionRequests.simple);

                expect(response.finishReason).toBe(expected);
            }
        });
    });
});
