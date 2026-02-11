//openai provider implementation

import { BaseModel } from '../core/model.js';
import { BaseProvider } from '../core/provider.js';
import type {
    CompletionRequest,
    CompletionResponse,
    CompletionChunk,
    ModelDefinition,
    ProviderConfig,
    AuthCredential,
    Message,
    MessageContent,
} from '../core/types.js';

/**
 * OpenAI model implementation
 */
class OpenAIModel extends BaseModel {
    private _provider: OpenAIProvider;

    public constructor(definition: ModelDefinition, provider: OpenAIProvider) {
        super(definition);
        this._provider = provider;
    }

    public async complete(request: CompletionRequest): Promise<CompletionResponse> {
        this._validateRequest(request);

        const payload = this._buildPayload(request);
        const response = await this._provider._request<OpenAIChatResponse>('/chat/completions', {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        return this._parseResponse(response);
    }

    public async *stream(
        request: CompletionRequest
    ): AsyncGenerator<CompletionChunk, void, undefined> {
        this._validateRequest(request);

        const payload = {
            ...this._buildPayload(request),
            stream: true,
        };

        const response = await this._provider._requestStream('/chat/completions', {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        yield* this._parseStream(response);
    }

    private _buildPayload(request: CompletionRequest): OpenAIChatRequest {
        const payload: OpenAIChatRequest = {
            model: request.model,
            messages: this._convertMessages(request.messages),
            temperature: request.temperature,
            max_tokens: request.maxTokens,
            top_p: request.topP,
            stop: request.stopSequences,
        };

        if (request.tools && request.tools.length > 0) {
            payload.tools = request.tools.map((tool) => ({
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters,
                },
            }));

            if (request.toolChoice) {
                if (request.toolChoice === 'auto' || request.toolChoice === 'required') {
                    payload.tool_choice = request.toolChoice === 'auto' ? 'auto' : 'required';
                } else {
                    payload.tool_choice = {
                        type: 'function',
                        function: { name: request.toolChoice.name },
                    };
                }
            }
        }

        return payload;
    }

    private _convertMessages(messages: Message[]): OpenAIMessage[] {
        return messages.map((msg) => {
            if (typeof msg.content === 'string') {
                return {
                    role: msg.role,
                    content: msg.content,
                };
            }

            //handle multi-part content
            return {
                role: msg.role,
                content: msg.content.map((part) => {
                    if (part.type === 'text') {
                        return {
                            type: 'text',
                            text: part.text,
                        };
                    } else {
                        return {
                            type: 'image_url',
                            image_url: {
                                url: part.source,
                            },
                        };
                    }
                }),
            };
        });
    }

    private _parseResponse(response: OpenAIChatResponse): CompletionResponse {
        const choice = response.choices[0];
        if (!choice) {
            throw new Error('no choices in response');
        }
        const message = choice.message;

        //extract content
        let content: string | MessageContent[];
        if (typeof message.content === 'string') {
            content = message.content;
        } else if (Array.isArray(message.content)) {
            content = message.content.map((part) => {
                if (typeof part === 'string') {
                    return { type: 'text' as const, text: part };
                }
                if (part.type === 'text') {
                    return { type: 'text' as const, text: part.text };
                }
                throw new Error(`unsupported content type: ${part.type}`);
            });
        } else {
            content = '';
        }

        //extract tool calls
        const toolCalls = message.tool_calls?.map((tc) => ({
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments),
        }));

        return {
            content,
            finishReason: this._mapFinishReason(choice.finish_reason),
            toolCalls,
            usage: {
                inputTokens: response.usage.prompt_tokens,
                outputTokens: response.usage.completion_tokens,
                cacheReadTokens: response.usage.prompt_tokens_details?.cached_tokens,
            },
            raw: response,
        };
    }

    private async *_parseStream(
        response: Response
    ): AsyncGenerator<CompletionChunk, void, undefined> {
        if (!response.body) {
            throw new Error('response body is null');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim() || line.startsWith(':')) continue;
                    if (line === 'data: [DONE]') continue;

                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        const chunk = JSON.parse(data) as OpenAIChatStreamChunk;
                        const delta = chunk.choices[0]?.delta;

                        if (delta?.content) {
                            yield {
                                delta: delta.content,
                                done: false,
                            };
                        }

                        if (chunk.choices[0]?.finish_reason) {
                            yield {
                                delta: '',
                                done: true,
                                finishReason: this._mapFinishReason(chunk.choices[0].finish_reason),
                                usage: chunk.usage
                                    ? {
                                          inputTokens: chunk.usage.prompt_tokens,
                                          outputTokens: chunk.usage.completion_tokens,
                                      }
                                    : undefined,
                            };
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    private _mapFinishReason(reason: string): CompletionResponse['finishReason'] {
        switch (reason) {
            case 'stop':
                return 'stop';
            case 'length':
                return 'length';
            case 'tool_calls':
            case 'function_call':
                return 'tool_calls';
            case 'content_filter':
                return 'content_filter';
            default:
                return 'error';
        }
    }
}

/**
 * OpenAI provider
 */
export class OpenAIProvider extends BaseProvider {
    public constructor(apiKey: string, baseUrl?: string) {
        const auth: AuthCredential = {
            type: 'api-key',
            key: apiKey,
        };

        const config: ProviderConfig = {
            id: 'openai',
            name: 'OpenAI',
            baseUrl: baseUrl || 'https://api.openai.com/v1',
            auth,
            models: OPENAI_MODELS,
        };

        super(config);
    }

    public async test(): Promise<boolean> {
        try {
            await this._request<{ data: unknown[] }>('/models', { method: 'GET' });
            return true;
        } catch {
            return false;
        }
    }

    protected _initializeModels(): void {
        for (const modelDef of this._config.models) {
            const model = new OpenAIModel(modelDef, this);
            this._models.set(modelDef.id, model);
        }
    }

    public async _requestStream(endpoint: string, options: RequestInit = {}): Promise<Response> {
        const url = `${this._config.baseUrl}${endpoint}`;
        const headers = this._buildHeaders();

        const response = await fetch(url, {
            ...options,
            headers: {
                ...headers,
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await this._parseError(response);
            throw new Error(`provider request failed: ${error}`);
        }

        return response;
    }
}

//openai api types

interface OpenAIChatRequest {
    model: string;
    messages: OpenAIMessage[];
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    stop?: string[];
    tools?: OpenAITool[];
    tool_choice?: string | { type: 'function'; function: { name: string } };
    stream?: boolean;
}

interface OpenAIMessage {
    role: string;
    content:
        | string
        | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
    name?: string;
    tool_call_id?: string;
}

interface OpenAITool {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}

interface OpenAIChatResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string | Array<{ type: string; text: string }>;
            tool_calls?: Array<{
                id: string;
                type: 'function';
                function: {
                    name: string;
                    arguments: string;
                };
            }>;
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        prompt_tokens_details?: {
            cached_tokens?: number;
        };
    };
}

interface OpenAIChatStreamChunk {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        delta: {
            role?: string;
            content?: string;
        };
        finish_reason: string | null;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

//openai model catalog

const OPENAI_MODELS: ModelDefinition[] = [
    {
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
    {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        api: 'openai-chat',
        reasoning: false,
        input: ['text', 'image'],
        output: ['text'],
        cost: {
            input: 0.15,
            output: 0.6,
            cacheRead: 0.075,
            cacheWrite: 0.225,
        },
        contextWindow: 128_000,
        maxTokens: 16_384,
    },
    {
        id: 'o1',
        name: 'o1',
        provider: 'openai',
        api: 'openai-chat',
        reasoning: true,
        input: ['text', 'image'],
        output: ['text'],
        cost: {
            input: 15.0,
            output: 60.0,
        },
        contextWindow: 200_000,
        maxTokens: 100_000,
    },
    {
        id: 'o1-mini',
        name: 'o1 Mini',
        provider: 'openai',
        api: 'openai-chat',
        reasoning: true,
        input: ['text', 'image'],
        output: ['text'],
        cost: {
            input: 3.0,
            output: 12.0,
        },
        contextWindow: 128_000,
        maxTokens: 65_536,
    },
    {
        id: 'o3-mini',
        name: 'o3 Mini',
        provider: 'openai',
        api: 'openai-chat',
        reasoning: true,
        input: ['text', 'image'],
        output: ['text'],
        cost: {
            input: 1.1,
            output: 4.4,
        },
        contextWindow: 200_000,
        maxTokens: 100_000,
    },
];
