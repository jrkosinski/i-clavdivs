import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AnthropicProvider } from '../../../src/providers/anthropic.js';
import type { CompletionRequest } from '../../../src/core/types.js';
import {
    mockAnthropicResponses,
    createMockResponse,
    createMockStreamResponse,
    createMockErrorResponse,
} from '../../fixtures/mock-responses.js';
import { testCompletionRequests } from '../../fixtures/test-data.js';

describe('AnthropicProvider', () => {
    let provider: AnthropicProvider;
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        provider = new AnthropicProvider('sk-ant-test-key-12345');
        fetchMock = vi.fn();
        global.fetch = fetchMock;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with api key', () => {
            const config = provider.getConfig();
            expect(config.id).toBe('anthropic');
            expect(config.name).toBe('Anthropic');
            expect(config.auth.type).toBe('api-key');
        });

        it('should use default base url', () => {
            const config = provider.getConfig();
            expect(config.baseUrl).toBe('https://api.anthropic.com/v1');
        });

        it('should use default api version', async () => {
            fetchMock.mockResolvedValueOnce(
                createMockResponse(mockAnthropicResponses.message.success)
            );

            const model = provider.getModel('claude-3-5-sonnet-20241022');
            await model!.complete(testCompletionRequests.simple);

            expect(fetchMock).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'anthropic-version': '2023-06-01',
                    }),
                })
            );
        });

        it('should accept custom api version', async () => {
            const customProvider = new AnthropicProvider('key', '2024-01-01');
            fetchMock.mockResolvedValueOnce(
                createMockResponse(mockAnthropicResponses.message.success)
            );

            const model = customProvider.getModel('claude-3-5-sonnet-20241022');
            await model!.complete(testCompletionRequests.simple);

            expect(fetchMock).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'anthropic-version': '2024-01-01',
                    }),
                })
            );
        });

        it('should initialize all Anthropic models', () => {
            const models = provider.listModels();
            expect(models.length).toBeGreaterThan(0);

            const modelIds = models.map((m) => m.id);
            expect(modelIds).toContain('claude-3-5-sonnet-20241022');
            expect(modelIds).toContain('claude-3-5-haiku-20241022');
            expect(modelIds).toContain('claude-3-opus-20240229');
        });
    });

    describe('test', () => {
        it('should return true on successful connection', async () => {
            fetchMock.mockResolvedValueOnce(
                createMockResponse(mockAnthropicResponses.message.success)
            );

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
                createMockResponse(mockAnthropicResponses.message.success)
            );

            const model = provider.getModel('claude-3-5-sonnet-20241022');
            expect(model).toBeDefined();

            const response = await model!.complete(testCompletionRequests.simple);

            expect(response.content).toBe('Hello! How can I assist you today?');
            expect(response.finishReason).toBe('stop');
            expect(response.usage.inputTokens).toBe(10);
            expect(response.usage.outputTokens).toBe(15);
        });

        it('should handle tool use', async () => {
            fetchMock.mockResolvedValueOnce(
                createMockResponse(mockAnthropicResponses.message.withToolUse)
            );

            const model = provider.getModel('claude-3-5-sonnet-20241022');
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
                createMockResponse(mockAnthropicResponses.message.withCache)
            );

            const model = provider.getModel('claude-3-5-sonnet-20241022');
            const response = await model!.complete(testCompletionRequests.simple);

            expect(response.usage.cacheReadTokens).toBe(50);
            expect(response.usage.cacheWriteTokens).toBe(25);
        });

        it('should send correct request headers', async () => {
            fetchMock.mockResolvedValueOnce(
                createMockResponse(mockAnthropicResponses.message.success)
            );

            const model = provider.getModel('claude-3-5-sonnet-20241022');
            await model!.complete(testCompletionRequests.simple);

            expect(fetchMock).toHaveBeenCalledWith(
                'https://api.anthropic.com/v1/messages',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'x-api-key': 'sk-ant-test-key-12345',
                        'anthropic-version': '2023-06-01',
                    }),
                })
            );

            // Verify no Authorization header
            const callArgs = fetchMock.mock.calls[0];
            expect(callArgs[1].headers.Authorization).toBeUndefined();
        });

        it('should extract and send system message separately', async () => {
            fetchMock.mockResolvedValueOnce(
                createMockResponse(mockAnthropicResponses.message.success)
            );

            const model = provider.getModel('claude-3-5-sonnet-20241022');
            await model!.complete(testCompletionRequests.withSystem);

            const callArgs = fetchMock.mock.calls[0];
            const body = JSON.parse(callArgs[1].body);

            expect(body.system).toBe('You are a helpful assistant.');
            expect(body.messages).toHaveLength(1);
            expect(body.messages[0].role).toBe('user');
        });

        it('should require max_tokens', async () => {
            fetchMock.mockResolvedValueOnce(
                createMockResponse(mockAnthropicResponses.message.success)
            );

            const model = provider.getModel('claude-3-5-sonnet-20241022');
            await model!.complete(testCompletionRequests.simple);

            const callArgs = fetchMock.mock.calls[0];
            const body = JSON.parse(callArgs[1].body);

            expect(body.max_tokens).toBeDefined();
            expect(typeof body.max_tokens).toBe('number');
        });

        it('should convert multi-part messages correctly', async () => {
            fetchMock.mockResolvedValueOnce(
                createMockResponse(mockAnthropicResponses.message.success)
            );

            const model = provider.getModel('claude-3-5-sonnet-20241022');
            await model!.complete(testCompletionRequests.withImage);

            const callArgs = fetchMock.mock.calls[0];
            const body = JSON.parse(callArgs[1].body);

            expect(body.messages[0].content).toEqual([
                { type: 'text', text: 'What is in this image?' },
                {
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: 'image/png',
                        data: 'iVBORw0KGgoAAAANSUhEUg==',
                    },
                },
            ]);
        });

        it('should handle tools and tool choice', async () => {
            fetchMock.mockResolvedValueOnce(
                createMockResponse(mockAnthropicResponses.message.withToolUse)
            );

            const model = provider.getModel('claude-3-5-sonnet-20241022');
            await model!.complete(testCompletionRequests.withTools);

            const callArgs = fetchMock.mock.calls[0];
            const body = JSON.parse(callArgs[1].body);

            expect(body.tools).toBeDefined();
            expect(body.tools[0]).toEqual({
                name: 'get_weather',
                description: expect.any(String),
                input_schema: expect.any(Object),
            });
            expect(body.tool_choice).toEqual({ type: 'auto' });
        });

        it('should map tool choice correctly', async () => {
            const testCases = [
                { input: 'auto', expected: { type: 'auto' } },
                { input: 'required', expected: { type: 'any' } },
                {
                    input: { type: 'tool', name: 'get_weather' },
                    expected: { type: 'tool', name: 'get_weather' },
                },
            ];

            for (const { input, expected } of testCases) {
                fetchMock.mockResolvedValueOnce(
                    createMockResponse(mockAnthropicResponses.message.success)
                );

                const model = provider.getModel('claude-3-5-sonnet-20241022');
                await model!.complete({
                    ...testCompletionRequests.withTools,
                    toolChoice: input as any,
                });

                const callArgs = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
                const body = JSON.parse(callArgs[1].body);

                expect(body.tool_choice).toEqual(expected);
            }
        });

        it('should throw error on api error', async () => {
            fetchMock.mockResolvedValueOnce(
                createMockErrorResponse('Invalid API key', 401)
            );

            const model = provider.getModel('claude-3-5-sonnet-20241022');

            await expect(model!.complete(testCompletionRequests.simple)).rejects.toThrow(
                'provider request failed'
            );
        });

        it('should validate request before sending', async () => {
            const model = provider.getModel('claude-3-5-sonnet-20241022');

            const invalidRequest: CompletionRequest = {
                messages: [],
                model: 'claude-3-5-sonnet-20241022',
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
                createMockStreamResponse(mockAnthropicResponses.stream.chunks)
            );

            const model = provider.getModel('claude-3-5-sonnet-20241022');
            const stream = model!.stream(testCompletionRequests.simple);

            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            expect(chunks.length).toBeGreaterThan(0);

            // Check content chunks
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
                createMockStreamResponse(mockAnthropicResponses.stream.chunks)
            );

            const model = provider.getModel('claude-3-5-sonnet-20241022');
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

            const model = provider.getModel('claude-3-5-sonnet-20241022');

            await expect(async () => {
                const stream = model!.stream(testCompletionRequests.simple);
                for await (const _ of stream) {
                    // no-op
                }
            }).rejects.toThrow('provider request failed');
        });
    });

    describe('stop reason mapping', () => {
        it('should map stop reasons correctly', async () => {
            const reasons = [
                { anthropic: 'end_turn', expected: 'stop' },
                { anthropic: 'max_tokens', expected: 'length' },
                { anthropic: 'tool_use', expected: 'tool_calls' },
                { anthropic: 'stop_sequence', expected: 'stop' },
                { anthropic: 'unknown', expected: 'error' },
            ];

            for (const { anthropic, expected } of reasons) {
                const mockResponse = {
                    ...mockAnthropicResponses.message.success,
                    stop_reason: anthropic,
                };

                fetchMock.mockResolvedValueOnce(createMockResponse(mockResponse));

                const model = provider.getModel('claude-3-5-sonnet-20241022');
                const response = await model!.complete(testCompletionRequests.simple);

                expect(response.finishReason).toBe(expected);
            }
        });
    });
});
