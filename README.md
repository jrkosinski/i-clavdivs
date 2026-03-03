# i-clavdivs

A pnpm workspace monorepo.

## Structure

```
i-clavdivs/
├── apps/           # Applications (web apps, services, etc.)
├── packages/       # Shared packages and libraries
├── package.json    # Root package configuration
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Installation

```bash
pnpm install
```

### Configuration

i-clavdivs uses a hybrid configuration approach:

- **Environment variables** for secrets (API keys, tokens)
- **Config files** for settings and preferences

#### 1. Set up environment variables

Copy the example file and add your credentials:

```bash
cp .env.example .env
# Edit .env and add your DISCORD_BOT_TOKEN and ANTHROPIC_API_KEY
```

**Required:**

- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `DISCORD_BOT_TOKEN` - Your Discord bot token from https://discord.com/developers/applications

**Optional** (configure in `config/default.json` instead):

- `DISCORD_REQUIRE_MENTION` - Require @mention in channels
- `DISCORD_ALLOWED_CHANNELS` - Comma-separated Discord channel IDs
- `DISCORD_ALLOWED_USERS` - Comma-separated Discord user IDs

#### 2. Configure settings in config/default.json

Edit `config/default.json` for behavior settings:

```json
{
    "channels": {
        "discord": {
            "enabled": true,
            "requireMention": true,
            "allowedChannels": [],
            "allowedUsers": []
        }
    }
}
```

**Tips:**

- Empty arrays (`[]`) mean "allow all"
- Get Discord IDs: Enable Developer Mode in Discord, right-click → Copy ID
- Config file settings are overridden by environment variables if both are set

### Development

```bash
# Build all packages
pnpm build

# Run tests
pnpm test

# Lint all packages
pnpm lint

# Format code
pnpm format
```

### Running the Discord Bot

After configuration, start the Discord bot daemon:

```bash
cd apps/cli
pnpm daemon
```

The bot will:

- Connect to Discord and listen for messages
- Print a heartbeat every 60 seconds to show it's alive
- Show detailed logs when messages are received
- Require @mention if `requireMention: true` is set

**To send a message to the bot:**

- In Discord channels: `@i-clavdivs your message here`
- In DMs: Just send your message directly

Press `Ctrl+C` to stop the daemon.

### Workspace Commands

```bash
# Add a dependency to a specific package
pnpm --filter <package-name> add <dependency>

# Run a command in a specific package
pnpm --filter <package-name> <command>

# Run a command in all packages
pnpm -r <command>
```

## Adding New Packages

To add a new package to the workspace:

1. Create a new directory in `packages/` or `apps/`
2. Add a `package.json` file with a unique name
3. The package will automatically be part of the workspace

Example package structure:

```
packages/my-package/
├── src/
│   └── index.ts
├── package.json
└── tsconfig.json
```

## License

MIT
