# @i-clavdivs/plugins

Plugin system for extensible channel support in i-clavdivs.

## Overview

This package provides a flexible plugin architecture that enables:

- **Channel abstraction**: Unified interface for different messaging platforms
- **Plugin lifecycle management**: Registration, initialization, and cleanup
- **Gateway orchestration**: Starting and managing channel gateways
- **Configuration loading**: Flexible config resolution per channel
- **Plugin registry**: Centralized plugin discovery and access

## Features

- **Type-safe plugin API**: Strong TypeScript interfaces for plugin development
- **Channel plugins**: Specialized plugin type for messaging platform integrations
- **Plugin registry**: Global registry for plugin registration and lookup
- **Plugin manager**: Lifecycle management and gateway orchestration
- **Configuration utilities**: Helper functions for config loading and validation

## Installation

```bash
pnpm add @i-clavdivs/plugins
```

## Architecture

```
packages/plugins/
├── src/
│   ├── core/
│   │   ├── plugin-manager.ts    # Plugin lifecycle orchestration
│   │   └── plugin-registry.ts   # Global plugin registry
│   ├── types/
│   │   ├── plugin.ts            # Base plugin interface
│   │   ├── channel-plugin.ts    # Channel plugin interface
│   │   └── plugin-api.ts        # Plugin API interface
│   └── utils/
│       └── config-loader.ts     # Configuration utilities
└── package.json
```

## Core Concepts

### Plugin Types

#### Base Plugin (`IPlugin`)

The foundational plugin interface that all plugins implement:

```typescript
interface IPlugin {
    id: string;
    name: string;
    description: string;
    version: string;
    register(api: IPluginApi): void;
    unregister?(): void;
}
```

#### Channel Plugin (`IChannelPlugin`)

Specialized plugin for messaging platform integrations:

```typescript
interface IChannelPlugin extends IPlugin {
    channelMetadata: ChannelMetadata;
    capabilities: IChannelCapabilities;
    createGateway(config: unknown): IChannelGateway;
}
```

### Plugin Registry

The registry maintains a global list of available plugins and provides lookup functionality:

```typescript
import { getGlobalPluginRegistry } from '@i-clavdivs/plugins';

const registry = getGlobalPluginRegistry();

// Register a plugin
registry.register(myPlugin);

// Get a plugin
const plugin = registry.get('discord');

// List all plugins
const all = registry.listAll();

// List channel plugins
const channels = registry.listChannels();
```

### Plugin Manager

The manager handles plugin lifecycle and gateway orchestration:

```typescript
import { PluginManager } from '@i-clavdivs/plugins';

const manager = new PluginManager(runner, config);

// Initialize all plugins
await manager.initializeAll();

// Start enabled channel gateways
await manager.startChannelGateways();

// Stop all gateways
await manager.stopAll();
```

## Usage

### Creating a Channel Plugin

```typescript
import type { IChannelPlugin, IChannelGateway } from '@i-clavdivs/plugins';

export const myPlugin: IChannelPlugin = {
    id: 'my-channel',
    name: 'My Channel',
    description: 'Integration with My Platform',
    version: '1.0.0',

    channelMetadata: {
        id: 'my-channel',
        label: 'My Channel',
        description: 'My messaging platform',
        icon: '💬',
        aliases: ['mc'],
    },

    capabilities: {
        chatTypes: ['direct', 'group'],
        media: true,
        reactions: false,
        threads: false,
    },

    register(api) {
        api.log.info('Initializing My Channel plugin');
    },

    createGateway(config): IChannelGateway {
        return new MyChannelGateway(config);
    },

    unregister() {
        console.log('Cleaning up My Channel plugin');
    },
};
```

### Implementing a Gateway

```typescript
import type { IChannelGateway, IIncomingMessage } from '@i-clavdivs/plugins';

class MyChannelGateway implements IChannelGateway {
    async initialize(): Promise<void> {
        // Connect to platform, set up listeners
    }

    async sendMessage(target: string, content: string): Promise<void> {
        // Send message to platform
    }

    async stop(): Promise<void> {
        // Disconnect and cleanup
    }

    onMessage(handler: (msg: IIncomingMessage) => void): void {
        // Register message handler
    }
}
```

### Registering Plugins

```typescript
import { getGlobalPluginRegistry } from '@i-clavdivs/plugins';
import { discordPlugin } from '@i-clavdivs/discord';
import { redditPlugin } from '@i-clavdivs/reddit';

const registry = getGlobalPluginRegistry();

// Register channel plugins
registry.register(discordPlugin);
registry.register(redditPlugin);
```

### Plugin Initialization

```typescript
import { PluginManager } from '@i-clavdivs/plugins';
import { Agent } from '@i-clavdivs/runner';

const runner = new Agent(/* ... */);
const config = {
    channels: {
        discord: {
            enabled: true,
            botToken: 'token',
        },
        reddit: {
            enabled: false,
        },
    },
};

const manager = new PluginManager(runner, config);

// Initialize all registered plugins
await manager.initializeAll();

// Start enabled channel gateways
await manager.startChannelGateways();

// Later: stop everything
await manager.stopAll();
```

## Plugin API

Plugins receive an API object during registration:

```typescript
interface IPluginApi {
    log: ILogger;
    config: IConfigProvider;
    runner: Agent;
    registry: IPluginRegistry;
}
```

This provides access to:

- **Logging**: Structured logging
- **Configuration**: Access to app config
- **Runner**: Agent execution
- **Registry**: Other plugin lookup

## Configuration

Channel plugins typically read config from `channels.<channel-id>`:

```json
{
    "channels": {
        "discord": {
            "enabled": true,
            "botToken": "...",
            "requireMention": true
        },
        "reddit": {
            "enabled": false
        }
    }
}
```

The plugin manager automatically:

1. Reads channel config
2. Checks `enabled` flag
3. Creates gateway with config
4. Initializes and starts gateway

## Available Plugins

Official channel plugins:

- [@i-clavdivs/discord](../discord/README.md) - Discord integration
- [@i-clavdivs/reddit](../reddit/README.md) - Reddit integration

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

## Testing Plugins

```typescript
import { vi } from 'vitest';
import { getGlobalPluginRegistry } from '@i-clavdivs/plugins';

describe('MyPlugin', () => {
    it('should register successfully', () => {
        const registry = getGlobalPluginRegistry();
        registry.register(myPlugin);

        const retrieved = registry.get('my-channel');
        expect(retrieved).toBeDefined();
        expect(retrieved?.name).toBe('My Channel');
    });

    it('should create gateway', () => {
        const config = { enabled: true };
        const gateway = myPlugin.createGateway(config);

        expect(gateway).toBeDefined();
    });
});
```

## Design Principles

This package follows i-clavdivs coding standards:

- **Interface-driven**: Strong typing for all plugin contracts
- **Composable**: Plugins are self-contained and composable
- **Extensible**: Easy to add new channel integrations
- **Type-safe**: Full TypeScript support throughout

## License

See root project license.
