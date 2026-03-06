/**
 * Configuration for a single Reddit account.
 */
export interface IRedditAccountConfig {
    /**
     * Account identifier (for multi-account setups).
     */
    id: string;

    /**
     * Reddit OAuth client ID.
     */
    clientId: string;

    /**
     * Reddit OAuth client secret.
     */
    clientSecret: string;

    /**
     * Reddit OAuth refresh token.
     */
    refreshToken: string;

    /**
     * Reddit username for this account.
     */
    username: string;

    /**
     * User agent string for Reddit API requests.
     */
    userAgent: string;

    /**
     * Whether this account is enabled.
     */
    enabled?: boolean;

    /**
     * List of subreddits to monitor (empty = none).
     */
    subreddits?: string[];

    /**
     * Whether to monitor mentions of the bot's username.
     */
    monitorMentions?: boolean;

    /**
     * Whether to monitor direct messages/PMs.
     */
    monitorDirectMessages?: boolean;

    /**
     * Whether to monitor comment replies.
     */
    monitorCommentReplies?: boolean;

    /**
     * Whether to monitor post replies.
     */
    monitorPostReplies?: boolean;

    /**
     * List of allowed user IDs (empty = all users).
     */
    allowedUsers?: string[];

    /**
     * Polling interval in milliseconds (default: 60000 = 1 minute).
     */
    pollingInterval?: number;
}

/**
 * Reddit plugin configuration.
 * Supports both single-account and multi-account modes.
 */
export interface IRedditConfig {
    /**
     * Whether Reddit plugin is enabled.
     */
    enabled: boolean;

    /**
     * Single-account mode: OAuth client ID.
     */
    clientId?: string;

    /**
     * Single-account mode: OAuth client secret.
     */
    clientSecret?: string;

    /**
     * Single-account mode: OAuth refresh token.
     */
    refreshToken?: string;

    /**
     * Single-account mode: Reddit username.
     */
    username?: string;

    /**
     * Single-account mode: user agent.
     */
    userAgent?: string;

    /**
     * Single-account mode: subreddits to monitor.
     */
    subreddits?: string[];

    /**
     * Single-account mode: monitor mentions.
     */
    monitorMentions?: boolean;

    /**
     * Single-account mode: monitor direct messages.
     */
    monitorDirectMessages?: boolean;

    /**
     * Single-account mode: monitor comment replies.
     */
    monitorCommentReplies?: boolean;

    /**
     * Single-account mode: monitor post replies.
     */
    monitorPostReplies?: boolean;

    /**
     * Single-account mode: allowed users.
     */
    allowedUsers?: string[];

    /**
     * Single-account mode: polling interval.
     */
    pollingInterval?: number;

    /**
     * Multi-account mode: array of account configurations.
     */
    accounts?: IRedditAccountConfig[];
}

/**
 * Normalize Reddit config into an array of account configs.
 */
export function normalizeRedditConfig(config: IRedditConfig): IRedditAccountConfig[] {
    //multi-account mode
    if (config.accounts && config.accounts.length > 0) {
        return config.accounts.filter((acc) => acc.enabled !== false);
    }

    //single-account mode
    if (config.clientId && config.clientSecret && config.refreshToken) {
        return [
            {
                id: 'default',
                clientId: config.clientId,
                clientSecret: config.clientSecret,
                refreshToken: config.refreshToken,
                username: config.username || 'bot',
                userAgent: config.userAgent || 'i-clavdivs-bot/1.0',
                enabled: true,
                subreddits: config.subreddits,
                monitorMentions: config.monitorMentions ?? true,
                monitorDirectMessages: config.monitorDirectMessages ?? true,
                monitorCommentReplies: config.monitorCommentReplies ?? true,
                monitorPostReplies: config.monitorPostReplies ?? false,
                allowedUsers: config.allowedUsers,
                pollingInterval: config.pollingInterval ?? 60000,
            },
        ];
    }

    return [];
}
