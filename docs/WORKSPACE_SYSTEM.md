# Workspace Bootstrap System

The workspace bootstrap system allows you to define your agent's personality, capabilities, and context through markdown files. These files are loaded at startup and embedded in the agent's system prompt, influencing all interactions.

## Overview

Inspired by the v0.0 OpenClaw architecture, the workspace system provides a flexible way to customize agent behavior without modifying code. It's particularly useful for:

- Defining agent personality and communication style (SOUL.md)
- Documenting available tools and best practices (TOOLS.md)
- Providing agent identity and purpose (IDENTITY.md)
- Sharing user preferences and project context (USER.md)
- Maintaining persistent memory across sessions (MEMORY.md)

## Quick Start

### 1. Create Workspace Directory

```bash
mkdir -p ~/.i-clavdivs/workspace
```

### 2. Copy Example Files

```bash
cp examples/workspace/*.md ~/.i-clavdivs/workspace/
```

### 3. Customize SOUL.md

Edit `~/.i-clavdivs/workspace/SOUL.md` to define your agent's personality:

```markdown
# Agent Soul

You are **MyAgent**, a helpful assistant with expertise in...

## Personality

- Tone: Professional and friendly
- Style: Concise and clear
  ...
```

### 4. Run the Agent

```bash
node apps/cli/dist/index.js "Hello!"
```

The agent will automatically load and use your workspace files.

## File Descriptions

### SOUL.md (Priority: High)

**Purpose**: Defines the agent's core personality, tone, and behavioral guidelines.

**When to use**: Always! This is the most important file for customizing agent behavior.

**Effect**: Agent embodies this persona in all responses.

**Example content**:

- Personality traits and communication style
- Areas of expertise
- Behavioral do's and don'ts
- Response formatting preferences

### IDENTITY.md (Priority: Medium)

**Purpose**: Describes who/what the agent is - its name, version, purpose, and architecture.

**When to use**: When you want the agent to have self-awareness about its role.

**Effect**: Helps agent understand its capabilities and limitations.

**Example content**:

- Agent name and version
- Design philosophy
- Architecture overview
- Current development focus

### TOOLS.md (Priority: Medium)

**Purpose**: Documents available tools, capabilities, and usage guidelines.

**When to use**: When you want to remind the agent of its capabilities or provide tool-specific best practices.

**Effect**: Improves tool selection and usage quality.

**Example content**:

- List of available operations
- Best practices for tool usage
- Known limitations
- Integration-specific guidelines (e.g., Discord bot features)

### USER.md (Priority: Medium)

**Purpose**: Contains information about the user, their preferences, and project context.

**When to use**: When you want personalized interactions aligned with your coding style and project needs.

**Effect**: Agent adapts its responses to your preferences.

**Example content**:

- User role and expertise level
- Coding standards and preferences
- Current project context
- Communication preferences

### MEMORY.md (Priority: Low)

**Purpose**: Persistent facts and context that should be remembered across sessions.

**When to use**: When you need the agent to remember important decisions, facts, or context.

**Effect**: Provides continuity across conversations.

**Example content**:

- Project decisions and rationale
- Important facts to remember
- Recurring issues and their solutions
- User preferences discovered over time

### BOOTSTRAP.md (Priority: Low)

**Purpose**: One-time initialization instructions or system-level configuration.

**When to use**: When you need special setup or configuration at agent startup.

**Effect**: Executed once during initialization.

**Example content**:

- Environment-specific setup
- Initial context loading
- System-level preferences

### HEARTBEAT.md (Priority: Low)

**Purpose**: Periodic reminders or recurring instructions.

**When to use**: When you need the agent to maintain consistent behavior over long conversations.

**Effect**: Regular behavioral nudges throughout the conversation.

**Example content**:

- Reminders about coding standards
- Regular checks for best practices
- Behavioral consistency guidelines

## Architecture

### Package Structure

The workspace system is implemented in `@i-clavdivs/workspace`:

```
packages/workspace/
├── src/
│   ├── types/
│   │   └── workspace.ts          # IWorkspaceFile interface
│   ├── core/
│   │   ├── workspace-loader.ts   # File loading logic
│   │   └── system-prompt-builder.ts  # Prompt integration
│   └── index.ts                  # Public API
└── package.json
```

### Integration Points

#### 1. CLI Integration

Location: `apps/cli/src/index.ts`

```typescript
import { loadWorkspaceFiles } from '@i-clavdivs/workspace';

async function createAgent(stream: boolean): Promise<Agent> {
    //load workspace files from default location
    const workspaceFiles = await loadWorkspaceFiles();

    return new Agent({
        onChunk: stream ? writeChunk : undefined,
        workspaceFiles,
    });
}
```

#### 2. Agent Integration

Location: `packages/agent/src/agent.ts`

```typescript
import { buildSystemPromptWithWorkspace } from '@i-clavdivs/workspace';

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

    //fallback to minimal prompt
    return SystemPrompt.build({...});
}
```

#### 3. Discord Plugin Integration (Planned)

The Discord plugin will load workspace files when creating the agent instance, similar to the CLI integration.

### Data Flow

```
User runs CLI/bot
    ↓
loadWorkspaceFiles() reads files from ~/.i-clavdivs/workspace/
    ↓
Files parsed into IWorkspaceFile[] array
    ↓
Passed to Agent constructor
    ↓
buildSystemPromptWithWorkspace() embeds files in system prompt
    ↓
System prompt sent to AI provider with each request
    ↓
Agent responds with context from workspace files
```

## API Reference

### loadWorkspaceFiles()

Loads all workspace bootstrap files from the specified directory.

```typescript
async function loadWorkspaceFiles(workspaceDir?: string): Promise<IWorkspaceFile[]>;
```

**Parameters**:

- `workspaceDir` (optional): Path to workspace directory. Defaults to `~/.i-clavdivs/workspace`

**Returns**: Array of workspace files with their content and metadata

**Example**:

```typescript
const files = await loadWorkspaceFiles();
//files: [
//  { path: 'SOUL.md', content: '# Agent Soul...', ... },
//  { path: 'TOOLS.md', content: '# Available Tools...', ... },
//  ...
//]
```

### buildSystemPromptWithWorkspace()

Builds an enhanced system prompt that includes workspace file content.

```typescript
function buildSystemPromptWithWorkspace(options: {
    basePrompt?: string;
    workspaceFiles: IWorkspaceFile[];
    workspaceDir: string;
    model: string;
}): string;
```

**Parameters**:

- `basePrompt` (optional): Additional prompt text to include
- `workspaceFiles`: Array of workspace files to embed
- `workspaceDir`: Current workspace directory path
- `model`: Model name for system prompt

**Returns**: Complete system prompt string

**Example**:

```typescript
const prompt = buildSystemPromptWithWorkspace({
    workspaceFiles: files,
    workspaceDir: '/home/user/project',
    model: 'claude-sonnet-4-5-20250929',
});
```

### IWorkspaceFile Interface

```typescript
interface IWorkspaceFile {
    path: string; //file path
    content: string; //file contents
}
```

## Configuration

### Default Workspace Directory

By default, workspace files are loaded from:

```
~/.i-clavdivs/workspace/
```

### Custom Workspace Directory

You can specify a custom directory via:

1. **Environment variable**:

    ```bash
    export I_CLAVDIVS_WORKSPACE="/custom/path"
    ```

2. **Configuration file**:

    ```json
    {
        "agent": {
            "workspaceDir": "/custom/path"
        }
    }
    ```

3. **Programmatically**:
    ```typescript
    const files = await loadWorkspaceFiles('/custom/path');
    ```

## Best Practices

### 1. Start with SOUL.md

Focus on SOUL.md first - it has the biggest impact on agent behavior. The other files are optional and can be added incrementally.

### 2. Be Specific and Concrete

Vague instructions like "be helpful" are less effective than specific guidelines:

❌ "Be helpful and friendly"
✅ "Start responses with a brief acknowledgment. Break down complex explanations into numbered steps. Use code examples when helpful."

### 3. Use Examples

Show the agent what you want rather than just telling it:

```markdown
## Response Style

When explaining code:

- ✅ Good: "The `loadWorkspaceFiles()` function reads markdown files from the workspace directory and returns them as an array."
- ❌ Bad: "It loads stuff from a folder."
```

### 4. Keep It Concise

Agents work better with focused, well-organized instructions. Aim for clarity over completeness.

### 5. Iterate Based on Feedback

Test your workspace files in real conversations and refine based on actual agent behavior.

### 6. Version Control Your Workspace

Store your workspace files in git alongside your project:

```bash
mkdir .i-clavdivs
cp ~/.i-clavdivs/workspace/*.md .i-clavdivs/
git add .i-clavdivs/
```

### 7. Separate Personal and Project Context

Use USER.md for personal preferences and project-specific files for project context.

## Troubleshooting

### Workspace Files Not Loading

**Symptom**: Agent doesn't follow SOUL.md guidelines

**Check**:

1. Files exist in `~/.i-clavdivs/workspace/`:

    ```bash
    ls -la ~/.i-clavdivs/workspace/
    ```

2. Files are valid markdown:

    ```bash
    cat ~/.i-clavdivs/workspace/SOUL.md
    ```

3. No file permission issues:
    ```bash
    chmod 644 ~/.i-clavdivs/workspace/*.md
    ```

### Agent Ignoring Instructions

**Symptom**: Agent doesn't follow workspace file guidelines consistently

**Possible causes**:

1. Instructions too vague - be more specific
2. Conflicting instructions across multiple files
3. Instructions contradict the base system prompt
4. File content too long - agents have context limits

**Solutions**:

- Simplify and clarify instructions
- Remove redundant or conflicting content
- Prioritize most important guidelines
- Test with simpler prompts first

### File Not Found Errors

**Symptom**: Error loading workspace directory

**Solution**:

```bash
mkdir -p ~/.i-clavdivs/workspace
cp examples/workspace/*.md ~/.i-clavdivs/workspace/
```

## Migration from v0.0

If you're migrating from OpenClaw (v0.0), your existing workspace files should work with minimal changes:

1. Copy files:

    ```bash
    cp ~/.openclaw/workspace/*.md ~/.i-clavdivs/workspace/
    ```

2. Update references:
    - Change "OpenClaw" to "i-clavdivs" or your agent name
    - Remove v0.0-specific references (pi-coding-agent, etc.)
    - Update file paths if needed

3. Test:
    ```bash
    node apps/cli/dist/index.js "test workspace integration"
    ```

## Examples

### Example: Code Review Agent

`~/.i-clavdivs/workspace/SOUL.md`:

```markdown
# Code Review Agent

You are a meticulous code reviewer with expertise in TypeScript, system design, and security.

## Review Approach

1. Always start with a security analysis
2. Check for type safety issues
3. Evaluate error handling
4. Assess testability
5. Suggest improvements with specific examples

## Communication Style

- Be constructive, not critical
- Provide code examples for suggestions
- Explain the "why" behind recommendations
- Acknowledge good practices
```

### Example: Discord Bot Persona

`~/.i-clavdivs/workspace/SOUL.md`:

```markdown
# Friendly Discord Bot

You are a helpful Discord bot assistant with a casual, friendly tone.

## Personality

- Use Discord-appropriate language (but stay professional)
- Respond promptly and concisely
- Use emojis sparingly for emphasis
- Be patient with repeat questions

## Discord-Specific Behavior

- Keep responses under 2000 characters
- Use code blocks for code snippets
- Mention users by name when addressing them
- React with 👍 to acknowledge commands
```

### Example: Project-Specific Agent

`~/.i-clavdivs/workspace/USER.md`:

```markdown
# Project Context

Working on: i-clavdivs v0.1 - Discord bot integration

## Tech Stack

- TypeScript + Node.js
- pnpm monorepo
- Vitest for testing
- Discord.js for bot integration

## Coding Standards

See coding-standards.txt - always follow these!

## Current Focus

- Phase 2.5: Workspace bootstrap system
- Integration with Discord plugin
- Replacing v0.0 dependencies
```

## Related Documentation

- [Discord Bot Integration Plan](./DISCORD_BOT_INTEGRATION.md) - Phase 2.5 workspace integration
- [Coding Standards](../coding-standards.txt) - Project coding conventions
- [Workspace Examples](../examples/workspace/) - Example workspace files

## Future Enhancements

Planned improvements to the workspace system:

1. **Hot Reloading**: Automatically reload workspace files when changed
2. **File Validation**: Schema validation for workspace files
3. **Workspace Templates**: Pre-built templates for common use cases
4. **Multi-Workspace Support**: Switch between different workspace profiles
5. **Web UI**: Browser-based workspace file editor
6. **Version Control Integration**: Track workspace file changes in git

## Contributing

To contribute to the workspace system:

1. Package location: `packages/workspace/`
2. Tests location: `packages/workspace/tests/`
3. Examples location: `examples/workspace/`
4. Follow coding-standards.txt
5. Add tests for new features
6. Update this documentation

---

**Questions or issues?** Please open an issue on GitHub or check the main documentation.
