/**
 * Channel registry and management.
 *
 * Provides centralized registration and lookup for communication channels
 * with their associated metadata and capabilities.
 */

import type { ChannelId } from '../types/channel-id.js';
import type { IChannelCapabilities } from '../types/capabilities.js';
import type { IChannelMetadata } from '../types/metadata.js';
import { normalizeChannelId } from '../types/channel-id.js';

/**
 * Complete channel registration information.
 */
export interface IChannelRegistration {
    /**
     * Channel identifier.
     */
    id: ChannelId;

    /**
     * Channel metadata.
     */
    metadata: IChannelMetadata;

    /**
     * Channel capabilities.
     */
    capabilities: IChannelCapabilities;

    /**
     * Display order priority.
     */
    order: number;
}

/**
 * Channel registry for managing registered channels.
 */
export class ChannelRegistry {
    private _channels: Map<ChannelId, IChannelRegistration>;

    public constructor() {
        this._channels = new Map();
    }

    /**
     * Registers a new channel.
     *
     * @param registration - The channel registration data
     */
    public register(registration: IChannelRegistration): void {
        this._channels.set(registration.id, registration);
    }

    /**
     * Retrieves a channel registration by ID.
     *
     * @param id - The channel identifier
     * @returns The channel registration or undefined if not found
     */
    public get(id: ChannelId): IChannelRegistration | undefined {
        return this._channels.get(id);
    }

    /**
     * Checks if a channel is registered.
     *
     * @param id - The channel identifier
     * @returns True if the channel is registered
     */
    public has(id: ChannelId): boolean {
        return this._channels.has(id);
    }

    /**
     * Lists all registered channels.
     *
     * @returns Array of all channel registrations
     */
    public listAll(): IChannelRegistration[] {
        return Array.from(this._channels.values());
    }

    /**
     * Lists all registered channels sorted by order.
     *
     * @returns Array of sorted channel registrations
     */
    public listSorted(): IChannelRegistration[] {
        const channels = this.listAll();
        return channels.sort((a, b) => a.order - b.order);
    }

    /**
     * Resolves a channel ID from a raw string.
     *
     * @param raw - Raw channel identifier or alias
     * @returns Resolved channel ID or null if not found
     */
    public resolve(raw?: string | null): ChannelId | null {
        //try core channel normalization first
        const coreId = normalizeChannelId(raw);
        if (coreId && this._channels.has(coreId)) {
            return coreId;
        }

        //try direct lookup
        const normalized = raw?.trim().toLowerCase();
        if (!normalized) {
            return null;
        }

        //check all registered channels and their aliases
        for (const channel of this._channels.values()) {
            const channelIdLower = channel.id.toLowerCase();
            if (channelIdLower === normalized) {
                return channel.id;
            }

            const aliases = channel.metadata.aliases ?? [];
            if (aliases.some((alias) => alias.toLowerCase() === normalized)) {
                return channel.id;
            }
        }

        return null;
    }

    /**
     * Clears all registered channels.
     */
    public clear(): void {
        this._channels.clear();
    }
}

/**
 * Global registry instance.
 */
let _globalRegistry: ChannelRegistry | null = null;

/**
 * Gets the global channel registry instance.
 *
 * @returns The global registry
 */
export function getGlobalRegistry(): ChannelRegistry {
    if (!_globalRegistry) {
        _globalRegistry = new ChannelRegistry();
    }
    return _globalRegistry;
}

/**
 * Resets the global registry (primarily for testing).
 */
export function resetGlobalRegistry(): void {
    _globalRegistry = new ChannelRegistry();
}
