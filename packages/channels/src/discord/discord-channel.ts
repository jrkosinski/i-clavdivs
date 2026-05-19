import { Client, GatewayIntentBits, Events, Partials, type Message } from 'discord.js';
import type { IChannel, IChannelMessage } from '../channel';
import { DiscordMessageHandler } from './message-handler';

const DISCORD_MAX_MESSAGE_LENGTH = 2000;

/** @notice Options for configuring a DiscordChannel instance. */
export interface IDiscordChannelOptions {
    token: string;
    channelId?: string;
    allowedChannels?: string[];
    allowedUsers?: string[];
    requireMention?: boolean;
}

/**
 * @notice IChannel implementation backed by a Discord bot.
 * @dev Handles inbound message routing and chunked reply delivery.
 */
export class DiscordChannel implements IChannel {
    private readonly _client: Client;
    private readonly _token: string;
    private readonly _channelId?: string;
    private readonly _handler: DiscordMessageHandler;
    private _onMessage?: (msg: IChannelMessage) => Promise<string>;

    /**
     * @notice Constructs a DiscordChannel with the given options.
     * @param options Configuration including bot token, channel filters, and mention requirements.
     */
    public constructor(options: IDiscordChannelOptions) {
        this._token = options.token;
        this._channelId = options.channelId;
        this._handler = new DiscordMessageHandler({
            allowedChannels: options.allowedChannels,
            allowedUsers: options.allowedUsers,
            requireMention: options.requireMention,
        });
        this._client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.DirectMessageTyping,
            ],
            partials: [Partials.Channel],
        });

        this._client.on(Events.ClientReady, () => {
            console.log(`[Discord] Logged in as ${this._client.user?.tag}`);
        });

        this._client.on(Events.MessageCreate, (message: Message) => {
            void this._handleMessage(message);
        });

        this._client.on(Events.Error, (err) => {
            console.error('[Discord] Client error', err);
        });
    }

    /**
     * @notice Logs the bot into Discord.
     */
    public async connect(): Promise<void> {
        await this._client.login(this._token);
    }

    /**
     * @notice Destroys the Discord client connection.
     */
    public async disconnect(): Promise<void> {
        this._client.destroy();
    }

    /**
     * @notice Registers the handler invoked for every qualifying incoming message.
     * @param handler Async function returning the reply text.
     */
    public onMessage(handler: (msg: IChannelMessage) => Promise<string>): void {
        this._onMessage = handler;
    }

    /**
     * @notice Sends a message to the configured channel, splitting if it exceeds Discord's limit.
     * @param msg The text to send.
     */
    public async send(msg: string): Promise<void> {
        if (!this._channelId) {
            throw new Error('No channelId configured for proactive send');
        }
        const channel = await this._client.channels.fetch(this._channelId);
        if (!channel || !channel.isSendable()) {
            throw new Error(`Channel ${this._channelId} is not a sendable channel`);
        }
        for (const chunk of DiscordChannel._splitMessage(msg)) {
            await channel.send(chunk);
        }
    }

    private async _handleMessage(message: Message): Promise<void> {
        if (message.author.bot) return;
        if (this._channelId && message.channelId !== this._channelId) return;
        if (!this._handler.shouldProcess(message)) return;
        if (!this._onMessage) return;

        try {
            if ('sendTyping' in message.channel) {
                await message.channel.sendTyping();
            }
            const channelMessage = this._handler.toChannelMessage(message);
            const response = await this._onMessage(channelMessage);
            for (const chunk of DiscordChannel._splitMessage(response)) {
                await message.reply(chunk);
            }
        } catch (err) {
            console.error('[Discord] Error handling message', err);
        }
    }

    /**
     * @notice Splits text into chunks that fit within Discord's message length limit.
     * @param text The text to split.
     * @returns An array of chunks, each no longer than DISCORD_MAX_MESSAGE_LENGTH characters.
     */
    private static _splitMessage(text: string): string[] {
        if (text.length <= DISCORD_MAX_MESSAGE_LENGTH) return [text];

        const chunks: string[] = [];
        let remaining = text;
        while (remaining.length > 0) {
            if (remaining.length <= DISCORD_MAX_MESSAGE_LENGTH) {
                chunks.push(remaining);
                break;
            }
            //prefer splitting at a newline, then a space, then hard-cut at the limit
            let split = remaining.lastIndexOf('\n', DISCORD_MAX_MESSAGE_LENGTH);
            if (split < DISCORD_MAX_MESSAGE_LENGTH / 2) split = remaining.lastIndexOf(' ', DISCORD_MAX_MESSAGE_LENGTH);
            if (split < DISCORD_MAX_MESSAGE_LENGTH / 2) split = DISCORD_MAX_MESSAGE_LENGTH;
            chunks.push(remaining.substring(0, split));
            remaining = remaining.substring(split).trim();
        }
        return chunks;
    }
}
