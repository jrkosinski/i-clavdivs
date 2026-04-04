# @i-clavdivs/agent

Agent execution engine for session management and LLM execution loop in i-clavdivs.

## Overview

This package provides the core agent execution engine that:

- **Manages conversation sessions**: Persists message history to disk
- **Executes LLM turns**: Handles completion requests with streaming support
- **Builds system prompts**: Integrates workspace files (SOUL.md, TOOLS.md, etc.)
- **Handles concurrency**: Queues overlapping requests per session
- **Truncates history**: Keeps conversation history within limits

## Features

- **Session persistence**: Automatic save/load of conversation history
- **Streaming support**: Real-time text streaming via callback
- **Workspace integration**: Includes workspace files in system prompt
- **History management**: Automatic truncation to prevent context overflow
- **Concurrent safety**: Prevents race conditions with per-session queuing
- **Structured logging**: Debug logs for troubleshooting

## Installation

```bash
pnpm add @i-clavdivs/agent
```

## Core Components

### Agent

The main execution engine that orchestrates LLM completions:

```typescript
import { Agent } from '@i-clavdivs/agent';

const agent = new Agent({
    id: 'my-agent', // Required: unique agent identifier
    name: 'My Assistant', // Optional: human-readable name
    model: 'claude-sonnet-4-5-20250929', // Optional: default model
    provider: 'anthropic', // Optional: default provider
    workspaceDir: '/path/to/workspace', // Optional: agent's workspace
    maxHistoryMessages: 40,
    sessionDir: '~/.i-clavdivs/sessions',
    onChunk: (text) => process.stdout.write(text),
    workspaceFiles: [], // SOUL.md, TOOLS.md, etc.
    extraSystemPrompt: 'Additional instructions...',
});

// Initialize the agent (required before use)
await agent.initialize();

// Simple execution using agent's defaults
const result = await agent.execute({
    sessionId: 'user-123',
    prompt: 'Hello, how are you?',
});

// Or use run() to override defaults
const result2 = await agent.run({
    sessionId: 'user-123',
    prompt: 'Hello, how are you?',
    model: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
});

// Cleanup when done
await agent.dispose();
```

### SessionStore

Manages conversation history persistence:

```typescript
import { SessionStore } from '@i-clavdivs/agent';

const store = new SessionStore('~/.i-clavdivs/sessions');

// Load conversation history
const messages = await store.load('session-123');

// Save conversation history
await store.save('session-123', messages);

// List all sessions
const sessions = await store.listSessions();

// Delete a session
await store.delete('session-123');
```

### SystemPrompt

Builds structured system prompts:

```typescript
import { SystemPrompt } from '@i-clavdivs/agent';

const prompt = SystemPrompt.build({
    workspaceDir: '~/.i-clavdivs/workspace',
    extraInstructions: 'Be concise and helpful.',
});
```

### Logger

Simple structured logging:

```typescript
import { log, Logger } from '@i-clavdivs/agent';

log.info('Agent started');
log.debug('Processing request', { sessionId: '123' });
log.error('Failed to load session', { error: err });

// Create custom logger
const customLog = new Logger({ level: 'debug', prefix: 'myapp' });
```

## Usage

### Basic Agent Execution

```typescript
import { Agent } from '@i-clavdivs/agent';

const agent = new Agent();

const result = await agent.run({
    sessionId: 'user-123',
    prompt: 'Write a function to reverse a string',
    model: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
});

console.log(result.response); // Agent's response
console.log(result.usage); // Token usage stats
```

### Streaming Responses

```typescript
const agent = new Agent({
    onChunk: (text) => {
        process.stdout.write(text);
    },
});

await agent.run({
    sessionId: 'user-123',
    prompt: 'Explain async/await in JavaScript',
    model: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
});
```

### With Workspace Files

```typescript
import { buildSystemPromptWithWorkspace } from '@i-clavdivs/workspace';

const workspaceFiles = await buildSystemPromptWithWorkspace('~/.i-clavdivs/workspace');

const agent = new Agent({
    workspaceFiles,
    extraSystemPrompt: 'Focus on TypeScript best practices.',
});

await agent.run({
    sessionId: 'dev-session',
    prompt: 'Review this code...',
    model: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
});
```

### Managing Sessions

```typescript
const store = new SessionStore();

// List all sessions
const sessions = await store.listSessions();
console.log(`Found ${sessions.length} sessions`);

// Load specific session
const messages = await store.load('user-123');
console.log(`Session has ${messages.length} messages`);

// Delete old session
await store.delete('old-session-456');
```

## Configuration

### Agent Options

```typescript
interface IAgentConfig {
    maxHistoryMessages?: number; // Default: 40
    sessionDir?: string; // Default: ~/.i-clavdivs/sessions
    onChunk?: (chunk: string) => void;
    extraSystemPrompt?: string;
    workspaceFiles?: IWorkspaceFile[];
}
```

### Request Parameters

```typescript
interface IAgentRequest {
    sessionId: string; // Unique session identifier
    prompt: string; // User's message
    model: string; // Model ID (e.g., 'claude-sonnet-4-5-20250929')
    provider: string; // Provider name (e.g., 'anthropic')
    temperature?: number; // 0.0 - 1.0
    maxTokens?: number;
}
```

### Response Structure

```typescript
interface IAgentRunResult {
    response: string; // Agent's text response
    usage: {
        inputTokens: number;
        outputTokens: number;
        cacheReadTokens?: number;
        cacheWriteTokens?: number;
    };
    finishReason: string; // 'end_turn', 'max_tokens', etc.
    duration: number; // Milliseconds
}
```

## Session Management

### Session Storage

Sessions are stored as JSON files in the session directory:

```
~/.i-clavdivs/sessions/
├── user-123.json
├── dev-session.json
└── support-456.json
```

Each session file contains:

```json
{
    "sessionId": "user-123",
    "messages": [
        { "role": "user", "content": "Hello" },
        { "role": "assistant", "content": "Hi! How can I help?" },
        { "role": "user", "content": "Tell me about TypeScript" }
    ],
    "createdAt": "2025-03-01T12:00:00Z",
    "updatedAt": "2025-03-01T12:05:00Z"
}
```

### History Truncation

When `maxHistoryMessages` is exceeded, the oldest messages are removed:

```typescript
const agent = new Agent({
    maxHistoryMessages: 20, // Keep only last 20 messages
});

// After many turns, only the most recent 20 messages are retained
```

**Note**: System prompts are never truncated, only user/assistant messages.

## Concurrency Handling

The agent prevents race conditions by queuing requests per session:

```typescript
// Multiple concurrent requests for the same session
const [result1, result2, result3] = await Promise.all([
    agent.run({ sessionId: 'user-123', prompt: 'Question 1' }),
    agent.run({ sessionId: 'user-123', prompt: 'Question 2' }),
    agent.run({ sessionId: 'user-123', prompt: 'Question 3' }),
]);

// Requests are executed sequentially per session
// Different sessions can run in parallel
```

## Integration with Workspace Files

The agent integrates with [@i-clavdivs/workspace](../workspace/README.md) to include:

- **SOUL.md** - Agent personality and behavior
- **IDENTITY.md** - Agent identity and purpose
- **USER.md** - User preferences and context
- **TOOLS.md** - Available tools and capabilities
- **MEMORY.md** - Persistent knowledge
- **BOOTSTRAP.md** - Initialization instructions
- **HEARTBEAT.md** - Periodic reminders

These files are automatically included in the system prompt.

## Environment Variables

The agent respects these environment variables:

- `ANTHROPIC_API_KEY` - Required for Anthropic provider
- `OPENAI_API_KEY` - Required for OpenAI provider (future)
- `I_CLAVDIVS_SESSION_DIR` - Override default session directory
- `I_CLAVDIVS_WORKSPACE_DIR` - Override default workspace directory

## Error Handling

The agent handles common errors:

```typescript
try {
    const result = await agent.run(request);
} catch (error) {
    if (error.code === 'ENOENT') {
        // Session file not found
    } else if (error.status === 401) {
        // Invalid API key
    } else if (error.status === 429) {
        // Rate limited
    } else if (error.status === 500) {
        // Provider error
    }
}
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

## Related Packages

- [@i-clavdivs/agents](../agents/README.md) - Agent orchestration layer (deprecated, functionality moved to this package)
- [@i-clavdivs/models](../models/README.md) - LLM provider implementations
- [@i-clavdivs/workspace](../workspace/README.md) - Workspace file management

## License

See root project license.
