import { describe, it, expect } from 'vitest';
import { isReasoningTagProvider } from '../../src/utils/provider-utils.js';

describe('provider-utils', () => {
    describe('isReasoningTagProvider', () => {
        it('should return false for null or undefined', () => {
            expect(isReasoningTagProvider(null)).toBe(false);
            expect(isReasoningTagProvider(undefined)).toBe(false);
        });

        it('should return true for ollama provider', () => {
            expect(isReasoningTagProvider('ollama')).toBe(true);
            expect(isReasoningTagProvider('OLLAMA')).toBe(true);
            expect(isReasoningTagProvider(' ollama ')).toBe(true);
        });

        it('should return true for google-gemini-cli provider', () => {
            expect(isReasoningTagProvider('google-gemini-cli')).toBe(true);
        });

        it('should return true for google-antigravity provider', () => {
            expect(isReasoningTagProvider('google-antigravity')).toBe(true);
            expect(isReasoningTagProvider('google-antigravity/gemini-3')).toBe(true);
        });

        it('should return true for minimax provider', () => {
            expect(isReasoningTagProvider('minimax')).toBe(true);
            expect(isReasoningTagProvider('MINIMAX')).toBe(true);
        });

        it('should return false for non-reasoning providers', () => {
            expect(isReasoningTagProvider('openai')).toBe(false);
            expect(isReasoningTagProvider('anthropic')).toBe(false);
            expect(isReasoningTagProvider('github-copilot')).toBe(false);
        });
    });
});
