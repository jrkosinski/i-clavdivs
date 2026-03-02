import { describe, it, expect, vi } from 'vitest';
import { discordPlugin } from '../src/plugin.js';
import type { IPluginApi } from '@i-clavdivs/plugins';

describe('Discord Plugin', () => {
    describe('metadata', () => {
        it('should have correct plugin metadata', () => {
            expect(discordPlugin.id).toBe('discord');
            expect(discordPlugin.name).toBe('Discord');
            expect(discordPlugin.description).toBe('Discord channel integration with multi-account support');
            expect(discordPlugin.version).toBe('0.1.0');
        });

        it('should have correct channel metadata', () => {
            expect(discordPlugin.channelMetadata.id).toBe('discord');
            expect(discordPlugin.channelMetadata.label).toBe('Discord');
            expect(discordPlugin.channelMetadata.description).toBe('Discord messaging platform');
            expect(discordPlugin.channelMetadata.icon).toBe('🎮');
            expect(discordPlugin.channelMetadata.aliases).toEqual(['dc']);
        });

        it('should have correct capabilities', () => {
            expect(discordPlugin.capabilities.chatTypes).toEqual(['direct', 'group', 'channel']);
            expect(discordPlugin.capabilities.media).toBe(true);
            expect(discordPlugin.capabilities.reactions).toBe(true);
            expect(discordPlugin.capabilities.threads).toBe(true);
            expect(discordPlugin.capabilities.polls).toBe(true);
            expect(discordPlugin.capabilities.nativeCommands).toBe(true);
        });
    });

    describe('register', () => {
        it('should register itself as a channel plugin', () => {
            const mockApi: IPluginApi = {
                registerChannel: vi.fn(),
                runner: {} as any,
                getConfig: vi.fn(),
                log: {
                    info: vi.fn(),
                    warn: vi.fn(),
                    error: vi.fn(),
                },
            };

            discordPlugin.register(mockApi);

            expect(mockApi.log.info).toHaveBeenCalledWith('Initializing Discord plugin');
        });
    });

    describe('createGateway', () => {
        it('should create a Discord gateway instance', () => {
            const config = {
                enabled: true,
                token: 'test-token',
            };

            const gateway = discordPlugin.createGateway(config);

            expect(gateway).toBeDefined();
            expect(typeof gateway.start).toBe('function');
            expect(typeof gateway.stop).toBe('function');
            expect(typeof gateway.isRunning).toBe('function');
            expect(typeof gateway.sendMessage).toBe('function');
        });

        it('should create gateway with empty config', () => {
            const gateway = discordPlugin.createGateway({});

            expect(gateway).toBeDefined();
        });
    });

    describe('unregister', () => {
        it('should have an unregister method', () => {
            expect(typeof discordPlugin.unregister).toBe('function');
        });

        it('should not throw when unregistering', () => {
            expect(() => discordPlugin.unregister?.()).not.toThrow();
        });
    });
});
