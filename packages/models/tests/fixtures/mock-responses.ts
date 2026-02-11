// Mock API responses for testing

export const mockOpenAIResponses = {
    chat: {
        success: {
            id: 'chatcmpl-123',
            object: 'chat.completion',
            created: 1677652288,
            model: 'gpt-4o',
            choices: [
                {
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: 'Hello! How can I help you today?',
                    },
                    finish_reason: 'stop',
                },
            ],
            usage: {
                prompt_tokens: 10,
                completion_tokens: 9,
                total_tokens: 19,
            },
        },
        withToolCalls: {
            id: 'chatcmpl-456',
            object: 'chat.completion',
            created: 1677652288,
            model: 'gpt-4o',
            choices: [
                {
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: '',
                        tool_calls: [
                            {
                                id: 'call_abc123',
                                type: 'function' as const,
                                function: {
                                    name: 'get_weather',
                                    arguments: '{"location":"San Francisco","unit":"celsius"}',
                                },
                            },
                        ],
                    },
                    finish_reason: 'tool_calls',
                },
            ],
            usage: {
                prompt_tokens: 50,
                completion_tokens: 20,
                total_tokens: 70,
            },
        },
        withCache: {
            id: 'chatcmpl-789',
            object: 'chat.completion',
            created: 1677652288,
            model: 'gpt-4o',
            choices: [
                {
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: 'Cached response',
                    },
                    finish_reason: 'stop',
                },
            ],
            usage: {
                prompt_tokens: 100,
                completion_tokens: 20,
                total_tokens: 120,
                prompt_tokens_details: {
                    cached_tokens: 50,
                },
            },
        },
        error: {
            error: {
                message: 'Invalid API key',
                type: 'invalid_request_error',
                code: 'invalid_api_key',
            },
        },
    },
    stream: {
        chunks: [
            'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-4o","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}\n\n',
            'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}\n\n',
            'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null}]}\n\n',
            'data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-4o","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":6,"total_tokens":16}}\n\n',
            'data: [DONE]\n\n',
        ],
    },
    models: {
        list: {
            data: [
                {
                    id: 'gpt-4o',
                    object: 'model',
                    created: 1677610602,
                    owned_by: 'openai',
                },
                {
                    id: 'gpt-4o-mini',
                    object: 'model',
                    created: 1677649963,
                    owned_by: 'openai',
                },
            ],
        },
    },
};

export const mockAnthropicResponses = {
    message: {
        success: {
            id: 'msg_123',
            type: 'message' as const,
            role: 'assistant' as const,
            content: [
                {
                    type: 'text' as const,
                    text: 'Hello! How can I assist you today?',
                },
            ],
            model: 'claude-3-5-sonnet-20241022',
            stop_reason: 'end_turn',
            stop_sequence: null,
            usage: {
                input_tokens: 10,
                output_tokens: 15,
            },
        },
        withToolUse: {
            id: 'msg_456',
            type: 'message' as const,
            role: 'assistant' as const,
            content: [
                {
                    type: 'text' as const,
                    text: "I'll check the weather for you.",
                },
                {
                    type: 'tool_use' as const,
                    id: 'toolu_123',
                    name: 'get_weather',
                    input: {
                        location: 'San Francisco',
                        unit: 'celsius',
                    },
                },
            ],
            model: 'claude-3-5-sonnet-20241022',
            stop_reason: 'tool_use',
            stop_sequence: null,
            usage: {
                input_tokens: 50,
                output_tokens: 30,
            },
        },
        withCache: {
            id: 'msg_789',
            type: 'message' as const,
            role: 'assistant' as const,
            content: [
                {
                    type: 'text' as const,
                    text: 'Cached response',
                },
            ],
            model: 'claude-3-5-sonnet-20241022',
            stop_reason: 'end_turn',
            stop_sequence: null,
            usage: {
                input_tokens: 100,
                output_tokens: 20,
                cache_read_input_tokens: 50,
                cache_creation_input_tokens: 25,
            },
        },
        error: {
            type: 'error',
            error: {
                type: 'authentication_error',
                message: 'Invalid API key',
            },
        },
    },
    stream: {
        chunks: [
            'data: {"type":"message_start","message":{"id":"msg_123","type":"message","role":"assistant","content":[],"model":"claude-3-5-sonnet-20241022","stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":10,"output_tokens":0}}}\n\n',
            'data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n',
            'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n\n',
            'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"!"}}\n\n',
            'data: {"type":"content_block_stop","index":0}\n\n',
            'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":6}}\n\n',
            'data: {"type":"message_stop"}\n\n',
        ],
    },
};

export function createMockResponse(data: any, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}

export function createMockStreamResponse(chunks: string[]): Response {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            for (const chunk of chunks) {
                controller.enqueue(encoder.encode(chunk));
            }
            controller.close();
        },
    });

    return new Response(stream, {
        status: 200,
        headers: {
            'Content-Type': 'text/event-stream',
        },
    });
}

export function createMockErrorResponse(message: string, status = 400): Response {
    return new Response(
        JSON.stringify({
            error: {
                message,
                type: 'invalid_request_error',
            },
        }),
        {
            status,
            headers: {
                'Content-Type': 'application/json',
            },
        }
    );
}
