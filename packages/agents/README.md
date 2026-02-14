# @i-clavdivs/agents

AI agent orchestration and execution layer for i-clavdivs.

## Overview

This package provides a robust, production-ready agent execution system with:

- **Multi-provider authentication** with automatic failover
- **Session management** with streaming support
- **Tool orchestration** with policy-based access control
- **Context management** with automatic compaction
- **Error handling** with structured retry strategies

## Architecture

The agents layer follows an object-oriented design with clear separation of concerns:

```
agents/
├── core/           # Core types and interfaces
├── errors/         # Error classes and classification
├── auth/           # Authentication and provider management
├── runner/         # Agent execution orchestration
├── session/        # Session state and event management
├── tools/          # Tool creation and policy enforcement
└── utils/          # Helper utilities
```

## Core Concepts

### Agent Runner

The `AgentRunner` class orchestrates the execution of AI agent tasks with automatic:

- Authentication profile rotation on failures
- Context overflow detection and compaction
- Provider failover on errors
- Retry logic with exponential backoff

### Authentication Profiles

Supports multiple authentication profiles per provider with:

- Round-robin selection
- Cooldown management after failures
- Last-good profile prioritization
- OAuth token refresh

### Session Events

Real-time streaming of agent responses through event subscriptions:

- Text delta streaming
- Tool execution events
- Error notifications
- Completion callbacks

## Usage

```typescript
import { AgentRunner } from '@i-clavdivs/agents';

const runner = new AgentRunner({
    authManager,
    sessionManager,
    toolFactory,
});

const result = await runner.run({
    sessionId: 'session-123',
    prompt: 'Hello, agent!',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
});
```

## Design Principles

This package adheres to the i-clavdivs coding standards:

- **OOP-first**: Class-based architecture with clear responsibilities
- **Interface-driven**: All major components implement interfaces
- **Composable**: Small, focused classes over monolithic modules
- **Well-documented**: Doc headers on all public APIs
- **Liberally commented**: In-code comments following project style

## License

Private - i-clavdivs project
