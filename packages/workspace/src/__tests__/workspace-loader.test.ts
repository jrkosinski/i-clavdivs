import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
    loadWorkspaceFiles,
    loadWorkspaceFile,
    getDefaultWorkspaceDir,
} from '../core/workspace-loader.js';
import type { WorkspaceFileName } from '../types/workspace.js';

describe('workspace-loader', () => {
    let testDir: string;

    beforeEach(async () => {
        // Create a temporary test directory
        testDir = path.join(os.tmpdir(), `workspace-test-${Date.now()}`);
        await fs.mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
        // Clean up test directory
        await fs.rm(testDir, { recursive: true, force: true });
    });

    describe('getDefaultWorkspaceDir', () => {
        it('should return the correct default workspace directory', () => {
            const defaultDir = getDefaultWorkspaceDir();
            const expected = path.join(os.homedir(), '.i-clavdivs', 'workspace');
            expect(defaultDir).toBe(expected);
        });
    });

    describe('loadWorkspaceFiles', () => {
        it('should create workspace directory if it does not exist', async () => {
            const nonExistentDir = path.join(testDir, 'new-workspace');
            await loadWorkspaceFiles({ workspaceDir: nonExistentDir });

            const exists = await fs
                .access(nonExistentDir)
                .then(() => true)
                .catch(() => false);
            expect(exists).toBe(true);
        });

        it('should load all expected workspace file names', async () => {
            const files = await loadWorkspaceFiles({ workspaceDir: testDir });

            const expectedNames: WorkspaceFileName[] = [
                'SOUL.md',
                'TOOLS.md',
                'IDENTITY.md',
                'USER.md',
                'HEARTBEAT.md',
                'MEMORY.md',
            ];

            expect(files).toHaveLength(expectedNames.length);
            expect(files.map((f) => f.name)).toEqual(expectedNames);
        });

        it('should mark missing files with missing: true', async () => {
            const files = await loadWorkspaceFiles({ workspaceDir: testDir });

            // All files should be missing initially
            files.forEach((file) => {
                expect(file.missing).toBe(true);
                expect(file.content).toBeUndefined();
            });
        });

        it('should load existing files with content', async () => {
            const soulContent = 'I am a helpful assistant.';
            await fs.writeFile(path.join(testDir, 'SOUL.md'), soulContent);

            const files = await loadWorkspaceFiles({ workspaceDir: testDir });

            const soulFile = files.find((f) => f.name === 'SOUL.md');
            expect(soulFile).toBeDefined();
            expect(soulFile!.missing).toBe(false);
            expect(soulFile!.content).toBe(soulContent);
        });

        it('should strip YAML frontmatter correctly', async () => {
            const contentWithFrontmatter = `---
title: Soul Configuration
version: 1.0
---
This is the actual content.`;

            await fs.writeFile(path.join(testDir, 'SOUL.md'), contentWithFrontmatter);

            const files = await loadWorkspaceFiles({ workspaceDir: testDir });
            const soulFile = files.find((f) => f.name === 'SOUL.md');

            expect(soulFile!.content).toBe('This is the actual content.');
        });

        it('should handle files with no frontmatter', async () => {
            const content = 'No frontmatter here.';
            await fs.writeFile(path.join(testDir, 'TOOLS.md'), content);

            const files = await loadWorkspaceFiles({ workspaceDir: testDir });
            const toolsFile = files.find((f) => f.name === 'TOOLS.md');

            expect(toolsFile!.content).toBe(content);
        });

        it('should handle incomplete frontmatter (no closing ---)', async () => {
            const content = `---
title: Incomplete
This content has no closing frontmatter marker.`;

            await fs.writeFile(path.join(testDir, 'IDENTITY.md'), content);

            const files = await loadWorkspaceFiles({ workspaceDir: testDir });
            const identityFile = files.find((f) => f.name === 'IDENTITY.md');

            // Should return original content if frontmatter is incomplete
            expect(identityFile!.content).toBe(content);
        });

        it('should handle frontmatter not at start of file', async () => {
            const content = `Some content first
---
title: Not at start
---
More content`;

            await fs.writeFile(path.join(testDir, 'USER.md'), content);

            const files = await loadWorkspaceFiles({ workspaceDir: testDir });
            const userFile = files.find((f) => f.name === 'USER.md');

            // Should return original content if frontmatter doesn't start at beginning
            expect(userFile!.content).toBe(content);
        });

        it('should normalize CRLF line endings', async () => {
            const contentWithCRLF = `---\r\ntitle: Test\r\n---\r\nContent with CRLF`;
            await fs.writeFile(path.join(testDir, 'HEARTBEAT.md'), contentWithCRLF);

            const files = await loadWorkspaceFiles({ workspaceDir: testDir });
            const heartbeatFile = files.find((f) => f.name === 'HEARTBEAT.md');

            expect(heartbeatFile!.content).toBe('Content with CRLF');
        });

        it('should use custom workspace directory from config', async () => {
            const customDir = path.join(testDir, 'custom-workspace');
            await fs.mkdir(customDir, { recursive: true });
            await fs.writeFile(path.join(customDir, 'SOUL.md'), 'Custom location');

            const files = await loadWorkspaceFiles({ workspaceDir: customDir });
            const soulFile = files.find((f) => f.name === 'SOUL.md');

            expect(soulFile!.missing).toBe(false);
            expect(soulFile!.content).toBe('Custom location');
            expect(soulFile!.path).toBe(path.join(customDir, 'SOUL.md'));
        });

        it('should handle mixed existing and missing files', async () => {
            await fs.writeFile(path.join(testDir, 'SOUL.md'), 'Soul content');
            await fs.writeFile(path.join(testDir, 'TOOLS.md'), 'Tools content');
            // IDENTITY.md, USER.md, HEARTBEAT.md, MEMORY.md don't exist

            const files = await loadWorkspaceFiles({ workspaceDir: testDir });

            const existingFiles = files.filter((f) => !f.missing);
            const missingFiles = files.filter((f) => f.missing);

            expect(existingFiles).toHaveLength(2);
            expect(missingFiles).toHaveLength(4);
        });

        it('should handle unicode and special characters in content', async () => {
            const unicodeContent = '你好世界 🌍 Здравствуй мир';
            await fs.writeFile(path.join(testDir, 'SOUL.md'), unicodeContent);

            const files = await loadWorkspaceFiles({ workspaceDir: testDir });
            const soulFile = files.find((f) => f.name === 'SOUL.md');

            expect(soulFile!.content).toBe(unicodeContent);
        });

        it('should handle empty files', async () => {
            await fs.writeFile(path.join(testDir, 'MEMORY.md'), '');

            const files = await loadWorkspaceFiles({ workspaceDir: testDir });
            const memoryFile = files.find((f) => f.name === 'MEMORY.md');

            expect(memoryFile!.missing).toBe(false);
            expect(memoryFile!.content).toBe('');
        });

        it('should strip frontmatter and preserve content whitespace', async () => {
            const contentWithWhitespace = `---
title: Test
---

  Indented content
    More indentation

End`;
            await fs.writeFile(path.join(testDir, 'SOUL.md'), contentWithWhitespace);

            const files = await loadWorkspaceFiles({ workspaceDir: testDir });
            const soulFile = files.find((f) => f.name === 'SOUL.md');

            expect(soulFile!.content).toBe(`Indented content
    More indentation

End`);
        });
    });

    describe('loadWorkspaceFile', () => {
        it('should load a specific file by name', async () => {
            const content = 'Specific file content';
            await fs.writeFile(path.join(testDir, 'TOOLS.md'), content);

            const file = await loadWorkspaceFile('TOOLS.md', { workspaceDir: testDir });

            expect(file.name).toBe('TOOLS.md');
            expect(file.missing).toBe(false);
            expect(file.content).toBe(content);
            expect(file.path).toBe(path.join(testDir, 'TOOLS.md'));
        });

        it('should return missing status for non-existent file', async () => {
            const file = await loadWorkspaceFile('IDENTITY.md', { workspaceDir: testDir });

            expect(file.name).toBe('IDENTITY.md');
            expect(file.missing).toBe(true);
            expect(file.content).toBeUndefined();
        });

        it('should strip frontmatter from single file', async () => {
            const contentWithFrontmatter = `---
author: Test
---
Main content here`;
            await fs.writeFile(path.join(testDir, 'USER.md'), contentWithFrontmatter);

            const file = await loadWorkspaceFile('USER.md', { workspaceDir: testDir });

            expect(file.content).toBe('Main content here');
        });

        it('should use custom workspace directory', async () => {
            const customDir = path.join(testDir, 'another-custom');
            await fs.mkdir(customDir, { recursive: true });
            await fs.writeFile(path.join(customDir, 'HEARTBEAT.md'), 'Heartbeat data');

            const file = await loadWorkspaceFile('HEARTBEAT.md', { workspaceDir: customDir });

            expect(file.missing).toBe(false);
            expect(file.content).toBe('Heartbeat data');
            expect(file.path).toBe(path.join(customDir, 'HEARTBEAT.md'));
        });

        it('should handle empty file names gracefully', async () => {
            await fs.writeFile(path.join(testDir, 'SOUL.md'), '');

            const file = await loadWorkspaceFile('SOUL.md', { workspaceDir: testDir });

            expect(file.missing).toBe(false);
            expect(file.content).toBe('');
        });
    });
});
