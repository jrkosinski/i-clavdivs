import type { IWorkspaceFile } from '../types/workspace.js';

/**
 * Build an enhanced system prompt that includes workspace file content.
 */
export function buildSystemPromptWithWorkspace(params: {
    basePrompt?: string;
    workspaceFiles: IWorkspaceFile[];
    workspaceDir: string;
    model?: string;
}): string {
    const lines: string[] = [];

    // Start with base identity
    lines.push('You are a personal assistant.');
    lines.push('');

    // Add model info
    if (params.model) {
        lines.push(`Model: ${params.model}`);
    }

    // Add workspace directory
    lines.push(`Working directory: ${params.workspaceDir}`);
    lines.push('');

    // Filter to only files that exist and have content
    const validFiles = params.workspaceFiles.filter(
        (file) => !file.missing && file.content && file.content.trim().length > 0
    );

    if (validFiles.length > 0) {
        const hasSoulFile = validFiles.some((file) => file.name.toLowerCase() === 'soul.md');

        lines.push('# Workspace Context');
        lines.push('');
        lines.push('The following workspace files have been loaded:');

        if (hasSoulFile) {
            lines.push('');
            lines.push(
                'IMPORTANT: If SOUL.md is present, embody its persona and tone. ' +
                    'Avoid stiff, generic replies; follow its guidance unless higher-priority instructions override it.'
            );
        }

        lines.push('');

        // Add each workspace file as a section
        for (const file of validFiles) {
            lines.push(`## ${file.name}`);
            lines.push('');
            lines.push(file.content!);
            lines.push('');
        }
    }

    // Add any additional base prompt content
    if (params.basePrompt?.trim()) {
        lines.push('## Additional Context');
        lines.push('');
        lines.push(params.basePrompt.trim());
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Build a minimal system prompt (for when workspace files aren't needed).
 */
export function buildMinimalSystemPrompt(params: {
    workspaceDir: string;
    model?: string;
    extra?: string;
}): string {
    const lines: string[] = [];

    lines.push('You are a helpful assistant.');

    if (params.model) {
        lines.push(`Model: ${params.model}`);
    }

    lines.push(`Working directory: ${params.workspaceDir}`);

    if (params.extra?.trim()) {
        lines.push('');
        lines.push(params.extra.trim());
    }

    return lines.join('\n');
}
