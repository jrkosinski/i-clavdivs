/**
 * Configuration for a single Discord account.
 */
export interface IDiscordAccountConfig {
    /**
     * Account identifier (for multi-account setups).
     */
    id: string;

    /**
     * Discord bot token.
     */
    token: string;

    /**
     * Whether this account is enabled.
     */
    enabled?: boolean;

    /**
     * List of allowed channel IDs (empty = all channels).
     */
    allowedChannels?: string[];

    /**
     * List of allowed user IDs (empty = all users).
     */
    allowedUsers?: string[];

    /**
     * Whether bot mention is required in guild channels.
     */
    requireMention?: boolean;
}

/**
 * Discord plugin configuration.
 * Supports both single-account and multi-account modes.
 */
export interface IDiscordConfig {
    /**
     * Whether Discord plugin is enabled.
     */
    enabled: boolean;

    /**
     * Single-account mode: bot token.
     */
    token?: string;

    /**
     * Single-account mode: allowed channels.
     */
    allowedChannels?: string[];

    /**
     * Single-account mode: allowed users.
     */
    allowedUsers?: string[];

    /**
     * Single-account mode: require mention in guild channels.
     */
    requireMention?: boolean;

    /**
     * Multi-account mode: array of account configurations.
     */
    accounts?: IDiscordAccountConfig[];
}

/**
 * Normalize Discord config into an array of account configs.
 */
export function normalizeDiscordConfig(config: IDiscordConfig): IDiscordAccountConfig[] {
    //multi-account mode
    if (config.accounts && config.accounts.length > 0) {
        return config.accounts.filter(acc => acc.enabled !== false);
    }

    //single-account mode
    if (config.token) {
        return [{
            id: 'default',
            token: config.token,
            enabled: true,
            allowedChannels: config.allowedChannels,
            allowedUsers: config.allowedUsers,
            requireMention: config.requireMention,
        }];
    }

    return [];
}
