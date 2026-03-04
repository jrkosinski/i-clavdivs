# Discord Bot Integration

This guide explains how to set up and use the Discord bot integration in i-clavdivs v0.1.

## Overview

The Discord integration allows i-clavdivs to respond to messages in Discord channels and direct messages. It supports:

- ✅ Multi-account Discord bots
- ✅ Channel and user allowlisting
- ✅ Mention requirements for guild channels
- ✅ Direct message support
- ✅ Long message splitting (2000 char limit)
- ✅ Typing indicators
- ✅ Per-channel conversation sessions

## Setup

### 1. Create a Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" tab and click "Add Bot"
4. Copy the bot token (you'll need this for configuration)
5. Enable the following intents:
    - Server Members Intent
    - Message Content Intent

### 2. Invite the Bot to Your Server

1. Go to the "OAuth2" → "URL Generator" tab
2. Select scopes:
    - `bot`
3. Select bot permissions:
    - Read Messages/View Channels
    - Send Messages
    - Read Message History
    - Add Reactions
4. Copy the generated URL and open it in your browser
5. Select the server to invite the bot to

### 3. Configure i-clavdivs

You can configure Discord in two ways:

#### Option A: Using a Config File

Create a `config/default.json` file:

```json
{
    "channels": {
        "discord": {
            "enabled": true,
            "token": "your-discord-bot-token",
            "requireMention": true,
            "allowedChannels": ["1234567890", "0987654321"],
            "allowedUsers": []
        }
    }
}
```

#### Option B: Using Environment Variables

Create a `.env` file:

```bash
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_REQUIRE_MENTION=true
DISCORD_ALLOWED_CHANNELS=channel1,channel2,channel3
```

### 4. Run in Daemon Mode

Start the bot to listen for Discord messages:

```bash
pnpm build
node apps/cli/dist/index.js
```

Or in development:

```bash
pnpm dev  # in one terminal
node apps/cli/dist/index.js  # in another terminal
```

The bot will now respond to messages in the configured channels!

## Multi-Account Setup

To run multiple Discord bots simultaneously:

### Config File Approach

```json
{
    "channels": {
        "discord": {
            "enabled": true,
            "accounts": [
                {
                    "id": "bot1",
                    "token": "first-bot-token",
                    "requireMention": true,
                    "allowedChannels": ["1234567890"]
                },
                {
                    "id": "bot2",
                    "token": "second-bot-token",
                    "requireMention": false,
                    "allowedChannels": ["5555555555"]
                }
            ]
        }
    }
}
```

### Environment Variable Approach

```bash
DISCORD_ACCOUNTS=bot1,bot2
DISCORD_BOT1_TOKEN=first-bot-token
DISCORD_BOT1_ALLOWED_CHANNELS=channel1,channel2
DISCORD_BOT2_TOKEN=second-bot-token
DISCORD_BOT2_ALLOWED_CHANNELS=channel3
```

## Configuration Options

### Discord Config

| Option            | Type     | Description                                |
| ----------------- | -------- | ------------------------------------------ |
| `enabled`         | boolean  | Whether Discord integration is enabled     |
| `token`           | string   | Discord bot token (single-account mode)    |
| `requireMention`  | boolean  | Require bot mention in guild channels      |
| `allowedChannels` | string[] | Allowed channel IDs (empty = all channels) |
| `allowedUsers`    | string[] | Allowed user IDs (empty = all users)       |
| `accounts`        | array    | Multi-account configuration (see below)    |

### Account Config (Multi-Account Mode)

| Option            | Type     | Description                                     |
| ----------------- | -------- | ----------------------------------------------- |
| `id`              | string   | Unique identifier for this account              |
| `token`           | string   | Discord bot token                               |
| `enabled`         | boolean  | Whether this account is enabled (default: true) |
| `requireMention`  | boolean  | Require bot mention in guild channels           |
| `allowedChannels` | string[] | Allowed channel IDs for this account            |
| `allowedUsers`    | string[] | Allowed user IDs for this account               |

## Usage

### In Discord Channels

If `requireMention` is true, you must mention the bot:

```
@BotName what is TypeScript?
```

If `requireMention` is false, the bot responds to all messages in allowed channels:

```
what is TypeScript?
```

### In Direct Messages

The bot always responds to DMs (if the user is in the allowlist or allowlist is empty):

```
hello!
```

### Long Responses

The bot automatically splits responses longer than 2000 characters across multiple messages, attempting to split at natural boundaries (newlines or spaces).

## How It Works

1. **Plugin System**: Discord is implemented as a channel plugin that can be loaded/unloaded
2. **Gateway Pattern**: Each Discord account gets its own client gateway
3. **Message Routing**: Messages are routed to the agent runner with session management
4. **Session IDs**: Each Discord channel/DM gets a unique session ID for conversation context

## Troubleshooting

### Bot doesn't respond

- Check that `DISCORD_BOT_TOKEN` is set correctly
- Verify the bot has Message Content Intent enabled
- Check channel ID is in `allowedChannels` (if configured)
- If `requireMention` is true, make sure you're mentioning the bot

### "Missing Permissions" error

Make sure the bot has these permissions in the channel:

- View Channel
- Send Messages
- Read Message History

### Module resolution errors during build

Run:

```bash
pnpm install
pnpm build
```

## Next Steps

- Add more channel plugins (Slack, Telegram, etc.)
- Implement Discord slash commands
- Add rich embeds and interactive components
- Support voice channels

## Questions?

Check out the main project README or open an issue on GitHub.
