import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Message } from '@i-clavdivs/models';

//mock AnthropicProvider — must use function keyword so `new` works
vi.mock('@i-clavdivs/models', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@i-clavdivs/models')>();
    return {
        ...actual,
        AnthropicProvider: vi.fn().mockImplementation(function () {
            return {
                getModel: vi.fn().mockReturnValue({
                    complete: vi.fn().mockResolvedValue({
                        content: 'mocked response',
                        finishReason: 'stop',
                        usage: { inputTokens: 10, outputTokens: 5 },
                    }),
                    stream: vi.fn().mockImplementation(async function* () {
                        yield { delta: 'streamed ', done: false };
                        yield { delta: 'response', done: false };
                        yield { delta: '', done: true, finishReason: 'stop' };
                    }),
                }),
            };
        }),
    };
});

//in-memory session store — re-created per test
let sessionData = new Map<string, Message[]>();

vi.mock('../src/session-store.js', () => ({
    //use a class so `new SessionStore()` works and each instance reads sessionData dynamically
    SessionStore: vi.fn().mockImplementation(function () {
        return {
            load: vi.fn().mockImplementation((id: string) =>
                //read sessionData at call time, not at construction time
                Promise.resolve(sessionData.get(id) ?? [])
            ),
            save: vi.fn().mockImplementation((id: string, messages: Message[]) => {
                sessionData.set(id, messages);
                return Promise.resolve();
            }),
            delete: vi.fn().mockImplementation((id: string) => {
                sessionData.delete(id);
                return Promise.resolve();
            }),
            exists: vi
                .fn()
                .mockImplementation((id: string) => Promise.resolve(sessionData.has(id))),
            listSessions: vi
                .fn()
                .mockImplementation(() => Promise.resolve([...sessionData.keys()])),
            clear: vi.fn().mockImplementation(() => {
                sessionData.clear();
                return Promise.resolve();
            }),
            initialize: vi.fn().mockResolvedValue(undefined),
        };
    }),
}));

import { Agent } from '../src/agent.js';
import type { IAgentRequest } from '@i-clavdivs/agents';

const BASE_REQUEST: IAgentRequest = {
    sessionId: 'test-session',
    prompt: 'hello',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5-20250929',
    workspaceDir: '/tmp',
};

describe('Agent', () => {
    beforeEach(() => {
        //reset in-memory store; don't clear mocks as that wipes implementations
        sessionData = new Map();
    });

    describe('run', () => {
        it('should return the model response as a payload', async () => {
            const agent = new Agent({ id: 'test-agent' });
            await agent.initialize();
            const result = await agent.run(BASE_REQUEST);

            expect(result.payloads).toHaveLength(1);
            expect(result.payloads?.[0]?.text).toBe('mocked response');
            expect(result.payloads?.[0]?.isError).toBeFalsy();
        });

        it('should include durationMs in meta', async () => {
            const agent = new Agent({ id: 'test-agent' });
            await agent.initialize();
            const result = await agent.run(BASE_REQUEST);

            expect(result.meta.durationMs).toBeGreaterThanOrEqual(0);
        });

        it('should save the turn to session history after a successful run', async () => {
            const agent = new Agent({ id: 'test-agent' });
            await agent.initialize();
            await agent.run(BASE_REQUEST);

            const saved = sessionData.get('test-session');
            expect(saved).toHaveLength(2); //user + assistant
            expect(saved?.[0]).toEqual({ role: 'user', content: 'hello' });
            expect(saved?.[1]).toEqual({ role: 'assistant', content: 'mocked response' });
        });

        it('should include prior history in the saved session after a second turn', async () => {
            //seed existing history before constructing agent, so the mock load picks it up
            sessionData.set('test-session', [
                { role: 'user', content: 'prior question' },
                { role: 'assistant', content: 'prior answer' },
            ]);

            const agent = new Agent({ id: 'test-agent' });
            await agent.initialize();
            await agent.run(BASE_REQUEST);

            const saved = sessionData.get('test-session');
            //2 prior + 2 new = 4
            expect(saved).toHaveLength(4);
        });

        it('should return an error payload when the model is not found', async () => {
            const { AnthropicProvider } = await import('@i-clavdivs/models');
            vi.mocked(AnthropicProvider).mockImplementationOnce(function () {
                return {
                    getModel: vi.fn().mockImplementation((modelName: string) => {
                        //return the default model during initialize, but not the nonexistent one
                        if (modelName === 'claude-sonnet-4-5-20250929') {
                            return {
                                complete: vi.fn().mockResolvedValue({
                                    content: 'mocked response',
                                    finishReason: 'stop',
                                    usage: { inputTokens: 10, outputTokens: 5 },
                                }),
                            };
                        }
                        return undefined;
                    }),
                };
            } as never);

            const agent = new Agent({ id: 'test-agent' });
            await agent.initialize();
            const result = await agent.run({ ...BASE_REQUEST, model: 'nonexistent-model' });

            expect(result.payloads?.[0]?.isError).toBe(true);
            expect(result.payloads?.[0]?.text).toContain('nonexistent-model');
        });

        it('should call onChunk for each streamed delta', async () => {
            const chunks: string[] = [];
            const agent = new Agent({ id: 'test-agent', onChunk: (c) => chunks.push(c) });
            await agent.initialize();

            await agent.run(BASE_REQUEST);

            expect(chunks).toEqual(['streamed ', 'response']);
        });

        it('should collect streamed chunks into the saved response', async () => {
            const agent = new Agent({ id: 'test-agent', onChunk: () => {} });
            await agent.initialize();
            await agent.run(BASE_REQUEST);

            const saved = sessionData.get('test-session');
            expect(saved?.[1]?.content).toBe('streamed response');
        });
    });

    describe('isActive / abort', () => {
        it('should report session as inactive before a run', () => {
            const agent = new Agent({ id: 'test-agent' });
            expect(agent.isActive('test-session')).toBe(false);
        });

        it('should report session as inactive after a run completes', async () => {
            const agent = new Agent({ id: 'test-agent' });
            await agent.initialize();
            await agent.run(BASE_REQUEST);
            expect(agent.isActive('test-session')).toBe(false);
        });

        it('should return false from abort when session is not active', async () => {
            const agent = new Agent({ id: 'test-agent' });
            expect(await agent.abort('test-session')).toBe(false);
        });
    });

    describe('history trimming', () => {
        it('should trim history to maxHistoryMessages when exceeded', async () => {
            //seed 10 messages (5 turns)
            const longHistory: Message[] = Array.from({ length: 10 }, (_, i) => ({
                role: (i % 2 === 0 ? 'user' : 'assistant') as Message['role'],
                content: `message ${String(i)}`,
            }));
            sessionData.set('test-session', longHistory);

            //cap at 4 history messages
            const agent = new Agent({ id: 'test-agent', maxHistoryMessages: 4 });
            await agent.initialize();
            await agent.run(BASE_REQUEST);

            const saved = sessionData.get('test-session');
            //4 trimmed history + 2 new = 6
            expect(saved).toHaveLength(6);
        });

        it('should not trim when history is within the limit', async () => {
            sessionData.set('test-session', [
                { role: 'user', content: 'q' },
                { role: 'assistant', content: 'a' },
            ]);

            const agent = new Agent({ id: 'test-agent', maxHistoryMessages: 40 });
            await agent.initialize();
            await agent.run(BASE_REQUEST);

            const saved = sessionData.get('test-session');
            //2 existing + 2 new = 4
            expect(saved).toHaveLength(4);
        });
    });
});
