/**
 * Workspace file loading and system prompt building.
 * Provides support for SOUL.md, TOOLS.md, and other personality/context files.
 */

export type { IWorkspaceFile, IWorkspaceConfig, WorkspaceFileName } from './types/workspace.js';
export {
    loadWorkspaceFiles,
    loadWorkspaceFile,
    getDefaultWorkspaceDir,
} from './core/workspace-loader.js';
export {
    buildSystemPromptWithWorkspace,
    buildMinimalSystemPrompt,
} from './core/system-prompt-builder.js';
