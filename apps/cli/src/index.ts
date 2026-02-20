#!/usr/bin/env node
/**
 * CLI entrypoint for the i-clavdivs agent runner.
 *
 * Examples:
 *   node dist/index.js "hello"
 *   node dist/index.js --stream "write me a poem"
 *   node dist/index.js --session my-project "what did I just say?"
 *   node dist/index.js --model claude-3-5-sonnet-20241022 --stream "explain recursion"
 */

import process from 'node:process';
import { AgentRunner } from '@i-clavdivs/runner';
import { SessionStore } from '@i-clavdivs/runner';
import { CliArgs } from './args.js';
import { writeChunk, writeResponse, exitWithError } from './output.js';

/**
 * Main CLI entry point.
 */
async function main(): Promise<void> {
    const args = parseArgsOrExit();
    await prepareSession(args);
    const result = await runAgent(args);
    handleOutput(result, args.stream);
}

/**
 * Parses CLI arguments or exits with error message.
 */
function parseArgsOrExit(): ReturnType<typeof CliArgs.parse> {
    try {
        return CliArgs.parse(process.argv);
    } catch (err) {
        exitWithError(String(err));
    }
}

/**
 * Prepares session by clearing it if --new flag was passed.
 */
async function prepareSession(args: ReturnType<typeof CliArgs.parse>): Promise<void> {
    if (!args.newSession) return;

    const store = new SessionStore();
    await store.delete(args.sessionId);
}

/**
 * Runs the agent and returns the result.
 */
async function runAgent(args: ReturnType<typeof CliArgs.parse>) {
    const runner = createRunner(args.stream);
    return await runner.run({
        sessionId: args.sessionId,
        prompt: args.prompt,
        provider: 'anthropic',
        model: args.model,
        workspaceDir: process.cwd(),
    });
}

/**
 * Creates agent runner with optional streaming support.
 */
function createRunner(stream: boolean): AgentRunner {
    return new AgentRunner({
        onChunk: stream ? writeChunk : undefined,
    });
}

/**
 * Handles result output to stdout, either streaming or complete.
 */
function handleOutput(
    result: Awaited<ReturnType<AgentRunner['run']>>,
    isStreaming: boolean
): void {
    const payload = extractPayload(result);
    validatePayload(payload);

    if (isStreaming) {
        //streaming mode: chunks already written, just add newline
        process.stdout.write('\n');
    } else {
        writeResponse(payload.text ?? '');
    }
}

/**
 * Extracts first payload from result or exits with error.
 */
function extractPayload(result: Awaited<ReturnType<AgentRunner['run']>>) {
    const payload = result.payloads?.[0];
    if (!payload) exitWithError('no response from agent');
    return payload;
}

/**
 * Validates payload and exits if it contains an error.
 */
function validatePayload(payload: NonNullable<ReturnType<typeof extractPayload>>): void {
    if (payload.isError) {
        exitWithError(payload.text ?? 'unknown error');
    }
}

main().catch((err: unknown) => {
    exitWithError(err instanceof Error ? err.message : String(err));
});
