/**
 * AgentRunner: implements IAgentRunner using AnthropicProvider from @i-clavdivs/models.
 *
 * Replaces pi-coding-agent's createAgentSession + SessionManager loop.
 * Phase 1: plain text completions only (no tools, no compaction).
 */

import process from 'node:process';
import { AnthropicProvider } from '@i-clavdivs/models';
import type { Message, CompletionChunk } from '@i-clavdivs/models';
import type { IAgentRunner, IAgentRequest, IAgentRunResult } from '@i-clavdivs/agents';
import { SessionStore } from './session-store.js';
import { SystemPrompt } from './system-prompt.js';
import { log } from './logger.js';

export interface IAgentRunnerConfig {
    /** Max messages to retain in history before truncating oldest turns. Defaults to 40. */
    maxHistoryMessages?: number;
    /** Directory to store session files. Defaults to ~/.i-clavdivs/sessions. */
    sessionDir?: string;
    /** Called with each streamed text chunk if streaming is desired. */
    onChunk?: (chunk: string) => void;
    /** Extra text appended to the system prompt. */
    extraSystemPrompt?: string;
}

/**
 * Runs agent turns against the Anthropic API, persisting conversation
 * history to disk between calls.
 */
export class AgentRunner implements IAgentRunner {
    private readonly _store: SessionStore;
    private readonly _config: IAgentRunnerConfig;
    private readonly _active: Set<string> = new Set();

    public constructor(config: IAgentRunnerConfig = {}) {
        this._config = config;
        this._store = new SessionStore(config.sessionDir);
    }

    /** Executes a single agent turn and returns the result. */
    public async run(request: IAgentRequest): Promise<IAgentRunResult> {
        const startedAt = Date.now();
        log.debug(`run start: sessionId=${request.sessionId} model=${request.model}`);

        this._active.add(request.sessionId);
        try {
            return await this._execute(request, startedAt);
        } finally {
            this._active.delete(request.sessionId);
            log.debug(
                `run end: sessionId=${request.sessionId} durationMs=${Date.now() - startedAt}`
            );
        }
    }

    /** Aborts an active run. Returns true if the session was active. */
    public async abort(sessionId: string): Promise<boolean> {
        //Phase 1: no in-flight abort; just report whether it was active
        return this._active.has(sessionId);
    }

    /** Returns true if a run for this session is currently in progress. */
    public isActive(sessionId: string): boolean {
        return this._active.has(sessionId);
    }

    /**
     * Executes the core agent request flow: load history, call model, save result.
     */
    private async _execute(request: IAgentRequest, startedAt: number): Promise<IAgentRunResult> {
        const model = this._resolveModel(request);
        if (!model) {
            return this._errorResult(`model not found: ${request.model}`, startedAt);
        }

        const history = await this._loadAndPrepareHistory(request.sessionId);
        const messages = this._buildMessages(request, history);

        try {
            const responseText = await this._getModelResponse(model, messages, request);
            await this._saveConversationTurn(request.sessionId, history, request.prompt, responseText);

            return this._buildSuccessResult(responseText, startedAt);
        } catch (err) {
            return this._errorResult(String(err), startedAt);
        }
    }

    /**
     * Resolves and validates the model from the provider.
     */
    private _resolveModel(request: IAgentRequest): ReturnType<AnthropicProvider['getModel']> | null {
        const provider = this._buildProvider(request);
        return provider.getModel(request.model);
    }

    /**
     * Loads session history and trims it to max message limit.
     */
    private async _loadAndPrepareHistory(sessionId: string): Promise<Message[]> {
        const history = await this._store.load(sessionId);
        return this._trimHistory(history);
    }

    /**
     * Gets response from model, using streaming or completion based on config.
     */
    private async _getModelResponse(
        model: ReturnType<AnthropicProvider['getModel']>,
        messages: Message[],
        request: IAgentRequest
    ): Promise<string> {
        return this._config.onChunk
            ? await this._streamResponse(model, messages, request)
            : await this._completeResponse(model, messages, request);
    }

    /**
     * Saves the conversation turn (user prompt + assistant response) to session store.
     */
    private async _saveConversationTurn(
        sessionId: string,
        history: Message[],
        prompt: string,
        response: string
    ): Promise<void> {
        //append to trimmed history so the file never grows beyond the limit
        const updatedHistory = this._appendTurn(history, prompt, response);
        await this._store.save(sessionId, updatedHistory);
    }

    /**
     * Builds a successful result payload.
     */
    private _buildSuccessResult(responseText: string, startedAt: number): IAgentRunResult {
        return {
            payloads: [{ text: responseText }],
            meta: { durationMs: Date.now() - startedAt },
        };
    }

    /**
     * Gets a complete (non-streaming) response from the model.
     */
    private async _completeResponse(
        model: ReturnType<AnthropicProvider['getModel']>,
        messages: Message[],
        request: IAgentRequest
    ): Promise<string> {
        const response = await model!.complete({
            model: request.model,
            messages,
            maxTokens: request.maxTokens,
            temperature: request.temperature,
        });
        return this._extractTextContent(response.content);
    }

    /**
     * Extracts plain text from message content (string or multi-part array).
     */
    private _extractTextContent(content: string | Array<{ type: string; text?: string }>): string {
        return typeof content === 'string'
            ? content
            : content.map((c) => (c.type === 'text' ? c.text : '')).join('');
    }

    /**
     * Gets a streaming response from the model, calling onChunk for each delta.
     */
    private async _streamResponse(
        model: ReturnType<AnthropicProvider['getModel']>,
        messages: Message[],
        request: IAgentRequest
    ): Promise<string> {
        const chunks: string[] = [];
        const stream = model!.stream({
            model: request.model,
            messages,
            maxTokens: request.maxTokens,
            temperature: request.temperature,
        });

        for await (const chunk of stream) {
            const delta = this._extractChunkText(chunk);
            if (delta) {
                chunks.push(delta);
                this._config.onChunk!(delta);
            }
        }

        return chunks.join('');
    }

    /**
     * Builds the message array for API request: system prompt + history + current user message.
     */
    private _buildMessages(request: IAgentRequest, history: Message[]): Message[] {
        const systemPrompt = this._buildSystemPrompt(request);
        const systemMessage: Message = { role: 'system', content: systemPrompt };
        const userMessage: Message = { role: 'user', content: request.prompt };

        //history is already trimmed by the caller
        return [systemMessage, ...history, userMessage];
    }

    /**
     * Builds the system prompt with model info, workspace dir, and optional extras.
     */
    private _buildSystemPrompt(request: IAgentRequest): string {
        return SystemPrompt.build({
            model: request.model,
            workspaceDir: request.workspaceDir ?? process.cwd(),
            extra: this._config.extraSystemPrompt,
        });
    }

    /**
     * Trims history to max configured message count, preserving turn pairs.
     */
    private _trimHistory(history: Message[]): Message[] {
        const max = this._config.maxHistoryMessages ?? 40;
        if (history.length <= max) return history;

        //keep the most recent messages, always in pairs to preserve turn structure
        const keep = max % 2 === 0 ? max : max - 1;
        return history.slice(history.length - keep);
    }

    /**
     * Appends a user-assistant turn pair to the history.
     */
    private _appendTurn(history: Message[], prompt: string, response: string): Message[] {
        return [
            ...history,
            { role: 'user', content: prompt },
            { role: 'assistant', content: response },
        ];
    }

    /**
     * Creates the AI provider instance (currently only Anthropic supported).
     */
    private _buildProvider(_request: IAgentRequest): AnthropicProvider {
        const apiKey = process.env['ANTHROPIC_API_KEY'] ?? '';
        if (!apiKey) log.warn('ANTHROPIC_API_KEY is not set');
        //TODO: support other providers via request.provider once @i-clavdivs/models exposes OpenAIProvider
        return new AnthropicProvider(apiKey);
    }

    /**
     * Extracts text delta from a stream chunk.
     */
    private _extractChunkText(chunk: CompletionChunk): string {
        const delta = chunk.delta;
        return typeof delta === 'string' ? delta : delta.type === 'text' ? delta.text : '';
    }

    /**
     * Creates an error result payload.
     */
    private _errorResult(message: string, startedAt: number): IAgentRunResult {
        log.error(`run failed: ${message}`);
        return {
            payloads: [{ text: message, isError: true }],
            meta: {
                durationMs: Date.now() - startedAt,
                error: { kind: 'unknown', message },
            },
        };
    }
}
