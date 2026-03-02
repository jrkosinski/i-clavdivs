import { Client, GatewayIntentBits, Events, type Message } from 'discord.js';
import type { IChannelGateway, IChannelMessage } from '@i-clavdivs/plugins';
import type { AgentRunner } from '@i-clavdivs/runner';
import { MessageHandler } from './message-handler.js';
import type { IDiscordConfig, IDiscordAccountConfig } from '../config/index.js';
import { normalizeDiscordConfig } from '../config/index.js';

/**
 * Discord client instance for a single account.
 */
interface IDiscordClientInstance {
    accountId: string;
    client: Client;
    handler: MessageHandler;
}

/**
 * Discord gateway that listens for messages and routes them to the agent.
 * Supports multiple Discord bot accounts.
 */
export class DiscordGateway implements IChannelGateway {
    private _clients: IDiscordClientInstance[] = [];
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
     * Start listening for Discord messages across all configured accounts.
     */
    public async start(config: unknown): Promise<void> {
        if (this._running) {
            throw new Error('Discord gateway already running');
        }

        const discordConfig = config as IDiscordConfig;
        const accounts = normalizeDiscordConfig(discordConfig);

        if (accounts.length === 0) {
            throw new Error('No Discord accounts configured');
        }

        //start a client for each account
        for (const accountConfig of accounts) {
            await this._startAccount(accountConfig);
        }

        this._running = true;
    }

    /**
     * Stop all Discord clients.
     */
    public async stop(): Promise<void> {
        if (!this._running) {
            return;
        }

        for (const instance of this._clients) {
            await instance.client.destroy();
        }

        this._clients = [];
        this._running = false;
        console.log('[Discord] Gateway stopped');
    }

    /**
     * Check if gateway is running.
     */
    public isRunning(): boolean {
        return this._running;
    }

    /**
     * Send a message to a Discord channel or user.
     */
    public async sendMessage(to: string, content: string): Promise<void> {
        //parse target format: [accountId:]channel:ID or [accountId:]user:ID
        const { accountId, type, id } = this._parseTarget(to);

        //find the appropriate client
        const instance = this._findClient(accountId);
        if (!instance) {
            throw new Error(`Discord account not found: ${accountId}`);
        }

        const client = instance.client;

        if (type === 'channel') {
            const channel = await client.channels.fetch(id);
            if (channel?.isTextBased() && 'send' in channel) {
                await channel.send(content);
            }
        } else if (type === 'user') {
            const user = await client.users.fetch(id);
            await user.send(content);
        }
    }

    /**
     * Start a Discord client for a single account.
     */
    private async _startAccount(accountConfig: IDiscordAccountConfig): Promise<void> {
        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
            ],
        });

        const handler = new MessageHandler(accountConfig);
        handler.setMessageCallback(async (msg, raw) => {
            await this._processWithAgent(msg, raw);
        });

        client.on(Events.ClientReady, () => {
            console.log(`[Discord:${accountConfig.id}] Bot logged in as ${client.user?.tag}`);
        });

        client.on(Events.MessageCreate, async (message: Message) => {
            await this._handleMessage(message, handler, accountConfig.id);
        });

        client.on(Events.Error, (error) => {
            console.error(`[Discord:${accountConfig.id}] Client error:`, error);
        });

        await client.login(accountConfig.token);

        this._clients.push({
            accountId: accountConfig.id,
            client,
            handler,
        });
    }

    /**
     * Handle incoming message from Discord.
     */
    private async _handleMessage(
        message: Message,
        handler: MessageHandler,
        accountId: string
    ): Promise<void> {
        //ignore bot messages
        if (message.author.bot) {
            return;
        }

        //check if message should be processed
        if (!handler.shouldProcess(message)) {
            return;
        }

        //convert to channel message format
        const channelMessage: IChannelMessage = {
            channel: 'discord',
            accountId,
            messageId: message.id,
            conversationId: message.channelId,
            from: {
                id: message.author.id,
                name: message.author.displayName,
                username: message.author.username,
            },
            content: handler.extractContent(message),
            chatType: message.guild ? 'channel' : 'direct',
            timestamp: message.createdAt,
            metadata: {
                guildId: message.guildId,
                channelId: message.channelId,
            },
        };

        //route to agent
        await handler.handleMessage(channelMessage, message);
    }

    /**
     * Process message with the agent runner.
     */
    private async _processWithAgent(msg: IChannelMessage, raw: Message): Promise<void> {
        if (!this._runner) {
            console.error('[Discord] No runner configured');
            return;
        }

        try {
            //show typing indicator
            if ('sendTyping' in raw.channel) {
                await raw.channel.sendTyping();
            }

            //run the agent with the message content
            const result = await this._runner.run({
                sessionId: msg.conversationId,
                prompt: msg.content,
                provider: 'anthropic',
                model: 'claude-3-5-sonnet-20241022',
                workspaceDir: process.cwd(),
            });

            const payload = result.payloads?.[0];
            if (!payload) {
                await raw.reply('Sorry, I encountered an error processing your request.');
                return;
            }

            if (payload.isError) {
                await raw.reply(`Error: ${payload.text}`);
                return;
            }

            //send response back to Discord
            const response = payload.text ?? 'No response generated.';

            //split long messages if needed (Discord limit is 2000 chars)
            if (response.length <= 2000) {
                await raw.reply(response);
            } else {
                const chunks = this._splitMessage(response, 2000);
                for (const chunk of chunks) {
                    if ('send' in raw.channel) {
                        await raw.channel.send(chunk);
                    }
                }
            }
        } catch (error) {
            console.error('[Discord] Error processing message:', error);
            await raw.reply('Sorry, an error occurred while processing your message.');
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
     * Supports: "channel:ID", "user:ID", "accountId:channel:ID", "accountId:user:ID"
     */
    private _parseTarget(to: string): { accountId: string; type: string; id: string } {
        const parts = to.split(':');

        if (parts.length === 2 && parts[0] && parts[1]) {
            //format: "channel:ID" or "user:ID" - use first/default account
            return {
                accountId: this._clients[0]?.accountId || 'default',
                type: parts[0],
                id: parts[1],
            };
        }

        if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
            //format: "accountId:channel:ID" or "accountId:user:ID"
            return {
                accountId: parts[0],
                type: parts[1],
                id: parts[2],
            };
        }

        throw new Error(`Invalid Discord target format: ${to}`);
    }

    /**
     * Find client instance by account ID.
     */
    private _findClient(accountId: string): IDiscordClientInstance | undefined {
        return this._clients.find(c => c.accountId === accountId);
    }
}
