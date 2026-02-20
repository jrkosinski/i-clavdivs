import type { IChannelPlugin, IChannelGateway } from '@i-clavdivs/plugins';
import { DiscordGateway } from './gateway/discord-gateway.js';

/**
 * Discord channel plugin definition.
 */
export const discordPlugin: IChannelPlugin = {
    id: 'discord',
    name: 'Discord',
    description: 'Discord channel integration with multi-account support',
    version: '0.1.0',

    channelMetadata: {
        id: 'discord',
        label: 'Discord',
        description: 'Discord messaging platform',
        icon: '🎮',
        aliases: ['dc'],
    },

    capabilities: {
        chatTypes: ['direct', 'group', 'channel'],
        media: true,
        reactions: true,
        threads: true,
        polls: true,
        nativeCommands: true,
    },

    register(api) {
        api.log.info('Registering Discord plugin');
        api.registerChannel(this);
    },

    createGateway(config): IChannelGateway {
        return new DiscordGateway(config);
    },

    unregister() {
        console.log('Unregistering Discord plugin');
    },
};
