import type { IChannelPlugin, IChannelGateway } from '@i-clavdivs/plugins';
import { RedditGateway } from './gateway/reddit-gateway.js';

/**
 * Reddit channel plugin definition.
 */
export const redditPlugin: IChannelPlugin = {
    id: 'reddit',
    name: 'Reddit',
    description: 'Reddit channel integration with multi-account support',
    version: '0.1.0',

    channelMetadata: {
        id: 'reddit',
        label: 'Reddit',
        description: 'Reddit social platform',
        icon: '🤖',
        aliases: ['r'],
    },

    capabilities: {
        chatTypes: ['direct', 'channel'],
        media: false,
        reactions: false,
        threads: true,
        polls: false,
        nativeCommands: false,
    },

    register(api) {
        api.log.info('Initializing Reddit plugin');
        //plugin is already registered at this point, just do initialization here if needed
    },

    createGateway(config): IChannelGateway {
        return new RedditGateway(config);
    },

    unregister() {
        console.log('Unregistering Reddit plugin');
    },
};
