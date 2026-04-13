import { Client, GatewayIntentBits, Events, Partials, type Message } from 'discord.js';
import os from 'node:os';
import path from 'node:path';
import type { IChannelGateway, IChannelMessage } from '@i-clavdivs/plugins';
import { Agent } from '@i-clavdivs/agent';
import { loadWorkspaceFiles } from '@i-clavdivs/workspace';
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
    agent: Agent;
}

/**
 * Discord gateway that listens for messages and routes them to the agent.
 * Supports multiple Discord bot accounts, each with its own workspace/personality.
 */
export class DiscordGateway implements IChannelGateway {
    private _clients: IDiscordClientInstance[] = [];
    private _running = false;

    constructor(_config: unknown) {
        //config is passed to start() method
    }

    /**
     * Set the agent for processing messages.
     * @deprecated This method is kept for backward compatibility but is no longer used.
     * Each account now has its own agent created in _startAccount().
     */
    public setAgent(_agent: Agent): void {
        //no-op: kept for backward compatibility with IChannelGateway interface
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
            throw new Error(
                'No Discord accounts configured. Please ensure DISCORD_BOT_TOKEN is set in your environment or .env file, ' +
                    'or configure the token in config/default.json'
            );
        }

        // Validate that tokens don't contain placeholders
        for (const account of accounts) {
            console.log(`[DEBUG] Validating token for account ${account.id}:`, {
                hasToken: !!account.token,
                tokenLength: account.token?.length,
                tokenPrefix: account.token?.substring(0, 30),
                containsPlaceholder: account.token?.includes('${'),
            });

            if (!account.token || account.token.includes('${')) {
                throw new Error(
                    `Invalid Discord token for account ${account.id}: Token appears to be a placeholder or missing. ` +
                        'Please set DISCORD_BOT_TOKEN in your environment or .env file.'
                );
            }
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
        //create a dedicated agent for this account with its own workspace
        const agent = await this._createAgentForAccount(accountConfig);

        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.DirectMessageTyping,
            ],
            partials: [Partials.Channel], // Required for DMs
        });

        const handler = new MessageHandler(accountConfig);
        handler.setMessageCallback(async (msg, raw) => {
            await this._processWithAgent(msg, raw, accountConfig.id);
        });

        client.on(Events.ClientReady, () => {
            console.log(`[Discord:${accountConfig.id}] Bot logged in as ${client.user?.tag}`);
            console.log(
                `[Discord:${accountConfig.id}] Listening on ${client.guilds.cache.size} servers`
            );
            console.log(
                `[Discord:${accountConfig.id}] Configuration: requireMention=${accountConfig.requireMention}, allowedChannels=${accountConfig.allowedChannels?.length || 'all'}, allowedUsers=${accountConfig.allowedUsers?.length || 'all'}`
            );
            if (accountConfig.workspaceDir) {
                console.log(
                    `[Discord:${accountConfig.id}] Workspace: ${accountConfig.workspaceDir}`
                );
            }
        });

        client.on(Events.MessageCreate, async (message: Message) => {
            await this._handleMessage(message, handler, accountConfig.id);
        });

        client.on(Events.Error, (error) => {
            console.error(`[Discord:${accountConfig.id}] Client error:`, error);
        });

        client.on(Events.Debug, (info) => {
            if (info.includes('Heartbeat')) {
                //skip heartbeat spam
                return;
            }
            console.log(`[Discord:${accountConfig.id}] Debug:`, info);
        });

        await client.login(accountConfig.token);

        this._clients.push({
            accountId: accountConfig.id,
            client,
            handler,
            agent: agent,
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

        console.log(
            `[Discord:${accountId}] Received message from ${message.author.username}: "${message.content.substring(0, 50)}..."`
        );

        //check if message should be processed
        if (!handler.shouldProcess(message)) {
            console.log(
                `[Discord:${accountId}] Message filtered out (check requireMention, allowedChannels, allowedUsers)`
            );
            return;
        }

        console.log(`[Discord:${accountId}] Processing message...`);

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
     * Create an agent instance for a specific account.
     */
    private async _createAgentForAccount(accountConfig: IDiscordAccountConfig): Promise<Agent> {
        //load workspace files from account-specific directory
        const workspaceFiles = await loadWorkspaceFiles(
            accountConfig.workspaceDir ? { workspaceDir: accountConfig.workspaceDir } : undefined
        );

        //determine session directory for this account
        //if workspace is specified, use <workspace>/.sessions
        //otherwise use default ~/.i-clavdivs/sessions/<accountId>
        const sessionDir = this._getSessionDir(accountConfig);

        //create agent with account identity and workspace
        const agent = new Agent({
            id: accountConfig.id,
            workspaceDir: accountConfig.workspaceDir,
            workspaceFiles,
            sessionDir,
        });

        //initialize the agent
        await agent.initialize();

        return agent;
    }

    /**
     * Get session directory for an account.
     * Each account gets its own session directory to prevent conflicts.
     */
    private _getSessionDir(accountConfig: IDiscordAccountConfig): string {
        if (accountConfig.workspaceDir) {
            //store sessions alongside workspace
            return path.join(accountConfig.workspaceDir, '.sessions');
        }

        //use account-specific subdirectory in default sessions folder
        return path.join(os.homedir(), '.i-clavdivs', 'sessions', accountConfig.id);
    }

    /**
     * Process message with the agent for a specific account.
     */
    private async _processWithAgent(
        msg: IChannelMessage,
        raw: Message,
        accountId: string
    ): Promise<void> {
        //find the agent for this account
        const instance = this._findClient(accountId);
        if (!instance) {
            console.error(`[Discord] No client instance found for account: ${accountId}`);
            return;
        }

        const agent = instance.agent;

        try {
            //show typing indicator
            if ('sendTyping' in raw.channel) {
                await raw.channel.sendTyping();
            }

            //run the agent with the message content
            const result = await agent.run({
                sessionId: msg.conversationId,
                prompt: msg.content,
                provider: 'anthropic',
                model: 'claude-sonnet-4-5-20250929',
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
            console.error(`[Discord:${accountId}] Error processing message:`, error);
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
        return this._clients.find((c) => c.accountId === accountId);
    }
}
