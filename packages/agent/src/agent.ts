/**
 * Agent: implements IAgent using AnthropicProvider from @i-clavdivs/models.
 *
 * Replaces pi-coding-agent's createAgentSession + SessionManager loop.
 * Phase 1: plain text completions only (no tools, no compaction).
 */

import process from 'node:process';
import { AnthropicProvider } from '@i-clavdivs/models';
import type { Message, CompletionChunk } from '@i-clavdivs/models';
import type { IAgent, IAgentRequest, IAgentRunResult } from '@i-clavdivs/agents';
import { SessionStore } from './session-store.js';
import { SystemPrompt } from './system-prompt.js';
import { log } from './logger.js';
import { buildSystemPromptWithWorkspace, type IWorkspaceFile } from '@i-clavdivs/workspace';

export interface IAgentConfig {
    /** Unique agent identifier (e.g., "alan-watts", "conan") */
    id: string;
    /** Human-readable agent name (defaults to id if not provided) */
    name?: string;
    /** Default AI provider for this agent (e.g., "anthropic", "openai"). Defaults to "anthropic". */
    provider?: string;
    /** Default model identifier for this agent. Defaults to "claude-sonnet-4-5-20250929". */
    model?: string;
    /** Default temperature for sampling (0-1). */
    temperature?: number;
    /** Default maximum tokens for response. */
    maxTokens?: number;
    /** Working directory for agent operations. */
    workspaceDir?: string;
    /** Max messages to retain in history before truncating oldest turns. Defaults to 40. */
    maxHistoryMessages?: number;
    /** Directory to store session files. Defaults to ~/.i-clavdivs/sessions/<agentId>. */
    sessionDir?: string;
    /** Called with each streamed text chunk if streaming is desired. */
    onChunk?: (chunk: string) => void;
    /** Extra text appended to the system prompt. */
    extraSystemPrompt?: string;
    /** Workspace files to include in system prompt (SOUL.md, TOOLS.md, etc.) */
    workspaceFiles?: IWorkspaceFile[];
}

/**
 * Simplified agent request that uses agent's default model configuration.
 */
export interface IAgentSimpleRequest {
    /** Unique session identifier */
    sessionId: string;
    /** User prompt/message */
    prompt: string;
    /** Override agent's default provider */
    provider?: string;
    /** Override agent's default model */
    model?: string;
    /** Override agent's default temperature */
    temperature?: number;
    /** Override agent's default max tokens */
    maxTokens?: number;
    /** Additional request metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Statistics about an agent's current state.
 */
export interface IAgentStats {
    id: string;
    name: string;
    provider: string;
    model: string;
    activeSessions: number;
    pendingSessions: number;
}

/**
 * Runs agent turns against the Anthropic API, persisting conversation
 * history to disk between calls.
 */
export class Agent implements IAgent {
    public readonly id: string;
    public readonly name: string;

    private readonly _config: IAgentConfig;
    private readonly _store: SessionStore;
    private readonly _defaultProvider: string;
    private readonly _defaultModel: string;
    private readonly _defaultTemperature?: number;
    private readonly _defaultMaxTokens?: number;
    private readonly _active: Set<string> = new Set();
    private readonly _pending: Map<string, Promise<IAgentRunResult>> = new Map();
    private _provider?: AnthropicProvider;
    private _initialized = false;
    private _disposed = false;

    public constructor(config: IAgentConfig) {
        if (!config.id) {
            throw new Error('Agent id is required');
        }

        this.id = config.id;
        this.name = config.name ?? config.id;
        this._defaultProvider = config.provider ?? 'anthropic';
        this._defaultModel = config.model ?? 'claude-sonnet-4-5-20250929';
        this._defaultTemperature = config.temperature;
        this._defaultMaxTokens = config.maxTokens;
        this._config = config;
        this._store = new SessionStore(config.sessionDir);

        log.info(`[Agent:${this.id}] created: name=${this.name} model=${this._defaultModel}`);
    }

    /**
     * Initialize the agent (validate configuration, ensure session directory exists).
     * Must be called before using the agent.
     */
    public async initialize(): Promise<void> {
        if (this._initialized) {
            throw new Error(`Agent ${this.id} already initialized`);
        }

        //ensure session directory exists
        await this._store.initialize();

        //validate that the default model is available
        const provider = this._getProvider();
        const model = provider.getModel(this._defaultModel);
        if (!model) {
            throw new Error(`Model not available: ${this._defaultModel}`);
        }

        this._initialized = true;
        log.info(`[Agent:${this.id}] initialized successfully`);
    }

    /**
     * Cleanup resources when agent is no longer needed.
     * Waits for pending requests to complete before disposing.
     */
    public async dispose(): Promise<void> {
        if (this._disposed) {
            return;
        }

        //wait for pending requests to complete
        if (this._pending.size > 0) {
            log.info(
                `[Agent:${this.id}] waiting for ${String(this._pending.size)} pending requests...`
            );
            await Promise.all(this._pending.values());
        }

        //cleanup resources
        this._active.clear();
        this._pending.clear();
        this._provider = undefined;

        this._disposed = true;
        log.info(`[Agent:${this.id}] disposed`);
    }

    /**
     * Check if agent is ready to handle requests.
     */
    public isReady(): boolean {
        return this._initialized && !this._disposed;
    }

    /**
     * Execute a request using agent's default model configuration.
     * Simplified interface that doesn't require model/provider on every call.
     */
    public async execute(request: IAgentSimpleRequest): Promise<IAgentRunResult> {
        //build full request with agent's defaults
        const fullRequest: IAgentRequest = {
            sessionId: request.sessionId,
            prompt: request.prompt,
            provider: request.provider ?? this._defaultProvider,
            model: request.model ?? this._defaultModel,
            temperature: request.temperature ?? this._defaultTemperature,
            maxTokens: request.maxTokens ?? this._defaultMaxTokens,
            workspaceDir: this._config.workspaceDir,
            metadata: request.metadata,
        };

        return this.run(fullRequest);
    }

    /**
     * Executes a single agent turn and returns the result.
     * For backwards compatibility and cases where caller wants to override defaults.
     */
    public async run(request: IAgentRequest): Promise<IAgentRunResult> {
        if (!this.isReady()) {
            throw new Error(
                `Agent ${this.id} is not ready. Call initialize() first or check if disposed.`
            );
        }

        const startedAt = Date.now();
        log.debug(
            `[Agent:${this.id}] run start: sessionId=${request.sessionId} model=${request.model}`
        );

        //if there's already a request running for this session, wait for it
        const existing = this._pending.get(request.sessionId);
        if (existing) {
            log.debug(
                `[Agent:${this.id}] run queued: sessionId=${request.sessionId} (waiting for active request)`
            );
            await existing;
            log.debug(
                `[Agent:${this.id}] run resuming: sessionId=${request.sessionId} (previous request complete)`
            );
        }

        //create and track the promise for this request
        const promise = this._executeWithTracking(request, startedAt);
        this._pending.set(request.sessionId, promise);

        try {
            return await promise;
        } finally {
            this._pending.delete(request.sessionId);
        }
    }

    /**
     * Executes a request and manages the active session tracking.
     */
    private async _executeWithTracking(
        request: IAgentRequest,
        startedAt: number
    ): Promise<IAgentRunResult> {
        this._active.add(request.sessionId);
        try {
            return await this._execute(request, startedAt);
        } finally {
            this._active.delete(request.sessionId);
            log.debug(
                `[Agent:${this.id}] run end: sessionId=${request.sessionId} durationMs=${Date.now() - startedAt}`
            );
        }
    }

    /**
     * Aborts an active run. Returns true if the session was active.
     */
    public async abort(sessionId: string): Promise<boolean> {
        //Phase 1: no in-flight abort; just report whether it was active
        return this._active.has(sessionId);
    }

    /**
     * Returns true if a run for this session is currently in progress.
     */
    public isActive(sessionId: string): boolean {
        return this._active.has(sessionId);
    }

    /**
     * Lists all session IDs for this agent.
     */
    public async listSessions(): Promise<string[]> {
        return this._store.listSessions();
    }

    /**
     * Gets the conversation history for a specific session.
     */
    public async getSessionHistory(sessionId: string): Promise<Message[]> {
        return this._store.load(sessionId);
    }

    /**
     * Deletes a specific session.
     */
    public async deleteSession(sessionId: string): Promise<void> {
        await this._store.delete(sessionId);
        log.info(`[Agent:${this.id}] deleted session: ${sessionId}`);
    }

    /**
     * Clears all sessions for this agent.
     */
    public async clearAllSessions(): Promise<void> {
        await this._store.clear();
        log.info(`[Agent:${this.id}] cleared all sessions`);
    }

    /**
     * Gets current statistics about this agent.
     */
    public getStats(): IAgentStats {
        return {
            id: this.id,
            name: this.name,
            provider: this._defaultProvider,
            model: this._defaultModel,
            activeSessions: this._active.size,
            pendingSessions: this._pending.size,
        };
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
            await this._saveConversationTurn(
                request.sessionId,
                history,
                request.prompt,
                responseText
            );

            return this._buildSuccessResult(responseText, startedAt);
        } catch (err) {
            return this._errorResult(String(err), startedAt);
        }
    }

    /**
     * Resolves and validates the model from the provider.
     */
    private _resolveModel(
        request: IAgentRequest
    ): ReturnType<AnthropicProvider['getModel']> | null {
        const provider = this._getProvider();
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
     * If workspace files are provided, builds an enhanced prompt with SOUL.md and other context.
     */
    private _buildSystemPrompt(request: IAgentRequest): string {
        const workspaceFiles = this._config.workspaceFiles ?? [];
        const workspaceDir = this._config.workspaceDir ?? process.cwd();

        if (workspaceFiles.length > 0) {
            return buildSystemPromptWithWorkspace({
                basePrompt: this._config.extraSystemPrompt,
                workspaceFiles,
                workspaceDir,
                model: request.model,
            });
        }

        //fallback to minimal prompt if no workspace files
        return SystemPrompt.build({
            model: request.model,
            workspaceDir,
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
     * Gets or creates the cached AI provider instance.
     */
    private _getProvider(): AnthropicProvider {
        if (!this._provider) {
            const apiKey = process.env['ANTHROPIC_API_KEY'] ?? '';
            if (!apiKey) {
                log.warn(`[Agent:${this.id}] ANTHROPIC_API_KEY is not set`);
            }
            //TODO: support other providers via request.provider once @i-clavdivs/models exposes OpenAIProvider
            this._provider = new AnthropicProvider(apiKey);
        }
        return this._provider;
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
        log.error(`[Agent:${this.id}] run failed: ${message}`);
        return {
            payloads: [{ text: message, isError: true }],
            meta: {
                durationMs: Date.now() - startedAt,
                error: { kind: 'unknown', message },
                agentMeta: {
                    sessionId: '',
                    provider: this._defaultProvider,
                    model: this._defaultModel,
                },
            },
        };
    }
}

export class SuperAgent implements IAgent {
    public readonly id: string;
    public readonly name: string;

    private readonly _config: IAgentConfig;
    private readonly _store: SessionStore;
    private readonly _defaultProvider: string;
    private readonly _defaultModel: string;
    private readonly _defaultTemperature?: number;
    private readonly _defaultMaxTokens?: number;
    private readonly _active: Set<string> = new Set();
    private readonly _pending: Map<string, Promise<IAgentRunResult>> = new Map();
    private _provider?: AnthropicProvider;
    private _initialized = false;
    private _disposed = false;

    /**
     * Initialize the agent (validate configuration, ensure session directory exists).
     * Must be called before using the agent.
     */
    public async initialize(): Promise<void> {
        if (this._initialized) {
            throw new Error(`Agent ${this.id} already initialized`);
        }

        //ensure session directory exists
        await this._store.initialize();

        //validate that the default model is available
        const provider = this._getProvider();
        const model = provider.getModel(this._defaultModel);
        if (!model) {
            throw new Error(`Model not available: ${this._defaultModel}`);
        }

        this._initialized = true;
        log.info(`[Agent:${this.id}] initialized successfully`);
    }

    /**
     * Cleanup resources when agent is no longer needed.
     * Waits for pending requests to complete before disposing.
     */
    public async dispose(): Promise<void> {
        if (this._disposed) {
            return;
        }

        //wait for pending requests to complete
        if (this._pending.size > 0) {
            log.info(
                `[Agent:${this.id}] waiting for ${String(this._pending.size)} pending requests...`
            );
            await Promise.all(this._pending.values());
        }

        //cleanup resources
        this._active.clear();
        this._pending.clear();
        this._provider = undefined;

        this._disposed = true;
        log.info(`[Agent:${this.id}] disposed`);
    }

    /**
     * Check if agent is ready to handle requests.
     */
    public isReady(): boolean {
        return this._initialized && !this._disposed;
    }

    /**
     * Execute a request using agent's default model configuration.
     * Simplified interface that doesn't require model/provider on every call.
     */
    public async execute(request: IAgentSimpleRequest): Promise<IAgentRunResult> {
        //build full request with agent's defaults
        const fullRequest: IAgentRequest = {
            sessionId: request.sessionId,
            prompt: request.prompt,
            provider: request.provider ?? this._defaultProvider,
            model: request.model ?? this._defaultModel,
            temperature: request.temperature ?? this._defaultTemperature,
            maxTokens: request.maxTokens ?? this._defaultMaxTokens,
            workspaceDir: this._config.workspaceDir,
            metadata: request.metadata,
        };

        return this.run(fullRequest);
    }

    /**
     * Executes a single agent turn and returns the result.
     * For backwards compatibility and cases where caller wants to override defaults.
     */
    public async run(request: IAgentRequest): Promise<IAgentRunResult> {
        if (!this.isReady()) {
            throw new Error(
                `Agent ${this.id} is not ready. Call initialize() first or check if disposed.`
            );
        }

        const startedAt = Date.now();
        log.debug(
            `[Agent:${this.id}] run start: sessionId=${request.sessionId} model=${request.model}`
        );

        //if there's already a request running for this session, wait for it
        const existing = this._pending.get(request.sessionId);
        if (existing) {
            log.debug(
                `[Agent:${this.id}] run queued: sessionId=${request.sessionId} (waiting for active request)`
            );
            await existing;
            log.debug(
                `[Agent:${this.id}] run resuming: sessionId=${request.sessionId} (previous request complete)`
            );
        }
    }
}
