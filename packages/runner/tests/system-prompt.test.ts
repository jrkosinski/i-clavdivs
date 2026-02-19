import { describe, it, expect } from 'vitest';
import { SystemPrompt } from '../src/system-prompt.js';

describe('SystemPrompt', () => {
    describe('build', () => {
        it('should include the model name', () => {
            const result = SystemPrompt.build({
                model: 'claude-3-5-haiku-20241022',
                workspaceDir: '/home/user/project',
            });

            expect(result).toContain('claude-3-5-haiku-20241022');
        });

        it('should include the workspace directory', () => {
            const result = SystemPrompt.build({
                model: 'claude-3-5-sonnet-20241022',
                workspaceDir: '/home/user/my-project',
            });

            expect(result).toContain('/home/user/my-project');
        });

        it('should include the current date', () => {
            const before = new Date().getFullYear().toString();

            const result = SystemPrompt.build({
                model: 'claude-3-5-haiku-20241022',
                workspaceDir: '/tmp',
            });

            expect(result).toContain(before);
        });

        it('should append extra text when provided', () => {
            const result = SystemPrompt.build({
                model: 'claude-3-5-haiku-20241022',
                workspaceDir: '/tmp',
                extra: 'You are a pirate. Respond only in pirate speak.',
            });

            expect(result).toContain('You are a pirate');
        });

        it('should not append extra section when extra is empty string', () => {
            const withoutExtra = SystemPrompt.build({
                model: 'claude-3-5-haiku-20241022',
                workspaceDir: '/tmp',
            });
            const withEmptyExtra = SystemPrompt.build({
                model: 'claude-3-5-haiku-20241022',
                workspaceDir: '/tmp',
                extra: '   ',
            });

            expect(withEmptyExtra.trim()).toBe(withoutExtra.trim());
        });

        it('should produce a non-empty string', () => {
            const result = SystemPrompt.build({
                model: 'any-model',
                workspaceDir: '/tmp',
            });

            expect(result.trim().length).toBeGreaterThan(0);
        });
    });
});
