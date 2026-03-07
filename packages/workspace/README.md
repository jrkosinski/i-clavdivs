# @i-clavdivs/workspace

Workspace file loading and system prompt building for i-clavdivs.

## Overview

This package manages workspace configuration files that define the agent's personality, behavior, and context. It loads markdown files from a workspace directory and integrates them into the system prompt.

## Features

- **Workspace file loading**: Load personality and behavior files (SOUL.md, TOOLS.md, etc.)
- **System prompt building**: Construct structured system prompts with workspace content
- **Flexible configuration**: Default location with override support
- **Missing file handling**: Graceful handling when files don't exist
- **Type-safe**: Full TypeScript support for all operations

## Installation

```bash
pnpm add @i-clavdivs/workspace
```

## Workspace Files

The package supports these workspace files:

| File            | Purpose                                  | Priority |
| --------------- | ---------------------------------------- | -------- |
| **SOUL.md**     | Agent personality and communication style | High     |
| **IDENTITY.md** | Agent identity and purpose               | Medium   |
| **USER.md**     | User preferences and context             | Medium   |
| **TOOLS.md**    | Available tools and capabilities         | Medium   |
| **MEMORY.md**   | Persistent knowledge across sessions     | Low      |
| **HEARTBEAT.md**| Periodic behavioral reminders            | Low      |

See [examples/workspace/README.md](../../examples/workspace/README.md) for detailed descriptions and examples.

## Usage

### Loading Workspace Files

```typescript
import { loadWorkspaceFiles, getDefaultWorkspaceDir } from '@i-clavdivs/workspace';

// Load all workspace files from default location (~/.i-clavdivs/workspace)
const files = await loadWorkspaceFiles();

// Load from custom directory
const customFiles = await loadWorkspaceFiles('/path/to/workspace');

// Get default workspace directory
const defaultDir = getDefaultWorkspaceDir();
console.log(`Workspace: ${defaultDir}`);
```

### Loading Individual Files

```typescript
import { loadWorkspaceFile } from '@i-clavdivs/workspace';

// Load a specific file
const soulFile = await loadWorkspaceFile('SOUL.md', '~/.i-clavdivs/workspace');

if (!soulFile.missing) {
    console.log(soulFile.content);
}
```

### Building System Prompts

```typescript
import { buildSystemPromptWithWorkspace } from '@i-clavdivs/workspace';

// Build system prompt with workspace files
const systemPrompt = await buildSystemPromptWithWorkspace('~/.i-clavdivs/workspace');

// Use in agent runner
const runner = new AgentRunner({
    extraSystemPrompt: systemPrompt,
});
```

### Minimal System Prompt

```typescript
import { buildMinimalSystemPrompt } from '@i-clavdivs/workspace';

// Build a minimal system prompt without workspace files
const prompt = buildMinimalSystemPrompt();
```

## API

### Types

```typescript
type WorkspaceFileName =
    | 'SOUL.md'
    | 'IDENTITY.md'
    | 'USER.md'
    | 'TOOLS.md'
    | 'MEMORY.md'
    | 'HEARTBEAT.md';

interface IWorkspaceFile {
    name: WorkspaceFileName;
    path: string;
    content?: string;
    missing: boolean;
}

interface IWorkspaceConfig {
    workspaceDir: string;
    ensureDefaults?: boolean;
}
```

### Functions

#### `loadWorkspaceFiles(workspaceDir?: string): Promise<IWorkspaceFile[]>`

Load all workspace files from the specified directory.

**Parameters:**
- `workspaceDir` - Directory path (default: `~/.i-clavdivs/workspace`)

**Returns:** Array of workspace files (includes missing files with `missing: true`)

#### `loadWorkspaceFile(filename: WorkspaceFileName, workspaceDir?: string): Promise<IWorkspaceFile>`

Load a single workspace file.

**Parameters:**
- `filename` - Name of the file to load
- `workspaceDir` - Directory path (default: `~/.i-clavdivs/workspace`)

**Returns:** Workspace file object

#### `getDefaultWorkspaceDir(): string`

Get the default workspace directory path.

**Returns:** Expanded path to `~/.i-clavdivs/workspace`

#### `buildSystemPromptWithWorkspace(workspaceDir?: string): Promise<string>`

Build a system prompt including workspace file content.

**Parameters:**
- `workspaceDir` - Directory path (default: `~/.i-clavdivs/workspace`)

**Returns:** Formatted system prompt text

#### `buildMinimalSystemPrompt(): string`

Build a minimal system prompt without workspace files.

**Returns:** Basic system prompt text

## Default Location

By default, workspace files are stored in:

```
~/.i-clavdivs/workspace/
├── SOUL.md
├── IDENTITY.md
├── USER.md
├── TOOLS.md
├── MEMORY.md
└── HEARTBEAT.md
```

## Environment Variables

- `I_CLAVDIVS_WORKSPACE_DIR` - Override default workspace directory

```bash
export I_CLAVDIVS_WORKSPACE_DIR=/custom/path
```

## Setup

### Creating Workspace Files

```bash
# Create workspace directory
mkdir -p ~/.i-clavdivs/workspace

# Copy example files
cp examples/workspace/*.md ~/.i-clavdivs/workspace/

# Customize to your needs
vi ~/.i-clavdivs/workspace/SOUL.md
```

### Example SOUL.md

```markdown
# Agent Personality

## Tone and Style

- Professional yet approachable
- Concise and clear communication
- Technical accuracy is paramount

## Core Values

- Thoroughness: Consider edge cases
- Transparency: Explain reasoning
- Proactivity: Anticipate needs

## Communication Guidelines

1. Always explain what you're doing and why
2. Ask clarifying questions when ambiguous
3. Provide context for technical decisions
```

## Integration

### With AgentRunner

```typescript
import { AgentRunner } from '@i-clavdivs/runner';
import { buildSystemPromptWithWorkspace } from '@i-clavdivs/workspace';

const systemPrompt = await buildSystemPromptWithWorkspace();

const runner = new AgentRunner({
    extraSystemPrompt: systemPrompt,
});
```

### With Custom Prompts

```typescript
import { loadWorkspaceFiles } from '@i-clavdivs/workspace';

const files = await loadWorkspaceFiles();

// Build custom prompt structure
let prompt = 'You are a helpful assistant.\n\n';

for (const file of files) {
    if (!file.missing) {
        prompt += `\n## ${file.name}\n\n${file.content}\n`;
    }
}
```

## File Structure

```
packages/workspace/
├── src/
│   ├── core/
│   │   ├── workspace-loader.ts       # File loading logic
│   │   └── system-prompt-builder.ts  # Prompt building
│   ├── types/
│   │   └── workspace.ts              # Type definitions
│   └── index.ts                      # Public exports
├── tests/
│   ├── workspace-loader.test.ts
│   ├── system-prompt-builder.test.ts
│   └── integration.test.ts
└── package.json
```

## Error Handling

The package handles missing files gracefully:

```typescript
const files = await loadWorkspaceFiles();

for (const file of files) {
    if (file.missing) {
        console.log(`${file.name} not found at ${file.path}`);
    } else {
        console.log(`Loaded ${file.name}: ${file.content.length} chars`);
    }
}
```

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Run specific test
pnpm test workspace-loader
```

## Development

```bash
# Build the package
pnpm build

# Watch mode for development
pnpm dev

# Type checking
pnpm typecheck
```

## Best Practices

### 1. Start with SOUL.md

This file has the most impact on agent behavior. Define:
- Personality traits
- Communication style
- Core values
- Behavioral guidelines

### 2. Keep Files Focused

Each file should have a clear purpose:
- SOUL.md → How the agent acts
- IDENTITY.md → What the agent is
- USER.md → Who you are and your preferences
- TOOLS.md → What the agent can do

### 3. Use Concrete Examples

Show, don't just tell:

```markdown
## Code Style

Prefer:
```typescript
// like this
const result = await fetch(url);
```

Not:
```typescript
// Like This
const result = await fetch(url);
```
```

### 4. Iterate Based on Behavior

Test your workspace files and refine based on actual agent responses.

### 5. Version Control Your Workspace

Keep your workspace files in git to track changes and revert if needed.

## Related Packages

- [@i-clavdivs/runner](../runner/README.md) - Uses workspace files in system prompts
- [@i-clavdivs/agents](../agents/README.md) - Agent orchestration layer

## Examples

See [examples/workspace/](../../examples/workspace/) for:
- Example workspace files
- Detailed documentation
- Setup instructions
- Best practices guide

## License

See root project license.
