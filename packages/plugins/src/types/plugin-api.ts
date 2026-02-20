import type { AgentRunner } from '@i-clavdivs/runner';
import type { IChannelPlugin } from './channel-plugin.js';

/**
 * API provided to plugins during registration.
 */
export interface IPluginApi {
    /**
     * Register a channel plugin.
     */
    registerChannel(plugin: IChannelPlugin): void;

    /**
     * Access to the agent runner for executing prompts.
     */
    runner: AgentRunner;

    /**
     * Configuration access.
     */
    getConfig(key: string): unknown;

    /**
     * Logging interface.
     */
    log: {
        info(message: string): void;
        warn(message: string): void;
        error(message: string): void;
        debug?(message: string): void;
    };
}
