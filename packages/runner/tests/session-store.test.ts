import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Message } from '@i-clavdivs/models';

//mock fs/promises before importing SessionStore so the module sees the mock
vi.mock('node:fs/promises', () => ({
    default: {
        readFile: vi.fn(),
        writeFile: vi.fn(),
        mkdir: vi.fn(),
        unlink: vi.fn(),
        stat: vi.fn(),
    },
}));

import fs from 'node:fs/promises';
import { SessionStore } from '../src/session-store.js';

const MOCK_MESSAGES: Message[] = [
    { role: 'user', content: 'hello' },
    { role: 'assistant', content: 'hi there' },
];

describe('SessionStore', () => {
    let store: SessionStore;

    beforeEach(() => {
        vi.clearAllMocks();
        store = new SessionStore('/tmp/test-sessions');
    });

    describe('load', () => {
        it('should return messages from a valid session file', async () => {
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(MOCK_MESSAGES) as never);

            const result = await store.load('my-session');

            expect(result).toEqual(MOCK_MESSAGES);
        });

        it('should return [] when the session file does not exist', async () => {
            const err = Object.assign(new Error('not found'), { code: 'ENOENT' });
            vi.mocked(fs.readFile).mockRejectedValue(err);

            const result = await store.load('missing');

            expect(result).toEqual([]);
        });

        it('should return [] and warn when the file contains non-array JSON', async () => {
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ bad: true }) as never);

            const result = await store.load('bad-session');

            expect(result).toEqual([]);
        });

        it('should return [] when the file contains malformed JSON', async () => {
            vi.mocked(fs.readFile).mockResolvedValue('not json at all' as never);

            const result = await store.load('corrupt');

            expect(result).toEqual([]);
        });
    });

    describe('save', () => {
        it('should create the directory and write the session file', async () => {
            vi.mocked(fs.mkdir).mockResolvedValue(undefined as never);
            vi.mocked(fs.writeFile).mockResolvedValue(undefined as never);

            await store.save('my-session', MOCK_MESSAGES);

            expect(fs.mkdir).toHaveBeenCalledWith(
                expect.stringContaining('test-sessions'),
                { recursive: true },
            );
            expect(fs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('my-session.json'),
                JSON.stringify(MOCK_MESSAGES, null, 2),
                'utf-8',
            );
        });
    });

    describe('delete', () => {
        it('should unlink the session file', async () => {
            vi.mocked(fs.unlink).mockResolvedValue(undefined as never);

            await store.delete('my-session');

            expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining('my-session.json'));
        });

        it('should silently ignore ENOENT when the file does not exist', async () => {
            const err = Object.assign(new Error('not found'), { code: 'ENOENT' });
            vi.mocked(fs.unlink).mockRejectedValue(err);

            await expect(store.delete('missing')).resolves.toBeUndefined();
        });
    });

    describe('exists', () => {
        it('should return true when the session file exists', async () => {
            vi.mocked(fs.stat).mockResolvedValue({} as never);

            expect(await store.exists('my-session')).toBe(true);
        });

        it('should return false when the session file does not exist', async () => {
            vi.mocked(fs.stat).mockRejectedValue(new Error('not found'));

            expect(await store.exists('missing')).toBe(false);
        });
    });

    describe('path sanitisation', () => {
        it('should sanitise path-traversal characters in session IDs', async () => {
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify([]) as never);

            await store.load('../../../etc/passwd');

            expect(fs.readFile).toHaveBeenCalledWith(
                expect.not.stringContaining('..'),
                'utf-8',
            );
        });

        it('should preserve safe characters like hyphens, dots and colons', async () => {
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify([]) as never);

            await store.load('discord:123:456');

            expect(fs.readFile).toHaveBeenCalledWith(
                expect.stringContaining('discord:123:456.json'),
                'utf-8',
            );
        });
    });
});
