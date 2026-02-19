import { describe, it, expect } from 'vitest';
import { CliArgs } from '../src/args.js';

//helper: prepend the two argv entries Node normally provides
function argv(...args: string[]): string[] {
    return ['node', 'dist/index.js', ...args];
}

describe('CliArgs', () => {
    describe('prompt', () => {
        it('should capture a single-word prompt', () => {
            const result = CliArgs.parse(argv('hello'));
            expect(result.prompt).toBe('hello');
        });

        it('should join multiple positional arguments into one prompt', () => {
            const result = CliArgs.parse(argv('hello', 'world'));
            expect(result.prompt).toBe('hello world');
        });

        it('should throw when no prompt is provided', () => {
            expect(() => CliArgs.parse(argv())).toThrow('prompt is required');
        });

        it('should throw when only flags are provided and no prompt', () => {
            expect(() => CliArgs.parse(argv('--stream'))).toThrow('prompt is required');
        });
    });

    describe('defaults', () => {
        it('should default sessionId to "default"', () => {
            const result = CliArgs.parse(argv('hi'));
            expect(result.sessionId).toBe('default');
        });

        it('should default model to claude-3-5-haiku-20241022', () => {
            const result = CliArgs.parse(argv('hi'));
            expect(result.model).toBe('claude-3-5-haiku-20241022');
        });

        it('should default stream to false', () => {
            const result = CliArgs.parse(argv('hi'));
            expect(result.stream).toBe(false);
        });

        it('should default newSession to false', () => {
            const result = CliArgs.parse(argv('hi'));
            expect(result.newSession).toBe(false);
        });
    });

    describe('--session', () => {
        it('should set sessionId from --session flag', () => {
            const result = CliArgs.parse(argv('--session', 'my-project', 'hello'));
            expect(result.sessionId).toBe('my-project');
        });

        it('should accept session IDs with colons (discord-style)', () => {
            const result = CliArgs.parse(argv('--session', 'discord:123:456', 'hello'));
            expect(result.sessionId).toBe('discord:123:456');
        });
    });

    describe('--model', () => {
        it('should set model from --model flag', () => {
            const result = CliArgs.parse(argv('--model', 'claude-3-5-sonnet-20241022', 'hello'));
            expect(result.model).toBe('claude-3-5-sonnet-20241022');
        });
    });

    describe('--stream', () => {
        it('should set stream to true when flag is present', () => {
            const result = CliArgs.parse(argv('--stream', 'hello'));
            expect(result.stream).toBe(true);
        });
    });

    describe('--new', () => {
        it('should set newSession to true when flag is present', () => {
            const result = CliArgs.parse(argv('--new', 'hello'));
            expect(result.newSession).toBe(true);
        });
    });

    describe('flag combinations', () => {
        it('should handle all flags together', () => {
            const result = CliArgs.parse(
                argv('--session', 'proj', '--model', 'claude-3-5-sonnet-20241022', '--stream', '--new', 'write a poem'),
            );

            expect(result.sessionId).toBe('proj');
            expect(result.model).toBe('claude-3-5-sonnet-20241022');
            expect(result.stream).toBe(true);
            expect(result.newSession).toBe(true);
            expect(result.prompt).toBe('write a poem');
        });

        it('should handle flags interspersed with prompt words', () => {
            const result = CliArgs.parse(argv('write', '--stream', 'a poem'));
            expect(result.prompt).toBe('write a poem');
            expect(result.stream).toBe(true);
        });
    });

    describe('usage', () => {
        it('should return a non-empty usage string', () => {
            expect(CliArgs.usage().length).toBeGreaterThan(0);
        });

        it('should mention --session, --model, --stream and --new', () => {
            const usage = CliArgs.usage();
            expect(usage).toContain('--session');
            expect(usage).toContain('--model');
            expect(usage).toContain('--stream');
            expect(usage).toContain('--new');
        });
    });
});
