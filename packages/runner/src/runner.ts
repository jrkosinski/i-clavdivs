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
            log.debug(`run end: sessionId=${request.sessionId} durationMs=${Date.now() - startedAt}`);
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

    private async _execute(request: IAgentRequest, startedAt: number): Promise<IAgentRunResult> {
        const provider = this._buildProvider(request);
        const model = provider.getModel(request.model);
        if (!model) {
            return this._errorResult(`model not found: ${request.model}`, startedAt);
        }

        const history = await this._store.load(request.sessionId);
        const messages = this._buildMessages(request, history);

        try {
            const responseText = this._config.onChunk
                ? await this._streamResponse(model, messages, request)
                : await this._completeResponse(model, messages, request);

            const updatedHistory = this._appendTurn(history, request.prompt, responseText);
            await this._store.save(request.sessionId, updatedHistory);

            return {
                payloads: [{ text: responseText }],
                meta: { durationMs: Date.now() - startedAt },
            };
        } catch (err) {
            return this._errorResult(String(err), startedAt);
        }
    }

    private async _completeResponse(
        model: ReturnType<AnthropicProvider['getModel']>,
        messages: Message[],
        request: IAgentRequest,
    ): Promise<string> {
        const response = await model!.complete({
            model: request.model,
            messages,
            maxTokens: request.maxTokens,
            temperature: request.temperature,
        });
        const content = response.content;
        return typeof content === 'string' ? content : content.map(c => c.type === 'text' ? c.text : '').join('');
    }

    private async _streamResponse(
        model: ReturnType<AnthropicProvider['getModel']>,
        messages: Message[],
        request: IAgentRequest,
    ): Promise<string> {
        const chunks: string[] = [];
        for await (const chunk of model!.stream({ model: request.model, messages, maxTokens: request.maxTokens, temperature: request.temperature })) {
            const delta = this._chunkText(chunk);
            if (delta) {
                chunks.push(delta);
                this._config.onChunk!(delta);
            }
        }
        return chunks.join('');
    }

    private _buildMessages(request: IAgentRequest, history: Message[]): Message[] {
        const systemPrompt = SystemPrompt.build({
            model: request.model,
            workspaceDir: request.workspaceDir ?? process.cwd(),
            extra: this._config.extraSystemPrompt,
        });

        const systemMessage: Message = { role: 'system', content: systemPrompt };
        const userMessage: Message = { role: 'user', content: request.prompt };
        const trimmed = this._trimHistory(history);

        return [systemMessage, ...trimmed, userMessage];
    }

    private _trimHistory(history: Message[]): Message[] {
        const max = this._config.maxHistoryMessages ?? 40;
        if (history.length <= max) return history;
        //keep the most recent messages, always in pairs to preserve turn structure
        const keep = max % 2 === 0 ? max : max - 1;
        return history.slice(history.length - keep);
    }

    private _appendTurn(history: Message[], prompt: string, response: string): Message[] {
        return [
            ...history,
            { role: 'user', content: prompt },
            { role: 'assistant', content: response },
        ];
    }

    private _buildProvider(_request: IAgentRequest): AnthropicProvider {
        const apiKey = process.env['ANTHROPIC_API_KEY'] ?? '';
        if (!apiKey) log.warn('ANTHROPIC_API_KEY is not set');
        //TODO: support other providers via request.provider once @i-clavdivs/models exposes OpenAIProvider
        return new AnthropicProvider(apiKey);
    }

    private _chunkText(chunk: CompletionChunk): string {
        const delta = chunk.delta;
        return typeof delta === 'string' ? delta : (delta.type === 'text' ? delta.text : '');
    }

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
