/**
 * Normalized chat type definitions for communication channels.
 *
 * Provides standardized chat type categorization across different
 * messaging platforms and services.
 */

/**
 * Standardized chat type identifier.
 */
export type NormalizedChatType = 'direct' | 'group' | 'channel';

/**
 * Normalizes a raw chat type string to a standardized type.
 *
 * @param rawType - The raw chat type string from a platform
 * @returns The normalized chat type or null if invalid
 */
export function normalizeChatType(rawType?: string | null): NormalizedChatType | null {
    const normalized = rawType?.trim().toLowerCase();

    if (!normalized) {
        return null;
    }

    //check for direct message variations
    if (normalized === 'direct' || normalized === 'dm' || normalized === 'private') {
        return 'direct';
    }

    //check for group variations
    if (normalized === 'group' || normalized === 'supergroup') {
        return 'group';
    }

    //check for channel variations
    if (normalized === 'channel') {
        return 'channel';
    }

    return null;
}

/**
 * Checks if a chat type represents a group or channel (multi-user context).
 *
 * @param chatType - The normalized chat type
 * @returns True if the chat type is group or channel
 */
export function isGroupChat(chatType?: NormalizedChatType | null): boolean {
    return chatType === 'group' || chatType === 'channel';
}

/**
 * Checks if a chat type represents a direct message.
 *
 * @param chatType - The normalized chat type
 * @returns True if the chat type is direct
 */
export function isDirectChat(chatType?: NormalizedChatType | null): boolean {
    return chatType === 'direct';
}
