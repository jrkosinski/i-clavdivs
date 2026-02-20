import type { AgentRunner } from '@i-clavdivs/runner';
import { PluginManager, getGlobalPluginRegistry } from '@i-clavdivs/plugins';
import { discordPlugin } from '@i-clavdivs/discord';
import { ConfigLoader } from '@i-clavdivs/plugins';

/**
 * Load and initialize all available plugins.
 */
export async function loadPlugins(runner: AgentRunner, configPath?: string): Promise<PluginManager> {
    //load configuration
    const config = await ConfigLoader.load(configPath);

    //get plugin registry
    const registry = getGlobalPluginRegistry();

    //register available plugins
    registry.register(discordPlugin);

    //create plugin manager
    const manager = new PluginManager(runner, config);

    //initialize all plugins
    await manager.initializeAll();

    //start enabled channel gateways
    await manager.startChannelGateways();

    return manager;
}
