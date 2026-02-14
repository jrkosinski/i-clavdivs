import { describe, it, expect } from 'vitest';
import {
    normalizeChannelSlug,
    buildChannelKeyCandidates,
    resolveChannelEntryMatch,
    resolveChannelEntryMatchWithFallback,
    resolveNestedAllowlistDecision,
} from '../src/core/channel-matcher.js';

describe('channel-matcher', () => {
    describe('normalizeChannelSlug', () => {
        it('normalizes slugs correctly', () => {
            expect(normalizeChannelSlug('General Chat')).toBe('general-chat');
            expect(normalizeChannelSlug('#general')).toBe('general');
            expect(normalizeChannelSlug('  Team  Discussion  ')).toBe('team-discussion');
        });

        it('removes special characters', () => {
            expect(normalizeChannelSlug('hello@world!')).toBe('hello-world');
            expect(normalizeChannelSlug('test___channel')).toBe('test-channel');
        });

        it('removes leading/trailing dashes', () => {
            expect(normalizeChannelSlug('-hello-')).toBe('hello');
            expect(normalizeChannelSlug('--test--')).toBe('test');
        });
    });

    describe('buildChannelKeyCandidates', () => {
        it('builds unique candidate list', () => {
            const candidates = buildChannelKeyCandidates('key1', 'key2', 'key1', 'key3');
            expect(candidates).toEqual(['key1', 'key2', 'key3']);
        });

        it('filters out null and undefined', () => {
            const candidates = buildChannelKeyCandidates('key1', null, undefined, 'key2');
            expect(candidates).toEqual(['key1', 'key2']);
        });

        it('filters out empty strings', () => {
            const candidates = buildChannelKeyCandidates('key1', '', '  ', 'key2');
            expect(candidates).toEqual(['key1', 'key2']);
        });
    });

    describe('resolveChannelEntryMatch', () => {
        it('matches direct entries', () => {
            const entries = { key1: 'value1', key2: 'value2' };
            const match = resolveChannelEntryMatch({
                entries,
                keys: ['key1'],
            });

            expect(match.entry).toBe('value1');
            expect(match.key).toBe('key1');
        });

        it('matches first key in list', () => {
            const entries = { key1: 'value1', key2: 'value2' };
            const match = resolveChannelEntryMatch({
                entries,
                keys: ['missing', 'key2', 'key1'],
            });

            expect(match.entry).toBe('value2');
            expect(match.key).toBe('key2');
        });

        it('includes wildcard entry when present', () => {
            const entries = { key1: 'value1', '*': 'wildcard' };
            const match = resolveChannelEntryMatch({
                entries,
                keys: ['key1'],
                wildcardKey: '*',
            });

            expect(match.entry).toBe('value1');
            expect(match.wildcardEntry).toBe('wildcard');
            expect(match.wildcardKey).toBe('*');
        });

        it('returns empty match when no keys match', () => {
            const entries = { key1: 'value1' };
            const match = resolveChannelEntryMatch({
                entries,
                keys: ['missing'],
            });

            expect(match.entry).toBeUndefined();
            expect(match.key).toBeUndefined();
        });
    });

    describe('resolveChannelEntryMatchWithFallback', () => {
        it('returns direct match with source', () => {
            const entries = { key1: 'value1' };
            const match = resolveChannelEntryMatchWithFallback({
                entries,
                keys: ['key1'],
            });

            expect(match.entry).toBe('value1');
            expect(match.matchSource).toBe('direct');
            expect(match.matchKey).toBe('key1');
        });

        it('falls back to parent match', () => {
            const entries = { parent: 'parent-value' };
            const match = resolveChannelEntryMatchWithFallback({
                entries,
                keys: ['missing'],
                parentKeys: ['parent'],
            });

            expect(match.entry).toBe('parent-value');
            expect(match.matchSource).toBe('parent');
            expect(match.matchKey).toBe('parent');
        });

        it('falls back to wildcard match', () => {
            const entries = { '*': 'wildcard-value' };
            const match = resolveChannelEntryMatchWithFallback({
                entries,
                keys: ['missing'],
                wildcardKey: '*',
            });

            expect(match.entry).toBe('wildcard-value');
            expect(match.matchSource).toBe('wildcard');
            expect(match.matchKey).toBe('*');
        });

        it('prefers direct over parent over wildcard', () => {
            const entries = {
                direct: 'direct-value',
                parent: 'parent-value',
                '*': 'wildcard-value',
            };

            const directMatch = resolveChannelEntryMatchWithFallback({
                entries,
                keys: ['direct'],
                parentKeys: ['parent'],
                wildcardKey: '*',
            });
            expect(directMatch.matchSource).toBe('direct');

            const parentMatch = resolveChannelEntryMatchWithFallback({
                entries,
                keys: ['missing'],
                parentKeys: ['parent'],
                wildcardKey: '*',
            });
            expect(parentMatch.matchSource).toBe('parent');

            const wildcardMatch = resolveChannelEntryMatchWithFallback({
                entries,
                keys: ['missing'],
                wildcardKey: '*',
            });
            expect(wildcardMatch.matchSource).toBe('wildcard');
        });
    });

    describe('resolveNestedAllowlistDecision', () => {
        it('allows when outer not configured', () => {
            const result = resolveNestedAllowlistDecision({
                outerConfigured: false,
                outerMatched: false,
                innerConfigured: true,
                innerMatched: false,
            });
            expect(result).toBe(true);
        });

        it('denies when outer configured but not matched', () => {
            const result = resolveNestedAllowlistDecision({
                outerConfigured: true,
                outerMatched: false,
                innerConfigured: false,
                innerMatched: true,
            });
            expect(result).toBe(false);
        });

        it('allows when outer matched and inner not configured', () => {
            const result = resolveNestedAllowlistDecision({
                outerConfigured: true,
                outerMatched: true,
                innerConfigured: false,
                innerMatched: false,
            });
            expect(result).toBe(true);
        });

        it('defers to inner when both configured and outer matched', () => {
            const allowed = resolveNestedAllowlistDecision({
                outerConfigured: true,
                outerMatched: true,
                innerConfigured: true,
                innerMatched: true,
            });
            expect(allowed).toBe(true);

            const denied = resolveNestedAllowlistDecision({
                outerConfigured: true,
                outerMatched: true,
                innerConfigured: true,
                innerMatched: false,
            });
            expect(denied).toBe(false);
        });
    });
});
