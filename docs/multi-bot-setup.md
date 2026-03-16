# Multi-Bot Setup Guide

This guide explains how to run multiple Discord bots, each with its own personality (SOUL.md) and configuration.

## Overview

The system now supports running multiple Discord bot accounts simultaneously, where each bot can have:
- Its own bot token
- Its own allowed channels and users
- Its own workspace directory with unique SOUL.md and other personality files
- Its own agent runner instance

## Configuration Methods

### Method 1: Environment Variables (Recommended for Multiple Bots)

Create a `.env` file in the project root:

```bash
# List all bot account IDs (comma-separated)
DISCORD_ACCOUNTS=clavdivs,aurelius

# First bot: Clavdivs (technical expert)
DISCORD_CLAVDIVS_TOKEN=your_first_bot_token_here
DISCORD_CLAVDIVS_ALLOWED_CHANNELS=channel_id_1,channel_id_2
DISCORD_CLAVDIVS_REQUIRE_MENTION=false
DISCORD_CLAVDIVS_WORKSPACE_DIR=/home/user/.i-clavdivs/clavdivs-workspace

# Second bot: Aurelius (philosophical guide)
DISCORD_AURELIUS_TOKEN=your_second_bot_token_here
DISCORD_AURELIUS_ALLOWED_CHANNELS=channel_id_3,channel_id_4
DISCORD_AURELIUS_REQUIRE_MENTION=true
DISCORD_AURELIUS_WORKSPACE_DIR=/home/user/.i-clavdivs/aurelius-workspace
```

### Method 2: JSON Configuration

Edit `config/default.json`:

```json
{
    "channels": {
        "discord": {
            "enabled": true,
            "accounts": [
                {
                    "id": "clavdivs",
                    "token": "${DISCORD_CLAVDIVS_TOKEN}",
                    "allowedChannels": ["channel_id_1", "channel_id_2"],
                    "requireMention": false,
                    "workspaceDir": "~/.i-clavdivs/clavdivs-workspace"
                },
                {
                    "id": "aurelius",
                    "token": "${DISCORD_AURELIUS_TOKEN}",
                    "allowedChannels": ["channel_id_3", "channel_id_4"],
                    "requireMention": true,
                    "workspaceDir": "~/.i-clavdivs/aurelius-workspace"
                }
            ]
        }
    },
    "agent": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-5-20250929"
    }
}
```

## Setting Up Workspace Directories

Each bot needs its own workspace directory with personality files:

### 1. Create Workspace Directories

```bash
# Create directories for each bot
mkdir -p ~/.i-clavdivs/clavdivs-workspace
mkdir -p ~/.i-clavdivs/aurelius-workspace
```

### 2. Create Personality Files

**For Clavdivs** (`~/.i-clavdivs/clavdivs-workspace/SOUL.md`):

```markdown
# Agent Soul

You are **Clavdivs**, a sophisticated AI assistant with a classical Roman sensibility and modern technical expertise.

## Personality

- **Tone**: Professional yet approachable, with subtle wit and classical references
- **Communication style**: Clear, concise, and articulate
- **Approach**: Methodical and systematic
- **Values**: Precision, reliability, and continuous improvement

## Expertise

- Software engineering and system architecture
- TypeScript/JavaScript development
- Discord bot development
```

**For Aurelius** (`~/.i-clavdivs/aurelius-workspace/SOUL.md`):

```markdown
# Agent Soul

You are **Aurelius**, a philosophical guide inspired by Marcus Aurelius, blending Stoic wisdom with modern understanding.

## Personality

- **Tone**: Calm, thoughtful, and reflective
- **Communication style**: Measured and contemplative, with philosophical insights
- **Approach**: Stoic principles applied to modern challenges
- **Values**: Wisdom, virtue, and inner peace

## Expertise

- Philosophical guidance and life advice
- Stoic principles and practices
- Mindfulness and self-improvement
```

### 3. Optional: Add Other Workspace Files

You can also create additional files in each workspace:

- `IDENTITY.md` - Bot's core identity and backstory
- `TOOLS.md` - Available tools and capabilities
- `USER.md` - Information about the user
- `MEMORY.md` - Long-term memory and context
- `HEARTBEAT.md` - Periodic check-in behavior

## Running Multiple Bots

### Start as Daemon

```bash
pnpm run daemon
# or
./apps/cli/start-daemon.sh
```

The system will:
1. Load configuration from `.env` and `config/default.json`
2. Create a separate AgentRunner for each bot account
3. Load workspace files from each bot's workspace directory
4. Connect each bot to Discord with its own token
5. Listen for messages on all configured channels

### Console Output

You'll see output like:

```
[Discord:clavdivs] Bot logged in as Clavdivs#1234
[Discord:clavdivs] Listening on 5 servers
[Discord:clavdivs] Configuration: requireMention=false, allowedChannels=2, allowedUsers=all
[Discord:clavdivs] Workspace: /home/user/.i-clavdivs/clavdivs-workspace

[Discord:aurelius] Bot logged in as Aurelius#5678
[Discord:aurelius] Listening on 3 servers
[Discord:aurelius] Configuration: requireMention=true, allowedChannels=2, allowedUsers=all
[Discord:aurelius] Workspace: /home/user/.i-clavdivs/aurelius-workspace

i-clavdivs is running in daemon mode. Press Ctrl+C to stop.
Listening for messages on configured channels...
```

## Architecture Changes

### Key Components Modified

1. **IDiscordAccountConfig** (`packages/discord/src/config/discord-config.ts`)
   - Added `workspaceDir?: string` field

2. **DiscordGateway** (`packages/discord/src/gateway/discord-gateway.ts`)
   - Modified to create a separate `AgentRunner` for each account
   - Each runner loads workspace files from its account's workspace directory
   - Updated `_processWithAgent` to use account-specific runner

3. **ConfigLoader** (`packages/plugins/src/utils/config-loader.ts`)
   - Added support for `DISCORD_<ACCOUNT>_WORKSPACE_DIR` environment variable

### How It Works

1. When `DiscordGateway.start()` is called, it normalizes the config into account configs
2. For each account, `_startAccount()` is called which:
   - Creates a dedicated `AgentRunner` with account-specific workspace files
   - Sets up Discord client with event handlers
   - Stores the client, handler, and runner together
3. When a message arrives:
   - The gateway finds the correct account's runner
   - Passes the message to that specific runner
   - The runner uses its loaded workspace files (SOUL.md, etc.)

## Testing Your Setup

1. **Verify configuration**:
   ```bash
   # Check your .env file has all required tokens and paths
   cat .env
   ```

2. **Verify workspace files exist**:
   ```bash
   ls -la ~/.i-clavdivs/clavdivs-workspace/
   ls -la ~/.i-clavdivs/aurelius-workspace/
   ```

3. **Start the daemon**:
   ```bash
   pnpm run daemon
   ```

4. **Test each bot** by sending messages in their configured channels

## Troubleshooting

### Bot doesn't respond
- Check that the bot token is correct
- Verify the bot has permissions in the channel
- Check `requireMention` setting if in guild channels
- Verify `allowedChannels` includes the channel you're testing in

### Wrong personality
- Verify `workspaceDir` is set correctly for each account
- Check that SOUL.md exists in the workspace directory
- Review console output to see which workspace is loaded

### Both bots have the same personality
- Make sure each account has a unique `workspaceDir` configured
- Verify the workspace directories contain different SOUL.md files
- Check that you're not using the deprecated single-account setup

## Migration from Single Bot

If you're migrating from a single bot setup:

1. Create a second workspace directory
2. Add the new bot configuration to your `.env` or `config/default.json`
3. Specify `workspaceDir` for BOTH bots (including your existing one)
4. Restart the daemon

Your existing bot will continue working, and the new bot will start alongside it.
