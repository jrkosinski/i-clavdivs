import { describe, it, expect, beforeEach } from 'vitest';
import { AuthProfileStore } from '../../../src/auth/profile-store.js';
import type { IAuthProfileStore, IApiKeyCredential } from '../../../src/auth/types.js';

describe('AuthProfileStore', () => {
    let store: AuthProfileStore;

    beforeEach(() => {
        store = new AuthProfileStore();
    });

    describe('constructor', () => {
        it('should create empty store by default', () => {
            expect(store.getAllProfileIds()).toEqual([]);
        });

        it('should initialize from existing data', () => {
            const initialData: IAuthProfileStore = {
                version: 1,
                profiles: {
                    'profile-1': { type: 'api_key', provider: 'anthropic', key: 'test-key' },
                },
                order: { 'agent-1': ['profile-1'] },
                lastGood: { anthropic: 'profile-1' },
                usageStats: {
                    'profile-1': { lastUsed: 123456 },
                },
            };

            const newStore = new AuthProfileStore(initialData);

            expect(newStore.getAllProfileIds()).toEqual(['profile-1']);
            expect(newStore.getProfile('profile-1')).toEqual(initialData.profiles['profile-1']);
            expect(newStore.getProfileOrder('agent-1')).toEqual(['profile-1']);
            expect(newStore.getLastGoodProfile('anthropic')).toBe('profile-1');
            expect(newStore.getUsageStats('profile-1')).toEqual({ lastUsed: 123456 });
        });
    });

    describe('profile management', () => {
        it('should add a new profile', () => {
            const credential: IApiKeyCredential = {
                type: 'api_key',
                provider: 'anthropic',
                key: 'sk-ant-test',
            };

            store.upsertProfile('profile-1', credential);

            expect(store.getAllProfileIds()).toEqual(['profile-1']);
            expect(store.getProfile('profile-1')).toEqual(credential);
        });

        it('should update existing profile', () => {
            const credential1: IApiKeyCredential = {
                type: 'api_key',
                provider: 'anthropic',
                key: 'old-key',
            };
            const credential2: IApiKeyCredential = {
                type: 'api_key',
                provider: 'anthropic',
                key: 'new-key',
            };

            store.upsertProfile('profile-1', credential1);
            store.upsertProfile('profile-1', credential2);

            expect(store.getAllProfileIds()).toEqual(['profile-1']);
            expect(store.getProfile('profile-1')).toEqual(credential2);
        });

        it('should delete a profile', () => {
            const credential: IApiKeyCredential = {
                type: 'api_key',
                provider: 'anthropic',
                key: 'test-key',
            };

            store.upsertProfile('profile-1', credential);
            const deleted = store.deleteProfile('profile-1');

            expect(deleted).toBe(true);
            expect(store.getAllProfileIds()).toEqual([]);
            expect(store.getProfile('profile-1')).toBeUndefined();
        });

        it('should return false when deleting non-existent profile', () => {
            const deleted = store.deleteProfile('non-existent');

            expect(deleted).toBe(false);
        });

        it('should delete usage stats when deleting profile', () => {
            const credential: IApiKeyCredential = {
                type: 'api_key',
                provider: 'anthropic',
                key: 'test-key',
            };

            store.upsertProfile('profile-1', credential);
            store.markProfileUsed('profile-1');
            expect(store.getUsageStats('profile-1')).toBeDefined();

            store.deleteProfile('profile-1');
            expect(store.getUsageStats('profile-1')).toBeUndefined();
        });
    });

    describe('getProfilesForProvider', () => {
        beforeEach(() => {
            store.upsertProfile('anthropic-1', {
                type: 'api_key',
                provider: 'anthropic',
                key: 'key1',
            });
            store.upsertProfile('anthropic-2', {
                type: 'api_key',
                provider: 'anthropic',
                key: 'key2',
            });
            store.upsertProfile('openai-1', { type: 'api_key', provider: 'openai', key: 'key3' });
        });

        it('should return all profiles for a provider', () => {
            const profiles = store.getProfilesForProvider('anthropic');

            expect(profiles).toHaveLength(2);
            expect(profiles.map(([id]) => id).sort()).toEqual(['anthropic-1', 'anthropic-2']);
        });

        it('should return empty array for provider with no profiles', () => {
            const profiles = store.getProfilesForProvider('google');

            expect(profiles).toEqual([]);
        });

        it('should return profiles with credentials', () => {
            const profiles = store.getProfilesForProvider('openai');

            expect(profiles).toHaveLength(1);
            expect(profiles[0][0]).toBe('openai-1');
            expect(profiles[0][1]).toEqual({ type: 'api_key', provider: 'openai', key: 'key3' });
        });
    });

    describe('profile order management', () => {
        it('should set and get profile order for agent', () => {
            store.setProfileOrder('agent-1', ['profile-1', 'profile-2']);

            expect(store.getProfileOrder('agent-1')).toEqual(['profile-1', 'profile-2']);
        });

        it('should return undefined for agent with no order', () => {
            expect(store.getProfileOrder('agent-unknown')).toBeUndefined();
        });

        it('should update existing order', () => {
            store.setProfileOrder('agent-1', ['profile-1']);
            store.setProfileOrder('agent-1', ['profile-2', 'profile-3']);

            expect(store.getProfileOrder('agent-1')).toEqual(['profile-2', 'profile-3']);
        });
    });

    describe('last good profile tracking', () => {
        beforeEach(() => {
            store.upsertProfile('anthropic-1', {
                type: 'api_key',
                provider: 'anthropic',
                key: 'key1',
            });
            store.upsertProfile('openai-1', { type: 'api_key', provider: 'openai', key: 'key2' });
        });

        it('should mark profile as last good', () => {
            store.markLastGoodProfile('anthropic-1');

            expect(store.getLastGoodProfile('anthropic')).toBe('anthropic-1');
        });

        it('should return undefined for provider with no last good', () => {
            expect(store.getLastGoodProfile('google')).toBeUndefined();
        });

        it('should update last good when marked again', () => {
            store.upsertProfile('anthropic-2', {
                type: 'api_key',
                provider: 'anthropic',
                key: 'key3',
            });

            store.markLastGoodProfile('anthropic-1');
            store.markLastGoodProfile('anthropic-2');

            expect(store.getLastGoodProfile('anthropic')).toBe('anthropic-2');
        });

        it('should not mark last good for non-existent profile', () => {
            store.markLastGoodProfile('non-existent');

            //should not create entry since profile doesn't exist
            expect(store.getLastGoodProfile('unknown-provider')).toBeUndefined();
        });
    });

    describe('usage statistics', () => {
        beforeEach(() => {
            store.upsertProfile('profile-1', {
                type: 'api_key',
                provider: 'anthropic',
                key: 'key1',
            });
        });

        it('should mark profile as used with timestamp', () => {
            const before = Date.now();
            store.markProfileUsed('profile-1');
            const after = Date.now();

            const stats = store.getUsageStats('profile-1');
            expect(stats).toBeDefined();
            expect(stats!.lastUsed).toBeGreaterThanOrEqual(before);
            expect(stats!.lastUsed).toBeLessThanOrEqual(after);
        });

        it('should update lastUsed on subsequent uses', () => {
            store.markProfileUsed('profile-1');
            const firstUse = store.getUsageStats('profile-1')!.lastUsed!;

            //ensure time passes
            const delay = new Promise((resolve) => setTimeout(resolve, 10));
            return delay.then(() => {
                store.markProfileUsed('profile-1');
                const secondUse = store.getUsageStats('profile-1')!.lastUsed!;

                expect(secondUse).toBeGreaterThan(firstUse);
            });
        });

        it('should mark profile failure with cooldown', () => {
            const cooldownMs = 60000;
            store.markProfileFailure('profile-1', 'auth', cooldownMs);

            const stats = store.getUsageStats('profile-1');
            expect(stats!.errorCount).toBe(1);
            expect(stats!.failureCounts?.auth).toBe(1);
            expect(stats!.lastFailureAt).toBeDefined();
            expect(stats!.cooldownUntil).toBeGreaterThan(Date.now());
        });

        it('should increment error counts on multiple failures', () => {
            store.markProfileFailure('profile-1', 'auth', 1000);
            store.markProfileFailure('profile-1', 'rate_limit', 1000);
            store.markProfileFailure('profile-1', 'auth', 1000);

            const stats = store.getUsageStats('profile-1');
            expect(stats!.errorCount).toBe(3);
            expect(stats!.failureCounts?.auth).toBe(2);
            expect(stats!.failureCounts?.rate_limit).toBe(1);
        });

        it('should clear cooldown for profile', () => {
            store.markProfileFailure('profile-1', 'auth', 60000);
            expect(store.getUsageStats('profile-1')!.cooldownUntil).toBeDefined();

            store.clearProfileCooldown('profile-1');
            expect(store.getUsageStats('profile-1')!.cooldownUntil).toBeUndefined();
        });

        it('should check if profile is in cooldown', () => {
            store.markProfileFailure('profile-1', 'auth', 5000);
            expect(store.isProfileInCooldown('profile-1')).toBe(true);
        });

        it('should return false for profile not in cooldown', () => {
            expect(store.isProfileInCooldown('profile-1')).toBe(false);
        });

        it('should return false for expired cooldown', () => {
            //set cooldown in the past
            store.markProfileFailure('profile-1', 'auth', -1000);
            expect(store.isProfileInCooldown('profile-1')).toBe(false);
        });
    });

    describe('toJSON', () => {
        it('should serialize to IAuthProfileStore format', () => {
            store.upsertProfile('profile-1', {
                type: 'api_key',
                provider: 'anthropic',
                key: 'key1',
            });
            store.setProfileOrder('agent-1', ['profile-1']);
            store.markLastGoodProfile('profile-1');
            store.markProfileUsed('profile-1');

            const json = store.toJSON();

            expect(json).toMatchObject({
                version: 1,
                profiles: {
                    'profile-1': { type: 'api_key', provider: 'anthropic', key: 'key1' },
                },
                order: {
                    'agent-1': ['profile-1'],
                },
                lastGood: {
                    anthropic: 'profile-1',
                },
                usageStats: {
                    'profile-1': {
                        lastUsed: expect.any(Number),
                    },
                },
            });
        });

        it('should handle empty store', () => {
            const json = store.toJSON();

            expect(json).toEqual({
                version: 1,
                profiles: {},
                order: {},
                lastGood: {},
                usageStats: {},
            });
        });
    });

    describe('roundtrip serialization', () => {
        it('should preserve all data through toJSON and constructor', () => {
            store.upsertProfile('profile-1', {
                type: 'api_key',
                provider: 'anthropic',
                key: 'key1',
            });
            store.upsertProfile('profile-2', {
                type: 'token',
                provider: 'openai',
                token: 'token1',
            });
            store.setProfileOrder('agent-1', ['profile-1', 'profile-2']);
            store.markLastGoodProfile('profile-1');
            store.markProfileUsed('profile-1');
            store.markProfileFailure('profile-2', 'rate_limit', 5000);

            const json = store.toJSON();
            const newStore = new AuthProfileStore(json);

            expect(newStore.toJSON()).toEqual(json);
            expect(newStore.getAllProfileIds().sort()).toEqual(['profile-1', 'profile-2']);
            expect(newStore.getProfileOrder('agent-1')).toEqual(['profile-1', 'profile-2']);
            expect(newStore.getLastGoodProfile('anthropic')).toBe('profile-1');
        });
    });
});
