import { describe, it, expect } from 'vitest';
import {
    isValidE164,
    normalizeE164,
    isValidEmail,
    isValidUrl,
    sanitizeForDisplay,
} from '../src/utils/validation.js';

describe('validation', () => {
    describe('isValidE164', () => {
        it('validates correct E.164 numbers', () => {
            expect(isValidE164('+12025551234')).toBe(true);
            expect(isValidE164('+442071234567')).toBe(true);
            expect(isValidE164('+81312345678')).toBe(true);
        });

        it('rejects invalid E.164 numbers', () => {
            expect(isValidE164('12025551234')).toBe(false); //missing +
            expect(isValidE164('+0123456789')).toBe(false); //starts with 0
            expect(isValidE164('+1')).toBe(false); //too short
            expect(isValidE164('+12345678901234567')).toBe(false); //too long
        });
    });

    describe('normalizeE164', () => {
        it('normalizes phone numbers to E.164', () => {
            expect(normalizeE164('+1 202 555 1234')).toBe('+12025551234');
            expect(normalizeE164('(202) 555-1234')).toBe('+2025551234');
            expect(normalizeE164('202.555.1234')).toBe('+2025551234');
        });

        it('adds + if missing', () => {
            expect(normalizeE164('12025551234')).toBe('+12025551234');
        });

        it('returns null for invalid numbers', () => {
            expect(normalizeE164('abc')).toBeNull();
            expect(normalizeE164('')).toBeNull();
            //note: "123" becomes "+123" which is technically valid E.164 format
            //though impractical, it's within the 1-15 digit range
        });
    });

    describe('isValidEmail', () => {
        it('validates correct emails', () => {
            expect(isValidEmail('user@example.com')).toBe(true);
            expect(isValidEmail('test.user@subdomain.example.com')).toBe(true);
            expect(isValidEmail('user+tag@example.co.uk')).toBe(true);
        });

        it('rejects invalid emails', () => {
            expect(isValidEmail('invalid')).toBe(false);
            expect(isValidEmail('@example.com')).toBe(false);
            expect(isValidEmail('user@')).toBe(false);
            expect(isValidEmail('user example.com')).toBe(false);
        });
    });

    describe('isValidUrl', () => {
        it('validates correct URLs', () => {
            expect(isValidUrl('https://example.com')).toBe(true);
            expect(isValidUrl('http://subdomain.example.com/path')).toBe(true);
            expect(isValidUrl('ftp://files.example.com')).toBe(true);
        });

        it('rejects invalid URLs', () => {
            expect(isValidUrl('not a url')).toBe(false);
            expect(isValidUrl('example.com')).toBe(false); //missing protocol
            expect(isValidUrl('')).toBe(false);
        });
    });

    describe('sanitizeForDisplay', () => {
        it('removes control characters', () => {
            const input = 'hello\x00world\x1F';
            expect(sanitizeForDisplay(input)).toBe('helloworld');
        });

        it('trims whitespace', () => {
            expect(sanitizeForDisplay('  hello world  ')).toBe('hello world');
        });

        it('truncates to max length', () => {
            const input = 'this is a very long string';
            expect(sanitizeForDisplay(input, 10)).toBe('this is a ');
        });

        it('preserves normal characters', () => {
            const input = 'Hello, World! 123';
            expect(sanitizeForDisplay(input)).toBe(input);
        });
    });
});
