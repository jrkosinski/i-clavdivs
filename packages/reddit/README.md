# @i-clavdivs/reddit

Reddit channel plugin for i-clavdivs, enabling AI agent integration with Reddit through polling-based message monitoring.

## Features

- **Multi-account support**: Manage multiple Reddit bot accounts simultaneously
- **Flexible monitoring**: Monitor mentions, DMs, comment replies, post replies, and specific subreddits
- **OAuth authentication**: Secure authentication using Reddit OAuth2
- **Automatic token refresh**: Handles token renewal automatically via snoowrap
- **User filtering**: Configurable allowlists for user access control
- **Polling-based**: Configurable polling intervals to stay within Reddit API rate limits
- **Message splitting**: Automatically splits long responses to respect Reddit's character limits

## Installation

```bash
pnpm add @i-clavdivs/reddit
```

## Configuration

### Single Account Mode

```typescript
{
  reddit: {
    enabled: true,
    clientId: "your-reddit-client-id",
    clientSecret: "your-reddit-client-secret",
    refreshToken: "your-reddit-refresh-token",
    username: "your-bot-username",
    userAgent: "i-clavdivs-bot/1.0 by /u/your-username",

    // Optional monitoring settings
    monitorMentions: true,           // Monitor username mentions
    monitorDirectMessages: true,     // Monitor private messages
    monitorCommentReplies: true,     // Monitor replies to bot comments
    monitorPostReplies: false,       // Monitor replies to bot posts

    // Optional subreddit monitoring
    subreddits: ["test", "botdevelopment"],

    // Optional user filtering
    allowedUsers: ["user1", "user2"], // Empty = all users allowed

    // Optional polling interval (milliseconds)
    pollingInterval: 60000  // Default: 60 seconds (60000ms)
  }
}
```

### Multi-Account Mode

```typescript
{
  reddit: {
    enabled: true,
    accounts: [
      {
        id: "bot-account-1",
        clientId: "client-id-1",
        clientSecret: "client-secret-1",
        refreshToken: "refresh-token-1",
        username: "bot1",
        userAgent: "bot1/1.0",
        enabled: true,
        subreddits: ["subreddit1"],
        monitorMentions: true,
        monitorDirectMessages: true,
        pollingInterval: 60000
      },
      {
        id: "bot-account-2",
        clientId: "client-id-2",
        clientSecret: "client-secret-2",
        refreshToken: "refresh-token-2",
        username: "bot2",
        userAgent: "bot2/1.0",
        enabled: true,
        subreddits: ["subreddit2"],
        monitorMentions: true,
        monitorDirectMessages: false,
        pollingInterval: 90000
      }
    ]
  }
}
```

## Getting Reddit API Credentials

1. **Create a Reddit App**:
    - Go to https://www.reddit.com/prefs/apps
    - Click "create app" or "create another app"
    - Choose "script" as the app type
    - Fill in the required fields
    - Note your `clientId` (under the app name) and `clientSecret`

2. **Get a Refresh Token**:
    - Use a tool like [reddit-oauth-helper](https://not-an-aardvark.github.io/reddit-oauth-helper/)
    - Or use OAuth2 flow to get a refresh token programmatically
    - Store the refresh token securely

3. **Set User Agent**:
    - Format: `platform:app-name:version (by /u/your-username)`
    - Example: `linux:i-clavdivs-bot:1.0.0 (by /u/mybotaccount)`

## Usage

### Plugin Registration

```typescript
import { redditPlugin } from '@i-clavdivs/reddit';
import { PluginManager } from '@i-clavdivs/plugins';

const pluginManager = new PluginManager();
pluginManager.registerPlugin(redditPlugin);
```

### Sending Messages

The gateway's `sendMessage` method supports these target formats:

```typescript
// Reply to a comment (using default account)
await gateway.sendMessage('comment:abc123xyz', 'Hello from the bot!');

// Send a private message (using default account)
await gateway.sendMessage('pm:username', 'Hello user!');

// Reply to a comment (using specific account)
await gateway.sendMessage('bot-account-1:comment:abc123xyz', 'Hello!');

// Send a private message (using specific account)
await gateway.sendMessage('bot-account-2:pm:username', 'Hello!');
```

## Rate Limiting

Reddit's API has rate limits of approximately **60 requests per minute**. The plugin respects these limits by:

- Using a configurable polling interval (default: 60 seconds)
- Configuring snoowrap with a 1-second request delay
- Enabling automatic rate limit error handling

**Recommended polling intervals**:

- Single account, minimal monitoring: 30-60 seconds
- Single account, extensive monitoring: 60-120 seconds
- Multiple accounts: 60-90 seconds per account

## Message Types

The plugin can monitor several types of Reddit content:

| Type               | Description                            | Config Option           |
| ------------------ | -------------------------------------- | ----------------------- |
| Mentions           | Username mentions (e.g., `/u/botname`) | `monitorMentions`       |
| Direct Messages    | Private messages sent to the bot       | `monitorDirectMessages` |
| Comment Replies    | Replies to bot's comments              | `monitorCommentReplies` |
| Post Replies       | Replies to bot's posts                 | `monitorPostReplies`    |
| Subreddit Comments | New comments in monitored subreddits   | `subreddits` array      |

## Architecture

```
packages/reddit/
├── src/
│   ├── config/
│   │   └── reddit-config.ts      # Configuration types and normalization
│   ├── gateway/
│   │   ├── reddit-gateway.ts     # Main gateway with polling logic
│   │   └── message-handler.ts    # Message filtering and processing
│   ├── plugin.ts                 # Plugin definition
│   └── index.ts                  # Public exports
├── tests/
│   ├── reddit-config.test.ts
│   └── plugin.test.ts
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

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch
```

## Limitations

- **Polling-based**: Not real-time; depends on polling interval
- **Rate limits**: Subject to Reddit's 60 req/min limit
- **No media**: Currently doesn't support image/video uploads
- **No reactions**: Reddit doesn't have native reactions/emoji responses
- **Character limits**: Reddit comments limited to 10,000 characters (handled via message splitting)

## Troubleshooting

### "No Reddit accounts configured"

- Ensure `clientId`, `clientSecret`, and `refreshToken` are provided
- Check that `enabled: true` in config

### Rate limit errors

- Increase `pollingInterval` to reduce request frequency
- Reduce number of monitored sources (mentions, DMs, subreddits)

### Messages not being processed

- Verify `allowedUsers` isn't blocking users
- Check polling interval isn't too long
- Ensure monitoring flags are enabled (`monitorMentions`, etc.)

### Authentication errors

- Verify OAuth credentials are correct
- Check refresh token hasn't expired
- Ensure user agent follows Reddit's format requirements

## License

See root project license.
