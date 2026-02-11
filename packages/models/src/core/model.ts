//base model interface and abstract class

import type {
    CompletionRequest,
    CompletionResponse,
    CompletionChunk,
    ModelDefinition,
} from './types.js';

/**
 * Base interface for all LLM models
 */
export interface IModel {
    /**
     * Get model definition with capabilities and pricing
     */
    getDefinition(): ModelDefinition;

    /**
     * Complete a prompt with this model
     */
    complete(request: CompletionRequest): Promise<CompletionResponse>;

    /**
     * Stream completion responses
     */
    stream(request: CompletionRequest): AsyncGenerator<CompletionChunk, void, undefined>;
}

/**
 * Abstract base class for model implementations
 */
export abstract class BaseModel implements IModel {
    protected _definition: ModelDefinition;

    public constructor(definition: ModelDefinition) {
        this._definition = definition;
    }

    public getDefinition(): ModelDefinition {
        return {
            ...this._definition,
            cost: { ...this._definition.cost },
            input: [...this._definition.input],
            output: [...this._definition.output],
            metadata: this._definition.metadata ? { ...this._definition.metadata } : undefined,
        };
    }

    /**
     * Subclasses must implement completion
     */
    public abstract complete(request: CompletionRequest): Promise<CompletionResponse>;

    /**
     * Subclasses must implement streaming
     */
    public abstract stream(
        request: CompletionRequest
    ): AsyncGenerator<CompletionChunk, void, undefined>;

    /**
     * Validate request before sending to provider
     */
    protected _validateRequest(request: CompletionRequest): void {
        if (!request.messages || request.messages.length === 0) {
            throw new Error('request must contain at least one message');
        }

        if (request.maxTokens && request.maxTokens > this._definition.maxTokens) {
            throw new Error(
                `maxTokens ${request.maxTokens} exceeds model limit ${this._definition.maxTokens}`
            );
        }

        if (request.temperature !== undefined) {
            if (request.temperature < 0 || request.temperature > 2) {
                throw new Error('temperature must be between 0 and 2');
            }
        }

        if (request.topP !== undefined) {
            if (request.topP < 0 || request.topP > 1) {
                throw new Error('topP must be between 0 and 1');
            }
        }
    }

    /**
     * Calculate cost based on token usage
     */
    protected _calculateCost(inputTokens: number, outputTokens: number): number {
        const inputCost = (inputTokens / 1_000_000) * this._definition.cost.input;
        const outputCost = (outputTokens / 1_000_000) * this._definition.cost.output;
        return inputCost + outputCost;
    }
}
