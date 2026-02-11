//provider abstraction for managing multiple models

import type { IModel } from './model.js';
import type { ProviderConfig, ModelDefinition, AuthCredential } from './types.js';

/**
 * Base interface for LLM providers
 */
export interface IProvider {
    /**
     * Get provider configuration
     */
    getConfig(): ProviderConfig;

    /**
     * Get a specific model by id
     */
    getModel(modelId: string): IModel | undefined;

    /**
     * Get all available models
     */
    getModels(): IModel[];

    /**
     * List all model definitions
     */
    listModels(): ModelDefinition[];

    /**
     * Test provider connectivity and authentication
     */
    test(): Promise<boolean>;
}

/**
 * Abstract base class for provider implementations
 */
export abstract class BaseProvider implements IProvider {
    protected _config: ProviderConfig;
    protected _models: Map<string, IModel>;

    public constructor(config: ProviderConfig) {
        this._config = config;
        this._models = new Map();
        this._initializeModels();
    }

    public getConfig(): ProviderConfig {
        return { ...this._config };
    }

    public getModel(modelId: string): IModel | undefined {
        return this._models.get(modelId);
    }

    public getModels(): IModel[] {
        return Array.from(this._models.values());
    }

    public listModels(): ModelDefinition[] {
        return Array.from(this._models.values()).map((model) => model.getDefinition());
    }

    /**
     * Update authentication credential
     */
    public updateAuth(auth: AuthCredential): void {
        this._config.auth = auth;
    }

    /**
     * Test provider connectivity
     */
    public abstract test(): Promise<boolean>;

    /**
     * Initialize models from config
     * Subclasses should override to create model instances
     */
    protected abstract _initializeModels(): void;

    /**
     * Build authorization header from credential
     */
    protected _buildAuthHeader(): string {
        const { auth } = this._config;
        switch (auth.type) {
            case 'api-key':
                return `Bearer ${auth.key}`;
            case 'bearer-token':
                return `Bearer ${auth.token}`;
            case 'oauth':
                return `Bearer ${auth.accessToken}`;
            default:
                throw new Error(`unsupported auth type: ${(auth as any).type}`);
        }
    }

    /**
     * Build headers for http requests
     */
    protected _buildHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...this._config.headers,
        };

        //add authorization header
        const authHeader = this._buildAuthHeader();
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }

        return headers;
    }

    /**
     * Make http request to provider api
     */
    public async _request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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

        return response.json() as Promise<T>;
    }

    /**
     * Parse error from response
     */
    protected async _parseError(response: Response): Promise<string> {
        try {
            const body: any = await response.json();
            return body.error?.message || body.message || response.statusText;
        } catch {
            return response.statusText;
        }
    }
}

/**
 * Registry for managing multiple providers
 */
export class ProviderRegistry {
    private _providers: Map<string, IProvider>;

    public constructor() {
        this._providers = new Map();
    }

    /**
     * Register a provider
     */
    public register(provider: IProvider): void {
        const config = provider.getConfig();
        this._providers.set(config.id, provider);
    }

    /**
     * Unregister a provider
     */
    public unregister(providerId: string): void {
        this._providers.delete(providerId);
    }

    /**
     * Get a provider by id
     */
    public getProvider(providerId: string): IProvider | undefined {
        return this._providers.get(providerId);
    }

    /**
     * Get all registered providers
     */
    public getProviders(): IProvider[] {
        return Array.from(this._providers.values());
    }

    /**
     * Get a model by provider and model id
     */
    public getModel(providerId: string, modelId: string): IModel | undefined {
        const provider = this._providers.get(providerId);
        return provider?.getModel(modelId);
    }

    /**
     * List all available models across all providers
     */
    public listAllModels(): ModelDefinition[] {
        const models: ModelDefinition[] = [];
        for (const provider of this._providers.values()) {
            models.push(...provider.listModels());
        }
        return models;
    }
}
