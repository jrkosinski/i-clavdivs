import { describe, it, expect, beforeEach } from 'vitest';
import { AuthenticationManager } from '../../../src/auth/authentication-manager.js';
import { AuthProfileStore } from '../../../src/auth/profile-store.js';
import { AuthenticationError } from '../../../src/errors/specific-errors.js';
import type {
    IAuthProfileConfig,
    IApiKeyCredential,
    ITokenCredential,
    IOAuthCredential,
} from '../../../src/auth/types.js';

describe('AuthenticationManager', () => {
    let store: AuthProfileStore;
    let manager: AuthenticationManager;

    beforeEach(() => {
        store = new AuthProfileStore();
        manager = new AuthenticationManager(store);
    });

    describe('authenticate', () => {
        describe('with no profiles', () => {
            it('should throw AuthenticationError when no profiles exist', async () => {
                const config: IAuthProfileConfig = {
                    provider: 'anthropic',
                };

                await expect(manager.authenticate(config)).rejects.toThrow(AuthenticationError);
                await expect(manager.authenticate(config)).rejects.toThrow(
                    "No available authentication profile for provider 'anthropic'"
                );
            });
        });

        describe('with specific profileId', () => {
            beforeEach(() => {
                const credential: IApiKeyCredential = {
                    type: 'api_key',
                    provider: 'anthropic',
                    key: 'sk-ant-test',
                };
                store.upsertProfile('profile-1', credential);
            });

            it('should use specified profile', async () => {
                const config: IAuthProfileConfig = {
                    provider: 'anthropic',
                    profileId: 'profile-1',
                };

                const credentials = await manager.authenticate(config);

                expect(credentials.apiKey).toBe('sk-ant-test');
            });

            it('should mark profile as used', async () => {
                const config: IAuthProfileConfig = {
                    provider: 'anthropic',
                    profileId: 'profile-1',
                };

                await manager.authenticate(config);

                const stats = store.getUsageStats('profile-1');
                expect(stats?.lastUsed).toBeDefined();
            });

            it('should throw if specified profile does not exist', async () => {
                const config: IAuthProfileConfig = {
                    provider: 'anthropic',
                    profileId: 'non-existent',
                };

                await expect(manager.authenticate(config)).rejects.toThrow(AuthenticationError);
            });

            it('should throw if specified profile is in cooldown', async () => {
                store.markProfileFailure('profile-1', 'auth', 60000);

                const config: IAuthProfileConfig = {
                    provider: 'anthropic',
                    profileId: 'profile-1',
                };

                await expect(manager.authenticate(config)).rejects.toThrow(AuthenticationError);
            });
        });

        describe('with multiple profiles', () => {
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
                store.upsertProfile('anthropic-3', {
                    type: 'api_key',
                    provider: 'anthropic',
                    key: 'key3',
                });
            });

            it('should select least recently used profile by default', async () => {
                const config: IAuthProfileConfig = { provider: 'anthropic' };

                //first call should pick any profile
                const creds1 = await manager.authenticate(config);
                expect(creds1.apiKey).toBeDefined();

                //mark one as recently used
                store.markProfileUsed('anthropic-1');

                //next call should pick different profile (least recently used)
                const creds2 = await manager.authenticate(config);
                expect(creds2.apiKey).not.toBe('key1');
            });

            it('should prefer last good profile', async () => {
                store.markLastGoodProfile('anthropic-2');

                const config: IAuthProfileConfig = { provider: 'anthropic' };
                const credentials = await manager.authenticate(config);

                expect(credentials.apiKey).toBe('key2');
            });

            it('should prefer agent-specific order', async () => {
                store.setProfileOrder('agent-1', ['anthropic-3', 'anthropic-1', 'anthropic-2']);

                const config: IAuthProfileConfig = {
                    provider: 'anthropic',
                    agentId: 'agent-1',
                };

                const credentials = await manager.authenticate(config);
                expect(credentials.apiKey).toBe('key3');
            });

            it('should skip profiles in cooldown', async () => {
                store.markProfileFailure('anthropic-1', 'auth', 60000);
                store.markProfileFailure('anthropic-2', 'rate_limit', 60000);

                const config: IAuthProfileConfig = { provider: 'anthropic' };
                const credentials = await manager.authenticate(config);

                //should use only available profile
                expect(credentials.apiKey).toBe('key3');
            });

            it('should throw if all profiles are in cooldown', async () => {
                store.markProfileFailure('anthropic-1', 'auth', 60000);
                store.markProfileFailure('anthropic-2', 'auth', 60000);
                store.markProfileFailure('anthropic-3', 'auth', 60000);

                const config: IAuthProfileConfig = { provider: 'anthropic' };

                await expect(manager.authenticate(config)).rejects.toThrow(AuthenticationError);
            });
        });

        describe('credential type conversion', () => {
            it('should convert api_key credential', async () => {
                const credential: IApiKeyCredential = {
                    type: 'api_key',
                    provider: 'anthropic',
                    key: 'sk-ant-key',
                    metadata: { region: 'us-east-1' },
                };
                store.upsertProfile('profile-1', credential);

                const config: IAuthProfileConfig = {
                    provider: 'anthropic',
                    profileId: 'profile-1',
                };

                const credentials = await manager.authenticate(config);

                expect(credentials.apiKey).toBe('sk-ant-key');
                expect(credentials.metadata).toEqual({ region: 'us-east-1' });
            });

            it('should convert token credential', async () => {
                const credential: ITokenCredential = {
                    type: 'token',
                    provider: 'openai',
                    token: 'bearer-token',
                    expires: 1234567890,
                };
                store.upsertProfile('profile-1', credential);

                const config: IAuthProfileConfig = {
                    provider: 'openai',
                    profileId: 'profile-1',
                };

                const credentials = await manager.authenticate(config);

                expect(credentials.apiKey).toBe('bearer-token');
                expect(credentials.expiresAt).toBe(1234567890);
            });

            it('should convert oauth credential', async () => {
                const credential: IOAuthCredential = {
                    type: 'oauth',
                    provider: 'google',
                    accessToken: 'access-token',
                    refreshToken: 'refresh-token',
                    expiresAt: 9876543210,
                };
                store.upsertProfile('profile-1', credential);

                const config: IAuthProfileConfig = {
                    provider: 'google',
                    profileId: 'profile-1',
                };

                const credentials = await manager.authenticate(config);

                expect(credentials.apiKey).toBe('access-token');
                expect(credentials.refreshToken).toBe('refresh-token');
                expect(credentials.expiresAt).toBe(9876543210);
            });
        });
    });

    describe('isValid', () => {
        it('should return false for credentials without apiKey', () => {
            const credentials = { metadata: {} };
            expect(manager.isValid(credentials)).toBe(false);
        });

        it('should return true for credentials with apiKey and no expiration', () => {
            const credentials = { apiKey: 'test-key' };
            expect(manager.isValid(credentials)).toBe(true);
        });

        it('should return true for non-expired credentials', () => {
            const credentials = {
                apiKey: 'test-key',
                expiresAt: Date.now() + 60000, //expires in 1 minute
            };
            expect(manager.isValid(credentials)).toBe(true);
        });

        it('should return false for expired credentials', () => {
            const credentials = {
                apiKey: 'test-key',
                expiresAt: Date.now() - 60000, //expired 1 minute ago
            };
            expect(manager.isValid(credentials)).toBe(false);
        });
    });

    describe('recordSuccess', () => {
        beforeEach(() => {
            store.upsertProfile('profile-1', {
                type: 'api_key',
                provider: 'anthropic',
                key: 'key1',
            });
        });

        it('should mark profile as last good', () => {
            manager.recordSuccess('profile-1');

            expect(store.getLastGoodProfile('anthropic')).toBe('profile-1');
        });

        it('should clear cooldown', () => {
            store.markProfileFailure('profile-1', 'auth', 60000);
            expect(store.isProfileInCooldown('profile-1')).toBe(true);

            manager.recordSuccess('profile-1');

            expect(store.isProfileInCooldown('profile-1')).toBe(false);
        });
    });

    describe('recordFailure', () => {
        beforeEach(() => {
            store.upsertProfile('profile-1', {
                type: 'api_key',
                provider: 'anthropic',
                key: 'key1',
            });
        });

        it('should apply cooldown for auth failures', () => {
            manager.recordFailure('profile-1', 'auth');

            expect(store.isProfileInCooldown('profile-1')).toBe(true);
            const stats = store.getUsageStats('profile-1');
            expect(stats?.failureCounts?.auth).toBe(1);
        });

        it('should apply cooldown for billing failures', () => {
            manager.recordFailure('profile-1', 'billing');

            expect(store.isProfileInCooldown('profile-1')).toBe(true);
            const stats = store.getUsageStats('profile-1');
            expect(stats?.failureCounts?.billing).toBe(1);
        });

        it('should apply cooldown for rate_limit failures', () => {
            manager.recordFailure('profile-1', 'rate_limit');

            expect(store.isProfileInCooldown('profile-1')).toBe(true);
            const stats = store.getUsageStats('profile-1');
            expect(stats?.failureCounts?.rate_limit).toBe(1);
        });

        it('should apply cooldown for timeout failures', () => {
            manager.recordFailure('profile-1', 'timeout');

            expect(store.isProfileInCooldown('profile-1')).toBe(true);
            const stats = store.getUsageStats('profile-1');
            expect(stats?.failureCounts?.timeout).toBe(1);
        });

        it('should map context_overflow to unknown', () => {
            manager.recordFailure('profile-1', 'context_overflow');

            const stats = store.getUsageStats('profile-1');
            expect(stats?.failureCounts?.unknown).toBe(1);
        });

        it('should map format errors to format failures', () => {
            manager.recordFailure('profile-1', 'format');

            const stats = store.getUsageStats('profile-1');
            expect(stats?.failureCounts?.format).toBe(1);
        });

        it('should map unknown errors to unknown failures', () => {
            manager.recordFailure('profile-1', 'unknown');

            const stats = store.getUsageStats('profile-1');
            expect(stats?.failureCounts?.unknown).toBe(1);
        });
    });

    describe('custom cooldowns', () => {
        it('should use custom cooldown durations', async () => {
            const customCooldowns = {
                auth: 1000, //1 second
                billing: 2000, //2 seconds
                rate_limit: 3000, //3 seconds
                timeout: 500, //0.5 seconds
                format: 100, //0.1 seconds
                unknown: 200, //0.2 seconds
            };

            const customManager = new AuthenticationManager(store, customCooldowns);

            store.upsertProfile('profile-1', { type: 'api_key', provider: 'test', key: 'key1' });

            customManager.recordFailure('profile-1', 'auth');

            const stats = store.getUsageStats('profile-1');
            const cooldownDuration = stats!.cooldownUntil! - Date.now();

            //cooldown should be approximately 1 second (with small margin)
            expect(cooldownDuration).toBeGreaterThan(900);
            expect(cooldownDuration).toBeLessThan(1100);
        });
    });

    describe('getStore', () => {
        it('should return the underlying store', () => {
            const returnedStore = manager.getStore();

            expect(returnedStore).toBe(store);
        });
    });
});
