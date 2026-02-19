/**
 * File-based session store.
 *
 * Replaces pi-coding-agent's SessionManager. Each session is a JSON file
 * containing an array of messages, stored at:
 *   ~/.i-clavdivs/sessions/<sessionId>.json
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Message } from '@i-clavdivs/models';
import { log } from './logger.js';

function resolveSessionDir(): string {
    return path.join(os.homedir(), '.i-clavdivs', 'sessions');
}

function resolveSessionPath(sessionId: string): string {
    // Sanitise sessionId to prevent path traversal
    const safe = sessionId.replace(/[^a-zA-Z0-9_\-.:]/g, '_');
    return path.join(resolveSessionDir(), `${safe}.json`);
}

export async function loadSession(sessionId: string): Promise<Message[]> {
    const file = resolveSessionPath(sessionId);
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

export async function saveSession(sessionId: string, messages: Message[]): Promise<void> {
    const file = resolveSessionPath(sessionId);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(messages, null, 2), 'utf-8');
    log.debug(`saved ${String(messages.length)} messages to ${file}`);
}

export async function deleteSession(sessionId: string): Promise<void> {
    const file = resolveSessionPath(sessionId);
    try {
        await fs.unlink(file);
        log.debug(`deleted session: ${file}`);
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
            log.warn(`failed to delete session: ${String(err)}`);
        }
    }
}

export async function sessionExists(sessionId: string): Promise<boolean> {
    const file = resolveSessionPath(sessionId);
    return fs.stat(file).then(() => true).catch(() => false);
}
