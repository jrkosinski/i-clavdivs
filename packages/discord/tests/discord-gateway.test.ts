import { describe, it, expect, beforeEach } from 'vitest';
import { DiscordGateway } from '../src/gateway/discord-gateway.js';

describe('DiscordGateway', () => {
    let gateway: DiscordGateway;

    beforeEach(() => {
        gateway = new DiscordGateway({});
    });

    describe('constructor', () => {
        it('should create a gateway instance', () => {
            expect(gateway).toBeDefined();
            expect(gateway.isRunning()).toBe(false);
        });

        it('should accept config parameter', () => {
            const config = {
                enabled: true,
                token: 'test-token',
            };

            const gw = new DiscordGateway(config);
            expect(gw).toBeDefined();
        });
    });

    describe('isRunning', () => {
        it('should return false initially', () => {
            expect(gateway.isRunning()).toBe(false);
        });
    });

    describe('setAgent', () => {
        it('should set the agent', () => {
            const mockAgent = {
                run: async () => ({ payloads: [] }),
            } as any;

            expect(() => gateway.setAgent(mockAgent)).not.toThrow();
        });
    });

    describe('message splitting', () => {
        it('should split long messages correctly', () => {
            //access private method via type assertion for testing
            const gw = gateway as any;
            const longText = 'a'.repeat(2500);

            const chunks = gw._splitMessage(longText, 2000);

            expect(chunks.length).toBeGreaterThan(1);
            chunks.forEach((chunk: string) => {
                expect(chunk.length).toBeLessThanOrEqual(2000);
            });
        });

        it('should not split short messages', () => {
            const gw = gateway as any;
            const shortText = 'Hello world';

            const chunks = gw._splitMessage(shortText, 2000);

            expect(chunks).toHaveLength(1);
            expect(chunks[0]).toBe('Hello world');
        });

        it('should prefer splitting at newlines', () => {
            const gw = gateway as any;
            const text = 'a'.repeat(1900) + '\n' + 'b'.repeat(1900);

            const chunks = gw._splitMessage(text, 2000);

            expect(chunks.length).toBeGreaterThan(1);
            expect(chunks[0]).toContain('a');
            expect(chunks[1]).toContain('b');
        });

        it('should handle exact length messages', () => {
            const gw = gateway as any;
            const text = 'a'.repeat(2000);

            const chunks = gw._splitMessage(text, 2000);

            expect(chunks).toHaveLength(1);
            expect(chunks[0]).toBe(text);
        });
    });

    describe('target parsing', () => {
        it('should parse channel target format', () => {
            const gw = gateway as any;
            //need to mock a client to test this
            gw._clients = [{ accountId: 'default', client: {}, handler: {} }];

            const result = gw._parseTarget('channel:123456');

            expect(result).toEqual({
                accountId: 'default',
                type: 'channel',
                id: '123456',
            });
        });

        it('should parse user target format', () => {
            const gw = gateway as any;
            gw._clients = [{ accountId: 'default', client: {}, handler: {} }];

            const result = gw._parseTarget('user:789012');

            expect(result).toEqual({
                accountId: 'default',
                type: 'user',
                id: '789012',
            });
        });

        it('should parse account-specific channel target', () => {
            const gw = gateway as any;

            const result = gw._parseTarget('bot1:channel:123456');

            expect(result).toEqual({
                accountId: 'bot1',
                type: 'channel',
                id: '123456',
            });
        });

        it('should parse account-specific user target', () => {
            const gw = gateway as any;

            const result = gw._parseTarget('bot1:user:789012');

            expect(result).toEqual({
                accountId: 'bot1',
                type: 'user',
                id: '789012',
            });
        });

        it('should throw on invalid target format', () => {
            const gw = gateway as any;

            expect(() => gw._parseTarget('invalid')).toThrow('Invalid Discord target format');
        });

        it('should throw on malformed target', () => {
            const gw = gateway as any;

            expect(() => gw._parseTarget('channel')).toThrow('Invalid Discord target format');
        });

        it('should handle empty parts in target', () => {
            const gw = gateway as any;

            expect(() => gw._parseTarget(':channel:123')).toThrow('Invalid Discord target format');
        });
    });

    describe('error handling', () => {
        it('should throw when starting without accounts', async () => {
            const config = {
                enabled: true,
            };

            await expect(gateway.start(config)).rejects.toThrow('No Discord accounts configured');
        });

        it('should throw when already running', async () => {
            const gw = gateway as any;
            gw._running = true;

            await expect(gateway.start({})).rejects.toThrow('Discord gateway already running');
        });

        it('should handle stop when not running', async () => {
            await expect(gateway.stop()).resolves.not.toThrow();
        });
    });

    describe('client management', () => {
        it('should find client by account ID', () => {
            const gw = gateway as any;
            gw._clients = [
                { accountId: 'bot1', client: { id: 1 }, handler: {} },
                { accountId: 'bot2', client: { id: 2 }, handler: {} },
            ];

            const found = gw._findClient('bot2');

            expect(found).toBeDefined();
            expect(found.accountId).toBe('bot2');
            expect(found.client.id).toBe(2);
        });

        it('should return undefined for non-existent account', () => {
            const gw = gateway as any;
            gw._clients = [{ accountId: 'bot1', client: {}, handler: {} }];

            const found = gw._findClient('nonexistent');

            expect(found).toBeUndefined();
        });

        it('should handle empty clients array', () => {
            const gw = gateway as any;
            gw._clients = [];

            const found = gw._findClient('bot1');

            expect(found).toBeUndefined();
        });
    });
});
