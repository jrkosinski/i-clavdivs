import type { Agent } from '@i-clavdivs/agent';
import { PluginManager, getGlobalPluginRegistry } from '@i-clavdivs/plugins';
import { discordPlugin } from '@i-clavdivs/discord';
import { ConfigLoader } from '@i-clavdivs/plugins';

/**
 * Load and initialize all available plugins.
 * @param agent Optional agent agent (not needed in daemon mode where plugins create their own agents)
 * @param configPath Optional path to config file
 */
export async function loadPlugins(agent?: Agent, configPath?: string): Promise<PluginManager> {
    //load configuration
    const config = await ConfigLoader.load(configPath);

    //debug: log the loaded config
    console.log('[DEBUG] Loaded config:', JSON.stringify(config, null, 2));

    //get plugin registry
    const registry = getGlobalPluginRegistry();

    //register available plugins (only if not already registered)
    if (!registry.has('discord')) {
        registry.registerChannel(discordPlugin);
    }

    //create plugin manager
    //in daemon mode, agent is undefined and plugins create their own agents
    const manager = new PluginManager(agent, config);

    //initialize all plugins
    await manager.initializeAll();

    //start enabled channel gateways
    await manager.startChannelGateways();

    return manager;
}
