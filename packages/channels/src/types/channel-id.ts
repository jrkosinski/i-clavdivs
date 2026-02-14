/**
 * Channel identifier type definitions.
 *
 * Defines the core channel identifiers and registry for supported
 * communication platforms.
 */

/**
 * Core supported channel identifiers.
 */
export const CORE_CHANNEL_IDS = ['telegram', 'whatsapp', 'discord', 'slack', 'signal'] as const;

/**
 * Type union of all core channel identifiers.
 */
export type CoreChannelId = (typeof CORE_CHANNEL_IDS)[number];

/**
 * Extended channel identifier that allows custom channel types.
 */
export type ChannelId = CoreChannelId | (string & Record<never, never>);

/**
 * Default channel to use when none is specified.
 */
export const DEFAULT_CHANNEL: CoreChannelId = 'telegram';

/**
 * Channel alias mappings for common alternative names.
 */
export const CHANNEL_ALIASES: Record<string, CoreChannelId> = {
    tg: 'telegram',
    wa: 'whatsapp',
    wapp: 'whatsapp',
};

/**
 * Normalizes a channel identifier string.
 *
 * @param raw - The raw channel identifier
 * @returns The normalized channel ID or null if invalid
 */
export function normalizeChannelId(raw?: string | null): CoreChannelId | null {
    const normalized = raw?.trim().toLowerCase();

    if (!normalized) {
        return null;
    }

    //check if it's an alias
    const resolved = CHANNEL_ALIASES[normalized] ?? normalized;

    //validate against core channels
    return CORE_CHANNEL_IDS.includes(resolved as CoreChannelId)
        ? (resolved as CoreChannelId)
        : null;
}

/**
 * Checks if a string is a valid core channel identifier.
 *
 * @param id - The identifier to check
 * @returns True if the identifier is a valid core channel
 */
export function isCoreChannel(id?: string | null): id is CoreChannelId {
    return normalizeChannelId(id) !== null;
}
