#!/usr/bin/env node
/**
 * CLI entrypoint for the i-clavdivs agent.
 *
 * Examples:
 *   node dist/index.js "hello"
 *   node dist/index.js --stream "write me a poem"
 *   node dist/index.js --session my-project "what did I just say?"
 *   node dist/index.js --model claude-sonnet-4-5-20250929 --stream "explain recursion"
 */

// Load environment variables from .env file before anything else
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Find project root (when built: apps/cli/dist/index.js -> apps/cli/dist -> apps/cli -> apps -> root)
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const projectRoot = resolve(__dirname, '..', '..', '..');
const envPath = resolve(projectRoot, '.env');

// Debug: log the paths
console.log('[DEBUG] Path resolution:');
console.log('  __filename:', __filename);
console.log('  __dirname:', __dirname);
console.log('  projectRoot:', projectRoot);
console.log('  envPath:', envPath);

// Load .env from project root
const dotenvResult = dotenvConfig({ path: envPath });
console.log(
    '[DEBUG] dotenv result:',
    dotenvResult.error ? `ERROR: ${dotenvResult.error}` : 'SUCCESS'
);
console.log(
    '[DEBUG] dotenv parsed:',
    dotenvResult.parsed ? Object.keys(dotenvResult.parsed) : 'none'
);
console.log(
    '[DEBUG] DISCORD_BOT_TOKEN_ALAN from process.env:',
    typeof process.env.DISCORD_BOT_TOKEN_ALAN,
    'value:',
    process.env.DISCORD_BOT_TOKEN_ALAN
);
console.log(
    '[DEBUG] DISCORD_BOT_TOKEN_CONAN from process.env:',
    typeof process.env.DISCORD_BOT_TOKEN_CONAN,
    'value:',
    process.env.DISCORD_BOT_TOKEN_CONAN
);
console.log(
    '[DEBUG] All DISCORD env vars:',
    Object.keys(process.env).filter((k) => k.startsWith('DISCORD'))
);
console.log('[DEBUG] Dotenv parsed values:', dotenvResult.parsed);

import process from 'node:process';
import { Agent } from '@i-clavdivs/agent';
import { SessionStore } from '@i-clavdivs/agent';
import { loadWorkspaceFiles } from '@i-clavdivs/workspace';
import { CliArgs } from './args.js';
import { writeChunk, writeResponse, exitWithError } from './output.js';
import { loadPlugins } from './plugin-loader.js';

/**
 * Main CLI entry point.
 */
async function main(): Promise<void> {
    const args = parseArgsOrExit();

    //if prompt provided, run in single-shot mode
    if (args.prompt) {
        await prepareSession(args);
        const agent = await createAgent(args.stream, args.workspaceDir);
        await runSinglePrompt(agent, args, args.prompt);
        await agent.dispose();
        process.exit(0);
    }

    //otherwise, run in daemon mode listening to channels
    //plugins will create their own agents with IDs from config
    const pluginManager = await loadPlugins(undefined);

    //setup graceful shutdown
    setupShutdownHandlers(pluginManager);

    await runDaemonMode();
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
 * Run a single prompt and return the result.
 */
async function runSinglePrompt(
    agent: Agent,
    args: ReturnType<typeof CliArgs.parse>,
    prompt: string
) {
    const result = await agent.run({
        sessionId: args.sessionId,
        prompt,
        provider: 'anthropic',
        model: args.model,
        workspaceDir: process.cwd(),
    });

    handleOutput(result, args.stream);
}

/**
 * Run in daemon mode, listening for channel messages.
 */
async function runDaemonMode(): Promise<void> {
    console.log('i-clavdivs is running in daemon mode. Press Ctrl+C to stop.');
    console.log('Listening for messages on configured channels...\n');

    //heartbeat to show the process is alive
    const heartbeatInterval = setInterval(() => {
        console.log(`[${new Date().toISOString()}] Daemon alive - listening for messages...`);
    }, 60000); //every minute

    //keep process alive
    await new Promise(() => {
        //this promise never resolves, keeping the process running
        //cleanup heartbeat on exit
        process.on('beforeExit', () => {
            clearInterval(heartbeatInterval);
        });
    });
}

/**
 * Creates agent with optional streaming support and workspace files.
 */
async function createAgent(stream: boolean, workspaceDir?: string): Promise<Agent> {
    // Load workspace files from specified directory or default location (~/.i-clavdivs/workspace)
    const workspaceFiles = await loadWorkspaceFiles(workspaceDir ? { workspaceDir } : undefined);

    const agent = new Agent({
        id: 'cli-agent',
        onChunk: stream ? writeChunk : undefined,
        workspaceDir,
        workspaceFiles,
    });

    await agent.initialize();

    return agent;
}

/**
 * Handles result output to stdout, either streaming or complete.
 */
function handleOutput(result: Awaited<ReturnType<Agent['run']>>, isStreaming: boolean): void {
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
function extractPayload(result: Awaited<ReturnType<Agent['run']>>) {
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

/**
 * Setup handlers for graceful shutdown.
 */
function setupShutdownHandlers(pluginManager: any): void {
    const shutdown = async () => {
        console.log('\nShutting down gracefully...');
        await pluginManager.cleanup();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

main().catch((err: unknown) => {
    exitWithError(err instanceof Error ? err.message : String(err));
});
