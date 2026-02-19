/**
 * File-based session store.
 *
 * Replaces pi-coding-agent's SessionManager. Each session is a JSON file
 * containing an array of Messages, persisted at:
 *   ~/.i-clavdivs/sessions/<sessionId>.json
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Message } from '@i-clavdivs/models';
import { log } from './logger.js';

/**
 * Manages loading and saving of per-session conversation history.
 */
export class SessionStore {
    private readonly _sessionDir: string;

    public constructor(sessionDir?: string) {
        this._sessionDir = sessionDir ?? path.join(os.homedir(), '.i-clavdivs', 'sessions');
    }

    /** Loads the message history for a session. Returns [] if none exists yet. */
    public async load(sessionId: string): Promise<Message[]> {
        const file = this._resolvePath(sessionId);
        try {
            const raw = await fs.readFile(file, 'utf-8');
            const parsed: unknown = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                log.warn(`session file malformed, starting fresh: ${file}`);
                return [];
            }
            log.debug(`loaded ${String(parsed.length)} messages from ${file}`);
            return parsed as Message[];
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
                log.debug(`no session file found, starting fresh: ${file}`);
                return [];
            }
            log.warn(`failed to read session file, starting fresh: ${String(err)}`);
            return [];
        }
    }

    /** Persists the full message history for a session. */
    public async save(sessionId: string, messages: Message[]): Promise<void> {
        const file = this._resolvePath(sessionId);
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, JSON.stringify(messages, null, 2), 'utf-8');
        log.debug(`saved ${String(messages.length)} messages to ${file}`);
    }

    /** Deletes the session file if it exists. */
    public async delete(sessionId: string): Promise<void> {
        const file = this._resolvePath(sessionId);
        try {
            await fs.unlink(file);
            log.debug(`deleted session: ${file}`);
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
                log.warn(`failed to delete session: ${String(err)}`);
            }
        }
    }

    /** Returns true if a session file exists on disk. */
    public async exists(sessionId: string): Promise<boolean> {
        return fs
            .stat(this._resolvePath(sessionId))
            .then(() => true)
            .catch(() => false);
    }

    private _resolvePath(sessionId: string): string {
        //replace any character that isn't safe for a filename, then collapse
        //any remaining ".." sequences so path traversal is impossible
        const safe = sessionId.replace(/[^a-zA-Z0-9_\-.:]/g, '_').replace(/\.{2,}/g, '_');
        return path.join(this._sessionDir, `${safe}.json`);
    }
}
