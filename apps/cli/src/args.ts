/**
 * CLI argument parser.
 *
 * Usage:
 *   node dist/index.js [options] "<prompt>"
 *
 * Options:
 *   --session <id>    session ID for persistent history (default: "default")
 *   --model   <id>    model ID to use (default: claude-3-5-haiku-20241022)
 *   --stream          stream output token-by-token to stdout
 *   --new             start a fresh session, ignoring any existing history
 */

export interface ICliArgs {
    prompt: string;
    sessionId: string;
    model: string;
    stream: boolean;
    newSession: boolean;
}

const DEFAULT_MODEL = 'claude-3-5-haiku-20241022';
const DEFAULT_SESSION = 'default';

/**
 * Parses process.argv into a structured ICliArgs object.
 * Throws with a usage message if the prompt is missing.
 */
export class CliArgs {
    public static parse(argv: string[]): ICliArgs {
        const args = argv.slice(2);
        const parsed = new CliArgs(args);
        return parsed._resolve();
    }

    public static usage(): string {
        return [
            'Usage: node dist/index.js [options] "<prompt>"',
            '',
            'Options:',
            '  --session <id>   session ID for persistent history (default: "default")',
            '  --model <id>     Anthropic model ID (default: claude-3-5-haiku-20241022)',
            '  --stream         stream output token-by-token',
            '  --new            ignore existing session history',
        ].join('\n');
    }

    private readonly _args: string[];

    private constructor(args: string[]) {
        this._args = args;
    }

    /**
     * Resolves raw arguments into structured ICliArgs object.
     */
    private _resolve(): ICliArgs {
        const result = this._createDefaultArgs();
        const remaining = this._parseArguments(result);
        this._setPrompt(result, remaining);
        this._validatePrompt(result.prompt);
        return result;
    }

    /**
     * Creates a default args object with initial values.
     */
    private _createDefaultArgs(): ICliArgs {
        return {
            prompt: '',
            sessionId: DEFAULT_SESSION,
            model: DEFAULT_MODEL,
            stream: false,
            newSession: false,
        };
    }

    /**
     * Parses arguments, updating result object and returning non-flag arguments.
     */
    private _parseArguments(result: ICliArgs): string[] {
        const remaining: string[] = [];
        let i = 0;

        while (i < this._args.length) {
            const arg = this._args[i];
            if (arg !== undefined) {
                i = this._processArgument(arg, i, result, remaining);
            } else {
                i++;
            }
        }

        return remaining;
    }

    /**
     * Processes a single argument and returns the next index.
     */
    private _processArgument(
        arg: string,
        currentIndex: number,
        result: ICliArgs,
        remaining: string[]
    ): number {
        if (this._isSessionFlag(arg)) {
            return this._handleSessionFlag(currentIndex, result);
        }
        if (this._isModelFlag(arg)) {
            return this._handleModelFlag(currentIndex, result);
        }
        if (arg === '--stream') {
            result.stream = true;
            return currentIndex + 1;
        }
        if (arg === '--new') {
            result.newSession = true;
            return currentIndex + 1;
        }
        if (this._isPositionalArg(arg)) {
            remaining.push(arg);
        }
        return currentIndex + 1;
    }

    /**
     * Checks if argument is the --session flag.
     */
    private _isSessionFlag(arg: string): boolean {
        return arg === '--session';
    }

    /**
     * Checks if argument is the --model flag.
     */
    private _isModelFlag(arg: string): boolean {
        return arg === '--model';
    }

    /**
     * Checks if argument is a positional argument (not a flag).
     */
    private _isPositionalArg(arg: string): boolean {
        return arg !== undefined && !arg.startsWith('--');
    }

    /**
     * Handles --session flag and returns next index.
     */
    private _handleSessionFlag(currentIndex: number, result: ICliArgs): number {
        if (currentIndex + 1 < this._args.length) {
            result.sessionId = this._args[currentIndex + 1] ?? DEFAULT_SESSION;
            return currentIndex + 2;
        }
        return currentIndex + 1;
    }

    /**
     * Handles --model flag and returns next index.
     */
    private _handleModelFlag(currentIndex: number, result: ICliArgs): number {
        if (currentIndex + 1 < this._args.length) {
            result.model = this._args[currentIndex + 1] ?? DEFAULT_MODEL;
            return currentIndex + 2;
        }
        return currentIndex + 1;
    }

    /**
     * Sets the prompt field from remaining positional arguments.
     */
    private _setPrompt(result: ICliArgs, remaining: string[]): void {
        result.prompt = remaining.join(' ').trim();
    }

    /**
     * Validates that prompt is not empty.
     */
    private _validatePrompt(prompt: string): void {
        if (!prompt) {
            throw new Error(`prompt is required\n\n${CliArgs.usage()}`);
        }
    }
}
