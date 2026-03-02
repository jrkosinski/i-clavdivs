import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Configuration loader that supports both JSON config files and environment variables.
 */
export class ConfigLoader {
    /**
     * Load configuration from file and merge with environment variables.
     * Environment variables take precedence over file config.
     */
    public static async load(configPath?: string): Promise<Record<string, unknown>> {
        const fileConfig = await this._loadConfigFile(configPath);
        const envConfig = this._loadEnvConfig();

        //merge configs, env takes precedence
        return this._mergeConfigs(fileConfig, envConfig);
    }

    /**
     * Load config from a JSON file.
     */
    private static async _loadConfigFile(configPath?: string): Promise<Record<string, unknown>> {
        const path = this._resolveConfigPath(configPath);

        if (!path || !existsSync(path)) {
            return {};
        }

        try {
            const content = await readFile(path, 'utf-8');
            const config = JSON.parse(content);

            //replace environment variable placeholders
            return this._replaceEnvVars(config);
        } catch (err) {
            console.warn(`[config] Failed to load config file: ${path}`, err);
            return {};
        }
    }

    /**
     * Load config from environment variables.
     * Supports hierarchical config like DISCORD_TOKEN, DISCORD_ALLOWED_CHANNELS, etc.
     */
    private static _loadEnvConfig(): Record<string, unknown> {
        const config: Record<string, unknown> = {
            channels: {},
        };

        //discord config from env
        if (process.env.DISCORD_BOT_TOKEN) {
            (config.channels as any).discord = {
                enabled: true,
                token: process.env.DISCORD_BOT_TOKEN,
                requireMention: process.env.DISCORD_REQUIRE_MENTION === 'true',
                allowedChannels: process.env.DISCORD_ALLOWED_CHANNELS?.split(',').map(s => s.trim()),
                allowedUsers: process.env.DISCORD_ALLOWED_USERS?.split(',').map(s => s.trim()),
            };
        }

        //support for multi-account discord
        const discordAccounts = this._parseDiscordAccounts();
        if (discordAccounts.length > 0) {
            (config.channels as any).discord = {
                enabled: true,
                accounts: discordAccounts,
            };
        }

        return config;
    }

    /**
     * Parse multi-account Discord configuration from environment.
     * Format: DISCORD_ACCOUNTS=account1,account2
     *         DISCORD_ACCOUNT1_TOKEN=...
     *         DISCORD_ACCOUNT1_CHANNELS=...
     */
    private static _parseDiscordAccounts(): Array<Record<string, unknown>> {
        const accountsEnv = process.env.DISCORD_ACCOUNTS;
        if (!accountsEnv) return [];

        const accountIds = accountsEnv.split(',').map(s => s.trim());
        const accounts: Array<Record<string, unknown>> = [];

        for (const accountId of accountIds) {
            const prefix = `DISCORD_${accountId.toUpperCase()}_`;
            const token = process.env[`${prefix}TOKEN`];

            if (token) {
                accounts.push({
                    id: accountId,
                    token,
                    requireMention: process.env[`${prefix}REQUIRE_MENTION`] === 'true',
                    allowedChannels: process.env[`${prefix}ALLOWED_CHANNELS`]?.split(',').map(s => s.trim()),
                    allowedUsers: process.env[`${prefix}ALLOWED_USERS`]?.split(',').map(s => s.trim()),
                });
            }
        }

        return accounts;
    }

    /**
     * Resolve config file path, checking default locations.
     */
    private static _resolveConfigPath(configPath?: string): string | null {
        if (configPath) {
            return resolve(configPath);
        }

        //check default locations
        const defaults = [
            './config/default.json',
            './config.json',
            './.i-clavdivs.json',
        ];

        for (const def of defaults) {
            const path = resolve(def);
            if (existsSync(path)) {
                return path;
            }
        }

        return null;
    }

    /**
     * Replace ${ENV_VAR} placeholders in config with actual env values.
     */
    private static _replaceEnvVars(config: any): any {
        if (typeof config === 'string') {
            const match = config.match(/^\$\{(.+)\}$/);
            if (match && match[1]) {
                return process.env[match[1]] || config;
            }
            return config;
        }

        if (Array.isArray(config)) {
            return config.map(item => this._replaceEnvVars(item));
        }

        if (config && typeof config === 'object') {
            const result: any = {};
            for (const [key, value] of Object.entries(config)) {
                result[key] = this._replaceEnvVars(value);
            }
            return result;
        }

        return config;
    }

    /**
     * Deep merge two config objects.
     */
    private static _mergeConfigs(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
        const result = { ...base };

        for (const [key, value] of Object.entries(override)) {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                result[key] = this._mergeConfigs(
                    (base[key] as Record<string, unknown>) || {},
                    value as Record<string, unknown>
                );
            } else {
                result[key] = value;
            }
        }

        return result;
    }
}
