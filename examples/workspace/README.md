# Workspace Bootstrap Files

This directory contains example workspace bootstrap files that define the agent's personality, context, and behavior.

## Quick Reference

| File             | About              | Priority | One-Line Summary                         |
| ---------------- | ------------------ | -------- | ---------------------------------------- |
| **SOUL.md**      | Agent personality  | ⭐ High  | How the agent acts and communicates      |
| **IDENTITY.md**  | Agent facts        | Medium   | What the agent is and its purpose        |
| **USER.md**      | You (the human)    | Medium   | Your preferences and coding standards    |
| **TOOLS.md**     | Agent capabilities | Medium   | What the agent can do and best practices |
| **MEMORY.md**    | Shared knowledge   | Low      | Facts and decisions to remember          |
| **BOOTSTRAP.md** | Initialization     | Low      | One-time startup instructions            |
| **HEARTBEAT.md** | Reminders          | Low      | Periodic behavioral nudges               |

## File Descriptions

### SOUL.md - "How I Act" ⭐ **START HERE**

**Who it's about**: The agent
**Priority**: Required - most important file!

Defines the agent's personality, tone, values, and behavioral approach.

**Contains**:

- Personality traits (professional, witty, methodical, etc.)
- Communication style (concise vs verbose, formal vs casual)
- Values and principles (thoroughness, transparency, etc.)
- Response patterns and preferences
- Behavioral guidelines

**Purpose**: Embody a specific persona and communication style
**Effect**: Shapes how the agent behaves in all interactions

**Example**:

```markdown
## Personality

- Tone: Professional yet approachable
- Style: Concise and clear

## Behavior Guidelines

1. Be proactive: Anticipate issues
2. Be thorough: Consider edge cases
3. Be transparent: Explain reasoning
```

---

### IDENTITY.md - "What I Am"

**Who it's about**: The agent
**Priority**: Optional but recommended

Describes the agent's identity, purpose, architecture, and capabilities.

**Contains**:

- Agent name and version
- Purpose and goals
- Technical architecture
- Design philosophy
- Current development status

**Purpose**: Provide self-awareness and context about what the agent is
**Effect**: Helps agent understand its role and capabilities

**Example**:

```markdown
## Name

Clavdivs (i-clavdivs v0.1)

## Purpose

A flexible AI agent framework for multi-channel communication

## Architecture

- Monorepo structure
- Plugin-based
- Provider-agnostic
```

---

### USER.md - "Who You Are"

**Who it's about**: You (the developer/user)
**Priority**: Optional but very useful

Contains information about YOU - your preferences, standards, and project context.

**Contains**:

- Your role and expertise level
- Your coding standards and preferences
- Your communication preferences
- Current project context
- Your workflow preferences

**Purpose**: Personalize interactions based on YOUR preferences
**Effect**: Agent adapts to YOUR style and standards automatically

**Example**:

```markdown
## Developer Information

- Role: Senior developer
- Preferences:
    - Object-oriented design
    - Lowercase comments: //like this
    - Private members prefixed with \_

## Project Context

Working on: i-clavdivs v0.1
Tech stack: TypeScript, Node.js, pnpm
```

**Why it's useful**: The agent will follow YOUR coding standards, match YOUR communication style, and understand YOUR project context without you having to repeat it every time.

---

### TOOLS.md - "What I Can Do"

**Who it's about**: The agent's tools and capabilities
**Priority**: Optional but helpful

Documents available operations, best practices, and limitations.

**Contains**:

- List of available tools/operations
- Best practices for each tool
- Common workflows and patterns
- Known limitations
- Integration-specific features

**Purpose**: Remind agent of its capabilities and how to use them well
**Effect**: Improves tool selection and usage quality

**Example**:

```markdown
## Available Tools

- File Management: Read, Write, Edit
- Version Control: Git operations
- Execution: Bash commands, tests

## Best Practices

1. Read before writing: Examine existing code first
2. Test changes: Run tests after modifications
3. Commit thoughtfully: Meaningful commit messages
```

**Why it's useful**: Prevents the agent from forgetting what it can do and guides better tool usage decisions.

---

### MEMORY.md - "What We Know"

**Who it's about**: Shared knowledge between you and the agent
**Priority**: Optional, low priority

Persistent memory across sessions - facts, decisions, and context to remember.

**Contains**:

- Project decisions and their rationale
- Important facts discovered
- Recurring issues and solutions
- User preferences learned over time

**Purpose**: Remember important context across conversations
**Effect**: Provides continuity between sessions

**Example**:

```markdown
## Project Decisions

- 2025-02-20: Chose TypeScript over JavaScript for type safety
- 2025-02-22: Decided to use pnpm for monorepo management

## Important Facts

- This project replaces v0.0 OpenClaw
- Mario Zechner's pi-coding-agent library is private
```

**Note**: This file can be updated manually or potentially by the agent in future versions.

---

### BOOTSTRAP.md - "Initialize Me"

**Who it's about**: Startup configuration
**Priority**: Optional, advanced use

Additional system-level instructions or one-time initialization logic.

**Contains**:

- Environment-specific setup
- Initial context loading
- System-level preferences
- Startup checks or validations

**Purpose**: Configure agent behavior at startup
**Effect**: One-time setup instructions executed during initialization

**Example**:

```markdown
## Startup Instructions

1. Load project configuration from ./config
2. Check for required environment variables
3. Initialize session in project root directory
```

---

### HEARTBEAT.md - "Remember This"

**Who it's about**: Periodic reminders
**Priority**: Optional, advanced use

Recurring instructions or reminders to keep the agent on track during long conversations.

**Contains**:

- Regular reminders about coding standards
- Behavioral consistency checks
- Guidelines to revisit periodically

**Purpose**: Regular behavioral nudges throughout the conversation
**Effect**: Consistent adherence to guidelines over long interactions

**Example**:

```markdown
## Regular Reminders

- Always check coding-standards.txt before writing code
- Keep responses concise (under 200 words when possible)
- Test changes before considering them complete
```

---

## How They Work Together

Think of the files in groups:

### **Define the Agent** (Who is it?)

- **SOUL.md** - How it acts
- **IDENTITY.md** - What it is

### **Optimize for Context** (How to work with you?)

- **USER.md** - Adapt to you
- **TOOLS.md** - Work effectively

### **Advanced Features** (Continuity and consistency)

- **MEMORY.md** - Remember across sessions
- **BOOTSTRAP.md** - Initialize properly
- **HEARTBEAT.md** - Stay on track

### Example Interaction

You ask: _"Write a function to validate user input"_

- **SOUL.md** → Uses methodical, thorough approach with clear explanations
- **IDENTITY.md** → Leverages TypeScript expertise, monorepo awareness
- **USER.md** → Follows YOUR comment style (`//lowercase`), OOP preferences
- **TOOLS.md** → Reads existing code first, runs tests after writing
- **MEMORY.md** → Remembers you prefer input validation with specific patterns
- **BOOTSTRAP.md** → Uses project-specific validation utilities
- **HEARTBEAT.md** → Remembers to check security best practices

Result: A well-crafted function that matches your style, uses best practices, and integrates smoothly with your project.

## Usage

### Default Location

The agent looks for workspace files in `~/.i-clavdivs/workspace/` by default.

### Setup

```bash
# Create workspace directory
mkdir -p ~/.i-clavdivs/workspace

# Copy example files
cp examples/workspace/*.md ~/.i-clavdivs/workspace/

# Customize to your needs
vi ~/.i-clavdivs/workspace/SOUL.md
```

### Custom Location

You can specify a custom workspace directory via configuration:

```json
{
    "agent": {
        "workspaceDir": "/path/to/your/workspace"
    }
}
```

## Customization Tips

1. **Start with SOUL.md**: This has the biggest impact on agent behavior
2. **Be specific**: Clear, concrete instructions work better than vague guidance
3. **Use examples**: Show the agent what you want with examples
4. **Iterate**: Test and refine based on actual interactions
5. **Keep it concise**: Agents work better with focused, well-organized instructions

## Integration

The workspace files are automatically loaded by:

- CLI: via `loadWorkspaceFiles()` in `apps/cli/src/index.ts`
- Discord Bot: via the Discord plugin (when implemented)
- Custom: via `@i-clavdivs/workspace` package

Files are embedded in the system prompt and influence all agent responses.
