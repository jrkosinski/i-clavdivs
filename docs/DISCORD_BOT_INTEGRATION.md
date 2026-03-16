# Discord Bot Integration - Full Implementation Plan

## Overview

This document outlines the full approach to adding Discord bot capabilities to i-clavdivs v0.1, following the plugin/extension architecture pattern from v0.0 (openclaw).

## Architecture Goals

1. **Plugin-based architecture** - Discord as a pluggable channel extension
2. **Reusable plugin system** - Support future channels (Slack, Telegram, etc.)
3. **Clean separation** - Core runner remains channel-agnostic
4. **Configuration-driven** - Enable/disable channels via config

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                         CLI/Runner                       │
│  - Loads plugins                                         │
│  - Starts enabled channel gateways                       │
│  - Manages agent execution loop                          │
└─────────────────────────────────────────────────────────┘
                           │
                           ├─────────────────────────┐
                           ▼                         ▼
              ┌─────────────────────┐   ┌─────────────────────┐
              │   Plugin System     │   │   AgentRunner       │
              │  - Registry         │   │  - Session mgmt     │
              │  - Loader           │   │  - LLM execution    │
              │  - Lifecycle        │   │  - Skill routing    │
              └─────────────────────┘   └─────────────────────┘
                           │
                           ▼
              ┌─────────────────────────────────┐
              │    Discord Plugin/Extension     │
              │  - Channel registration         │
              │  - Gateway (message listener)   │
              │  - Message routing              │
              │  - Response handling            │
              └─────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────────────┐
              │         Discord API             │
              │       (via discord.js)          │
              └─────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Plugin System Foundation (1-2 days)

Create the core plugin infrastructure that will support Discord and future extensions.

#### 1.1 Create Plugin Package Structure

```
packages/plugins/
├── src/
│   ├── index.ts                 # Main exports
│   ├── types/
│   │   ├── index.ts            # Plugin type definitions
│   │   ├── plugin.ts           # Plugin interface
│   │   ├── channel-plugin.ts   # Channel-specific plugin interface
│   │   └── plugin-api.ts       # Plugin API interface
│   ├── core/
│   │   ├── plugin-registry.ts  # Plugin registration & lookup
│   │   ├── plugin-loader.ts    # Plugin discovery & loading
│   │   └── plugin-manager.ts   # Plugin lifecycle management
│   └── utils/
│       ├── validation.ts       # Plugin validation utilities
│       └── config.ts           # Plugin config helpers
├── tests/
│   └── plugin-registry.test.ts
├── package.json
└── tsconfig.json
```

#### 1.2 Core Plugin Types

**`packages/plugins/src/types/plugin.ts`**

```typescript
import type { PluginApi } from './plugin-api.js';

/**
 * Base plugin interface that all plugins must implement.
 */
export interface IPlugin {
    /**
     * Unique plugin identifier (e.g., 'discord', 'slack').
     */
    id: string;

    /**
     * Human-readable plugin name.
     */
    name: string;

    /**
     * Plugin description.
     */
    description: string;

    /**
     * Plugin version (semver).
     */
    version?: string;

    /**
     * Plugin initialization function.
     * Called when the plugin is loaded.
     */
    register(api: PluginApi): void | Promise<void>;

    /**
     * Optional cleanup function.
     * Called when the plugin is unloaded or app shuts down.
     */
    unregister?(): void | Promise<void>;
}

/**
 * Plugin metadata returned by the registry.
 */
export interface IPluginMetadata {
    id: string;
    name: string;
    description: string;
    version?: string;
    registered: boolean;
    initialized: boolean;
}
```

**`packages/plugins/src/types/channel-plugin.ts`**

```typescript
import type { IPlugin } from './plugin.js';
import type { IChannelCapabilities, IChannelMetadata } from '@i-clavdivs/channels';

/**
 * Message event received from a channel.
 */
export interface IChannelMessage {
    /**
     * Channel identifier (e.g., 'discord', 'slack').
     */
    channel: string;

    /**
     * Account ID for multi-account channels.
     */
    accountId?: string;

    /**
     * Unique message identifier.
     */
    messageId: string;

    /**
     * Conversation/thread identifier.
     */
    conversationId: string;

    /**
     * Message sender information.
     */
    from: {
        id: string;
        name?: string;
        username?: string;
    };

    /**
     * Message content/text.
     */
    content: string;

    /**
     * Chat type (direct, group, channel).
     */
    chatType: 'direct' | 'group' | 'channel';

    /**
     * Timestamp of message.
     */
    timestamp: Date;

    /**
     * Optional metadata (attachments, mentions, etc.).
     */
    metadata?: Record<string, unknown>;
}

/**
 * Channel gateway interface for message listening.
 */
export interface IChannelGateway {
    /**
     * Start listening for messages.
     */
    start(config: unknown): Promise<void>;

    /**
     * Stop listening for messages.
     */
    stop(): Promise<void>;

    /**
     * Current gateway status.
     */
    isRunning(): boolean;

    /**
     * Send a message to a channel.
     */
    sendMessage(to: string, content: string, options?: unknown): Promise<void>;
}

/**
 * Channel plugin extends base plugin with channel-specific features.
 */
export interface IChannelPlugin extends IPlugin {
    /**
     * Channel metadata.
     */
    channelMetadata: IChannelMetadata;

    /**
     * Channel capabilities.
     */
    capabilities: IChannelCapabilities;

    /**
     * Create a gateway instance for this channel.
     */
    createGateway(config: unknown): IChannelGateway;
}
```

**`packages/plugins/src/types/plugin-api.ts`**

```typescript
import type { AgentRunner } from '@i-clavdivs/runner';
import type { IChannelPlugin } from './channel-plugin.js';

/**
 * API provided to plugins during registration.
 */
export interface PluginApi {
    /**
     * Register a channel plugin.
     */
    registerChannel(plugin: IChannelPlugin): void;

    /**
     * Access to the agent runner for executing prompts.
     */
    runner: AgentRunner;

    /**
     * Configuration access.
     */
    getConfig(key: string): unknown;

    /**
     * Logging interface.
     */
    log: {
        info(message: string): void;
        warn(message: string): void;
        error(message: string): void;
        debug?(message: string): void;
    };
}
```

#### 1.3 Plugin Registry

**`packages/plugins/src/core/plugin-registry.ts`**

```typescript
import type { IPlugin, IPluginMetadata } from '../types/plugin.js';
import type { IChannelPlugin } from '../types/channel-plugin.js';

/**
 * Central registry for all plugins.
 */
export class PluginRegistry {
    private _plugins: Map<string, IPlugin>;
    private _channelPlugins: Map<string, IChannelPlugin>;
    private _initialized: Set<string>;

    constructor() {
        this._plugins = new Map();
        this._channelPlugins = new Map();
        this._initialized = new Set();
    }

    /**
     * Register a plugin.
     */
    register(plugin: IPlugin): void {
        if (this._plugins.has(plugin.id)) {
            throw new Error(`Plugin already registered: ${plugin.id}`);
        }
        this._plugins.set(plugin.id, plugin);
    }

    /**
     * Register a channel plugin.
     */
    registerChannel(plugin: IChannelPlugin): void {
        this.register(plugin);
        this._channelPlugins.set(plugin.id, plugin);
    }

    /**
     * Get a plugin by ID.
     */
    get(id: string): IPlugin | undefined {
        return this._plugins.get(id);
    }

    /**
     * Get a channel plugin by ID.
     */
    getChannel(id: string): IChannelPlugin | undefined {
        return this._channelPlugins.get(id);
    }

    /**
     * Check if a plugin is registered.
     */
    has(id: string): boolean {
        return this._plugins.has(id);
    }

    /**
     * List all registered plugins.
     */
    listAll(): IPluginMetadata[] {
        return Array.from(this._plugins.values()).map((plugin) => ({
            id: plugin.id,
            name: plugin.name,
            description: plugin.description,
            version: plugin.version,
            registered: true,
            initialized: this._initialized.has(plugin.id),
        }));
    }

    /**
     * List all channel plugins.
     */
    listChannels(): IChannelPlugin[] {
        return Array.from(this._channelPlugins.values());
    }

    /**
     * Mark a plugin as initialized.
     */
    markInitialized(id: string): void {
        this._initialized.add(id);
    }

    /**
     * Clear all plugins (for testing).
     */
    clear(): void {
        this._plugins.clear();
        this._channelPlugins.clear();
        this._initialized.clear();
    }
}

/**
 * Global plugin registry instance.
 */
let _globalRegistry: PluginRegistry | null = null;

/**
 * Get the global plugin registry.
 */
export function getGlobalPluginRegistry(): PluginRegistry {
    if (!_globalRegistry) {
        _globalRegistry = new PluginRegistry();
    }
    return _globalRegistry;
}

/**
 * Reset the global registry (for testing).
 */
export function resetGlobalPluginRegistry(): void {
    _globalRegistry = new PluginRegistry();
}
```

#### 1.4 Plugin Manager

**`packages/plugins/src/core/plugin-manager.ts`**

```typescript
import type { IPlugin } from '../types/plugin.js';
import type { IChannelPlugin, IChannelGateway } from '../types/channel-plugin.js';
import type { PluginApi } from '../types/plugin-api.js';
import type { AgentRunner } from '@i-clavdivs/runner';
import { getGlobalPluginRegistry } from './plugin-registry.js';

/**
 * Manages plugin lifecycle (initialization, starting gateways, cleanup).
 */
export class PluginManager {
    private _registry = getGlobalPluginRegistry();
    private _gateways: Map<string, IChannelGateway> = new Map();
    private _runner: AgentRunner;
    private _config: Record<string, unknown>;

    constructor(runner: AgentRunner, config: Record<string, unknown> = {}) {
        this._runner = runner;
        this._config = config;
    }

    /**
     * Initialize all registered plugins.
     */
    async initializeAll(): Promise<void> {
        const plugins = this._registry.listAll();
        for (const meta of plugins) {
            if (!meta.initialized) {
                const plugin = this._registry.get(meta.id);
                if (plugin) {
                    await this.initialize(plugin);
                }
            }
        }
    }

    /**
     * Initialize a single plugin.
     */
    async initialize(plugin: IPlugin): Promise<void> {
        const api = this._createPluginApi();
        await plugin.register(api);
        this._registry.markInitialized(plugin.id);
    }

    /**
     * Start all enabled channel gateways.
     */
    async startChannelGateways(): Promise<void> {
        const channels = this._registry.listChannels();
        for (const channel of channels) {
            const channelConfig = this._getChannelConfig(channel.id);
            if (channelConfig?.enabled) {
                await this.startGateway(channel, channelConfig);
            }
        }
    }

    /**
     * Start a specific channel gateway.
     */
    async startGateway(plugin: IChannelPlugin, config: unknown): Promise<void> {
        if (this._gateways.has(plugin.id)) {
            throw new Error(`Gateway already running: ${plugin.id}`);
        }

        const gateway = plugin.createGateway(config);
        this._gateways.set(plugin.id, gateway);
        await gateway.start(config);
    }

    /**
     * Stop all gateways.
     */
    async stopAll(): Promise<void> {
        for (const [id, gateway] of this._gateways.entries()) {
            await gateway.stop();
            this._gateways.delete(id);
        }
    }

    /**
     * Cleanup all plugins.
     */
    async cleanup(): Promise<void> {
        await this.stopAll();

        const plugins = this._registry.listAll();
        for (const meta of plugins) {
            const plugin = this._registry.get(meta.id);
            if (plugin?.unregister) {
                await plugin.unregister();
            }
        }
    }

    private _createPluginApi(): PluginApi {
        return {
            registerChannel: (plugin) => this._registry.registerChannel(plugin),
            runner: this._runner,
            getConfig: (key) => this._config[key],
            log: {
                info: (msg) => console.log(`[plugin] ${msg}`),
                warn: (msg) => console.warn(`[plugin] ${msg}`),
                error: (msg) => console.error(`[plugin] ${msg}`),
                debug: (msg) => console.debug(`[plugin] ${msg}`),
            },
        };
    }

    private _getChannelConfig(channelId: string): unknown {
        const channels = this._config.channels as Record<string, unknown> | undefined;
        return channels?.[channelId];
    }
}
```

#### 1.5 Plugin Package Configuration

**`packages/plugins/package.json`**

```json
{
    "name": "@i-clavdivs/plugins",
    "version": "0.0.0",
    "type": "module",
    "description": "Plugin system for extensible channel support",
    "main": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "import": "./dist/index.js",
            "default": "./dist/index.js"
        }
    },
    "scripts": {
        "build": "tsc -p tsconfig.json",
        "dev": "tsc -p tsconfig.json --watch",
        "clean": "rm -rf dist *.tsbuildinfo",
        "typecheck": "tsc --noEmit",
        "test": "vitest run",
        "test:watch": "vitest"
    },
    "dependencies": {
        "@i-clavdivs/common": "workspace:*",
        "@i-clavdivs/channels": "workspace:*",
        "@i-clavdivs/runner": "workspace:*"
    },
    "devDependencies": {
        "typescript": "^5.3.3",
        "vitest": "^4.0.18"
    }
}
```

---

### Phase 2: Discord Extension (2-3 days)

Build the Discord-specific plugin implementation.

#### 2.1 Discord Package Structure

```
packages/discord/
├── src/
│   ├── index.ts                    # Plugin export
│   ├── plugin.ts                   # Discord plugin definition
│   ├── gateway/
│   │   ├── discord-gateway.ts      # Main gateway implementation
│   │   ├── message-handler.ts      # Incoming message processing
│   │   └── event-router.ts         # Discord.js event routing
│   ├── client/
│   │   ├── discord-client.ts       # Discord.js client wrapper
│   │   └── connection-manager.ts   # Connection/reconnection logic
│   ├── config/
│   │   ├── discord-config.ts       # Configuration schema
│   │   └── validation.ts           # Config validation
│   └── utils/
│       ├── message-formatter.ts    # Format messages for Discord
│       └── permission-checker.ts   # Check bot permissions
├── tests/
│   └── gateway.test.ts
├── package.json
└── tsconfig.json
```

#### 2.2 Discord Plugin Definition

**`packages/discord/src/plugin.ts`**

```typescript
import type { IChannelPlugin, IChannelGateway } from '@i-clavdivs/plugins';
import type { IChannelCapabilities, IChannelMetadata } from '@i-clavdivs/channels';
import { DiscordGateway } from './gateway/discord-gateway.js';

export const discordPlugin: IChannelPlugin = {
    id: 'discord',
    name: 'Discord',
    description: 'Discord channel integration',
    version: '0.1.0',

    channelMetadata: {
        displayName: 'Discord',
        description: 'Discord messaging platform',
        iconUrl: 'https://discord.com/assets/icon.png',
        color: '#5865F2',
        aliases: ['dc'],
    },

    capabilities: {
        chatTypes: ['direct', 'group', 'channel'],
        media: true,
        reactions: true,
        threads: true,
        polls: true,
        nativeCommands: true,
    },

    register(api) {
        api.log.info('Registering Discord plugin');
        api.registerChannel(this);
    },

    createGateway(config): IChannelGateway {
        return new DiscordGateway(config);
    },

    unregister() {
        console.log('Unregistering Discord plugin');
    },
};
```

#### 2.3 Discord Gateway Implementation

**`packages/discord/src/gateway/discord-gateway.ts`**

```typescript
import { Client, GatewayIntentBits, Events, Message } from 'discord.js';
import type { IChannelGateway, IChannelMessage } from '@i-clavdivs/plugins';
import { MessageHandler } from './message-handler.js';

export interface IDiscordConfig {
    token: string;
    enabled: boolean;
    allowedChannels?: string[];
    allowedUsers?: string[];
    requireMention?: boolean;
}

/**
 * Discord gateway that listens for messages and routes them to the agent.
 */
export class DiscordGateway implements IChannelGateway {
    private _client: Client | null = null;
    private _config: IDiscordConfig;
    private _running = false;
    private _messageHandler: MessageHandler;

    constructor(config: unknown) {
        this._config = config as IDiscordConfig;
        this._messageHandler = new MessageHandler(this._config);
    }

    async start(config: unknown): Promise<void> {
        if (this._running) {
            throw new Error('Discord gateway already running');
        }

        const discordConfig = config as IDiscordConfig;

        this._client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
            ],
        });

        this._client.on(Events.ClientReady, () => {
            console.log(`[Discord] Bot logged in as ${this._client?.user?.tag}`);
            this._running = true;
        });

        this._client.on(Events.MessageCreate, async (message: Message) => {
            await this._handleMessage(message);
        });

        this._client.on(Events.Error, (error) => {
            console.error('[Discord] Client error:', error);
        });

        await this._client.login(discordConfig.token);
    }

    async stop(): Promise<void> {
        if (!this._running) {
            return;
        }

        if (this._client) {
            await this._client.destroy();
            this._client = null;
        }

        this._running = false;
        console.log('[Discord] Gateway stopped');
    }

    isRunning(): boolean {
        return this._running;
    }

    async sendMessage(to: string, content: string, options?: unknown): Promise<void> {
        if (!this._client) {
            throw new Error('Discord client not initialized');
        }

        // Parse target (channel:ID or user:ID)
        const match = to.match(/^(channel|user):(.+)$/);
        if (!match) {
            throw new Error(`Invalid Discord target format: ${to}`);
        }

        const [, type, id] = match;

        if (type === 'channel') {
            const channel = await this._client.channels.fetch(id);
            if (channel?.isTextBased()) {
                await channel.send(content);
            }
        } else if (type === 'user') {
            const user = await this._client.users.fetch(id);
            await user.send(content);
        }
    }

    private async _handleMessage(message: Message): Promise<void> {
        // Ignore bot messages
        if (message.author.bot) {
            return;
        }

        // Check if message should be processed
        if (!this._messageHandler.shouldProcess(message)) {
            return;
        }

        // Convert to channel message format
        const channelMessage: IChannelMessage = {
            channel: 'discord',
            messageId: message.id,
            conversationId: message.channelId,
            from: {
                id: message.author.id,
                name: message.author.displayName,
                username: message.author.username,
            },
            content: this._messageHandler.extractContent(message),
            chatType: message.guild ? 'channel' : 'direct',
            timestamp: message.createdAt,
            metadata: {
                guildId: message.guildId,
                channelId: message.channelId,
            },
        };

        // Route to agent (this would be injected via dependency)
        await this._messageHandler.handleMessage(channelMessage, message);
    }
}
```

#### 2.4 Message Handler

**`packages/discord/src/gateway/message-handler.ts`**

```typescript
import type { Message } from 'discord.js';
import type { IChannelMessage } from '@i-clavdivs/plugins';
import type { IDiscordConfig } from './discord-gateway.js';

/**
 * Handles incoming Discord messages and determines if they should be processed.
 */
export class MessageHandler {
    private _config: IDiscordConfig;
    private _onMessage?: (msg: IChannelMessage, raw: Message) => Promise<void>;

    constructor(config: IDiscordConfig) {
        this._config = config;
    }

    /**
     * Set the message callback handler.
     */
    setMessageCallback(callback: (msg: IChannelMessage, raw: Message) => Promise<void>): void {
        this._onMessage = callback;
    }

    /**
     * Check if a message should be processed by the bot.
     */
    shouldProcess(message: Message): boolean {
        // DM messages are always processed
        if (!message.guild) {
            return true;
        }

        // Check channel allowlist
        if (this._config.allowedChannels?.length) {
            if (!this._config.allowedChannels.includes(message.channelId)) {
                return false;
            }
        }

        // Check if mention is required
        if (this._config.requireMention) {
            if (!message.mentions.has(message.client.user!)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Extract content from message, removing bot mention if present.
     */
    extractContent(message: Message): string {
        let content = message.content;

        // Remove bot mention
        if (message.client.user) {
            const mentionPattern = new RegExp(`<@!?${message.client.user.id}>`, 'g');
            content = content.replace(mentionPattern, '').trim();
        }

        return content;
    }

    /**
     * Handle a processed message.
     */
    async handleMessage(channelMessage: IChannelMessage, raw: Message): Promise<void> {
        if (this._onMessage) {
            await this._onMessage(channelMessage, raw);
        }
    }
}
```

#### 2.5 Discord Package Configuration

**`packages/discord/package.json`**

```json
{
    "name": "@i-clavdivs/discord",
    "version": "0.0.0",
    "type": "module",
    "description": "Discord channel plugin for i-clavdivs",
    "main": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "import": "./dist/index.js",
            "default": "./dist/index.js"
        }
    },
    "scripts": {
        "build": "tsc -p tsconfig.json",
        "dev": "tsc -p tsconfig.json --watch",
        "clean": "rm -rf dist *.tsbuildinfo",
        "typecheck": "tsc --noEmit"
    },
    "dependencies": {
        "@i-clavdivs/common": "workspace:*",
        "@i-clavdivs/channels": "workspace:*",
        "@i-clavdivs/plugins": "workspace:*",
        "discord.js": "^14.14.1"
    },
    "devDependencies": {
        "typescript": "^5.3.3"
    }
}
```

---

### Phase 2.5: Character/Personality System - Workspace Bootstrap (1-2 days)

Implement the workspace file loading system from v0.0 to support `soul.md` and other personality/context files. This gives the agent a rich personality and context without relying on the Mario Zechner libraries.

#### 2.5.1 Workspace Package Structure

```
packages/workspace/
├── src/
│   ├── index.ts                    # Main exports
│   ├── types/
│   │   └── workspace.ts           # Workspace file types
│   ├── core/
│   │   ├── workspace-loader.ts    # Load workspace files
│   │   └── system-prompt-builder.ts  # Build enhanced system prompts
│   └── utils/
│       └── frontmatter.ts         # Parse frontmatter from MD files
├── tests/
│   └── workspace-loader.test.ts
├── package.json
└── tsconfig.json
```

#### 2.5.2 Workspace Types

**`packages/workspace/src/types/workspace.ts`**

```typescript
/**
 * Workspace file names loaded by the system.
 */
export type WorkspaceFileName =
    | 'SOUL.md'
    | 'TOOLS.md'
    | 'IDENTITY.md'
    | 'USER.md'
    | 'HEARTBEAT.md'
    | 'MEMORY.md';

/**
 * A loaded workspace file with its content.
 */
export interface IWorkspaceFile {
    /** File name (e.g., 'SOUL.md') */
    name: WorkspaceFileName;
    /** Full path to the file */
    path: string;
    /** File content (raw markdown) */
    content?: string;
    /** Whether the file was missing from disk */
    missing: boolean;
}

/**
 * Configuration for workspace loading.
 */
export interface IWorkspaceConfig {
    /** Directory containing workspace files (default: ~/.i-clavdivs/workspace) */
    workspaceDir: string;
    /** Whether to create default files if missing */
    ensureDefaults?: boolean;
}
```

#### 2.5.3 Workspace Loader

**`packages/workspace/src/core/workspace-loader.ts`**

```typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { IWorkspaceFile, IWorkspaceConfig, WorkspaceFileName } from '../types/workspace.js';

const DEFAULT_WORKSPACE_DIR = path.join(os.homedir(), '.i-clavdivs', 'workspace');

const WORKSPACE_FILE_NAMES: WorkspaceFileName[] = [
    'SOUL.md',
    'TOOLS.md',
    'IDENTITY.md',
    'USER.md',
    'HEARTBEAT.md',
    'MEMORY.md',
];

/**
 * Loads all workspace files from the configured directory.
 */
export async function loadWorkspaceFiles(
    config: Partial<IWorkspaceConfig> = {}
): Promise<IWorkspaceFile[]> {
    const workspaceDir = config.workspaceDir ?? DEFAULT_WORKSPACE_DIR;

    // Ensure workspace directory exists
    await fs.mkdir(workspaceDir, { recursive: true });

    const files: IWorkspaceFile[] = [];

    for (const fileName of WORKSPACE_FILE_NAMES) {
        const filePath = path.join(workspaceDir, fileName);

        try {
            const content = await fs.readFile(filePath, 'utf-8');
            files.push({
                name: fileName,
                path: filePath,
                content: stripFrontmatter(content),
                missing: false,
            });
        } catch (error) {
            // File doesn't exist - that's OK, mark as missing
            files.push({
                name: fileName,
                path: filePath,
                missing: true,
            });
        }
    }

    return files;
}

/**
 * Load a specific workspace file.
 */
export async function loadWorkspaceFile(
    fileName: WorkspaceFileName,
    config: Partial<IWorkspaceConfig> = {}
): Promise<IWorkspaceFile> {
    const workspaceDir = config.workspaceDir ?? DEFAULT_WORKSPACE_DIR;
    const filePath = path.join(workspaceDir, fileName);

    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return {
            name: fileName,
            path: filePath,
            content: stripFrontmatter(content),
            missing: false,
        };
    } catch (error) {
        return {
            name: fileName,
            path: filePath,
            missing: true,
        };
    }
}

/**
 * Strip YAML frontmatter from markdown content.
 */
function stripFrontmatter(content: string): string {
    const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    if (!normalized.startsWith('---')) {
        return content;
    }

    const endIndex = normalized.indexOf('\n---', 3);
    if (endIndex === -1) {
        return content;
    }

    // Return content after the closing ---
    return normalized.slice(endIndex + 4).trim();
}

/**
 * Get the default workspace directory path.
 */
export function getDefaultWorkspaceDir(): string {
    return DEFAULT_WORKSPACE_DIR;
}
```

#### 2.5.4 System Prompt Builder

**`packages/workspace/src/core/system-prompt-builder.ts`**

```typescript
import type { IWorkspaceFile } from '../types/workspace.js';

/**
 * Build an enhanced system prompt that includes workspace file content.
 */
export function buildSystemPromptWithWorkspace(params: {
    basePrompt?: string;
    workspaceFiles: IWorkspaceFile[];
    workspaceDir: string;
    model?: string;
}): string {
    const lines: string[] = [];

    // Start with base identity
    lines.push('You are a personal assistant.');
    lines.push('');

    // Add model info
    if (params.model) {
        lines.push(`Model: ${params.model}`);
    }

    // Add workspace directory
    lines.push(`Working directory: ${params.workspaceDir}`);
    lines.push('');

    // Filter to only files that exist and have content
    const validFiles = params.workspaceFiles.filter(
        (file) => !file.missing && file.content && file.content.trim().length > 0
    );

    if (validFiles.length > 0) {
        const hasSoulFile = validFiles.some((file) => file.name.toLowerCase() === 'soul.md');

        lines.push('# Workspace Context');
        lines.push('');
        lines.push('The following workspace files have been loaded:');

        if (hasSoulFile) {
            lines.push('');
            lines.push(
                'IMPORTANT: If SOUL.md is present, embody its persona and tone. ' +
                    'Avoid stiff, generic replies; follow its guidance unless higher-priority instructions override it.'
            );
        }

        lines.push('');

        // Add each workspace file as a section
        for (const file of validFiles) {
            lines.push(`## ${file.name}`);
            lines.push('');
            lines.push(file.content!);
            lines.push('');
        }
    }

    // Add any additional base prompt content
    if (params.basePrompt?.trim()) {
        lines.push('## Additional Context');
        lines.push('');
        lines.push(params.basePrompt.trim());
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Build a minimal system prompt (for when workspace files aren't needed).
 */
export function buildMinimalSystemPrompt(params: {
    workspaceDir: string;
    model?: string;
    extra?: string;
}): string {
    const lines: string[] = [];

    lines.push('You are a helpful assistant.');

    if (params.model) {
        lines.push(`Model: ${params.model}`);
    }

    lines.push(`Working directory: ${params.workspaceDir}`);

    if (params.extra?.trim()) {
        lines.push('');
        lines.push(params.extra.trim());
    }

    return lines.join('\n');
}
```

#### 2.5.5 Workspace Package Configuration

**`packages/workspace/package.json`**

```json
{
    "name": "@i-clavdivs/workspace",
    "version": "0.0.0",
    "type": "module",
    "description": "Workspace file loading and system prompt building",
    "main": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "import": "./dist/index.js",
            "default": "./dist/index.js"
        }
    },
    "scripts": {
        "build": "tsc -p tsconfig.json",
        "dev": "tsc -p tsconfig.json --watch",
        "clean": "rm -rf dist *.tsbuildinfo",
        "typecheck": "tsc --noEmit",
        "test": "vitest run",
        "test:watch": "vitest"
    },
    "dependencies": {
        "@i-clavdivs/common": "workspace:*"
    },
    "devDependencies": {
        "typescript": "^5.3.3",
        "vitest": "^4.0.18"
    }
}
```

#### 2.5.6 Enhance AgentRunner

Update the `AgentRunner` in `packages/runner/src/runner.ts` to use workspace files:

**Key Changes:**

1. Accept workspace files in config
2. Use enhanced system prompt builder
3. Make it backward compatible (still works without workspace)

**`packages/runner/src/runner.ts`** (modifications)

```typescript
import { buildSystemPromptWithWorkspace } from '@i-clavdivs/workspace';
import type { IWorkspaceFile } from '@i-clavdivs/workspace';

export interface IAgentRunnerConfig {
    /** Max messages to retain in history before truncating oldest turns. Defaults to 40. */
    maxHistoryMessages?: number;
    /** Directory to store session files. Defaults to ~/.i-clavdivs/sessions. */
    sessionDir?: string;
    /** Called with each streamed text chunk if streaming is desired. */
    onChunk?: (chunk: string) => void;
    /** Extra text appended to the system prompt. */
    extraSystemPrompt?: string;
    /** Workspace files to include in system prompt (SOUL.md, etc.) */
    workspaceFiles?: IWorkspaceFile[];
}

// In _buildSystemPrompt method, replace with:
private _buildSystemPrompt(request: IAgentRequest): string {
    const workspaceFiles = this._config.workspaceFiles ?? [];

    if (workspaceFiles.length > 0) {
        return buildSystemPromptWithWorkspace({
            basePrompt: this._config.extraSystemPrompt,
            workspaceFiles,
            workspaceDir: request.workspaceDir ?? process.cwd(),
            model: request.model,
        });
    }

    // Fallback to minimal prompt if no workspace files
    return SystemPrompt.build({
        model: request.model,
        workspaceDir: request.workspaceDir ?? process.cwd(),
        extra: this._config.extraSystemPrompt,
    });
}
```

#### 2.5.7 CLI Integration

Update the CLI to load workspace files and pass them to the runner:

**`apps/cli/src/index.ts`** (additions)

```typescript
import { loadWorkspaceFiles, getDefaultWorkspaceDir } from '@i-clavdivs/workspace';

async function main(): Promise<void> {
    const args = parseArgsOrExit();
    await prepareSession(args);

    // Load workspace files (SOUL.md, TOOLS.md, etc.)
    const workspaceDir = process.env.I_CLAVDIVS_WORKSPACE ?? getDefaultWorkspaceDir();
    const workspaceFiles = await loadWorkspaceFiles({ workspaceDir });

    console.log(
        `[workspace] Loaded ${workspaceFiles.filter((f) => !f.missing).length} workspace files`
    );

    // Create runner with workspace files
    const runner = new AgentRunner({
        onChunk: args.stream ? writeChunk : undefined,
        workspaceFiles,
    });

    // Load plugins for channel support
    const pluginManager = await loadPlugins(runner);

    // ... rest of main function
}
```

#### 2.5.8 Default Workspace Files

Create template workspace files that users can customize:

**`~/.i-clavdivs/workspace/SOUL.md`** (default template)

```markdown
---
title: Agent Personality
version: 1.0
---

# Agent Personality

You are a helpful, friendly, and knowledgeable assistant. Your communication style is:

- **Professional yet approachable** - Maintain expertise while being warm and conversational
- **Clear and concise** - Explain complex topics in simple terms
- **Proactive** - Anticipate needs and offer helpful suggestions
- **Respectful** - Always treat users with courtesy and respect their time

## Tone Guidelines

- Use natural, conversational language
- Avoid overly formal or robotic responses
- Show enthusiasm when appropriate
- Be honest when you don't know something
- Admit and correct mistakes gracefully

## Knowledge Areas

You excel in:

- Software development and programming
- System administration and DevOps
- Technical documentation
- Problem-solving and debugging
- Architecture and design patterns

## Constraints

- Do not make up information - cite sources when possible
- Respect user privacy and data security
- Follow ethical guidelines in all recommendations
- Defer to user expertise when they demonstrate deep knowledge
```

**`~/.i-clavdivs/workspace/TOOLS.md`** (default template)

```markdown
---
title: Available Tools
version: 1.0
---

# Available Tools

This file documents custom tools and capabilities available to you beyond standard LLM features.

## System Tools

(User can document custom tool integrations here)

## External APIs

(User can document API keys and usage patterns)

## Custom Commands

(User can define custom command shortcuts)
```

**`~/.i-clavdivs/workspace/IDENTITY.md`** (default template)

```markdown
---
title: Agent Identity
version: 1.0
---

# Agent Identity

**Name:** i-clavdivs Assistant
**Version:** 0.1.0
**Purpose:** Multi-channel AI assistant for Discord, CLI, and other platforms

## Role

You are a personal AI assistant helping with daily tasks, coding, research, and conversation.

## Owner Information

(User can add their information here for personalization)
```

**`~/.i-clavdivs/workspace/USER.md`** (default template)

```markdown
---
title: User Context
version: 1.0
---

# User Context

Use this file to document user preferences, context, and personal information that helps personalize interactions.

## Preferences

- Communication style:
- Preferred programming languages:
- Timezone:
- Working hours:

## Context

(User can add background information, current projects, goals, etc.)
```

#### 2.5.9 Configuration Support

Add workspace configuration to the main config:

**`config/default.json`** (additions)

```json
{
    "workspace": {
        "dir": "${HOME}/.i-clavdivs/workspace",
        "autoLoad": true,
        "files": ["SOUL.md", "TOOLS.md", "IDENTITY.md", "USER.md", "MEMORY.md"]
    },
    "channels": {
        "discord": {
            "enabled": true,
            "token": "${DISCORD_BOT_TOKEN}",
            "requireMention": true,
            "allowedChannels": []
        }
    },
    "agent": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-5-20250929"
    }
}
```

#### 2.5.10 Bootstrap Command

Add a CLI command to initialize workspace with default files:

**`apps/cli/src/commands/init-workspace.ts`**

```typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import { getDefaultWorkspaceDir } from '@i-clavdivs/workspace';

export async function initWorkspace(customDir?: string): Promise<void> {
    const workspaceDir = customDir ?? getDefaultWorkspaceDir();

    console.log(`Initializing workspace at: ${workspaceDir}`);

    await fs.mkdir(workspaceDir, { recursive: true });

    const templates = {
        'SOUL.md': getSoulTemplate(),
        'TOOLS.md': getToolsTemplate(),
        'IDENTITY.md': getIdentityTemplate(),
        'USER.md': getUserTemplate(),
    };

    for (const [filename, content] of Object.entries(templates)) {
        const filePath = path.join(workspaceDir, filename);

        try {
            await fs.access(filePath);
            console.log(`  ⏭️  Skipping ${filename} (already exists)`);
        } catch {
            await fs.writeFile(filePath, content, 'utf-8');
            console.log(`  ✅ Created ${filename}`);
        }
    }

    console.log('\n✨ Workspace initialized! Edit the files to customize your agent.');
    console.log(`📂 Location: ${workspaceDir}`);
}

function getSoulTemplate(): string {
    return `---
title: Agent Personality
version: 1.0
---

# Agent Personality

You are a helpful, friendly assistant. Customize this file to define your agent's personality!

## Tone
- Professional yet approachable
- Clear and concise

## Style
- Natural, conversational language
- Show enthusiasm when appropriate
`;
}

// ... other template functions
```

---

### Phase 3: Runner Integration (0.5-1 day)

Integrate the plugin system into the existing CLI/runner.

#### 3.1 Update CLI to Load Plugins

**`apps/cli/src/index.ts`** (modified)

```typescript
#!/usr/bin/env node
import process from 'node:process';
import { AgentRunner, SessionStore } from '@i-clavdivs/runner';
import { PluginManager } from '@i-clavdivs/plugins';
import { discordPlugin } from '@i-clavdivs/discord';
import { getGlobalPluginRegistry } from '@i-clavdivs/plugins';
import { CliArgs } from './args.js';
import { writeChunk, writeResponse, exitWithError } from './output.js';

async function loadPlugins(runner: AgentRunner, config: Record<string, unknown>) {
    const registry = getGlobalPluginRegistry();

    // Register available plugins
    registry.register(discordPlugin);

    // Initialize and start plugins
    const manager = new PluginManager(runner, config);
    await manager.initializeAll();
    await manager.startChannelGateways();

    return manager;
}

async function main(): Promise<void> {
    let args;
    try {
        args = CliArgs.parse(process.argv);
    } catch (err) {
        exitWithError(String(err));
    }

    // Load configuration (could be from file, env vars, etc.)
    const config = loadConfig();

    const store = new SessionStore();
    if (args.newSession) await store.delete(args.sessionId);

    const runner = new AgentRunner({
        onChunk: args.stream ? writeChunk : undefined,
    });

    // Load and start plugins (Discord, etc.)
    const pluginManager = await loadPlugins(runner, config);

    // Handle shutdown gracefully
    process.on('SIGINT', async () => {
        console.log('\nShutting down...');
        await pluginManager.cleanup();
        process.exit(0);
    });

    // If prompt provided via CLI, run it and exit
    if (args.prompt) {
        const result = await runner.run({
            sessionId: args.sessionId,
            prompt: args.prompt,
            provider: 'anthropic',
            model: args.model,
            workspaceDir: process.cwd(),
        });

        const payload = result.payloads?.[0];
        if (!payload) exitWithError('no response from agent');
        if (payload.isError) exitWithError(payload.text ?? 'unknown error');

        if (args.stream) {
            process.stdout.write('\n');
        } else {
            writeResponse(payload.text ?? '');
        }

        await pluginManager.cleanup();
        process.exit(0);
    }

    // Otherwise, keep running to listen for channel messages
    console.log('i-clavdivs is running. Press Ctrl+C to stop.');

    // Keep process alive
    await new Promise(() => {});
}

function loadConfig(): Record<string, unknown> {
    // TODO: Load from config file, environment, etc.
    return {
        channels: {
            discord: {
                enabled: true,
                token: process.env.DISCORD_BOT_TOKEN,
                requireMention: true,
                allowedChannels: process.env.DISCORD_ALLOWED_CHANNELS?.split(','),
            },
        },
    };
}

main().catch((err: unknown) => {
    exitWithError(err instanceof Error ? err.message : String(err));
});
```

#### 3.2 Wire Message Handling to Agent

To connect incoming Discord messages to the agent runner, we need to modify the gateway:

**`packages/discord/src/gateway/discord-gateway.ts`** (additions)

```typescript
import type { AgentRunner } from '@i-clavdivs/runner';

export class DiscordGateway implements IChannelGateway {
    private _runner?: AgentRunner;

    // Add setter for runner injection
    setRunner(runner: AgentRunner): void {
        this._runner = runner;
        this._messageHandler.setMessageCallback(async (msg, raw) => {
            await this._processWithAgent(msg, raw);
        });
    }

    private async _processWithAgent(msg: IChannelMessage, raw: Message): Promise<void> {
        if (!this._runner) {
            console.error('[Discord] No runner configured');
            return;
        }

        try {
            // Show typing indicator
            await raw.channel.sendTyping();

            // Run the agent with the message content
            const result = await this._runner.run({
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

            // Send response back to Discord
            const response = payload.text ?? 'No response generated.';

            // Split long messages if needed (Discord limit is 2000 chars)
            if (response.length <= 2000) {
                await raw.reply(response);
            } else {
                const chunks = this._splitMessage(response, 2000);
                for (const chunk of chunks) {
                    await raw.channel.send(chunk);
                }
            }
        } catch (error) {
            console.error('[Discord] Error processing message:', error);
            await raw.reply('Sorry, an error occurred while processing your message.');
        }
    }

    private _splitMessage(text: string, maxLength: number): string[] {
        const chunks: string[] = [];
        let remaining = text;

        while (remaining.length > 0) {
            if (remaining.length <= maxLength) {
                chunks.push(remaining);
                break;
            }

            let splitIndex = remaining.lastIndexOf('\n', maxLength);
            if (splitIndex === -1 || splitIndex < maxLength / 2) {
                splitIndex = remaining.lastIndexOf(' ', maxLength);
            }
            if (splitIndex === -1 || splitIndex < maxLength / 2) {
                splitIndex = maxLength;
            }

            chunks.push(remaining.substring(0, splitIndex));
            remaining = remaining.substring(splitIndex).trim();
        }

        return chunks;
    }
}
```

And update the plugin manager to inject the runner:

**`packages/plugins/src/core/plugin-manager.ts`** (modification)

```typescript
async startGateway(plugin: IChannelPlugin, config: unknown): Promise<void> {
    if (this._gateways.has(plugin.id)) {
        throw new Error(`Gateway already running: ${plugin.id}`);
    }

    const gateway = plugin.createGateway(config);

    // Inject runner if gateway supports it
    if ('setRunner' in gateway && typeof gateway.setRunner === 'function') {
        (gateway as any).setRunner(this._runner);
    }

    this._gateways.set(plugin.id, gateway);
    await gateway.start(config);
}
```

---

## Configuration

### Example Configuration File

**`config/default.json`**

```json
{
    "channels": {
        "discord": {
            "enabled": true,
            "token": "${DISCORD_BOT_TOKEN}",
            "requireMention": true,
            "allowedChannels": ["1234567890", "0987654321"],
            "allowedUsers": [],
            "dm": {
                "policy": "open"
            }
        }
    },
    "agent": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-5-20250929"
    }
}
```

### Environment Variables

```bash
# Required
DISCORD_BOT_TOKEN=your-bot-token-here

# Optional
DISCORD_ALLOWED_CHANNELS=channel1,channel2,channel3
ANTHROPIC_API_KEY=your-api-key
```

---

## Testing Strategy

### Unit Tests

1. **Plugin Registry Tests**
    - Registration and lookup
    - Duplicate plugin handling
    - Channel plugin filtering

2. **Plugin Manager Tests**
    - Initialization flow
    - Gateway lifecycle
    - Cleanup handling

3. **Discord Gateway Tests**
    - Message filtering logic
    - Content extraction
    - Message splitting

### Integration Tests

1. **Plugin Loading**
    - CLI loads plugins correctly
    - Plugins initialize in correct order
    - Configuration is passed properly

2. **Message Flow**
    - Discord message → Gateway → Agent → Response
    - Error handling at each step
    - Session management

### Manual Testing

1. Set up Discord bot in Discord Developer Portal
2. Configure bot token and allowed channels
3. Run: `pnpm dev` or `pnpm build && pnpm start`
4. Send messages to bot in Discord
5. Verify responses come back correctly

---

## Deployment Considerations

### Discord Bot Setup

1. Create bot in Discord Developer Portal
2. Enable required intents:
    - Server Members Intent
    - Message Content Intent
3. Generate bot token
4. Invite bot to server with permissions:
    - Read Messages/View Channels
    - Send Messages
    - Read Message History
    - Add Reactions

### Production Configuration

1. Store bot token securely (environment variable or secrets manager)
2. Configure allowed channels via config file
3. Set up logging/monitoring
4. Consider rate limiting and error handling
5. Implement graceful shutdown

### Scaling Considerations

- Single bot instance can handle thousands of channels
- Use session management for conversation context
- Consider Redis for distributed session storage
- Monitor Discord API rate limits

---

## Future Enhancements

### Phase 4: Additional Features (Optional)

1. **Slash Commands**
    - Register Discord slash commands
    - Command routing to agent

2. **Rich Responses**
    - Embeds, buttons, select menus
    - Interactive components

3. **Additional Channels**
    - Slack plugin
    - Telegram plugin
    - Microsoft Teams plugin

4. **Advanced Features**
    - Voice channel support
    - File uploads/downloads
    - Reaction-based interactions
    - Thread management

5. **Plugin Discovery**
    - Auto-load plugins from directories
    - npm package-based plugins
    - Hot reload during development

---

## Implementation Checklist

### Phase 1: Plugin System

- [ ] Create `packages/plugins` package
- [ ] Implement plugin types and interfaces
- [ ] Build plugin registry
- [ ] Build plugin manager
- [ ] Write unit tests
- [ ] Add to workspace build

### Phase 2: Discord Extension

- [ ] Create `packages/discord` package
- [ ] Install discord.js dependency
- [ ] Implement Discord plugin definition
- [ ] Build Discord gateway
- [ ] Build message handler
- [ ] Wire agent runner integration
- [ ] Write unit tests

### Phase 3: Runner Integration

- [ ] Update CLI to load plugins
- [ ] Add configuration loading
- [ ] Implement graceful shutdown
- [ ] Add environment variable support
- [ ] Test end-to-end flow

### Phase 4: Documentation & Polish

- [ ] Add README for each package
- [ ] Document configuration options
- [ ] Create setup guide for Discord bot
- [ ] Add troubleshooting guide
- [ ] Update main project README

---

## Estimated Timeline

- **Phase 1** (Plugin System): 1-2 days
- **Phase 2** (Discord Extension): 2-3 days
- **Phase 3** (Integration): 0.5-1 day
- **Testing & Polish**: 0.5-1 day

**Total: 4-7 days** for a complete, production-ready implementation.

---

## Questions & Considerations

1. **Configuration Management**: Should we use a config file format (JSON, YAML) or environment variables?
2. **Multi-Account Support**: Should Discord support multiple bot accounts like v0.0?
3. **Security**: What security policies should we implement for DMs vs channels?
4. **Skills Integration**: How should Discord-specific skills (from SKILL.md) be exposed to the agent?
5. **Error Handling**: What level of error detail should be sent back to Discord users?

---

## References

- v0.0 Discord extension: `/home/blanta/Desktop/development/i-clavdivs/v0.0/extensions/discord/`
- Discord.js documentation: https://discord.js.org/
- Discord API documentation: https://discord.com/developers/docs/
