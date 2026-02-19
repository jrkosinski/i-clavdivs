/**
 * Minimal logger. Writes to stderr so stdout stays clean for agent output.
 * Level is controlled via the LOG_LEVEL environment variable (debug|info|warn|error).
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

/**
 * Simple stderr logger used across the runner package.
 */
export class Logger {
    private readonly _minLevel: LogLevel;

    public constructor(minLevel?: LogLevel) {
        this._minLevel = minLevel ?? this._resolveEnvLevel();
    }

    public debug(msg: string): void {
        this._write('debug', msg);
    }
    public info(msg: string): void {
        this._write('info', msg);
    }
    public warn(msg: string): void {
        this._write('warn', msg);
    }
    public error(msg: string): void {
        this._write('error', msg);
    }

    private _write(level: LogLevel, msg: string): void {
        if (LEVELS[level] < LEVELS[this._minLevel]) return;
        process.stderr.write(`[${level.toUpperCase()}] ${msg}\n`);
    }

    private _resolveEnvLevel(): LogLevel {
        const env = process.env['LOG_LEVEL']?.toLowerCase();
        if (env === 'debug' || env === 'info' || env === 'warn' || env === 'error') return env;
        return 'info';
    }
}

//shared default instance for the runner package
export const log = new Logger();
