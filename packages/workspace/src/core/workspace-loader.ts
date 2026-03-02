import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { IWorkspaceFile, IWorkspaceConfig, WorkspaceFileName } from '../types/workspace.js';

const DEFAULT_WORKSPACE_DIR = path.join(os.homedir(), '.i-clavdivs', 'workspace');

const WORKSPACE_FILE_NAMES: WorkspaceFileName[] = [
    'SOUL.md',
    'TOOLS.md',
    'IDENTITY.md',
    'USER.md',
    'HEARTBEAT.md',
    'MEMORY.md',
];

/**
 * Loads all workspace files from the configured directory.
 */
export async function loadWorkspaceFiles(
    config: Partial<IWorkspaceConfig> = {}
): Promise<IWorkspaceFile[]> {
    const workspaceDir = config.workspaceDir ?? DEFAULT_WORKSPACE_DIR;

    // Ensure workspace directory exists
    await fs.mkdir(workspaceDir, { recursive: true });

    const files: IWorkspaceFile[] = [];

    for (const fileName of WORKSPACE_FILE_NAMES) {
        const filePath = path.join(workspaceDir, fileName);

        try {
            const content = await fs.readFile(filePath, 'utf-8');
            files.push({
                name: fileName,
                path: filePath,
                content: stripFrontmatter(content),
                missing: false,
            });
        } catch (error) {
            // File doesn't exist - that's OK, mark as missing
            files.push({
                name: fileName,
                path: filePath,
                missing: true,
            });
        }
    }

    return files;
}

/**
 * Load a specific workspace file.
 */
export async function loadWorkspaceFile(
    fileName: WorkspaceFileName,
    config: Partial<IWorkspaceConfig> = {}
): Promise<IWorkspaceFile> {
    const workspaceDir = config.workspaceDir ?? DEFAULT_WORKSPACE_DIR;
    const filePath = path.join(workspaceDir, fileName);

    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return {
            name: fileName,
            path: filePath,
            content: stripFrontmatter(content),
            missing: false,
        };
    } catch (error) {
        return {
            name: fileName,
            path: filePath,
            missing: true,
        };
    }
}

/**
 * Strip YAML frontmatter from markdown content.
 */
function stripFrontmatter(content: string): string {
    const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    if (!normalized.startsWith('---')) {
        return content;
    }

    const endIndex = normalized.indexOf('\n---', 3);
    if (endIndex === -1) {
        return content;
    }

    // Return content after the closing ---
    return normalized.slice(endIndex + 4).trim();
}

/**
 * Get the default workspace directory path.
 */
export function getDefaultWorkspaceDir(): string {
    return DEFAULT_WORKSPACE_DIR;
}
