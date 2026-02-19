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

    private _resolve(): ICliArgs {
        const result = {
            prompt: '',
            sessionId: DEFAULT_SESSION,
            model: DEFAULT_MODEL,
            stream: false,
            newSession: false,
        };

        const remaining: string[] = [];
        let i = 0;
        while (i < this._args.length) {
            const arg = this._args[i];
            if (arg === '--session' && i + 1 < this._args.length) {
                result.sessionId = this._args[++i] ?? DEFAULT_SESSION;
            } else if (arg === '--model' && i + 1 < this._args.length) {
                result.model = this._args[++i] ?? DEFAULT_MODEL;
            } else if (arg === '--stream') {
                result.stream = true;
            } else if (arg === '--new') {
                result.newSession = true;
            } else if (arg && !arg.startsWith('--')) {
                remaining.push(arg);
            }
            i++;
        }

        result.prompt = remaining.join(' ').trim();
        if (!result.prompt) throw new Error(`prompt is required\n\n${CliArgs.usage()}`);
        return result;
    }
}
