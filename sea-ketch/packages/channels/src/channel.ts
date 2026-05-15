/** @notice Identifies the sender of a channel message. */
export interface IChannelSender {
    id: string;
    username: string;
}

/** @notice Represents a message received from a channel. */
export interface IChannelMessage {
    content: string;
    from: IChannelSender;
    conversationId: string;
    chatType: 'direct' | 'group' | 'channel';
}

/**
 * @notice Abstracts a communication channel that can receive and send messages.
 * @dev Implement this interface to integrate any messaging platform (Discord, Slack, etc.).
 */
export interface IChannel {
    /** @notice Establishes the connection to the channel. */
    connect(): Promise<void>;

    /** @notice Tears down the connection to the channel. */
    disconnect(): Promise<void>;

    /**
     * @notice Registers a handler invoked for every incoming message.
     * @param handler Async function that receives a message and returns a reply string.
     */
    onMessage(handler: (msg: IChannelMessage) => Promise<string>): void;

    /**
     * @notice Proactively sends a message to the configured channel.
     * @param msg The text to send.
     */
    send(msg: string): Promise<void>;
}
