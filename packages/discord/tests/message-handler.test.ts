import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageHandler } from '../src/gateway/message-handler.js';
import type { IDiscordAccountConfig } from '../src/config/discord-config.js';
import type { Message, User, Guild, Client } from 'discord.js';

describe('MessageHandler', () => {
    let handler: MessageHandler;
    let mockMessage: Partial<Message>;
    let mockUser: Partial<User>;
    let mockClientUser: Partial<User>;

    beforeEach(() => {
        const config: IDiscordAccountConfig = {
            id: 'test-bot',
            token: 'test-token',
        };

        handler = new MessageHandler(config);

        mockClientUser = {
            id: 'bot-123',
            username: 'TestBot',
        };

        mockUser = {
            id: 'user-456',
            username: 'TestUser',
        };

        mockMessage = {
            id: 'msg-789',
            content: 'Hello bot!',
            channelId: 'channel-111',
            author: mockUser as User,
            guild: null,
            mentions: {
                has: vi.fn().mockReturnValue(false),
            } as any,
            client: {
                user: mockClientUser,
            } as Client,
        };
    });

    describe('shouldProcess', () => {
        describe('direct messages', () => {
            it('should process DMs by default', () => {
                mockMessage.guild = null;

                const result = handler.shouldProcess(mockMessage as Message);

                expect(result).toBe(true);
            });

            it('should process DMs when user is in allowlist', () => {
                const config: IDiscordAccountConfig = {
                    id: 'test-bot',
                    token: 'test-token',
                    allowedUsers: ['user-456'],
                };

                handler = new MessageHandler(config);
                mockMessage.guild = null;

                const result = handler.shouldProcess(mockMessage as Message);

                expect(result).toBe(true);
            });

            it('should reject DMs when user is not in allowlist', () => {
                const config: IDiscordAccountConfig = {
                    id: 'test-bot',
                    token: 'test-token',
                    allowedUsers: ['other-user'],
                };

                handler = new MessageHandler(config);
                mockMessage.guild = null;

                const result = handler.shouldProcess(mockMessage as Message);

                expect(result).toBe(false);
            });
        });

        describe('guild messages', () => {
            beforeEach(() => {
                mockMessage.guild = {
                    id: 'guild-123',
                } as Guild;
            });

            it('should process guild messages by default', () => {
                const result = handler.shouldProcess(mockMessage as Message);

                expect(result).toBe(true);
            });

            it('should check channel allowlist', () => {
                const config: IDiscordAccountConfig = {
                    id: 'test-bot',
                    token: 'test-token',
                    allowedChannels: ['channel-111'],
                };

                handler = new MessageHandler(config);

                const result = handler.shouldProcess(mockMessage as Message);

                expect(result).toBe(true);
            });

            it('should reject messages from non-allowed channels', () => {
                const config: IDiscordAccountConfig = {
                    id: 'test-bot',
                    token: 'test-token',
                    allowedChannels: ['other-channel'],
                };

                handler = new MessageHandler(config);

                const result = handler.shouldProcess(mockMessage as Message);

                expect(result).toBe(false);
            });

            it('should check user allowlist', () => {
                const config: IDiscordAccountConfig = {
                    id: 'test-bot',
                    token: 'test-token',
                    allowedUsers: ['user-456'],
                };

                handler = new MessageHandler(config);

                const result = handler.shouldProcess(mockMessage as Message);

                expect(result).toBe(true);
            });

            it('should reject messages from non-allowed users', () => {
                const config: IDiscordAccountConfig = {
                    id: 'test-bot',
                    token: 'test-token',
                    allowedUsers: ['other-user'],
                };

                handler = new MessageHandler(config);

                const result = handler.shouldProcess(mockMessage as Message);

                expect(result).toBe(false);
            });

            it('should require mention when configured', () => {
                const config: IDiscordAccountConfig = {
                    id: 'test-bot',
                    token: 'test-token',
                    requireMention: true,
                };

                handler = new MessageHandler(config);
                mockMessage.mentions = {
                    has: vi.fn().mockReturnValue(false),
                } as any;

                const result = handler.shouldProcess(mockMessage as Message);

                expect(result).toBe(false);
            });

            it('should process when mentioned and mention required', () => {
                const config: IDiscordAccountConfig = {
                    id: 'test-bot',
                    token: 'test-token',
                    requireMention: true,
                };

                handler = new MessageHandler(config);
                mockMessage.mentions = {
                    has: vi.fn().mockReturnValue(true),
                } as any;

                const result = handler.shouldProcess(mockMessage as Message);

                expect(result).toBe(true);
            });

            it('should respect both channel and user allowlists', () => {
                const config: IDiscordAccountConfig = {
                    id: 'test-bot',
                    token: 'test-token',
                    allowedChannels: ['channel-111'],
                    allowedUsers: ['user-456'],
                };

                handler = new MessageHandler(config);

                const result = handler.shouldProcess(mockMessage as Message);

                expect(result).toBe(true);
            });

            it('should reject when channel is allowed but user is not', () => {
                const config: IDiscordAccountConfig = {
                    id: 'test-bot',
                    token: 'test-token',
                    allowedChannels: ['channel-111'],
                    allowedUsers: ['other-user'],
                };

                handler = new MessageHandler(config);

                const result = handler.shouldProcess(mockMessage as Message);

                expect(result).toBe(false);
            });
        });
    });

    describe('extractContent', () => {
        it('should return content as-is when no mention', () => {
            mockMessage.content = 'Hello world';

            const content = handler.extractContent(mockMessage as Message);

            expect(content).toBe('Hello world');
        });

        it('should remove bot mention from content', () => {
            mockMessage.content = '<@bot-123> Hello world';

            const content = handler.extractContent(mockMessage as Message);

            expect(content).toBe('Hello world');
        });

        it('should remove bot mention with nickname format', () => {
            mockMessage.content = '<@!bot-123> Hello world';

            const content = handler.extractContent(mockMessage as Message);

            expect(content).toBe('Hello world');
        });

        it('should handle multiple mentions', () => {
            mockMessage.content = '<@bot-123> <@bot-123> Hello world';

            const content = handler.extractContent(mockMessage as Message);

            expect(content).toBe('Hello world');
        });

        it('should handle mention in the middle of message', () => {
            mockMessage.content = 'Hey <@bot-123> help me';

            const content = handler.extractContent(mockMessage as Message);

            expect(content).toBe('Hey  help me');
        });

        it('should handle mention at the end', () => {
            mockMessage.content = 'Hello <@bot-123>';

            const content = handler.extractContent(mockMessage as Message);

            expect(content).toBe('Hello');
        });

        it('should handle message with only mention', () => {
            mockMessage.content = '<@bot-123>';

            const content = handler.extractContent(mockMessage as Message);

            expect(content).toBe('');
        });
    });

    describe('setMessageCallback and handleMessage', () => {
        it('should call message callback when handling message', async () => {
            const callback = vi.fn();
            handler.setMessageCallback(callback);

            const channelMessage = {
                channel: 'discord',
                accountId: 'test-bot',
                messageId: 'msg-789',
                conversationId: 'channel-111',
                from: {
                    id: 'user-456',
                    name: 'TestUser',
                    username: 'TestUser',
                },
                content: 'Hello',
                chatType: 'direct' as const,
                timestamp: new Date(),
            };

            await handler.handleMessage(channelMessage, mockMessage as Message);

            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith(channelMessage, mockMessage);
        });

        it('should not throw when no callback is set', async () => {
            const channelMessage = {
                channel: 'discord',
                accountId: 'test-bot',
                messageId: 'msg-789',
                conversationId: 'channel-111',
                from: {
                    id: 'user-456',
                    name: 'TestUser',
                    username: 'TestUser',
                },
                content: 'Hello',
                chatType: 'direct' as const,
                timestamp: new Date(),
            };

            await expect(
                handler.handleMessage(channelMessage, mockMessage as Message)
            ).resolves.not.toThrow();
        });
    });
});
