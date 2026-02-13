/**
 * TmuxSkill class wrapping tmux utility scripts.
 * Provides TypeScript methods for interacting with tmux sessions.
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Options for finding tmux sessions.
 */
export interface ITmuxFindOptions {
    socketName?: string;
    socketPath?: string;
    scanAll?: boolean;
    query?: string;
}

/**
 * Result from finding tmux sessions.
 */
export interface ITmuxSession {
    name: string;
    attached: boolean;
    created: string;
}

/**
 * Wrapper class for tmux skill utilities.
 * Executes shell scripts from the tmux skill directory.
 */
export class TmuxSkill {
    private _scriptsDir: string;

    /**
     * Creates a new TmuxSkill instance.
     *
     * @param skillsBaseDir - Base directory containing all skills
     */
    public constructor(skillsBaseDir?: string) {
        //default to skills directory relative to this package
        if (!skillsBaseDir) {
            const packagesDir = path.resolve(__dirname, '../../..');
            skillsBaseDir = path.join(packagesDir, 'skills', 'skills');
        }
        this._scriptsDir = path.join(skillsBaseDir, 'tmux', 'scripts');
    }

    /**
     * Finds tmux sessions using the find-sessions.sh script.
     *
     * @param options - Options for finding sessions
     * @returns Array of found sessions
     */
    public findSessions(options: ITmuxFindOptions = {}): ITmuxSession[] {
        const scriptPath = path.join(this._scriptsDir, 'find-sessions.sh');
        const args: string[] = [];

        if (options.socketName) {
            args.push('-L', options.socketName);
        } else if (options.socketPath) {
            args.push('-S', options.socketPath);
        } else if (options.scanAll) {
            args.push('-A');
        }

        if (options.query) {
            args.push('-q', options.query);
        }

        try {
            const output = execSync(`bash "${scriptPath}" ${args.join(' ')}`, {
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'pipe'],
            });

            return this._parseFindSessionsOutput(output);
        } catch (error) {
            //if the script fails, return empty array
            return [];
        }
    }

    /**
     * Waits for text to appear in a tmux pane using wait-for-text.sh.
     *
     * @param target - Tmux target (e.g., 'session:0.0')
     * @param pattern - Pattern to wait for
     * @param options - Additional options
     * @returns True if pattern was found, false if timeout
     */
    public async waitForText(
        target: string,
        pattern: string,
        options: {
            fixed?: boolean;
            timeout?: number;
            interval?: number;
            historyLines?: number;
        } = {}
    ): Promise<boolean> {
        const scriptPath = path.join(this._scriptsDir, 'wait-for-text.sh');
        const args: string[] = ['-t', target, '-p', pattern];

        if (options.fixed) {
            args.push('-F');
        }
        if (options.timeout !== undefined) {
            args.push('-T', String(options.timeout));
        }
        if (options.interval !== undefined) {
            args.push('-i', String(options.interval));
        }
        if (options.historyLines !== undefined) {
            args.push('-l', String(options.historyLines));
        }

        try {
            execSync(`bash "${scriptPath}" ${args.join(' ')}`, {
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Parses output from find-sessions.sh script.
     */
    private _parseFindSessionsOutput(output: string): ITmuxSession[] {
        const sessions: ITmuxSession[] = [];
        const lines = output.split('\n');

        for (const line of lines) {
            //look for lines like: "  - session_name (attached, started ...)"
            const match = line.match(/^\s*-\s+(\S+)\s+\((\w+),\s+started\s+(.+)\)$/);
            if (match && match[1] && match[2] && match[3]) {
                sessions.push({
                    name: match[1],
                    attached: match[2] === 'attached',
                    created: match[3],
                });
            }
        }

        return sessions;
    }
}
