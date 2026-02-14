import { describe, it, expect } from 'vitest';
import { normalizeChatType, isGroupChat, isDirectChat } from '../src/types/chat-type.js';

describe('chat-type', () => {
    describe('normalizeChatType', () => {
        it('normalizes direct message variations', () => {
            expect(normalizeChatType('direct')).toBe('direct');
            expect(normalizeChatType('dm')).toBe('direct');
            expect(normalizeChatType('private')).toBe('direct');
            expect(normalizeChatType('DIRECT')).toBe('direct');
        });

        it('normalizes group variations', () => {
            expect(normalizeChatType('group')).toBe('group');
            expect(normalizeChatType('supergroup')).toBe('group');
            expect(normalizeChatType('GROUP')).toBe('group');
        });

        it('normalizes channel', () => {
            expect(normalizeChatType('channel')).toBe('channel');
            expect(normalizeChatType('CHANNEL')).toBe('channel');
        });

        it('returns null for invalid types', () => {
            expect(normalizeChatType('invalid')).toBeNull();
            expect(normalizeChatType('')).toBeNull();
            expect(normalizeChatType(null)).toBeNull();
            expect(normalizeChatType(undefined)).toBeNull();
        });

        it('handles whitespace', () => {
            expect(normalizeChatType('  direct  ')).toBe('direct');
            expect(normalizeChatType('  group  ')).toBe('group');
        });
    });

    describe('isGroupChat', () => {
        it('returns true for group and channel', () => {
            expect(isGroupChat('group')).toBe(true);
            expect(isGroupChat('channel')).toBe(true);
        });

        it('returns false for direct', () => {
            expect(isGroupChat('direct')).toBe(false);
        });

        it('returns false for null/undefined', () => {
            expect(isGroupChat(null)).toBe(false);
            expect(isGroupChat(undefined)).toBe(false);
        });
    });

    describe('isDirectChat', () => {
        it('returns true for direct', () => {
            expect(isDirectChat('direct')).toBe(true);
        });

        it('returns false for group and channel', () => {
            expect(isDirectChat('group')).toBe(false);
            expect(isDirectChat('channel')).toBe(false);
        });

        it('returns false for null/undefined', () => {
            expect(isDirectChat(null)).toBe(false);
            expect(isDirectChat(undefined)).toBe(false);
        });
    });
});
