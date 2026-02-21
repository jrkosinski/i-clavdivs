import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginManager } from '../src/core/plugin-manager.js';
import { getGlobalPluginRegistry, resetGlobalPluginRegistry } from '../src/core/plugin-registry.js';
import type { IPlugin, IChannelPlugin, IChannelGateway } from '../src/types/index.js';

describe('PluginManager', () => {
    let mockRunner: any;

    beforeEach(() => {
        //reset global registry before each test
        resetGlobalPluginRegistry();

        //create a mock runner
        mockRunner = {
            run: vi.fn(),
        };
    });

    describe('constructor', () => {
        it('should create plugin manager with runner and config', () => {
            const config = { test: 'value' };
            const manager = new PluginManager(mockRunner, config);

            expect(manager).toBeDefined();
        });

        it('should create plugin manager with empty config', () => {
            const manager = new PluginManager(mockRunner);

            expect(manager).toBeDefined();
        });
    });

    describe('initializeAll', () => {
        it('should initialize all registered plugins', async () => {
            const registerSpy = vi.fn();
            const plugin: IPlugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                description: 'A test plugin',
                register: registerSpy,
            };

            registry.register(plugin);

            const manager = new PluginManager(mockRunner);
            await manager.initializeAll();

            expect(registerSpy).toHaveBeenCalledTimes(1);
            expect(registerSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    runner: mockRunner,
                    registerChannel: expect.any(Function),
                    getConfig: expect.any(Function),
                    log: expect.any(Object),
                })
            );
        });

        it('should not initialize already initialized plugins', async () => {
            const registerSpy = vi.fn();
            const plugin: IPlugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                description: 'A test plugin',
                register: registerSpy,
            };

            getGlobalPluginRegistry().register(plugin);

            const manager = new PluginManager(mockRunner);
            await manager.initializeAll();
            await manager.initializeAll();

            //should only be called once
            expect(registerSpy).toHaveBeenCalledTimes(1);
        });

        it('should handle async plugin registration', async () => {
            const registerSpy = vi.fn(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
            });

            const plugin: IPlugin = {
                id: 'async-plugin',
                name: 'Async Plugin',
                description: 'An async plugin',
                register: registerSpy,
            };

            getGlobalPluginRegistry().register(plugin);

            const manager = new PluginManager(mockRunner);
            await manager.initializeAll();

            expect(registerSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('startChannelGateways', () => {
        it('should start enabled channel gateways', async () => {
            const startSpy = vi.fn();
            const mockGateway: IChannelGateway = {
                start: startSpy,
                stop: vi.fn(),
                isRunning: () => false,
                sendMessage: vi.fn(),
            };

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
                createGateway: () => mockGateway,
            };

            registry.registerChannel(channelPlugin);

            const config = {
                channels: {
                    'test-channel': {
                        enabled: true,
                        token: 'test-token',
                    },
                },
            };

            const manager = new PluginManager(mockRunner, config);
            await manager.initializeAll();
            await manager.startChannelGateways();

            expect(startSpy).toHaveBeenCalledTimes(1);
            expect(startSpy).toHaveBeenCalledWith({
                enabled: true,
                token: 'test-token',
            });
        });

        it('should not start disabled channel gateways', async () => {
            const startSpy = vi.fn();
            const mockGateway: IChannelGateway = {
                start: startSpy,
                stop: vi.fn(),
                isRunning: () => false,
                sendMessage: vi.fn(),
            };

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
                createGateway: () => mockGateway,
            };

            getGlobalPluginRegistry().registerChannel(channelPlugin);

            const config = {
                channels: {
                    'test-channel': {
                        enabled: false,
                        token: 'test-token',
                    },
                },
            };

            const manager = new PluginManager(mockRunner, config);
            await manager.initializeAll();
            await manager.startChannelGateways();

            expect(startSpy).not.toHaveBeenCalled();
        });

        it('should inject runner into gateway if setRunner method exists', async () => {
            const setRunnerSpy = vi.fn();
            const mockGateway: any = {
                start: vi.fn(),
                stop: vi.fn(),
                isRunning: () => false,
                sendMessage: vi.fn(),
                setRunner: setRunnerSpy,
            };

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
                createGateway: () => mockGateway,
            };

            getGlobalPluginRegistry().registerChannel(channelPlugin);

            const config = {
                channels: {
                    'test-channel': {
                        enabled: true,
                        token: 'test-token',
                    },
                },
            };

            const manager = new PluginManager(mockRunner, config);
            await manager.initializeAll();
            await manager.startChannelGateways();

            expect(setRunnerSpy).toHaveBeenCalledWith(mockRunner);
        });
    });

    describe('stopAll', () => {
        it('should stop all running gateways', async () => {
            const stopSpy = vi.fn();
            const mockGateway: IChannelGateway = {
                start: vi.fn(),
                stop: stopSpy,
                isRunning: () => true,
                sendMessage: vi.fn(),
            };

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
                createGateway: () => mockGateway,
            };

            getGlobalPluginRegistry().registerChannel(channelPlugin);

            const config = {
                channels: {
                    'test-channel': {
                        enabled: true,
                        token: 'test-token',
                    },
                },
            };

            const manager = new PluginManager(mockRunner, config);
            await manager.initializeAll();
            await manager.startChannelGateways();
            await manager.stopAll();

            expect(stopSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('cleanup', () => {
        it('should stop gateways and call plugin unregister', async () => {
            const stopSpy = vi.fn();
            const unregisterSpy = vi.fn();

            const mockGateway: IChannelGateway = {
                start: vi.fn(),
                stop: stopSpy,
                isRunning: () => true,
                sendMessage: vi.fn(),
            };

            const channelPlugin: IChannelPlugin = {
                id: 'test-channel',
                name: 'Test Channel',
                description: 'A test channel plugin',
                register: () => {},
                unregister: unregisterSpy,
                channelMetadata: {
                    id: 'test-channel',
                    label: 'Test Channel',
                    description: 'Test',
                },
                capabilities: {
                    chatTypes: ['direct'],
                },
                createGateway: () => mockGateway,
            };

            getGlobalPluginRegistry().registerChannel(channelPlugin);

            const config = {
                channels: {
                    'test-channel': {
                        enabled: true,
                        token: 'test-token',
                    },
                },
            };

            const manager = new PluginManager(mockRunner, config);
            await manager.initializeAll();
            await manager.startChannelGateways();
            await manager.cleanup();

            expect(stopSpy).toHaveBeenCalledTimes(1);
            expect(unregisterSpy).toHaveBeenCalledTimes(1);
        });

        it('should handle plugins without unregister method', async () => {
            const plugin: IPlugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                description: 'A test plugin',
                register: () => {},
                //no unregister method
            };

            getGlobalPluginRegistry().register(plugin);

            const manager = new PluginManager(mockRunner);
            await manager.initializeAll();

            //should not throw
            await expect(manager.cleanup()).resolves.not.toThrow();
        });
    });
});
