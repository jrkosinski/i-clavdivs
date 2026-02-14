# @i-clavdivs/channels

Communication channel abstractions and management for the i-clavdivs framework.

## Overview

This package provides core functionality for managing communication channels across different messaging platforms. It includes type definitions, configuration utilities, and channel registry management.

## Features

- **Type System**: Comprehensive type definitions for channels, capabilities, and metadata
- **Channel Registry**: Centralized registration and lookup for communication channels
- **Configuration Matching**: Flexible channel configuration resolution with wildcard and parent fallback support
- **Validation Utilities**: Common validation functions for phone numbers, emails, and URLs
- **Chat Type Normalization**: Standardized chat type handling across platforms
- **Location Support**: Geographic location type definitions and utilities
- **Conversation Labeling**: Human-readable label generation for conversations

## Installation

```bash
pnpm add @i-clavdivs/channels
```

## Usage

### Basic Channel Types

```typescript
import {
    type ChannelId,
    type IChannelCapabilities,
    normalizeChannelId,
    normalizeChatType,
} from '@i-clavdivs/channels';

//normalize channel identifiers
const channelId = normalizeChannelId('telegram'); //=> "telegram"
const aliased = normalizeChannelId('tg'); //=> "telegram"

//normalize chat types
const chatType = normalizeChatType('direct'); //=> "direct"
const group = normalizeChatType('group'); //=> "group"
```

### Channel Registry

```typescript
import {
    ChannelRegistry,
    getGlobalRegistry,
    type IChannelRegistration,
} from '@i-clavdivs/channels';

//get global registry
const registry = getGlobalRegistry();

//register a channel
registry.register({
    id: 'telegram',
    metadata: {
        id: 'telegram',
        label: 'Telegram',
        description: 'Telegram messaging platform',
        order: 1,
    },
    capabilities: {
        chatTypes: ['direct', 'group', 'channel'],
        threads: true,
        reactions: true,
    },
    order: 1,
});

//retrieve channel
const channel = registry.get('telegram');

//resolve from alias
const resolved = registry.resolve('tg'); //=> "telegram"
```

### Channel Matching

```typescript
import { resolveChannelEntryMatchWithFallback, normalizeChannelSlug } from '@i-clavdivs/channels';

//match channel configuration with fallback
const match = resolveChannelEntryMatchWithFallback({
    entries: {
        'general-chat': { setting: 'value' },
        'parent-channel': { setting: 'parent-value' },
        '*': { setting: 'wildcard' },
    },
    keys: ['general-chat'],
    parentKeys: ['parent-channel'],
    wildcardKey: '*',
    normalizeKey: normalizeChannelSlug,
});

//match.entry contains the matched configuration
//match.matchSource indicates "direct", "parent", or "wildcard"
```

### Conversation Labels

```typescript
import { generateConversationLabel } from '@i-clavdivs/channels';

const label = generateConversationLabel({
    chatType: 'group',
    conversationName: 'Engineering Team',
    senderName: 'John Doe',
    includeSender: true,
});
//=> "Engineering Team (John Doe)"
```

### Validation

```typescript
import { isValidE164, normalizeE164, isValidEmail } from '@i-clavdivs/channels';

//phone number validation
const valid = isValidE164('+12025551234'); //=> true
const normalized = normalizeE164('(202) 555-1234'); //=> "+12025551234"

//email validation
const emailValid = isValidEmail('user@example.com'); //=> true
```

## Architecture

The package is organized into three main areas:

- **types/**: Core type definitions and interfaces
- **core/**: Channel registry and matching logic
- **utils/**: Utility functions for validation and formatting

## License

MIT
