import type { Message } from 'discord.js';
import type { IChannelMessage } from '../channel';

/** @notice Options for configuring a DiscordMessageHandler instance. */
export interface IDiscordMessageHandlerOptions {
    allowedChannels?: string[];
    allowedUsers?: string[];
    requireMention?: boolean;
}

/**
 * @notice Filters and transforms Discord messages into IChannelMessage instances.
 * @dev Encapsulates channel/user allowlisting and bot-mention-stripping logic.
 */
export class DiscordMessageHandler {
    /**
     * @notice Constructs a DiscordMessageHandler with the given filter options.
     * @param _options Filtering options controlling which messages are processed.
     */
    public constructor(private readonly _options: IDiscordMessageHandlerOptions) {}

    /**
     * @notice Determines whether a Discord message should be forwarded to the agent.
     * @param message The raw Discord message to evaluate.
     * @returns True if the message passes all configured filters.
     */
    public shouldProcess(message: Message): boolean {
        if (!message.guild) {
            //DMs bypass channel filtering but still respect the user allowlist
            return this._isUserAllowed(message.author.id);
        }

        if (!this._isChannelAllowed(message.channelId)) return false;
        if (!this._isUserAllowed(message.author.id)) return false;

        if (this._options.requireMention && !message.mentions.has(message.client.user!)) {
            return false;
        }

        return true;
    }

    /**
     * @notice Converts a Discord message into a platform-agnostic IChannelMessage.
     * @param message The raw Discord message to convert.
     * @returns A normalized IChannelMessage with content and metadata.
     */
    public toChannelMessage(message: Message): IChannelMessage {
        return {
            content: this._extractContent(message),
            from: { id: message.author.id, username: message.author.username },
            conversationId: message.channelId,
            chatType: message.guild ? (message.channel.isThread() ? 'group' : 'channel') : 'direct',
        };
    }

    private _extractContent(message: Message): string {
        if (!message.client.user) return message.content;
        //strip the bot mention before passing the content to the agent
        return message.content
            .replace(new RegExp(`<@!?${message.client.user.id}>`, 'g'), '')
            .trim();
    }

    private _isChannelAllowed(channelId: string): boolean {
        if (!this._options.allowedChannels || this._options.allowedChannels.length === 0) return true;
        return this._options.allowedChannels.includes(channelId);
    }

    private _isUserAllowed(userId: string): boolean {
        if (!this._options.allowedUsers || this._options.allowedUsers.length === 0) return true;
        return this._options.allowedUsers.includes(userId);
    }
}
