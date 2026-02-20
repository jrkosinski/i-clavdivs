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

    /**
     * Writes a log message to stderr if it meets the minimum level threshold.
     */
    private _write(level: LogLevel, msg: string): void {
        if (this._shouldSkipLevel(level)) return;
        this._writeToStderr(level, msg);
    }

    /**
     * Checks if the log level should be skipped based on minimum level.
     */
    private _shouldSkipLevel(level: LogLevel): boolean {
        return LEVELS[level] < LEVELS[this._minLevel];
    }

    /**
     * Formats and writes log message to stderr.
     */
    private _writeToStderr(level: LogLevel, msg: string): void {
        const formatted = `[${level.toUpperCase()}] ${msg}\n`;
        process.stderr.write(formatted);
    }

    /**
     * Resolves log level from LOG_LEVEL environment variable, defaulting to 'info'.
     */
    private _resolveEnvLevel(): LogLevel {
        const env = process.env['LOG_LEVEL']?.toLowerCase();
        if (this._isValidLogLevel(env)) {
            return env;
        }
        return 'info';
    }

    /**
     * Type guard to check if string is a valid LogLevel.
     */
    private _isValidLogLevel(value: string | undefined): value is LogLevel {
        return value === 'debug' || value === 'info' || value === 'warn' || value === 'error';
    }
}

//shared default instance for the runner package
export const log = new Logger();
