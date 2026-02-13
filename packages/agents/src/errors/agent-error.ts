/**
 * Base error class for all agent-related errors
 */

/**
 * Base class for all agent system errors
 */
export abstract class AgentError extends Error {
    /**
     * Error code for programmatic identification
     */
    public abstract readonly code: string;

    /**
     * Whether this error type can be retried
     */
    public abstract readonly retryable: boolean;

    /**
     * HTTP status code associated with this error type
     */
    public abstract readonly httpStatus: number;

    constructor(
        message: string,
        public override readonly cause?: Error
    ) {
        super(message);
        this.name = this.constructor.name;

        //preserve stack trace
        if (cause?.stack) {
            this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
        }
    }

    /**
     * Convert error to JSON-serializable object
     */
    public toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            retryable: this.retryable,
            httpStatus: this.httpStatus,
            cause: this.cause ? String(this.cause) : undefined,
        };
    }
}
