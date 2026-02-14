/**
 * Authentication profile store - manages persistent auth profiles
 */

import type {
    AuthProfileCredential,
    AuthProfileFailureReason,
    IAuthProfileStore,
    IProfileUsageStats,
} from './types.js';

const DEFAULT_STORE_VERSION = 1;

/**
 * Manages authentication profiles with persistence support
 */
export class AuthProfileStore {
    private _profiles: Map<string, AuthProfileCredential>;
    private _order: Map<string, string[]>;
    private _lastGood: Map<string, string>;
    private _usageStats: Map<string, IProfileUsageStats>;
    private _version: number;

    constructor(initialData?: IAuthProfileStore) {
        this._version = initialData?.version ?? DEFAULT_STORE_VERSION;
        this._profiles = new Map(Object.entries(initialData?.profiles ?? {}));
        this._order = new Map(Object.entries(initialData?.order ?? {}));
        this._lastGood = new Map(Object.entries(initialData?.lastGood ?? {}));
        this._usageStats = new Map(Object.entries(initialData?.usageStats ?? {}));
    }

    /**
     * Get all profile IDs
     */
    public getAllProfileIds(): string[] {
        return Array.from(this._profiles.keys());
    }

    /**
     * Get all profiles for a specific provider
     * @param provider Provider name
     * @returns Array of [profileId, credential] tuples
     */
    public getProfilesForProvider(provider: string): Array<[string, AuthProfileCredential]> {
        const results: Array<[string, AuthProfileCredential]> = [];
        for (const [profileId, credential] of this._profiles) {
            if (credential.provider === provider) {
                results.push([profileId, credential]);
            }
        }
        return results;
    }

    /**
     * Get a specific profile by ID
     */
    public getProfile(profileId: string): AuthProfileCredential | undefined {
        return this._profiles.get(profileId);
    }

    /**
     * Add or update a profile
     */
    public upsertProfile(profileId: string, credential: AuthProfileCredential): void {
        this._profiles.set(profileId, credential);
    }

    /**
     * Delete a profile
     */
    public deleteProfile(profileId: string): boolean {
        const deleted = this._profiles.delete(profileId);
        if (deleted) {
            this._usageStats.delete(profileId);
        }
        return deleted;
    }

    /**
     * Get preferred profile order for an agent
     */
    public getProfileOrder(agentId: string): string[] | undefined {
        return this._order.get(agentId);
    }

    /**
     * Set preferred profile order for an agent
     */
    public setProfileOrder(agentId: string, order: string[]): void {
        this._order.set(agentId, order);
    }

    /**
     * Get last successful profile for a provider
     */
    public getLastGoodProfile(provider: string): string | undefined {
        return this._lastGood.get(provider);
    }

    /**
     * Mark a profile as last successful for its provider
     */
    public markLastGoodProfile(profileId: string): void {
        const credential = this._profiles.get(profileId);
        if (credential) {
            this._lastGood.set(credential.provider, profileId);
        }
    }

    /**
     * Get usage statistics for a profile
     */
    public getUsageStats(profileId: string): IProfileUsageStats | undefined {
        return this._usageStats.get(profileId);
    }

    /**
     * Mark profile as used
     */
    public markProfileUsed(profileId: string): void {
        const stats = this._ensureUsageStats(profileId);
        stats.lastUsed = Date.now();
    }

    /**
     * Mark profile failure with cooldown
     */
    public markProfileFailure(
        profileId: string,
        reason: AuthProfileFailureReason,
        cooldownMs: number
    ): void {
        const stats = this._ensureUsageStats(profileId);
        const now = Date.now();

        stats.lastFailureAt = now;
        stats.cooldownUntil = now + cooldownMs;
        stats.errorCount = (stats.errorCount ?? 0) + 1;

        //track failure counts per reason
        if (!stats.failureCounts) {
            stats.failureCounts = {};
        }
        stats.failureCounts[reason] = (stats.failureCounts[reason] ?? 0) + 1;
    }

    /**
     * Clear cooldown for a profile
     */
    public clearProfileCooldown(profileId: string): void {
        const stats = this._usageStats.get(profileId);
        if (stats) {
            stats.cooldownUntil = undefined;
        }
    }

    /**
     * Check if profile is in cooldown
     */
    public isProfileInCooldown(profileId: string): boolean {
        const stats = this._usageStats.get(profileId);
        if (!stats?.cooldownUntil) {
            return false;
        }
        return Date.now() < stats.cooldownUntil;
    }

    /**
     * Serialize to plain object for persistence
     */
    public toJSON(): IAuthProfileStore {
        return {
            version: this._version,
            profiles: Object.fromEntries(this._profiles),
            order: Object.fromEntries(this._order),
            lastGood: Object.fromEntries(this._lastGood),
            usageStats: Object.fromEntries(this._usageStats),
        };
    }

    /**
     * Ensure usage stats exist for profile
     */
    private _ensureUsageStats(profileId: string): IProfileUsageStats {
        let stats = this._usageStats.get(profileId);
        if (!stats) {
            stats = {};
            this._usageStats.set(profileId, stats);
        }
        return stats;
    }
}
