# @i-clavdivs/discord

Discord channel plugin for i-clavdivs, enabling AI agent integration with Discord through real-time event-based messaging.

## Features

- **Multi-account support**: Manage multiple Discord bot accounts simultaneously
- **Real-time events**: Instant message delivery via Discord Gateway WebSocket
- **Rich capabilities**: Support for embeds, reactions, threads, polls, and more
- **Flexible filtering**: Configure allowed channels and users per account
- **Mention control**: Require @mention in public channels while responding freely in DMs
- **Thread support**: Maintain context in Discord threads
- **Media support**: Send and receive images, files, and other media

## Installation

```bash
pnpm add @i-clavdivs/discord
```

## Configuration

### Single Account Mode

```typescript
{
  discord: {
    enabled: true,
    botToken: "your-bot-token",
    requireMention: true,           // Require @mention in channels
    allowedChannels: [],            // Empty = all channels allowed
    allowedUsers: []                // Empty = all users allowed
  }
}
```

### Multi-Account Mode

```typescript
{
  discord: {
    enabled: true,
    accounts: [
      {
        id: "bot-1",
        botToken: "token-1",
        requireMention: true,
        allowedChannels: ["channel-id-1", "channel-id-2"],
        allowedUsers: [],
        enabled: true
      },
      {
        id: "bot-2",
        botToken: "token-2",
        requireMention: false,
        allowedChannels: [],
        allowedUsers: ["user-id-1"],
        enabled: true
      }
    ]
  }
}
```

## Getting Discord Bot Token

1. **Create a Discord Application**:
   - Go to https://discord.com/developers/applications
   - Click "New Application"
   - Give it a name and create

2. **Create a Bot**:
   - Navigate to the "Bot" section
   - Click "Add Bot"
   - Copy the bot token (keep it secret!)

3. **Configure Bot Permissions**:
   - Under "Privileged Gateway Intents", enable:
     - Message Content Intent (required to read messages)
     - Server Members Intent (optional, for member info)
   - Under "Bot Permissions", select:
     - Read Messages/View Channels
     - Send Messages
     - Send Messages in Threads
     - Embed Links
     - Attach Files
     - Read Message History
     - Add Reactions

4. **Invite Bot to Server**:
   - Go to OAuth2 → URL Generator
   - Select scopes: `bot`
   - Select permissions (same as above)
   - Copy the generated URL and open in browser
   - Select your server and authorize

## Usage

### Plugin Registration

```typescript
import { discordPlugin } from '@i-clavdivs/discord';
import { PluginManager } from '@i-clavdivs/plugins';

const pluginManager = new PluginManager();
pluginManager.registerPlugin(discordPlugin);
```

### Sending Messages

```typescript
// Reply to a message (uses reply feature)
await gateway.sendMessage('channel-id:message-id', 'Hello!');

// Send to a channel
await gateway.sendMessage('channel-id', 'Hello channel!');

// Send to a DM
await gateway.sendMessage('user-id', 'Hello user!');

// Send to a thread
await gateway.sendMessage('thread-id', 'Hello thread!');

// Multi-account: specify account
await gateway.sendMessage('bot-1:channel-id', 'Hello from bot-1!');
```

## Features

### Message Filtering

- **Channel filtering**: Only respond in whitelisted channels
- **User filtering**: Only respond to whitelisted users
- **Mention requirement**: Require @mention in public channels
- **DM handling**: Always respond in DMs regardless of mention setting

### Media Support

- Send images, files, and other attachments
- Receive and process uploaded media
- Support for embeds with rich formatting

### Thread Support

- Automatic thread detection
- Maintain conversation context in threads
- Create and manage threads

### Reactions

- Add emoji reactions to messages
- Listen for reaction events

## Architecture

```
packages/discord/
├── src/
│   ├── config/
│   │   └── discord-config.ts     # Configuration types and normalization
│   ├── gateway/
│   │   ├── discord-gateway.ts    # Main gateway with Discord.js integration
│   │   └── message-handler.ts    # Message filtering and processing
│   ├── plugin.ts                 # Plugin definition
│   └── index.ts                  # Public exports
├── tests/
│   └── discord.test.ts
└── package.json
```

## Development

```bash
# Build the package
pnpm build

# Run tests
pnpm test

# Watch mode for development
pnpm dev

# Type checking
pnpm typecheck
```

## Rate Limits

Discord has rate limits that vary by endpoint:

- **Messages**: 5 requests per 5 seconds per channel
- **Reactions**: 1 request per 0.25 seconds
- **Global**: 50 requests per second per account

The Discord.js library handles rate limiting automatically with request queuing.

## Troubleshooting

### "No Discord accounts configured"

- Ensure `botToken` is provided in config
- Check that `enabled: true` is set

### Bot doesn't respond to messages

- Verify "Message Content Intent" is enabled in Discord Developer Portal
- Check `requireMention` setting - bot may need @mention
- Verify `allowedChannels` and `allowedUsers` filters
- Check bot has "Read Messages" and "Send Messages" permissions

### Bot disconnects frequently

- Check network connection stability
- Verify token is valid and not expired
- Check Discord API status: https://discordstatus.com

### "Missing Permissions" errors

- Verify bot has necessary permissions in the server
- Check channel-specific permission overrides
- Ensure bot role is positioned correctly in role hierarchy

## License

See root project license.
