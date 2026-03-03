import { describe, it, expect } from 'vitest';
import {
    buildSystemPromptWithWorkspace,
    buildMinimalSystemPrompt,
} from '../core/system-prompt-builder.js';
import type { IWorkspaceFile } from '../types/workspace.js';

describe('system-prompt-builder', () => {
    describe('buildSystemPromptWithWorkspace', () => {
        it('should include base identity text', () => {
            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: [],
                workspaceDir: '/test/dir',
            });

            expect(prompt).toContain('You are a personal assistant.');
        });

        it('should include model name when provided', () => {
            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: [],
                workspaceDir: '/test/dir',
                model: 'gpt-4',
            });

            expect(prompt).toContain('Model: gpt-4');
        });

        it('should not include model line when not provided', () => {
            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: [],
                workspaceDir: '/test/dir',
            });

            expect(prompt).not.toContain('Model:');
        });

        it('should include workspace directory', () => {
            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: [],
                workspaceDir: '/home/user/.i-clavdivs/workspace',
            });

            expect(prompt).toContain('Working directory: /home/user/.i-clavdivs/workspace');
        });

        it('should add workspace context section for valid files', () => {
            const files: IWorkspaceFile[] = [
                {
                    name: 'SOUL.md',
                    path: '/test/SOUL.md',
                    content: 'I am creative and helpful.',
                    missing: false,
                },
                {
                    name: 'TOOLS.md',
                    path: '/test/TOOLS.md',
                    content: 'I have access to various tools.',
                    missing: false,
                },
            ];

            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: files,
                workspaceDir: '/test',
            });

            expect(prompt).toContain('# Workspace Context');
            expect(prompt).toContain('## SOUL.md');
            expect(prompt).toContain('I am creative and helpful.');
            expect(prompt).toContain('## TOOLS.md');
            expect(prompt).toContain('I have access to various tools.');
        });

        it('should filter out missing files', () => {
            const files: IWorkspaceFile[] = [
                {
                    name: 'SOUL.md',
                    path: '/test/SOUL.md',
                    content: 'Present content',
                    missing: false,
                },
                {
                    name: 'TOOLS.md',
                    path: '/test/TOOLS.md',
                    missing: true,
                },
            ];

            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: files,
                workspaceDir: '/test',
            });

            expect(prompt).toContain('## SOUL.md');
            expect(prompt).toContain('Present content');
            expect(prompt).not.toContain('## TOOLS.md');
        });

        it('should filter out files with empty content', () => {
            const files: IWorkspaceFile[] = [
                {
                    name: 'SOUL.md',
                    path: '/test/SOUL.md',
                    content: 'Valid content',
                    missing: false,
                },
                {
                    name: 'IDENTITY.md',
                    path: '/test/IDENTITY.md',
                    content: '',
                    missing: false,
                },
                {
                    name: 'USER.md',
                    path: '/test/USER.md',
                    content: '   ',
                    missing: false,
                },
            ];

            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: files,
                workspaceDir: '/test',
            });

            expect(prompt).toContain('## SOUL.md');
            expect(prompt).not.toContain('## IDENTITY.md');
            expect(prompt).not.toContain('## USER.md');
        });

        it('should add SOUL.md special instruction when SOUL.md exists', () => {
            const files: IWorkspaceFile[] = [
                {
                    name: 'SOUL.md',
                    path: '/test/SOUL.md',
                    content: 'I am a creative assistant.',
                    missing: false,
                },
            ];

            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: files,
                workspaceDir: '/test',
            });

            expect(prompt).toContain(
                'IMPORTANT: If SOUL.md is present, embody its persona and tone.'
            );
            expect(prompt).toContain(
                'Avoid stiff, generic replies; follow its guidance unless higher-priority instructions override it.'
            );
        });

        it('should not add SOUL instruction when SOUL.md is missing', () => {
            const files: IWorkspaceFile[] = [
                {
                    name: 'TOOLS.md',
                    path: '/test/TOOLS.md',
                    content: 'Tools available',
                    missing: false,
                },
                {
                    name: 'SOUL.md',
                    path: '/test/SOUL.md',
                    missing: true,
                },
            ];

            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: files,
                workspaceDir: '/test',
            });

            expect(prompt).not.toContain('IMPORTANT: If SOUL.md is present');
        });

        it('should not add SOUL instruction when SOUL.md has empty content', () => {
            const files: IWorkspaceFile[] = [
                {
                    name: 'SOUL.md',
                    path: '/test/SOUL.md',
                    content: '',
                    missing: false,
                },
                {
                    name: 'TOOLS.md',
                    path: '/test/TOOLS.md',
                    content: 'Tools info',
                    missing: false,
                },
            ];

            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: files,
                workspaceDir: '/test',
            });

            expect(prompt).not.toContain('IMPORTANT: If SOUL.md is present');
        });

        it('should append additional base prompt content', () => {
            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: [],
                workspaceDir: '/test',
                basePrompt: 'Additional instructions here.',
            });

            expect(prompt).toContain('## Additional Context');
            expect(prompt).toContain('Additional instructions here.');
        });

        it('should handle empty base prompt', () => {
            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: [],
                workspaceDir: '/test',
                basePrompt: '',
            });

            expect(prompt).not.toContain('## Additional Context');
        });

        it('should handle whitespace-only base prompt', () => {
            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: [],
                workspaceDir: '/test',
                basePrompt: '   \n  \t  ',
            });

            expect(prompt).not.toContain('## Additional Context');
        });

        it('should handle empty workspace files array', () => {
            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: [],
                workspaceDir: '/test',
            });

            expect(prompt).toContain('You are a personal assistant.');
            expect(prompt).toContain('Working directory: /test');
            expect(prompt).not.toContain('# Workspace Context');
        });

        it('should preserve file order in output', () => {
            const files: IWorkspaceFile[] = [
                {
                    name: 'SOUL.md',
                    path: '/test/SOUL.md',
                    content: 'First file',
                    missing: false,
                },
                {
                    name: 'TOOLS.md',
                    path: '/test/TOOLS.md',
                    content: 'Second file',
                    missing: false,
                },
                {
                    name: 'IDENTITY.md',
                    path: '/test/IDENTITY.md',
                    content: 'Third file',
                    missing: false,
                },
            ];

            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: files,
                workspaceDir: '/test',
            });

            const soulIndex = prompt.indexOf('## SOUL.md');
            const toolsIndex = prompt.indexOf('## TOOLS.md');
            const identityIndex = prompt.indexOf('## IDENTITY.md');

            expect(soulIndex).toBeLessThan(toolsIndex);
            expect(toolsIndex).toBeLessThan(identityIndex);
        });

        it('should handle multiline content in workspace files', () => {
            const files: IWorkspaceFile[] = [
                {
                    name: 'SOUL.md',
                    path: '/test/SOUL.md',
                    content: `Line 1
Line 2
Line 3`,
                    missing: false,
                },
            ];

            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: files,
                workspaceDir: '/test',
            });

            expect(prompt).toContain('Line 1\nLine 2\nLine 3');
        });

        it('should handle special characters in content', () => {
            const files: IWorkspaceFile[] = [
                {
                    name: 'USER.md',
                    path: '/test/USER.md',
                    content: 'Special chars: #@$%^&*(){}[]',
                    missing: false,
                },
            ];

            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: files,
                workspaceDir: '/test',
            });

            expect(prompt).toContain('Special chars: #@$%^&*(){}[]');
        });

        it('should handle case-insensitive SOUL.md detection', () => {
            const files: IWorkspaceFile[] = [
                {
                    name: 'SOUL.md',
                    path: '/test/SOUL.md',
                    content: 'Soul content',
                    missing: false,
                },
            ];

            const prompt = buildSystemPromptWithWorkspace({
                workspaceFiles: files,
                workspaceDir: '/test',
            });

            expect(prompt).toContain('IMPORTANT: If SOUL.md is present');
        });

        it('should build complete prompt with all options', () => {
            const files: IWorkspaceFile[] = [
                {
                    name: 'SOUL.md',
                    path: '/test/SOUL.md',
                    content: 'Creative personality',
                    missing: false,
                },
                {
                    name: 'TOOLS.md',
                    path: '/test/TOOLS.md',
                    content: 'Available tools',
                    missing: false,
                },
            ];

            const prompt = buildSystemPromptWithWorkspace({
                basePrompt: 'Extra instructions',
                workspaceFiles: files,
                workspaceDir: '/home/test',
                model: 'gpt-4-turbo',
            });

            expect(prompt).toContain('You are a personal assistant.');
            expect(prompt).toContain('Model: gpt-4-turbo');
            expect(prompt).toContain('Working directory: /home/test');
            expect(prompt).toContain('# Workspace Context');
            expect(prompt).toContain('IMPORTANT: If SOUL.md is present');
            expect(prompt).toContain('## SOUL.md');
            expect(prompt).toContain('Creative personality');
            expect(prompt).toContain('## TOOLS.md');
            expect(prompt).toContain('Available tools');
            expect(prompt).toContain('## Additional Context');
            expect(prompt).toContain('Extra instructions');
        });
    });

    describe('buildMinimalSystemPrompt', () => {
        it('should include basic identity', () => {
            const prompt = buildMinimalSystemPrompt({
                workspaceDir: '/test',
            });

            expect(prompt).toContain('You are a helpful assistant.');
        });

        it('should include model when provided', () => {
            const prompt = buildMinimalSystemPrompt({
                workspaceDir: '/test',
                model: 'claude-3',
            });

            expect(prompt).toContain('Model: claude-3');
        });

        it('should not include model line when not provided', () => {
            const prompt = buildMinimalSystemPrompt({
                workspaceDir: '/test',
            });

            expect(prompt).not.toContain('Model:');
        });

        it('should include workspace directory', () => {
            const prompt = buildMinimalSystemPrompt({
                workspaceDir: '/home/workspace',
            });

            expect(prompt).toContain('Working directory: /home/workspace');
        });

        it('should append extra content when provided', () => {
            const prompt = buildMinimalSystemPrompt({
                workspaceDir: '/test',
                extra: 'Custom instructions',
            });

            expect(prompt).toContain('Custom instructions');
        });

        it('should omit extra section when not provided', () => {
            const prompt = buildMinimalSystemPrompt({
                workspaceDir: '/test',
            });

            // Should have identity and working directory only
            const lines = prompt.split('\n').filter((line) => line.trim());
            expect(lines.length).toBeLessThanOrEqual(3); // "You are...", "Working directory..."
        });

        it('should handle whitespace-only extra content', () => {
            const prompt = buildMinimalSystemPrompt({
                workspaceDir: '/test',
                extra: '   \n\t  ',
            });

            // Should not include the extra section
            expect(prompt.split('\n').filter((line) => line.trim()).length).toBeLessThanOrEqual(3);
        });

        it('should build complete minimal prompt with all options', () => {
            const prompt = buildMinimalSystemPrompt({
                workspaceDir: '/home/minimal',
                model: 'gpt-3.5',
                extra: 'Be concise',
            });

            expect(prompt).toContain('You are a helpful assistant.');
            expect(prompt).toContain('Model: gpt-3.5');
            expect(prompt).toContain('Working directory: /home/minimal');
            expect(prompt).toContain('Be concise');
        });

        it('should not include workspace context sections', () => {
            const prompt = buildMinimalSystemPrompt({
                workspaceDir: '/test',
            });

            expect(prompt).not.toContain('# Workspace Context');
            expect(prompt).not.toContain('SOUL.md');
        });

        it('should handle multiline extra content', () => {
            const prompt = buildMinimalSystemPrompt({
                workspaceDir: '/test',
                extra: `Line 1
Line 2
Line 3`,
            });

            expect(prompt).toContain('Line 1\nLine 2\nLine 3');
        });
    });
});
