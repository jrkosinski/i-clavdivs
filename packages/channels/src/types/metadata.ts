/**
 * Channel metadata definitions.
 *
 * Provides descriptive information about communication channels
 * for display and documentation purposes.
 */

import type { ChannelId } from './channel-id.js';

/**
 * Descriptive metadata for a communication channel.
 */
export interface IChannelMetadata {
    /**
     * Unique identifier for the channel.
     */
    id: ChannelId;

    /**
     * Human-readable display name.
     */
    label: string;

    /**
     * Brief description of the channel.
     */
    description: string;

    /**
     * Display priority/ordering hint.
     */
    order?: number;

    /**
     * Alternative names/aliases for this channel.
     */
    aliases?: string[];

    /**
     * Documentation path or URL.
     */
    docsPath?: string;

    /**
     * Icon or emoji representation.
     */
    icon?: string;
}

/**
 * Creates channel metadata with sensible defaults.
 *
 * @param id - The channel identifier
 * @param label - The display label
 * @param description - Brief channel description
 * @param options - Optional additional metadata
 * @returns Complete channel metadata object
 */
export function createChannelMetadata(
    id: ChannelId,
    label: string,
    description: string,
    options?: Partial<Omit<IChannelMetadata, 'id' | 'label' | 'description'>>
): IChannelMetadata {
    return {
        id,
        label,
        description,
        ...options,
    };
}
