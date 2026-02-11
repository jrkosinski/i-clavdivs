//anthropic provider implementation

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
 * Anthropic model implementation
 */
class AnthropicModel extends BaseModel {
    private _provider: AnthropicProvider;

    public constructor(definition: ModelDefinition, provider: AnthropicProvider) {
        super(definition);
        this._provider = provider;
    }

    public async complete(request: CompletionRequest): Promise<CompletionResponse> {
        this._validateRequest(request);

        const payload = this._buildPayload(request);
        const response = await this._provider._request<AnthropicMessageResponse>('/messages', {
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

        const response = await this._provider._requestStream('/messages', {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        yield* this._parseStream(response);
    }

    private _buildPayload(request: CompletionRequest): AnthropicMessageRequest {
        //extract system message
        const systemMessage = request.messages.find((m) => m.role === 'system');
        const conversationMessages = request.messages.filter((m) => m.role !== 'system');

        const payload: AnthropicMessageRequest = {
            model: request.model,
            messages: this._convertMessages(conversationMessages),
            max_tokens: request.maxTokens || this._definition.maxTokens,
            temperature: request.temperature,
            top_p: request.topP,
            stop_sequences: request.stopSequences,
        };

        if (systemMessage) {
            payload.system =
                typeof systemMessage.content === 'string'
                    ? systemMessage.content
                    : systemMessage.content.map((c) => (c.type === 'text' ? c.text : '')).join('');
        }

        if (request.tools && request.tools.length > 0) {
            payload.tools = request.tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                input_schema: tool.parameters,
            }));

            if (request.toolChoice) {
                if (request.toolChoice === 'auto') {
                    payload.tool_choice = { type: 'auto' };
                } else if (request.toolChoice === 'required') {
                    payload.tool_choice = { type: 'any' };
                } else {
                    payload.tool_choice = { type: 'tool', name: request.toolChoice.name };
                }
            }
        }

        return payload;
    }

    private _convertMessages(messages: Message[]): AnthropicMessage[] {
        return messages.map((msg) => {
            if (typeof msg.content === 'string') {
                return {
                    role: msg.role === 'assistant' ? 'assistant' : 'user',
                    content: msg.content,
                };
            }

            //handle multi-part content
            return {
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content.map((part) => {
                    if (part.type === 'text') {
                        return {
                            type: 'text',
                            text: part.text,
                        };
                    } else {
                        //anthropic uses base64 encoded images or urls
                        const source = part.source;
                        if (source.startsWith('data:')) {
                            //extract base64 from data url
                            const match = source.match(/^data:([^;]+);base64,(.+)$/);
                            if (match && match[1] && match[2]) {
                                return {
                                    type: 'image' as const,
                                    source: {
                                        type: 'base64' as const,
                                        media_type: match[1],
                                        data: match[2],
                                    },
                                };
                            }
                        }
                        //assume it's a url
                        return {
                            type: 'image' as const,
                            source: {
                                type: 'url' as const,
                                url: source,
                            },
                        };
                    }
                }),
            };
        });
    }

    private _parseResponse(response: AnthropicMessageResponse): CompletionResponse {
        //extract content (filter out tool_use blocks as they're handled separately)
        const textBlocks = response.content.filter(
            (block): block is AnthropicTextBlock => block.type === 'text'
        );

        let content: string | MessageContent[];
        if (textBlocks.length === 1 && textBlocks[0]) {
            content = textBlocks[0].text;
        } else if (textBlocks.length > 1) {
            content = textBlocks.map((block) => ({
                type: 'text' as const,
                text: block.text,
            }));
        } else {
            content = '';
        }

        //extract tool calls
        const toolCalls = response.content
            .filter((block): block is AnthropicToolUseBlock => block.type === 'tool_use')
            .map((block) => ({
                id: block.id,
                name: block.name,
                arguments: block.input,
            }));

        return {
            content,
            finishReason: this._mapStopReason(response.stop_reason),
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            usage: {
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens,
                cacheReadTokens: response.usage.cache_read_input_tokens,
                cacheWriteTokens: response.usage.cache_creation_input_tokens,
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
                    if (!line.trim() || !line.startsWith('data: ')) continue;

                    const data = line.slice(6);
                    const event = JSON.parse(data) as AnthropicStreamEvent;

                    if (event.type === 'content_block_delta') {
                        if (event.delta.type === 'text_delta') {
                            yield {
                                delta: event.delta.text,
                                done: false,
                            };
                        }
                    } else if (event.type === 'message_delta') {
                        yield {
                            delta: '',
                            done: true,
                            finishReason: this._mapStopReason(event.delta.stop_reason),
                            usage: event.usage
                                ? {
                                      inputTokens: 0,
                                      outputTokens: event.usage.output_tokens,
                                  }
                                : undefined,
                        };
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    private _mapStopReason(reason: string): CompletionResponse['finishReason'] {
        switch (reason) {
            case 'end_turn':
                return 'stop';
            case 'max_tokens':
                return 'length';
            case 'tool_use':
                return 'tool_calls';
            case 'stop_sequence':
                return 'stop';
            default:
                return 'error';
        }
    }
}

/**
 * Anthropic provider
 */
export class AnthropicProvider extends BaseProvider {
    private _version: string;

    public constructor(apiKey: string, version?: string) {
        const auth: AuthCredential = {
            type: 'api-key',
            key: apiKey,
        };

        const config: ProviderConfig = {
            id: 'anthropic',
            name: 'Anthropic',
            baseUrl: 'https://api.anthropic.com/v1',
            auth,
            models: ANTHROPIC_MODELS,
        };

        super(config);
        this._version = version || '2023-06-01';
    }

    public async test(): Promise<boolean> {
        try {
            //anthropic doesn't have a simple health check endpoint
            //we can try a minimal request
            await this._request<AnthropicMessageResponse>('/messages', {
                method: 'POST',
                body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 1,
                    messages: [{ role: 'user', content: 'hi' }],
                }),
            });
            return true;
        } catch {
            return false;
        }
    }

    protected _initializeModels(): void {
        for (const modelDef of this._config.models) {
            const model = new AnthropicModel(modelDef, this);
            this._models.set(modelDef.id, model);
        }
    }

    protected override _buildHeaders(): Record<string, string> {
        const headers = super._buildHeaders();
        headers['anthropic-version'] = this._version;
        //override authorization header format for anthropic
        const auth = this._config.auth;
        if (auth.type === 'api-key') {
            headers['x-api-key'] = auth.key;
            delete headers['Authorization'];
        }
        return headers;
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

//anthropic api types

interface AnthropicMessageRequest {
    model: string;
    messages: AnthropicMessage[];
    max_tokens: number;
    system?: string;
    temperature?: number;
    top_p?: number;
    stop_sequences?: string[];
    tools?: AnthropicTool[];
    tool_choice?: { type: 'auto' } | { type: 'any' } | { type: 'tool'; name: string };
    stream?: boolean;
}

interface AnthropicMessage {
    role: 'user' | 'assistant';
    content:
        | string
        | Array<
              | { type: 'text'; text: string }
              | {
                    type: 'image';
                    source:
                        | { type: 'base64'; media_type: string; data: string }
                        | { type: 'url'; url: string };
                }
          >;
}

interface AnthropicTool {
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
}

interface AnthropicMessageResponse {
    id: string;
    type: 'message';
    role: 'assistant';
    content: Array<AnthropicTextBlock | AnthropicToolUseBlock>;
    model: string;
    stop_reason: string;
    stop_sequence: string | null;
    usage: {
        input_tokens: number;
        output_tokens: number;
        cache_read_input_tokens?: number;
        cache_creation_input_tokens?: number;
    };
}

interface AnthropicTextBlock {
    type: 'text';
    text: string;
}

interface AnthropicToolUseBlock {
    type: 'tool_use';
    id: string;
    name: string;
    input: Record<string, unknown>;
}

type AnthropicStreamEvent =
    | {
          type: 'content_block_delta';
          index: number;
          delta: { type: 'text_delta'; text: string };
      }
    | {
          type: 'message_delta';
          delta: { stop_reason: string };
          usage: { output_tokens: number };
      };

//anthropic model catalog

const ANTHROPIC_MODELS: ModelDefinition[] = [
    {
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
    {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic',
        api: 'anthropic-messages',
        reasoning: false,
        input: ['text', 'image'],
        output: ['text'],
        cost: {
            input: 0.8,
            output: 4.0,
            cacheRead: 0.08,
            cacheWrite: 1.0,
        },
        contextWindow: 200_000,
        maxTokens: 8_192,
    },
    {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        api: 'anthropic-messages',
        reasoning: false,
        input: ['text', 'image'],
        output: ['text'],
        cost: {
            input: 15.0,
            output: 75.0,
            cacheRead: 1.5,
            cacheWrite: 18.75,
        },
        contextWindow: 200_000,
        maxTokens: 4_096,
    },
];
