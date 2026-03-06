import { describe, it, expect } from 'vitest';
import { normalizeRedditConfig } from '../src/config/reddit-config.js';
import type { IRedditConfig } from '../src/config/reddit-config.js';

describe('Reddit Config', () => {
    describe('normalizeRedditConfig', () => {
        it('should return empty array when no config provided', () => {
            const config: IRedditConfig = {
                enabled: true,
            };

            const result = normalizeRedditConfig(config);
            expect(result).toEqual([]);
        });

        it('should normalize single-account config', () => {
            const config: IRedditConfig = {
                enabled: true,
                clientId: 'test-client-id',
                clientSecret: 'test-client-secret',
                refreshToken: 'test-refresh-token',
                username: 'testbot',
                userAgent: 'test-agent/1.0',
                subreddits: ['test'],
                monitorMentions: true,
                monitorDirectMessages: false,
                pollingInterval: 30000,
            };

            const result = normalizeRedditConfig(config);
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                id: 'default',
                clientId: 'test-client-id',
                clientSecret: 'test-client-secret',
                refreshToken: 'test-refresh-token',
                username: 'testbot',
                userAgent: 'test-agent/1.0',
                enabled: true,
                subreddits: ['test'],
                monitorMentions: true,
                monitorDirectMessages: false,
                pollingInterval: 30000,
            });
        });

        it('should use defaults for missing single-account fields', () => {
            const config: IRedditConfig = {
                enabled: true,
                clientId: 'test-client-id',
                clientSecret: 'test-client-secret',
                refreshToken: 'test-refresh-token',
            };

            const result = normalizeRedditConfig(config);
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                id: 'default',
                username: 'bot',
                userAgent: 'i-clavdivs-bot/1.0',
                enabled: true,
                monitorMentions: true,
                monitorDirectMessages: true,
                monitorCommentReplies: true,
                monitorPostReplies: false,
                pollingInterval: 60000,
            });
        });

        it('should normalize multi-account config', () => {
            const config: IRedditConfig = {
                enabled: true,
                accounts: [
                    {
                        id: 'bot1',
                        clientId: 'client1',
                        clientSecret: 'secret1',
                        refreshToken: 'token1',
                        username: 'bot1',
                        userAgent: 'bot1/1.0',
                        enabled: true,
                    },
                    {
                        id: 'bot2',
                        clientId: 'client2',
                        clientSecret: 'secret2',
                        refreshToken: 'token2',
                        username: 'bot2',
                        userAgent: 'bot2/1.0',
                        enabled: false,
                    },
                    {
                        id: 'bot3',
                        clientId: 'client3',
                        clientSecret: 'secret3',
                        refreshToken: 'token3',
                        username: 'bot3',
                        userAgent: 'bot3/1.0',
                        enabled: true,
                    },
                ],
            };

            const result = normalizeRedditConfig(config);
            expect(result).toHaveLength(2);
            expect(result[0]?.id).toBe('bot1');
            expect(result[1]?.id).toBe('bot3');
        });

        it('should filter out disabled accounts in multi-account mode', () => {
            const config: IRedditConfig = {
                enabled: true,
                accounts: [
                    {
                        id: 'bot1',
                        clientId: 'client1',
                        clientSecret: 'secret1',
                        refreshToken: 'token1',
                        username: 'bot1',
                        userAgent: 'bot1/1.0',
                        enabled: false,
                    },
                ],
            };

            const result = normalizeRedditConfig(config);
            expect(result).toHaveLength(0);
        });

        it('should prefer multi-account config over single-account', () => {
            const config: IRedditConfig = {
                enabled: true,
                clientId: 'single-client',
                clientSecret: 'single-secret',
                refreshToken: 'single-token',
                accounts: [
                    {
                        id: 'multi-bot',
                        clientId: 'multi-client',
                        clientSecret: 'multi-secret',
                        refreshToken: 'multi-token',
                        username: 'multibot',
                        userAgent: 'multi/1.0',
                    },
                ],
            };

            const result = normalizeRedditConfig(config);
            expect(result).toHaveLength(1);
            expect(result[0]?.id).toBe('multi-bot');
            expect(result[0]?.clientId).toBe('multi-client');
        });
    });
});
