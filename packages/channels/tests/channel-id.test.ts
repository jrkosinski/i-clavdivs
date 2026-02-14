import { describe, it, expect } from 'vitest';
import { normalizeChannelId, isCoreChannel, CORE_CHANNEL_IDS } from '../src/types/channel-id.js';

describe('channel-id', () => {
    describe('normalizeChannelId', () => {
        it('normalizes valid core channel IDs', () => {
            expect(normalizeChannelId('telegram')).toBe('telegram');
            expect(normalizeChannelId('whatsapp')).toBe('whatsapp');
            expect(normalizeChannelId('discord')).toBe('discord');
            expect(normalizeChannelId('slack')).toBe('slack');
            expect(normalizeChannelId('signal')).toBe('signal');
        });

        it('normalizes channel aliases', () => {
            expect(normalizeChannelId('tg')).toBe('telegram');
            expect(normalizeChannelId('wa')).toBe('whatsapp');
            expect(normalizeChannelId('wapp')).toBe('whatsapp');
        });

        it('handles case insensitivity', () => {
            expect(normalizeChannelId('TELEGRAM')).toBe('telegram');
            expect(normalizeChannelId('TG')).toBe('telegram');
            expect(normalizeChannelId('WhatsApp')).toBe('whatsapp');
        });

        it('handles whitespace', () => {
            expect(normalizeChannelId('  telegram  ')).toBe('telegram');
            expect(normalizeChannelId('  tg  ')).toBe('telegram');
        });

        it('returns null for invalid IDs', () => {
            expect(normalizeChannelId('invalid')).toBeNull();
            expect(normalizeChannelId('')).toBeNull();
            expect(normalizeChannelId(null)).toBeNull();
            expect(normalizeChannelId(undefined)).toBeNull();
        });
    });

    describe('isCoreChannel', () => {
        it('returns true for core channels', () => {
            CORE_CHANNEL_IDS.forEach((id) => {
                expect(isCoreChannel(id)).toBe(true);
            });
        });

        it('returns true for normalized aliases', () => {
            expect(isCoreChannel('telegram')).toBe(true);
            expect(isCoreChannel('tg')).toBe(true);
        });

        it('returns false for invalid channels', () => {
            expect(isCoreChannel('invalid')).toBe(false);
            expect(isCoreChannel('')).toBe(false);
            expect(isCoreChannel(null)).toBe(false);
        });
    });
});
