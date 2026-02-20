import type { IPlugin, IPluginMetadata } from '../types/plugin.js';
import type { IChannelPlugin } from '../types/channel-plugin.js';

/**
 * Central registry for all plugins.
 */
export class PluginRegistry {
    private _plugins: Map<string, IPlugin>;
    private _channelPlugins: Map<string, IChannelPlugin>;
    private _initialized: Set<string>;

    constructor() {
        this._plugins = new Map();
        this._channelPlugins = new Map();
        this._initialized = new Set();
    }

    /**
     * Register a plugin.
     */
    public register(plugin: IPlugin): void {
        if (this._plugins.has(plugin.id)) {
            throw new Error(`Plugin already registered: ${plugin.id}`);
        }
        this._plugins.set(plugin.id, plugin);
    }

    /**
     * Register a channel plugin.
     */
    public registerChannel(plugin: IChannelPlugin): void {
        this.register(plugin);
        this._channelPlugins.set(plugin.id, plugin);
    }

    /**
     * Get a plugin by ID.
     */
    public get(id: string): IPlugin | undefined {
        return this._plugins.get(id);
    }

    /**
     * Get a channel plugin by ID.
     */
    public getChannel(id: string): IChannelPlugin | undefined {
        return this._channelPlugins.get(id);
    }

    /**
     * Check if a plugin is registered.
     */
    public has(id: string): boolean {
        return this._plugins.has(id);
    }

    /**
     * List all registered plugins.
     */
    public listAll(): IPluginMetadata[] {
        return Array.from(this._plugins.values()).map((plugin) => ({
            id: plugin.id,
            name: plugin.name,
            description: plugin.description,
            version: plugin.version,
            registered: true,
            initialized: this._initialized.has(plugin.id),
        }));
    }

    /**
     * List all channel plugins.
     */
    public listChannels(): IChannelPlugin[] {
        return Array.from(this._channelPlugins.values());
    }

    /**
     * Mark a plugin as initialized.
     */
    public markInitialized(id: string): void {
        this._initialized.add(id);
    }

    /**
     * Clear all plugins (for testing).
     */
    public clear(): void {
        this._plugins.clear();
        this._channelPlugins.clear();
        this._initialized.clear();
    }
}

/**
 * Global plugin registry instance.
 */
let _globalRegistry: PluginRegistry | null = null;

/**
 * Get the global plugin registry.
 */
export function getGlobalPluginRegistry(): PluginRegistry {
    if (!_globalRegistry) {
        _globalRegistry = new PluginRegistry();
    }
    return _globalRegistry;
}

/**
 * Reset the global registry (for testing).
 */
export function resetGlobalPluginRegistry(): void {
    _globalRegistry = new PluginRegistry();
}
