import { describe, it, expect } from 'vitest';
import { normalizeDiscordConfig } from '../src/config/discord-config.js';
import type { IDiscordConfig } from '../src/config/discord-config.js';

describe('Discord Configuration', () => {
    describe('normalizeDiscordConfig', () => {
        describe('single-account mode', () => {
            it('should normalize single-account config with token', () => {
                const config: IDiscordConfig = {
                    enabled: true,
                    token: 'test-token',
                };

                const accounts = normalizeDiscordConfig(config);

                expect(accounts).toHaveLength(1);
                expect(accounts[0]).toEqual({
                    id: 'default',
                    token: 'test-token',
                    enabled: true,
                    allowedChannels: undefined,
                    allowedUsers: undefined,
                    requireMention: undefined,
                });
            });

            it('should normalize single-account config with all options', () => {
                const config: IDiscordConfig = {
                    enabled: true,
                    token: 'test-token',
                    allowedChannels: ['ch1', 'ch2'],
                    allowedUsers: ['user1', 'user2'],
                    requireMention: true,
                };

                const accounts = normalizeDiscordConfig(config);

                expect(accounts).toHaveLength(1);
                expect(accounts[0]).toEqual({
                    id: 'default',
                    token: 'test-token',
                    enabled: true,
                    allowedChannels: ['ch1', 'ch2'],
                    allowedUsers: ['user1', 'user2'],
                    requireMention: true,
                });
            });

            it('should return empty array if no token provided', () => {
                const config: IDiscordConfig = {
                    enabled: true,
                };

                const accounts = normalizeDiscordConfig(config);

                expect(accounts).toEqual([]);
            });
        });

        describe('multi-account mode', () => {
            it('should normalize multi-account config', () => {
                const config: IDiscordConfig = {
                    enabled: true,
                    accounts: [
                        {
                            id: 'bot1',
                            token: 'token1',
                            enabled: true,
                        },
                        {
                            id: 'bot2',
                            token: 'token2',
                            enabled: true,
                        },
                    ],
                };

                const accounts = normalizeDiscordConfig(config);

                expect(accounts).toHaveLength(2);
                expect(accounts[0]?.id).toBe('bot1');
                expect(accounts[1]?.id).toBe('bot2');
            });

            it('should filter out disabled accounts', () => {
                const config: IDiscordConfig = {
                    enabled: true,
                    accounts: [
                        {
                            id: 'bot1',
                            token: 'token1',
                            enabled: true,
                        },
                        {
                            id: 'bot2',
                            token: 'token2',
                            enabled: false,
                        },
                        {
                            id: 'bot3',
                            token: 'token3',
                            enabled: true,
                        },
                    ],
                };

                const accounts = normalizeDiscordConfig(config);

                expect(accounts).toHaveLength(2);
                expect(accounts[0]?.id).toBe('bot1');
                expect(accounts[1]?.id).toBe('bot3');
            });

            it('should include accounts without explicit enabled flag', () => {
                const config: IDiscordConfig = {
                    enabled: true,
                    accounts: [
                        {
                            id: 'bot1',
                            token: 'token1',
                        },
                        {
                            id: 'bot2',
                            token: 'token2',
                            enabled: true,
                        },
                    ],
                };

                const accounts = normalizeDiscordConfig(config);

                expect(accounts).toHaveLength(2);
            });

            it('should preserve account-specific settings', () => {
                const config: IDiscordConfig = {
                    enabled: true,
                    accounts: [
                        {
                            id: 'bot1',
                            token: 'token1',
                            allowedChannels: ['ch1', 'ch2'],
                            allowedUsers: ['user1'],
                            requireMention: true,
                        },
                    ],
                };

                const accounts = normalizeDiscordConfig(config);

                expect(accounts).toHaveLength(1);
                expect(accounts[0]).toEqual({
                    id: 'bot1',
                    token: 'token1',
                    allowedChannels: ['ch1', 'ch2'],
                    allowedUsers: ['user1'],
                    requireMention: true,
                });
            });

            it('should prefer multi-account mode over single-account', () => {
                const config: IDiscordConfig = {
                    enabled: true,
                    token: 'single-token',
                    accounts: [
                        {
                            id: 'bot1',
                            token: 'multi-token1',
                        },
                    ],
                };

                const accounts = normalizeDiscordConfig(config);

                expect(accounts).toHaveLength(1);
                expect(accounts[0]?.token).toBe('multi-token1');
                expect(accounts[0]?.id).toBe('bot1');
            });

            it('should return empty array for empty accounts array', () => {
                const config: IDiscordConfig = {
                    enabled: true,
                    accounts: [],
                };

                const accounts = normalizeDiscordConfig(config);

                expect(accounts).toEqual([]);
            });
        });

        describe('edge cases', () => {
            it('should handle config with no accounts and no token', () => {
                const config: IDiscordConfig = {
                    enabled: true,
                };

                const accounts = normalizeDiscordConfig(config);

                expect(accounts).toEqual([]);
            });

            it('should handle empty string token', () => {
                const config: IDiscordConfig = {
                    enabled: true,
                    token: '',
                };

                const accounts = normalizeDiscordConfig(config);

                expect(accounts).toEqual([]);
            });

            it('should handle all accounts disabled in multi-account mode', () => {
                const config: IDiscordConfig = {
                    enabled: true,
                    accounts: [
                        {
                            id: 'bot1',
                            token: 'token1',
                            enabled: false,
                        },
                        {
                            id: 'bot2',
                            token: 'token2',
                            enabled: false,
                        },
                    ],
                };

                const accounts = normalizeDiscordConfig(config);

                expect(accounts).toEqual([]);
            });
        });
    });
});
