import type { IPluginApi } from './plugin-api.js';

/**
 * Base plugin interface that all plugins must implement.
 */
export interface IPlugin {
    /**
     * Unique plugin identifier (e.g., 'discord', 'slack').
     */
    id: string;

    /**
     * Human-readable plugin name.
     */
    name: string;

    /**
     * Plugin description.
     */
    description: string;

    /**
     * Plugin version (semver).
     */
    version?: string;

    /**
     * Plugin initialization function.
     * Called when the plugin is loaded.
     */
    register(api: IPluginApi): void | Promise<void>;

    /**
     * Optional cleanup function.
     * Called when the plugin is unloaded or app shuts down.
     */
    unregister?(): void | Promise<void>;
}

/**
 * Plugin metadata returned by the registry.
 */
export interface IPluginMetadata {
    id: string;
    name: string;
    description: string;
    version?: string;
    registered: boolean;
    initialized: boolean;
}
