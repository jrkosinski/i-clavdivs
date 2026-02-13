/**
 * Authentication manager - orchestrates profile selection and rotation
 */

import type { IAuthenticationProvider, ICredentials } from '../core/interfaces.js';
import { AuthenticationError, type FailoverReason } from '../errors/index.js';
import { AuthProfileStore } from './profile-store.js';
import type {
    AuthProfileCredential,
    AuthProfileFailureReason,
    IAuthProfileConfig,
    IResolvedAuthProfile,
} from './types.js';

/**
 * Default cooldown durations in milliseconds per failure reason
 */
const DEFAULT_COOLDOWNS: Record<AuthProfileFailureReason, number> = {
    auth: 5 * 60 * 1000, //5 minutes
    billing: 60 * 60 * 1000, //1 hour
    rate_limit: 15 * 60 * 1000, //15 minutes
    timeout: 2 * 60 * 1000, //2 minutes
    format: 30 * 1000, //30 seconds
    unknown: 60 * 1000, //1 minute
};

/**
 * Manages authentication profile selection, rotation, and failover
 */
export class AuthenticationManager implements IAuthenticationProvider {
    constructor(
        private readonly _store: AuthProfileStore,
        private readonly _cooldowns: Record<AuthProfileFailureReason, number> = DEFAULT_COOLDOWNS
    ) {}

    /**
     * Authenticate with a provider using profile selection strategy
     */
    public async authenticate(config: IAuthProfileConfig): Promise<ICredentials> {
        const profile = this._resolveProfile(config);

        if (!profile) {
            throw new AuthenticationError(
                `No available authentication profile for provider '${config.provider}'`,
                config.provider,
                config.profileId
            );
        }

        //mark profile as used
        this._store.markProfileUsed(profile.profileId);

        return this._credentialToICredentials(profile.credential);
    }

    /**
     * Check if credentials are valid
     */
    public isValid(credentials: ICredentials): boolean {
        if (!credentials.apiKey) {
            return false;
        }

        //check expiration if present
        if (credentials.expiresAt) {
            return Date.now() < credentials.expiresAt;
        }

        return true;
    }

    /**
     * Resolve best profile for config using selection strategy
     */
    private _resolveProfile(config: IAuthProfileConfig): IResolvedAuthProfile | null {
        //if specific profile requested, try to use it
        if (config.profileId) {
            const credential = this._store.getProfile(config.profileId);
            if (credential && !this._store.isProfileInCooldown(config.profileId)) {
                return {
                    profileId: config.profileId,
                    provider: credential.provider,
                    credential,
                    stats: this._store.getUsageStats(config.profileId),
                };
            }
            return null;
        }

        //get all profiles for provider
        const profiles = this._store.getProfilesForProvider(config.provider);
        if (profiles.length === 0) {
            return null;
        }

        //filter out profiles in cooldown
        const available = profiles.filter(
            ([profileId]) => !this._store.isProfileInCooldown(profileId)
        );

        if (available.length === 0) {
            return null;
        }

        //selection strategy: prefer configured order > last good > least recently used
        const selected = this._selectBestProfile(available, config);

        return {
            profileId: selected[0],
            provider: selected[1].provider,
            credential: selected[1],
            stats: this._store.getUsageStats(selected[0]),
        };
    }

    /**
     * Select best profile using selection strategy
     */
    private _selectBestProfile(
        available: Array<[string, AuthProfileCredential]>,
        config: IAuthProfileConfig
    ): [string, AuthProfileCredential] {
        //check for agent-specific order preference
        if (config.agentId) {
            const order = this._store.getProfileOrder(config.agentId);
            if (order) {
                for (const profileId of order) {
                    const match = available.find(([id]) => id === profileId);
                    if (match) {
                        return match;
                    }
                }
            }
        }

        //check for last good profile
        const lastGood = this._store.getLastGoodProfile(config.provider);
        if (lastGood) {
            const match = available.find(([id]) => id === lastGood);
            if (match) {
                return match;
            }
        }

        //fall back to least recently used
        return this._selectLeastRecentlyUsed(available);
    }

    /**
     * Select least recently used profile
     */
    private _selectLeastRecentlyUsed(
        profiles: Array<[string, AuthProfileCredential]>
    ): [string, AuthProfileCredential] {
        //profiles array is guaranteed non-empty by caller
        let selected = profiles[0]!;
        let oldestUsage = this._store.getUsageStats(selected[0])?.lastUsed ?? 0;

        for (let i = 1; i < profiles.length; i++) {
            const profile = profiles[i]!;
            const lastUsed = this._store.getUsageStats(profile[0])?.lastUsed ?? 0;

            if (lastUsed < oldestUsage) {
                selected = profile;
                oldestUsage = lastUsed;
            }
        }

        return selected;
    }

    /**
     * Record successful authentication
     */
    public recordSuccess(profileId: string): void {
        this._store.markLastGoodProfile(profileId);
        this._store.clearProfileCooldown(profileId);
    }

    /**
     * Record failed authentication and apply cooldown
     */
    public recordFailure(profileId: string, reason: FailoverReason): void {
        //map failover reason to profile failure reason
        const profileReason = this._mapFailoverReason(reason);
        const cooldownMs = this._cooldowns[profileReason];

        this._store.markProfileFailure(profileId, profileReason, cooldownMs);
    }

    /**
     * Get current profile store (for persistence)
     */
    public getStore(): AuthProfileStore {
        return this._store;
    }

    /**
     * Map failover reason to profile failure reason
     */
    private _mapFailoverReason(reason: FailoverReason): AuthProfileFailureReason {
        switch (reason) {
            case 'auth':
                return 'auth';
            case 'billing':
                return 'billing';
            case 'rate_limit':
                return 'rate_limit';
            case 'timeout':
                return 'timeout';
            case 'format':
                return 'format';
            case 'context_overflow':
            case 'unknown':
            default:
                return 'unknown';
        }
    }

    /**
     * Convert auth profile credential to ICredentials interface
     */
    private _credentialToICredentials(credential: AuthProfileCredential): ICredentials {
        switch (credential.type) {
            case 'api_key':
                return {
                    apiKey: credential.key,
                    metadata: credential.metadata,
                };
            case 'token':
                return {
                    apiKey: credential.token,
                    expiresAt: credential.expires,
                };
            case 'oauth':
                return {
                    apiKey: credential.accessToken,
                    refreshToken: credential.refreshToken,
                    expiresAt: credential.expiresAt,
                };
        }
    }
}
