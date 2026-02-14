/**
 * Channel capability definitions.
 *
 * Defines what features and functionalities are supported by
 * different communication channels.
 */

import type { NormalizedChatType } from './chat-type.js';

/**
 * Defines the capabilities supported by a communication channel.
 */
export interface IChannelCapabilities {
    /**
     * Supported chat/conversation types.
     */
    chatTypes: Array<NormalizedChatType | 'thread'>;

    /**
     * Whether the channel supports polls.
     */
    polls?: boolean;

    /**
     * Whether the channel supports message reactions.
     */
    reactions?: boolean;

    /**
     * Whether the channel supports editing messages.
     */
    edit?: boolean;

    /**
     * Whether the channel supports deleting/unsending messages.
     */
    unsend?: boolean;

    /**
     * Whether the channel supports replying to messages.
     */
    reply?: boolean;

    /**
     * Whether the channel supports message effects (animations, etc).
     */
    effects?: boolean;

    /**
     * Whether the channel supports group management operations.
     */
    groupManagement?: boolean;

    /**
     * Whether the channel supports threaded conversations.
     */
    threads?: boolean;

    /**
     * Whether the channel supports media attachments.
     */
    media?: boolean;

    /**
     * Whether the channel has native command support (slash commands, etc).
     */
    nativeCommands?: boolean;

    /**
     * Whether the channel requires blocking (non-streaming) message delivery.
     */
    blockStreaming?: boolean;
}

/**
 * Checks if a channel supports a specific chat type.
 *
 * @param capabilities - The channel capabilities
 * @param chatType - The chat type to check
 * @returns True if the chat type is supported
 */
export function supportsChatType(
    capabilities: IChannelCapabilities,
    chatType: NormalizedChatType | 'thread'
): boolean {
    return capabilities.chatTypes.includes(chatType);
}

/**
 * Checks if a channel supports threaded conversations.
 *
 * @param capabilities - The channel capabilities
 * @returns True if threads are supported
 */
export function supportsThreads(capabilities: IChannelCapabilities): boolean {
    return capabilities.threads === true || capabilities.chatTypes.includes('thread');
}
