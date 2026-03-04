import type { IPlugin } from './plugin.js';
import type { IChannelCapabilities, IChannelMetadata } from '@i-clavdivs/channels';

/**
 * Message event received from a channel.
 */
export interface IChannelMessage {
    /**
     * Channel identifier (e.g., 'discord', 'slack').
     */
    channel: string;

    /**
     * Account ID for multi-account channels.
     */
    accountId?: string;

    /**
     * Unique message identifier.
     */
    messageId: string;

    /**
     * Conversation/thread identifier.
     */
    conversationId: string;

    /**
     * Message sender information.
     */
    from: {
        id: string;
        name?: string;
        username?: string;
    };

    /**
     * Message content/text.
     */
    content: string;

    /**
     * Chat type (direct, group, channel).
     */
    chatType: 'direct' | 'group' | 'channel';

    /**
     * Timestamp of message.
     */
    timestamp: Date;

    /**
     * Optional metadata (attachments, mentions, etc.).
     */
    metadata?: Record<string, unknown>;
}

/**
 * Channel gateway interface for message listening.
 */
export interface IChannelGateway {
    /**
     * Start listening for messages.
     */
    start(config: unknown): Promise<void>;

    /**
     * Stop listening for messages.
     */
    stop(): Promise<void>;

    /**
     * Current gateway status.
     */
    isRunning(): boolean;

    /**
     * Send a message to a channel.
     */
    sendMessage(to: string, content: string, options?: unknown): Promise<void>;
}

/**
 * Channel plugin extends base plugin with channel-specific features.
 */
export interface IChannelPlugin extends IPlugin {
    /**
     * Channel metadata.
     */
    channelMetadata: IChannelMetadata;

    /**
     * Channel capabilities.
     */
    capabilities: IChannelCapabilities;

    /**
     * Create a gateway instance for this channel.
     */
    createGateway(config: unknown): IChannelGateway;
}
