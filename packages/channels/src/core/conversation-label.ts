/**
 * Conversation labeling utilities.
 *
 * Provides utilities for generating human-readable labels for
 * conversations across different channel types.
 */

import type { NormalizedChatType } from '../types/chat-type.js';

/**
 * Parameters for generating a conversation label.
 */
export interface IConversationLabelParams {
    /**
     * The type of chat/conversation.
     */
    chatType?: NormalizedChatType | null;

    /**
     * The conversation or channel identifier.
     */
    conversationId?: string | null;

    /**
     * The sender identifier.
     */
    senderId?: string | null;

    /**
     * Human-readable conversation name.
     */
    conversationName?: string | null;

    /**
     * Human-readable sender name.
     */
    senderName?: string | null;

    /**
     * Whether to include the sender in the label.
     */
    includeSender?: boolean;
}

/**
 * Generates a human-readable label for a conversation.
 *
 * @param params - Label generation parameters
 * @returns Generated conversation label
 */
export function generateConversationLabel(params: IConversationLabelParams): string {
    const chatType = params.chatType;
    const conversationName = params.conversationName?.trim();
    const senderName = params.senderName?.trim();
    const conversationId = params.conversationId?.trim();
    const senderId = params.senderId?.trim();

    //for direct messages
    if (chatType === 'direct') {
        if (senderName) {
            return `DM with ${senderName}`;
        }
        if (senderId) {
            return `DM with ${senderId}`;
        }
        return 'Direct Message';
    }

    //for groups
    if (chatType === 'group') {
        if (conversationName) {
            if (params.includeSender && senderName) {
                return `${conversationName} (${senderName})`;
            }
            return conversationName;
        }
        if (conversationId) {
            return `Group ${conversationId}`;
        }
        return 'Group Chat';
    }

    //for channels
    if (chatType === 'channel') {
        if (conversationName) {
            return `#${conversationName}`;
        }
        if (conversationId) {
            return `Channel ${conversationId}`;
        }
        return 'Channel';
    }

    //fallback
    if (conversationName) {
        return conversationName;
    }
    if (conversationId) {
        return conversationId;
    }
    return 'Conversation';
}

/**
 * Truncates a label to a maximum length.
 *
 * @param label - The label to truncate
 * @param maxLength - Maximum length (default: 50)
 * @returns Truncated label
 */
export function truncateLabel(label: string, maxLength: number = 50): string {
    if (label.length <= maxLength) {
        return label;
    }

    //truncate and add ellipsis
    return label.substring(0, maxLength - 3) + '...';
}
