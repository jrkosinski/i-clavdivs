import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ConfigLoader } from '../src/utils/config-loader.js';

describe('ConfigLoader', () => {
    let testDir: string;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(async () => {
        //create temp directory for test files
        testDir = join(tmpdir(), `plugin-test-${Date.now()}`);
        await mkdir(testDir, { recursive: true });

        //save original env
        originalEnv = { ...process.env };
    });

    afterEach(async () => {
        //cleanup temp directory
        await rm(testDir, { recursive: true, force: true });

        //clear any Discord-related env vars to prevent test pollution
        delete process.env.DISCORD_BOT_TOKEN;
        delete process.env.DISCORD_REQUIRE_MENTION;
        delete process.env.DISCORD_ALLOWED_CHANNELS;
        delete process.env.DISCORD_ALLOWED_USERS;
        delete process.env.DISCORD_ACCOUNTS;

        //restore original env
        process.env = originalEnv;
    });

    describe('load', () => {
        it('should load config from JSON file', async () => {
            const configPath = join(testDir, 'config.json');
            const configData = {
                channels: {
                    discord: {
                        enabled: true,
                        token: 'test-token',
                    },
                },
            };

            await writeFile(configPath, JSON.stringify(configData, null, 2));

            const config = await ConfigLoader.load(configPath);

            expect(config).toEqual(configData);
        });

        it('should replace environment variable placeholders', async () => {
            process.env.TEST_TOKEN = 'my-secret-token';
            process.env.TEST_CHANNEL = 'channel-123';

            const configPath = join(testDir, 'config.json');
            const configData = {
                channels: {
                    discord: {
                        enabled: true,
                        token: '${TEST_TOKEN}',
                        allowedChannels: ['${TEST_CHANNEL}'],
                    },
                },
            };

            await writeFile(configPath, JSON.stringify(configData, null, 2));

            const config = await ConfigLoader.load(configPath);

            expect(config).toEqual({
                channels: {
                    discord: {
                        enabled: true,
                        token: 'my-secret-token',
                        allowedChannels: ['channel-123'],
                    },
                },
            });
        });

        it('should return empty config for nonexistent file', async () => {
            const config = await ConfigLoader.load(join(testDir, 'nonexistent.json'));

            //should have channels object from env config
            expect(config).toHaveProperty('channels');
        });

        it('should handle malformed JSON gracefully', async () => {
            const configPath = join(testDir, 'bad.json');
            await writeFile(configPath, '{ bad json }');

            const config = await ConfigLoader.load(configPath);

            //should have channels object from env config (file parse failed)
            expect(config).toHaveProperty('channels');
        });

        it('should load from environment variables', async () => {
            process.env.DISCORD_BOT_TOKEN = 'env-token';
            process.env.DISCORD_REQUIRE_MENTION = 'true';
            process.env.DISCORD_ALLOWED_CHANNELS = 'ch1,ch2,ch3';

            const config = await ConfigLoader.load();

            expect(config).toEqual({
                channels: {
                    discord: {
                        enabled: true,
                        token: 'env-token',
                        requireMention: true,
                        allowedChannels: ['ch1', 'ch2', 'ch3'],
                        allowedUsers: undefined,
                    },
                },
            });
        });

        it('should merge file config with env config (env takes precedence)', async () => {
            const configPath = join(testDir, 'config.json');
            const configData = {
                channels: {
                    discord: {
                        enabled: true,
                        token: 'file-token',
                        requireMention: false,
                    },
                },
            };

            await writeFile(configPath, JSON.stringify(configData, null, 2));

            process.env.DISCORD_BOT_TOKEN = 'env-token';
            process.env.DISCORD_REQUIRE_MENTION = 'true';

            const config = await ConfigLoader.load(configPath);

            expect(config.channels?.discord).toMatchObject({
                enabled: true,
                token: 'env-token',
                requireMention: true,
            });
        });
    });

    describe('multi-account Discord config', () => {
        it('should parse multi-account config from environment', async () => {
            process.env.DISCORD_ACCOUNTS = 'bot1,bot2';
            process.env.DISCORD_BOT1_TOKEN = 'token1';
            process.env.DISCORD_BOT1_ALLOWED_CHANNELS = 'ch1,ch2';
            process.env.DISCORD_BOT2_TOKEN = 'token2';
            process.env.DISCORD_BOT2_REQUIRE_MENTION = 'true';

            const config = await ConfigLoader.load();

            expect(config.channels?.discord).toEqual({
                enabled: true,
                accounts: [
                    {
                        id: 'bot1',
                        token: 'token1',
                        requireMention: false,
                        allowedChannels: ['ch1', 'ch2'],
                        allowedUsers: undefined,
                    },
                    {
                        id: 'bot2',
                        token: 'token2',
                        requireMention: true,
                        allowedChannels: undefined,
                        allowedUsers: undefined,
                    },
                ],
            });
        });

        it('should handle missing account tokens', async () => {
            process.env.DISCORD_ACCOUNTS = 'bot1,bot2,bot3';
            process.env.DISCORD_BOT1_TOKEN = 'token1';
            //bot2 has no token
            process.env.DISCORD_BOT3_TOKEN = 'token3';

            const config = await ConfigLoader.load();

            const accounts = (config.channels?.discord as any)?.accounts;
            expect(accounts).toHaveLength(2);
            expect(accounts[0]?.id).toBe('bot1');
            expect(accounts[1]?.id).toBe('bot3');
        });

        it('should handle whitespace in account list', async () => {
            process.env.DISCORD_ACCOUNTS = 'bot1 , bot2 ,bot3';
            process.env.DISCORD_BOT1_TOKEN = 'token1';
            process.env.DISCORD_BOT2_TOKEN = 'token2';
            process.env.DISCORD_BOT3_TOKEN = 'token3';

            const config = await ConfigLoader.load();

            const accounts = (config.channels?.discord as any)?.accounts;
            expect(accounts).toHaveLength(3);
            expect(accounts[0]?.id).toBe('bot1');
            expect(accounts[1]?.id).toBe('bot2');
            expect(accounts[2]?.id).toBe('bot3');
        });
    });

    describe('environment variable replacement', () => {
        it('should replace nested environment variables', async () => {
            process.env.DB_HOST = 'localhost';
            process.env.DB_PORT = '5432';
            process.env.API_KEY = 'secret-key';

            const configPath = join(testDir, 'config.json');
            const configData = {
                database: {
                    host: '${DB_HOST}',
                    port: '${DB_PORT}',
                },
                api: {
                    key: '${API_KEY}',
                },
            };

            await writeFile(configPath, JSON.stringify(configData, null, 2));

            const config = await ConfigLoader.load(configPath);

            expect(config).toMatchObject({
                database: {
                    host: 'localhost',
                    port: '5432',
                },
                api: {
                    key: 'secret-key',
                },
            });
        });

        it('should handle missing environment variables by keeping placeholder', async () => {
            const configPath = join(testDir, 'config.json');
            const configData = {
                test: '${NONEXISTENT_VAR}',
            };

            await writeFile(configPath, JSON.stringify(configData, null, 2));

            const config = await ConfigLoader.load(configPath);

            expect(config).toMatchObject({
                test: '${NONEXISTENT_VAR}',
            });
        });

        it('should handle arrays with environment variables', async () => {
            process.env.CHANNEL1 = 'ch1';
            process.env.CHANNEL2 = 'ch2';

            const configPath = join(testDir, 'config.json');
            const configData = {
                myChannels: ['${CHANNEL1}', '${CHANNEL2}', 'hardcoded'],
            };

            await writeFile(configPath, JSON.stringify(configData, null, 2));

            const config = await ConfigLoader.load(configPath);

            expect(config).toMatchObject({
                myChannels: ['ch1', 'ch2', 'hardcoded'],
            });
        });

        it('should not replace partial placeholders', async () => {
            process.env.TOKEN = 'secret';

            const configPath = join(testDir, 'config.json');
            const configData = {
                partialStart: 'prefix${TOKEN}',
                partialEnd: '${TOKEN}suffix',
                partialBoth: 'prefix${TOKEN}suffix',
                complete: '${TOKEN}',
            };

            await writeFile(configPath, JSON.stringify(configData, null, 2));

            const config = await ConfigLoader.load(configPath);

            expect(config).toMatchObject({
                partialStart: 'prefix${TOKEN}',
                partialEnd: '${TOKEN}suffix',
                partialBoth: 'prefix${TOKEN}suffix',
                complete: 'secret',
            });
        });
    });
});
