/**
 * Handles writing agent output to stdout.
 */

/**
 * Writes a streamed chunk to stdout without a newline.
 */
export function writeChunk(chunk: string): void {
    process.stdout.write(chunk);
}

/**
 * Writes the full response text followed by a newline.
 */
export function writeResponse(text: string): void {
    process.stdout.write(text + '\n');
}

/**
 * Writes an error message to stderr and exits with code 1.
 */
export function exitWithError(message: string): never {
    process.stderr.write(`Error: ${message}\n`);
    process.exit(1);
}
