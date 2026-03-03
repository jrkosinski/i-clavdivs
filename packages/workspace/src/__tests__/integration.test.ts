import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { loadWorkspaceFiles } from '../core/workspace-loader.js';
import { buildSystemPromptWithWorkspace } from '../core/system-prompt-builder.js';

describe('workspace integration', () => {
    let testDir: string;

    beforeEach(async () => {
        testDir = path.join(os.tmpdir(), `workspace-integration-${Date.now()}`);
        await fs.mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
        await fs.rm(testDir, { recursive: true, force: true });
    });

    describe('full workflow: load files → build prompt', () => {
        it('should load files and build complete system prompt', async () => {
            // Create workspace files
            await fs.writeFile(
                path.join(testDir, 'SOUL.md'),
                `---
version: 1.0
---
I am a creative and empathetic assistant.`
            );
            await fs.writeFile(
                path.join(testDir, 'TOOLS.md'),
                'I have access to file operations and web search.'
            );
            await fs.writeFile(
                path.join(testDir, 'IDENTITY.md'),
                'I am Claudius, your personal AI assistant.'
            );

            // Load files
            const files = await loadWorkspaceFiles({ workspaceDir: testDir });

            // Build prompt
            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: files,
                workspaceDir: testDir,
                model: 'claude-3-opus',
                basePrompt: 'Always be helpful and concise.',
            });

            // Verify structure
            expect(prompt).toContain('You are a personal assistant.');
            expect(prompt).toContain('Model: claude-3-opus');
            expect(prompt).toContain(`Working directory: ${testDir}`);
            expect(prompt).toContain('# Workspace Context');
            expect(prompt).toContain('IMPORTANT: If SOUL.md is present');

            // Verify file contents (frontmatter should be stripped)
            expect(prompt).toContain('## SOUL.md');
            expect(prompt).toContain('I am a creative and empathetic assistant.');
            expect(prompt).not.toContain('version: 1.0');

            expect(prompt).toContain('## TOOLS.md');
            expect(prompt).toContain('I have access to file operations and web search.');

            expect(prompt).toContain('## IDENTITY.md');
            expect(prompt).toContain('I am Claudius, your personal AI assistant.');

            // Verify additional context
            expect(prompt).toContain('## Additional Context');
            expect(prompt).toContain('Always be helpful and concise.');
        });

        it('should handle workspace with mixed existing/missing files', async () => {
            // Only create some files
            await fs.writeFile(path.join(testDir, 'SOUL.md'), 'Soul personality');
            await fs.writeFile(path.join(testDir, 'MEMORY.md'), 'Memory content');
            // TOOLS.md, IDENTITY.md, USER.md, HEARTBEAT.md are missing

            const files = await loadWorkspaceFiles({ workspaceDir: testDir });
            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: files,
                workspaceDir: testDir,
            });

            // Should include existing files
            expect(prompt).toContain('## SOUL.md');
            expect(prompt).toContain('Soul personality');
            expect(prompt).toContain('## MEMORY.md');
            expect(prompt).toContain('Memory content');

            // Should not include missing files
            expect(prompt).not.toContain('## TOOLS.md');
            expect(prompt).not.toContain('## IDENTITY.md');
            expect(prompt).not.toContain('## USER.md');
            expect(prompt).not.toContain('## HEARTBEAT.md');
        });

        it('should handle workspace with all files missing', async () => {
            // Don't create any files
            const files = await loadWorkspaceFiles({ workspaceDir: testDir });
            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: files,
                workspaceDir: testDir,
                model: 'gpt-4',
            });

            // Should have basic structure but no workspace context
            expect(prompt).toContain('You are a personal assistant.');
            expect(prompt).toContain('Model: gpt-4');
            expect(prompt).toContain(`Working directory: ${testDir}`);
            expect(prompt).not.toContain('# Workspace Context');
        });

        it('should handle workspace with empty files', async () => {
            // Create empty files
            await fs.writeFile(path.join(testDir, 'SOUL.md'), '');
            await fs.writeFile(path.join(testDir, 'TOOLS.md'), '   ');

            const files = await loadWorkspaceFiles({ workspaceDir: testDir });
            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: files,
                workspaceDir: testDir,
            });

            // Empty files should be filtered out
            expect(prompt).not.toContain('# Workspace Context');
            expect(prompt).not.toContain('## SOUL.md');
            expect(prompt).not.toContain('## TOOLS.md');
        });

        it('should preserve order of workspace files in prompt', async () => {
            // Create files in specific order
            await fs.writeFile(path.join(testDir, 'SOUL.md'), 'First');
            await fs.writeFile(path.join(testDir, 'TOOLS.md'), 'Second');
            await fs.writeFile(path.join(testDir, 'IDENTITY.md'), 'Third');
            await fs.writeFile(path.join(testDir, 'USER.md'), 'Fourth');

            const files = await loadWorkspaceFiles({ workspaceDir: testDir });
            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: files,
                workspaceDir: testDir,
            });

            const soulIndex = prompt.indexOf('## SOUL.md');
            const toolsIndex = prompt.indexOf('## TOOLS.md');
            const identityIndex = prompt.indexOf('## IDENTITY.md');
            const userIndex = prompt.indexOf('## USER.md');

            expect(soulIndex).toBeGreaterThan(-1);
            expect(toolsIndex).toBeGreaterThan(soulIndex);
            expect(identityIndex).toBeGreaterThan(toolsIndex);
            expect(userIndex).toBeGreaterThan(identityIndex);
        });

        it('should handle complex frontmatter and content', async () => {
            await fs.writeFile(
                path.join(testDir, 'SOUL.md'),
                `---
title: Soul Configuration
author: Human
version: 2.1
tags:
  - personality
  - behavior
---

# Personality

I am a thoughtful assistant who:
- Thinks before responding
- Asks clarifying questions
- Provides detailed explanations

## Communication Style

I communicate clearly and concisely.`
            );

            const files = await loadWorkspaceFiles({ workspaceDir: testDir });
            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: files,
                workspaceDir: testDir,
            });

            // Frontmatter should be stripped
            expect(prompt).not.toContain('title: Soul Configuration');
            expect(prompt).not.toContain('tags:');

            // Content should be preserved with formatting
            expect(prompt).toContain('# Personality');
            expect(prompt).toContain('I am a thoughtful assistant who:');
            expect(prompt).toContain('- Thinks before responding');
            expect(prompt).toContain('## Communication Style');
            expect(prompt).toContain('I communicate clearly and concisely.');
        });

        it('should handle custom workspace directory path', async () => {
            const customDir = path.join(testDir, 'custom', 'workspace', 'location');
            await fs.mkdir(customDir, { recursive: true });

            await fs.writeFile(path.join(customDir, 'SOUL.md'), 'Custom location soul');
            await fs.writeFile(path.join(customDir, 'TOOLS.md'), 'Custom location tools');

            const files = await loadWorkspaceFiles({ workspaceDir: customDir });
            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: files,
                workspaceDir: customDir,
            });

            expect(prompt).toContain(`Working directory: ${customDir}`);
            expect(prompt).toContain('Custom location soul');
            expect(prompt).toContain('Custom location tools');
        });

        it('should handle unicode content throughout the workflow', async () => {
            await fs.writeFile(path.join(testDir, 'SOUL.md'), '我是一个有创造力的助手 🤖');
            await fs.writeFile(path.join(testDir, 'IDENTITY.md'), 'Привет! Je suis Claudius.');

            const files = await loadWorkspaceFiles({ workspaceDir: testDir });
            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: files,
                workspaceDir: testDir,
            });

            expect(prompt).toContain('我是一个有创造力的助手 🤖');
            expect(prompt).toContain('Привет! Je suis Claudius.');
        });

        it('should handle very long workspace files', async () => {
            // Create a large file
            const longContent = 'This is a line of content.\n'.repeat(1000);
            await fs.writeFile(path.join(testDir, 'MEMORY.md'), longContent);

            const files = await loadWorkspaceFiles({ workspaceDir: testDir });
            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: files,
                workspaceDir: testDir,
            });

            expect(prompt).toContain('## MEMORY.md');
            expect(prompt).toContain('This is a line of content.');
            // Verify the content is fully included
            const memorySection = prompt.split('## MEMORY.md')[1];
            expect(memorySection).toBeTruthy();
        });

        it('should correctly identify SOUL.md regardless of other files', async () => {
            await fs.writeFile(path.join(testDir, 'TOOLS.md'), 'Tools first');
            await fs.writeFile(path.join(testDir, 'SOUL.md'), 'Soul after');

            const files = await loadWorkspaceFiles({ workspaceDir: testDir });
            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: files,
                workspaceDir: testDir,
            });

            // Should still detect SOUL.md and add the special instruction
            expect(prompt).toContain('IMPORTANT: If SOUL.md is present');
        });
    });

    describe('edge cases', () => {
        it('should handle concurrent file loading', async () => {
            await fs.writeFile(path.join(testDir, 'SOUL.md'), 'Soul');
            await fs.writeFile(path.join(testDir, 'TOOLS.md'), 'Tools');

            // Load files multiple times concurrently
            const [files1, files2, files3] = await Promise.all([
                loadWorkspaceFiles({ workspaceDir: testDir }),
                loadWorkspaceFiles({ workspaceDir: testDir }),
                loadWorkspaceFiles({ workspaceDir: testDir }),
            ]);

            // All should return the same results
            expect(files1.length).toBe(files2.length);
            expect(files2.length).toBe(files3.length);

            const soul1 = files1.find((f) => f.name === 'SOUL.md');
            const soul2 = files2.find((f) => f.name === 'SOUL.md');
            const soul3 = files3.find((f) => f.name === 'SOUL.md');

            expect(soul1?.content).toBe('Soul');
            expect(soul2?.content).toBe('Soul');
            expect(soul3?.content).toBe('Soul');
        });

        it('should handle files with only frontmatter', async () => {
            await fs.writeFile(
                path.join(testDir, 'SOUL.md'),
                `---
title: Only Frontmatter
---`
            );

            const files = await loadWorkspaceFiles({ workspaceDir: testDir });
            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: files,
                workspaceDir: testDir,
            });

            // File has no content after frontmatter removal, should be filtered
            expect(prompt).not.toContain('## SOUL.md');
        });

        it('should handle malformed frontmatter gracefully', async () => {
            await fs.writeFile(
                path.join(testDir, 'TOOLS.md'),
                `---
this is not valid YAML: [
---
But the content is here.`
            );

            const files = await loadWorkspaceFiles({ workspaceDir: testDir });
            const soulFile = files.find((f) => f.name === 'TOOLS.md');

            // Should still strip the frontmatter section even if YAML is invalid
            expect(soulFile?.content).toBe('But the content is here.');
        });
    });
});
