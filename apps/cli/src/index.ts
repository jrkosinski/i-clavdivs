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

async function main(): Promise<void> {
    let args;
    try {
        args = CliArgs.parse(process.argv);
    } catch (err) {
        exitWithError(String(err));
    }

    const store = new SessionStore();
    if (args.newSession) await store.delete(args.sessionId);

    const runner = new AgentRunner({
        onChunk: args.stream ? writeChunk : undefined,
    });

    const result = await runner.run({
        sessionId: args.sessionId,
        prompt: args.prompt,
        provider: 'anthropic',
        model: args.model,
        workspaceDir: process.cwd(),
    });

    const payload = result.payloads?.[0];
    if (!payload) exitWithError('no response from agent');

    if (payload.isError) exitWithError(payload.text ?? 'unknown error');

    //if streaming, we already wrote chunks; just add a trailing newline
    if (args.stream) {
        process.stdout.write('\n');
    } else {
        writeResponse(payload.text ?? '');
    }
}

main().catch((err: unknown) => {
    exitWithError(err instanceof Error ? err.message : String(err));
});
