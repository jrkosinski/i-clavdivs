import type { Agent } from '@i-clavdivs/agent';
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
     * Access to the agent for executing prompts.
     */
    agent: Agent;

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
