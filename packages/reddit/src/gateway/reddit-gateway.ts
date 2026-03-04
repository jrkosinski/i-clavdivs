import Snoowrap from 'snoowrap';
import type { IChannelGateway, IChannelMessage } from '@i-clavdivs/plugins';
import type { AgentRunner } from '@i-clavdivs/runner';
import { MessageHandler, type RedditContent } from './message-handler.js';
import type { IRedditConfig, IRedditAccountConfig } from '../config/index.js';
import { normalizeRedditConfig } from '../config/index.js';

/**
 * Reddit client instance for a single account.
 */
interface IRedditClientInstance {
    accountId: string;
    client: Snoowrap;
    handler: MessageHandler;
    config: IRedditAccountConfig;
    pollingTimer?: NodeJS.Timeout;
    lastCheckedIds: Set<string>;
}

/**
 * Reddit gateway that polls for messages and routes them to the agent.
 * Supports multiple Reddit bot accounts.
 */
export class RedditGateway implements IChannelGateway {
    private _clients: IRedditClientInstance[] = [];
    private _running = false;
    private _runner?: AgentRunner;

    constructor(_config: unknown) {
        //config is passed to start() method
    }

    /**
     * Set the agent runner for processing messages.
     */
    public setRunner(runner: AgentRunner): void {
        this._runner = runner;
    }

    /**
     * Start polling for Reddit messages across all configured accounts.
     */
    public async start(config: unknown): Promise<void> {
        if (this._running) {
            throw new Error('Reddit gateway already running');
        }

        const redditConfig = config as IRedditConfig;
        const accounts = normalizeRedditConfig(redditConfig);

        if (accounts.length === 0) {
            throw new Error('No Reddit accounts configured');
        }

        //start a client for each account
        for (const accountConfig of accounts) {
            await this._startAccount(accountConfig);
        }

        this._running = true;
    }

    /**
     * Stop all Reddit clients and polling.
     */
    public async stop(): Promise<void> {
        if (!this._running) {
            return;
        }

        for (const instance of this._clients) {
            if (instance.pollingTimer) {
                clearInterval(instance.pollingTimer);
            }
        }

        this._clients = [];
        this._running = false;
        console.log('[Reddit] Gateway stopped');
    }

    /**
     * Check if gateway is running.
     */
    public isRunning(): boolean {
        return this._running;
    }

    /**
     * Send a message (reply to comment or send PM).
     */
    public async sendMessage(to: string, content: string): Promise<void> {
        //parse target format: [accountId:]type:ID
        //examples: "comment:abc123", "pm:username", "default:comment:abc123"
        const { accountId, type, id } = this._parseTarget(to);

        //find the appropriate client
        const instance = this._findClient(accountId);
        if (!instance) {
            throw new Error(`Reddit account not found: ${accountId}`);
        }

        const client = instance.client;

        if (type === 'comment') {
            //reply to a comment
            const comment = client.getComment(id);
            await comment.reply(content);
        } else if (type === 'pm') {
            //send a private message (id is username)
            await client.composeMessage({
                to: id,
                subject: 'Message from bot',
                text: content,
            });
        } else {
            throw new Error(`Unknown message type: ${type}`);
        }
    }

    /**
     * Start a Reddit client for a single account.
     */
    private async _startAccount(accountConfig: IRedditAccountConfig): Promise<void> {
        const client = new Snoowrap({
            clientId: accountConfig.clientId,
            clientSecret: accountConfig.clientSecret,
            refreshToken: accountConfig.refreshToken,
            userAgent: accountConfig.userAgent,
        });

        //configure snoowrap
        client.config({
            requestDelay: 1000, //1 second between requests
            warnings: false,
            continueAfterRatelimitError: true,
        });

        const handler = new MessageHandler(accountConfig);
        handler.setMessageCallback(async (msg, raw) => {
            await this._processWithAgent(msg, raw, client);
        });

        const instance: IRedditClientInstance = {
            accountId: accountConfig.id,
            client,
            handler,
            config: accountConfig,
            lastCheckedIds: new Set<string>(),
        };

        this._clients.push(instance);

        console.log(`[Reddit:${accountConfig.id}] Client initialized for user ${accountConfig.username}`);
        console.log(
            `[Reddit:${accountConfig.id}] Monitoring: mentions=${accountConfig.monitorMentions}, DMs=${accountConfig.monitorDirectMessages}, commentReplies=${accountConfig.monitorCommentReplies}, postReplies=${accountConfig.monitorPostReplies}`
        );
        console.log(
            `[Reddit:${accountConfig.id}] Subreddits: ${accountConfig.subreddits?.join(', ') || 'none'}`
        );

        //start polling
        this._startPolling(instance);
    }

    /**
     * Start polling for new messages.
     */
    private _startPolling(instance: IRedditClientInstance): void {
        const interval = instance.config.pollingInterval || 60000;

        //do initial poll immediately
        this._poll(instance).catch((error) => {
            console.error(`[Reddit:${instance.accountId}] Initial poll error:`, error);
        });

        //then poll at regular intervals
        instance.pollingTimer = setInterval(() => {
            this._poll(instance).catch((error) => {
                console.error(`[Reddit:${instance.accountId}] Poll error:`, error);
            });
        }, interval);

        console.log(`[Reddit:${instance.accountId}] Polling started (interval: ${interval}ms)`);
    }

    /**
     * Poll for new messages from all configured sources.
     */
    private async _poll(instance: IRedditClientInstance): Promise<void> {
        const { config } = instance;

        try {
            //poll all sources in parallel
            const pollTasks: Promise<void>[] = [];

            if (config.monitorMentions) {
                pollTasks.push(this._pollMentions(instance));
            }

            if (config.monitorDirectMessages) {
                pollTasks.push(this._pollDirectMessages(instance));
            }

            if (config.monitorCommentReplies) {
                pollTasks.push(this._pollCommentReplies(instance));
            }

            if (config.monitorPostReplies) {
                pollTasks.push(this._pollPostReplies(instance));
            }

            if (config.subreddits && config.subreddits.length > 0) {
                for (const subreddit of config.subreddits) {
                    pollTasks.push(this._pollSubreddit(instance, subreddit));
                }
            }

            await Promise.all(pollTasks);
        } catch (error) {
            console.error(`[Reddit:${instance.accountId}] Poll error:`, error);
        }
    }

    /**
     * Poll for username mentions.
     */
    private async _pollMentions(instance: IRedditClientInstance): Promise<void> {
        try {
            const mentions = await instance.client.getInbox({ filter: 'mentions' });
            await this._processItems(instance, mentions, 'mentions');
        } catch (error) {
            console.error(`[Reddit:${instance.accountId}] Error polling mentions:`, error);
        }
    }

    /**
     * Poll for direct messages.
     */
    private async _pollDirectMessages(instance: IRedditClientInstance): Promise<void> {
        try {
            const messages = await instance.client.getUnreadMessages();
            await this._processItems(instance, messages, 'direct messages');
        } catch (error) {
            console.error(`[Reddit:${instance.accountId}] Error polling DMs:`, error);
        }
    }

    /**
     * Poll for comment replies.
     */
    private async _pollCommentReplies(instance: IRedditClientInstance): Promise<void> {
        try {
            const replies = await instance.client.getInbox({ filter: 'comments' });
            await this._processItems(instance, replies, 'comment replies');
        } catch (error) {
            console.error(`[Reddit:${instance.accountId}] Error polling comment replies:`, error);
        }
    }

    /**
     * Poll for post replies.
     */
    private async _pollPostReplies(instance: IRedditClientInstance): Promise<void> {
        try {
            const replies = await instance.client.getInbox({ filter: 'selfreply' });
            await this._processItems(instance, replies, 'post replies');
        } catch (error) {
            console.error(`[Reddit:${instance.accountId}] Error polling post replies:`, error);
        }
    }

    /**
     * Poll a specific subreddit for new posts/comments.
     */
    private async _pollSubreddit(instance: IRedditClientInstance, subredditName: string): Promise<void> {
        try {
            const subreddit = instance.client.getSubreddit(subredditName);
            const comments = await subreddit.getNewComments({ limit: 10 });
            await this._processItems(instance, comments, `subreddit ${subredditName}`);
        } catch (error) {
            console.error(`[Reddit:${instance.accountId}] Error polling subreddit ${subredditName}:`, error);
        }
    }

    /**
     * Process items from a polling source.
     */
    private async _processItems(
        instance: IRedditClientInstance,
        items: RedditContent[],
        source: string
    ): Promise<void> {
        let newItemCount = 0;

        for (const item of items) {
            //skip if already processed
            if (instance.lastCheckedIds.has(item.id)) {
                continue;
            }

            //mark as processed
            instance.lastCheckedIds.add(item.id);

            //keep the set from growing too large
            if (instance.lastCheckedIds.size > 1000) {
                const firstId = instance.lastCheckedIds.values().next().value as string;
                if (firstId) {
                    instance.lastCheckedIds.delete(firstId);
                }
            }

            //check if should process
            if (!instance.handler.shouldProcess(item)) {
                continue;
            }

            newItemCount++;

            console.log(
                `[Reddit:${instance.accountId}] New ${source} from ${item.author?.name}: "${item.body.substring(0, 50)}..."`
            );

            //convert to channel message
            const channelMessage = await instance.handler.convertToChannelMessage(
                item,
                instance.accountId
            );

            //handle the message
            await instance.handler.handleMessage(channelMessage, item);
        }

        if (newItemCount > 0) {
            console.log(`[Reddit:${instance.accountId}] Processed ${newItemCount} new items from ${source}`);
        }
    }

    /**
     * Process message with the agent runner.
     */
    private async _processWithAgent(
        msg: IChannelMessage,
        raw: RedditContent,
        client: Snoowrap
    ): Promise<void> {
        if (!this._runner) {
            console.error('[Reddit] No runner configured');
            return;
        }

        try {
            //run the agent with the message content
            const result = await this._runner.run({
                sessionId: msg.conversationId,
                prompt: msg.content,
                provider: 'anthropic',
                model: 'claude-sonnet-4-5-20250929',
                workspaceDir: process.cwd(),
            });

            const payload = result.payloads?.[0];
            if (!payload) {
                await this._sendReply(raw, 'Sorry, I encountered an error processing your request.', client);
                return;
            }

            if (payload.isError) {
                await this._sendReply(raw, `Error: ${payload.text}`, client);
                return;
            }

            //send response back to Reddit
            const response = payload.text ?? 'No response generated.';

            //Reddit comment limit is 10000 chars
            if (response.length <= 10000) {
                await this._sendReply(raw, response, client);
            } else {
                //split long messages
                const chunks = this._splitMessage(response, 10000);
                await this._sendReply(raw, chunks[0] || '', client);

                //send additional chunks as follow-up comments
                for (let i = 1; i < chunks.length; i++) {
                    await this._sendReply(raw, `(continued ${i}/${chunks.length - 1})\n\n${chunks[i]}`, client);
                }
            }
        } catch (error) {
            console.error('[Reddit] Error processing message:', error);
            await this._sendReply(raw, 'Sorry, an error occurred while processing your message.', client);
        }
    }

    /**
     * Send a reply to a Reddit item.
     */
    private async _sendReply(raw: RedditContent, text: string, _client: Snoowrap): Promise<void> {
        try {
            //both comments and private messages have a reply method
            await raw.reply(text);
        } catch (error) {
            console.error('[Reddit] Error sending reply:', error);
        }
    }

    /**
     * Split long messages into chunks.
     */
    private _splitMessage(text: string, maxLength: number): string[] {
        const chunks: string[] = [];
        let remaining = text;

        while (remaining.length > 0) {
            if (remaining.length <= maxLength) {
                chunks.push(remaining);
                break;
            }

            //try to split at newline
            let splitIndex = remaining.lastIndexOf('\n', maxLength);
            if (splitIndex === -1 || splitIndex < maxLength / 2) {
                //try to split at space
                splitIndex = remaining.lastIndexOf(' ', maxLength);
            }
            if (splitIndex === -1 || splitIndex < maxLength / 2) {
                //just split at max length
                splitIndex = maxLength;
            }

            chunks.push(remaining.substring(0, splitIndex));
            remaining = remaining.substring(splitIndex).trim();
        }

        return chunks;
    }

    /**
     * Parse message target format.
     * Supports: "comment:ID", "pm:username", "accountId:comment:ID", "accountId:pm:username"
     */
    private _parseTarget(to: string): { accountId: string; type: string; id: string } {
        const parts = to.split(':');

        if (parts.length === 2 && parts[0] && parts[1]) {
            //format: "comment:ID" or "pm:username" - use first/default account
            return {
                accountId: this._clients[0]?.accountId || 'default',
                type: parts[0],
                id: parts[1],
            };
        }

        if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
            //format: "accountId:comment:ID" or "accountId:pm:username"
            return {
                accountId: parts[0],
                type: parts[1],
                id: parts[2],
            };
        }

        throw new Error(`Invalid Reddit target format: ${to}`);
    }

    /**
     * Find client instance by account ID.
     */
    private _findClient(accountId: string): IRedditClientInstance | undefined {
        return this._clients.find((c) => c.accountId === accountId);
    }
}
