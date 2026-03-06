import type Snoowrap from 'snoowrap';
import type { IChannelMessage } from '@i-clavdivs/plugins';
import type { IRedditAccountConfig } from '../config/index.js';

/**
 * Type definitions for Reddit content items.
 */
type RedditComment = Snoowrap.Comment;
type RedditMessage = Snoowrap.PrivateMessage;

/**
 * Union type for all processable Reddit content.
 */
export type RedditContent = RedditComment | RedditMessage;

/**
 * Handles incoming Reddit messages and determines if they should be processed.
 */
export class MessageHandler {
    private _config: IRedditAccountConfig;
    private _onMessage?: (msg: IChannelMessage, raw: RedditContent) => Promise<void>;

    constructor(config: IRedditAccountConfig) {
        this._config = config;
    }

    /**
     * Set the message callback handler.
     */
    public setMessageCallback(
        callback: (msg: IChannelMessage, raw: RedditContent) => Promise<void>
    ): void {
        this._onMessage = callback;
    }

    /**
     * Check if a message should be processed by the bot.
     */
    public shouldProcess(content: RedditContent): boolean {
        //check user allowlist
        if (!this._checkUserAllowlist(content)) {
            console.log(
                `[Reddit:${this._config.id}] Message from ${this._getAuthorName(content)} rejected - not in allowedUsers: ${this._config.allowedUsers?.join(', ') || 'all allowed'}`
            );
            return false;
        }

        return true;
    }

    /**
     * Extract content text from Reddit item.
     */
    public extractContent(content: RedditContent): string {
        if (this._isComment(content)) {
            return content.body;
        } else {
            //private message
            return content.body;
        }
    }

    /**
     * Convert Reddit content to channel message format.
     */
    public async convertToChannelMessage(
        content: RedditContent,
        accountId: string
    ): Promise<IChannelMessage> {
        const isComment = this._isComment(content);
        const contentText = this.extractContent(content);
        const author = await this._getAuthor(content);

        //determine chat type
        let chatType: 'direct' | 'group' | 'channel';
        if (!isComment) {
            chatType = 'direct'; //private message
        } else {
            chatType = 'channel'; //subreddit comment
        }

        return {
            channel: 'reddit',
            accountId,
            messageId: content.id,
            conversationId: this._getConversationId(content),
            from: {
                id: author.id,
                name: author.name,
                username: author.name,
            },
            content: contentText,
            chatType,
            timestamp: new Date(content.created_utc * 1000),
            metadata: {
                subreddit: isComment
                    ? (content as RedditComment).subreddit?.display_name
                    : undefined,
                permalink: await this._getPermalink(content),
                isComment,
            },
        };
    }

    /**
     * Handle a processed message.
     */
    public async handleMessage(channelMessage: IChannelMessage, raw: RedditContent): Promise<void> {
        if (this._onMessage) {
            await this._onMessage(channelMessage, raw);
        }
    }

    /**
     * Check if content is a comment (vs private message).
     */
    private _isComment(content: RedditContent): content is RedditComment {
        return 'subreddit' in content;
    }

    /**
     * Check user allowlist.
     */
    private _checkUserAllowlist(content: RedditContent): boolean {
        if (!this._config.allowedUsers || this._config.allowedUsers.length === 0) {
            return true;
        }

        const authorName = this._getAuthorName(content);
        return this._config.allowedUsers.includes(authorName);
    }

    /**
     * Get author name from content.
     */
    private _getAuthorName(content: RedditContent): string {
        return content.author?.name || 'unknown';
    }

    /**
     * Get author details from content.
     */
    private async _getAuthor(content: RedditContent): Promise<{ id: string; name: string }> {
        const author = content.author;
        if (!author) {
            return { id: 'unknown', name: 'unknown' };
        }

        return {
            id: author.id,
            name: author.name,
        };
    }

    /**
     * Get conversation ID from content.
     */
    private _getConversationId(content: RedditContent): string {
        if (this._isComment(content)) {
            //for comments, use the parent post/comment ID
            return content.link_id || content.parent_id || content.id;
        } else {
            //for PMs, use the message ID
            return content.id;
        }
    }

    /**
     * Get permalink URL for content.
     */
    private async _getPermalink(content: RedditContent): Promise<string> {
        if (this._isComment(content)) {
            return `https://reddit.com${content.permalink}`;
        } else {
            //private messages don't have public permalinks
            return '';
        }
    }
}
