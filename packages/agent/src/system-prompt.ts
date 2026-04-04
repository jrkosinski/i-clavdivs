/**
 * Builds the system prompt injected at the start of every agent session.
 * Kept minimal for Phase 1 — just date, cwd, and model identity.
 */

import os from 'node:os';

export interface ISystemPromptParams {
    model: string;
    workspaceDir: string;
    extra?: string;
}

/**
 * Produces a concise system prompt string for the agent.
 */
export class SystemPrompt {
    /** Builds the system prompt text from the given params. */
    public static build(params: ISystemPromptParams): string {
        const coreLines = this._buildCoreLines(params);
        const allLines = this._addExtraIfPresent(coreLines, params.extra);
        return allLines.join('\n');
    }

    /**
     * Builds the core system prompt lines with context information.
     */
    private static _buildCoreLines(params: ISystemPromptParams): string[] {
        return [
            `You are a helpful assistant.`,
            `Date: ${new Date().toISOString()}`,
            `OS: ${os.type()} ${os.release()}`,
            `Working directory: ${params.workspaceDir}`,
            `Model: ${params.model}`,
        ];
    }

    /**
     * Appends extra prompt text if provided.
     */
    private static _addExtraIfPresent(lines: string[], extra?: string): string[] {
        if (extra?.trim()) {
            return [...lines, extra.trim()];
        }
        return lines;
    }
}
