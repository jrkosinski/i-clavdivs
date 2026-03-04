/**
 * Workspace file names loaded by the system.
 */
export type WorkspaceFileName =
    | 'SOUL.md'
    | 'TOOLS.md'
    | 'IDENTITY.md'
    | 'USER.md'
    | 'HEARTBEAT.md'
    | 'MEMORY.md';

/**
 * A loaded workspace file with its content.
 */
export interface IWorkspaceFile {
    /** File name (e.g., 'SOUL.md') */
    name: WorkspaceFileName;
    /** Full path to the file */
    path: string;
    /** File content (raw markdown) */
    content?: string;
    /** Whether the file was missing from disk */
    missing: boolean;
}

/**
 * Configuration for workspace loading.
 */
export interface IWorkspaceConfig {
    /** Directory containing workspace files (default: ~/.i-clavdivs/workspace) */
    workspaceDir: string;
    /** Whether to create default files if missing */
    ensureDefaults?: boolean;
}
