import { describe, it, expect, beforeEach } from 'vitest';
import { PluginRegistry, resetGlobalPluginRegistry } from '../src/core/plugin-registry.js';
import type { IPlugin, IChannelPlugin } from '../src/types/index.js';

describe('PluginRegistry', () => {
    let registry: PluginRegistry;

    beforeEach(() => {
        registry = new PluginRegistry();
    });

    describe('register', () => {
        it('should register a plugin successfully', () => {
            const plugin: IPlugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                description: 'A test plugin',
                register: () => {},
            };

            registry.register(plugin);

            expect(registry.has('test-plugin')).toBe(true);
            expect(registry.get('test-plugin')).toBe(plugin);
        });

        it('should throw error when registering duplicate plugin', () => {
            const plugin: IPlugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                description: 'A test plugin',
                register: () => {},
            };

            registry.register(plugin);

            expect(() => registry.register(plugin)).toThrow('Plugin already registered: test-plugin');
        });

        it('should register multiple different plugins', () => {
            const plugin1: IPlugin = {
                id: 'plugin1',
                name: 'Plugin 1',
                description: 'First plugin',
                register: () => {},
            };

            const plugin2: IPlugin = {
                id: 'plugin2',
                name: 'Plugin 2',
                description: 'Second plugin',
                register: () => {},
            };

            registry.register(plugin1);
            registry.register(plugin2);

            expect(registry.has('plugin1')).toBe(true);
            expect(registry.has('plugin2')).toBe(true);
        });
    });

    describe('registerChannel', () => {
        it('should register a channel plugin', () => {
            const channelPlugin: IChannelPlugin = {
                id: 'test-channel',
                name: 'Test Channel',
                description: 'A test channel plugin',
                register: () => {},
                channelMetadata: {
                    id: 'test-channel',
                    label: 'Test Channel',
                    description: 'Test',
                },
                capabilities: {
                    chatTypes: ['direct', 'group'],
                },
                createGateway: () => ({
                    start: async () => {},
                    stop: async () => {},
                    isRunning: () => false,
                    sendMessage: async () => {},
                }),
            };

            registry.registerChannel(channelPlugin);

            expect(registry.has('test-channel')).toBe(true);
            expect(registry.getChannel('test-channel')).toBe(channelPlugin);
        });

        it('should include channel plugins in both general and channel lists', () => {
            const channelPlugin: IChannelPlugin = {
                id: 'test-channel',
                name: 'Test Channel',
                description: 'A test channel plugin',
                register: () => {},
                channelMetadata: {
                    id: 'test-channel',
                    label: 'Test Channel',
                    description: 'Test',
                },
                capabilities: {
                    chatTypes: ['direct'],
                },
                createGateway: () => ({
                    start: async () => {},
                    stop: async () => {},
                    isRunning: () => false,
                    sendMessage: async () => {},
                }),
            };

            registry.registerChannel(channelPlugin);

            const allPlugins = registry.listAll();
            const channelPlugins = registry.listChannels();

            expect(allPlugins).toHaveLength(1);
            expect(channelPlugins).toHaveLength(1);
            expect(allPlugins[0]?.id).toBe('test-channel');
            expect(channelPlugins[0]?.id).toBe('test-channel');
        });
    });

    describe('get', () => {
        it('should return plugin when it exists', () => {
            const plugin: IPlugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                description: 'A test plugin',
                register: () => {},
            };

            registry.register(plugin);

            expect(registry.get('test-plugin')).toBe(plugin);
        });

        it('should return undefined when plugin does not exist', () => {
            expect(registry.get('nonexistent')).toBeUndefined();
        });
    });

    describe('getChannel', () => {
        it('should return channel plugin when it exists', () => {
            const channelPlugin: IChannelPlugin = {
                id: 'test-channel',
                name: 'Test Channel',
                description: 'A test channel plugin',
                register: () => {},
                channelMetadata: {
                    id: 'test-channel',
                    label: 'Test Channel',
                    description: 'Test',
                },
                capabilities: {
                    chatTypes: ['direct'],
                },
                createGateway: () => ({
                    start: async () => {},
                    stop: async () => {},
                    isRunning: () => false,
                    sendMessage: async () => {},
                }),
            };

            registry.registerChannel(channelPlugin);

            expect(registry.getChannel('test-channel')).toBe(channelPlugin);
        });

        it('should return undefined for non-channel plugin', () => {
            const plugin: IPlugin = {
                id: 'regular-plugin',
                name: 'Regular Plugin',
                description: 'A regular plugin',
                register: () => {},
            };

            registry.register(plugin);

            expect(registry.getChannel('regular-plugin')).toBeUndefined();
        });
    });

    describe('has', () => {
        it('should return true when plugin exists', () => {
            const plugin: IPlugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                description: 'A test plugin',
                register: () => {},
            };

            registry.register(plugin);

            expect(registry.has('test-plugin')).toBe(true);
        });

        it('should return false when plugin does not exist', () => {
            expect(registry.has('nonexistent')).toBe(false);
        });
    });

    describe('listAll', () => {
        it('should return empty array when no plugins registered', () => {
            expect(registry.listAll()).toEqual([]);
        });

        it('should return metadata for all registered plugins', () => {
            const plugin1: IPlugin = {
                id: 'plugin1',
                name: 'Plugin 1',
                description: 'First plugin',
                version: '1.0.0',
                register: () => {},
            };

            const plugin2: IPlugin = {
                id: 'plugin2',
                name: 'Plugin 2',
                description: 'Second plugin',
                register: () => {},
            };

            registry.register(plugin1);
            registry.register(plugin2);

            const list = registry.listAll();

            expect(list).toHaveLength(2);
            expect(list[0]).toEqual({
                id: 'plugin1',
                name: 'Plugin 1',
                description: 'First plugin',
                version: '1.0.0',
                registered: true,
                initialized: false,
            });
            expect(list[1]).toEqual({
                id: 'plugin2',
                name: 'Plugin 2',
                description: 'Second plugin',
                version: undefined,
                registered: true,
                initialized: false,
            });
        });
    });

    describe('listChannels', () => {
        it('should return empty array when no channel plugins registered', () => {
            expect(registry.listChannels()).toEqual([]);
        });

        it('should return only channel plugins', () => {
            const regularPlugin: IPlugin = {
                id: 'regular',
                name: 'Regular Plugin',
                description: 'A regular plugin',
                register: () => {},
            };

            const channelPlugin: IChannelPlugin = {
                id: 'channel',
                name: 'Channel Plugin',
                description: 'A channel plugin',
                register: () => {},
                channelMetadata: {
                    id: 'channel',
                    label: 'Channel',
                    description: 'Test',
                },
                capabilities: {
                    chatTypes: ['direct'],
                },
                createGateway: () => ({
                    start: async () => {},
                    stop: async () => {},
                    isRunning: () => false,
                    sendMessage: async () => {},
                }),
            };

            registry.register(regularPlugin);
            registry.registerChannel(channelPlugin);

            const channels = registry.listChannels();

            expect(channels).toHaveLength(1);
            expect(channels[0]?.id).toBe('channel');
        });
    });

    describe('markInitialized', () => {
        it('should mark plugin as initialized', () => {
            const plugin: IPlugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                description: 'A test plugin',
                register: () => {},
            };

            registry.register(plugin);
            registry.markInitialized('test-plugin');

            const metadata = registry.listAll()[0];
            expect(metadata?.initialized).toBe(true);
        });

        it('should handle marking non-existent plugin as initialized', () => {
            //should not throw
            registry.markInitialized('nonexistent');

            const list = registry.listAll();
            expect(list).toHaveLength(0);
        });
    });

    describe('clear', () => {
        it('should remove all plugins', () => {
            const plugin: IPlugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                description: 'A test plugin',
                register: () => {},
            };

            registry.register(plugin);
            registry.markInitialized('test-plugin');

            registry.clear();

            expect(registry.listAll()).toEqual([]);
            expect(registry.listChannels()).toEqual([]);
            expect(registry.has('test-plugin')).toBe(false);
        });
    });

    describe('global registry', () => {
        it('should reset global registry', () => {
            resetGlobalPluginRegistry();
            //should not throw
            expect(() => resetGlobalPluginRegistry()).not.toThrow();
        });
    });
});
