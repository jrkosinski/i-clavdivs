import type { IPlugin } from '../types/plugin.js';
import type { IChannelPlugin, IChannelGateway } from '../types/channel-plugin.js';
import type { IPluginApi } from '../types/plugin-api.js';
import type { AgentRunner } from '@i-clavdivs/runner';
import { getGlobalPluginRegistry } from './plugin-registry.js';

/**
 * Manages plugin lifecycle (initialization, starting gateways, cleanup).
 */
export class PluginManager {
    private _registry = getGlobalPluginRegistry();
    private _gateways: Map<string, IChannelGateway> = new Map();
    private _runner: AgentRunner;
    private _config: Record<string, unknown>;

    constructor(runner: AgentRunner, config: Record<string, unknown> = {}) {
        this._runner = runner;
        this._config = config;
    }

    /**
     * Initialize all registered plugins.
     */
    public async initializeAll(): Promise<void> {
        const plugins = this._registry.listAll();
        for (const meta of plugins) {
            if (!meta.initialized) {
                const plugin = this._registry.get(meta.id);
                if (plugin) {
                    await this._initializePlugin(plugin);
                }
            }
        }
    }

    /**
     * Start all enabled channel gateways.
     */
    public async startChannelGateways(): Promise<void> {
        const channels = this._registry.listChannels();
        for (const channel of channels) {
            const channelConfig = this._getChannelConfig(channel.id);
            if (channelConfig?.enabled) {
                await this._startGateway(channel, channelConfig);
            }
        }
    }

    /**
     * Stop all gateways.
     */
    public async stopAll(): Promise<void> {
        for (const [id, gateway] of this._gateways.entries()) {
            await gateway.stop();
            this._gateways.delete(id);
        }
    }

    /**
     * Cleanup all plugins.
     */
    public async cleanup(): Promise<void> {
        await this.stopAll();

        const plugins = this._registry.listAll();
        for (const meta of plugins) {
            const plugin = this._registry.get(meta.id);
            if (plugin?.unregister) {
                await plugin.unregister();
            }
        }
    }

    /**
     * Initialize a single plugin.
     */
    private async _initializePlugin(plugin: IPlugin): Promise<void> {
        const api = this._createPluginApi();
        await plugin.register(api);
        this._registry.markInitialized(plugin.id);
    }

    /**
     * Start a specific channel gateway.
     */
    private async _startGateway(plugin: IChannelPlugin, config: unknown): Promise<void> {
        if (this._gateways.has(plugin.id)) {
            throw new Error(`Gateway already running: ${plugin.id}`);
        }

        const gateway = plugin.createGateway(config);

        //inject runner if gateway supports it
        if ('setRunner' in gateway && typeof gateway.setRunner === 'function') {
            (gateway as any).setRunner(this._runner);
        }

        this._gateways.set(plugin.id, gateway);
        await gateway.start(config);
    }

    private _createPluginApi(): IPluginApi {
        return {
            registerChannel: (plugin) => this._registry.registerChannel(plugin),
            runner: this._runner,
            getConfig: (key) => this._config[key],
            log: {
                info: (msg) => console.log(`[plugin] ${msg}`),
                warn: (msg) => console.warn(`[plugin] ${msg}`),
                error: (msg) => console.error(`[plugin] ${msg}`),
                debug: (msg) => console.debug(`[plugin] ${msg}`),
            },
        };
    }

    private _getChannelConfig(channelId: string): any {
        const channels = this._config.channels as Record<string, unknown> | undefined;
        return channels?.[channelId];
    }
}
