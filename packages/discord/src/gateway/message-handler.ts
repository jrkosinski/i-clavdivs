import type { Message } from 'discord.js';
import type { IChannelMessage } from '@i-clavdivs/plugins';
import type { IDiscordAccountConfig } from '../config/index.js';

/**
 * Handles incoming Discord messages and determines if they should be processed.
 */
export class MessageHandler {
    private _config: IDiscordAccountConfig;
    private _onMessage?: (msg: IChannelMessage, raw: Message) => Promise<void>;

    constructor(config: IDiscordAccountConfig) {
        this._config = config;
    }

    /**
     * Set the message callback handler.
     */
    public setMessageCallback(callback: (msg: IChannelMessage, raw: Message) => Promise<void>): void {
        this._onMessage = callback;
    }

    /**
     * Check if a message should be processed by the bot.
     */
    public shouldProcess(message: Message): boolean {
        //dm messages are always processed
        if (!message.guild) {
            return this._checkUserAllowlist(message);
        }

        //check channel allowlist
        if (!this._checkChannelAllowlist(message)) {
            return false;
        }

        //check user allowlist
        if (!this._checkUserAllowlist(message)) {
            return false;
        }

        //check if mention is required
        if (this._config.requireMention) {
            if (!message.mentions.has(message.client.user!)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Extract content from message, removing bot mention if present.
     */
    public extractContent(message: Message): string {
        let content = message.content;

        //remove bot mention
        if (message.client.user) {
            const mentionPattern = new RegExp(`<@!?${message.client.user.id}>`, 'g');
            content = content.replace(mentionPattern, '').trim();
        }

        return content;
    }

    /**
     * Handle a processed message.
     */
    public async handleMessage(channelMessage: IChannelMessage, raw: Message): Promise<void> {
        if (this._onMessage) {
            await this._onMessage(channelMessage, raw);
        }
    }

    private _checkChannelAllowlist(message: Message): boolean {
        if (!this._config.allowedChannels || this._config.allowedChannels.length === 0) {
            return true;
        }

        return this._config.allowedChannels.includes(message.channelId);
    }

    private _checkUserAllowlist(message: Message): boolean {
        if (!this._config.allowedUsers || this._config.allowedUsers.length === 0) {
            return true;
        }

        return this._config.allowedUsers.includes(message.author.id);
    }
}
