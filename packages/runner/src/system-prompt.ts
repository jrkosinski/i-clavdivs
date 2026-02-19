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
        const lines: string[] = [
            `You are a helpful assistant.`,
            `Date: ${new Date().toISOString()}`,
            `OS: ${os.type()} ${os.release()}`,
            `Working directory: ${params.workspaceDir}`,
            `Model: ${params.model}`,
        ];
        if (params.extra?.trim()) lines.push(params.extra.trim());
        return lines.join('\n');
    }
}
