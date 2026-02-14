# @i-clavdivs/skills

Skills system for managing and executing tool-based capabilities. Adapted from i-clavdivs/moltbot.

## Overview

This package provides a skills system that:

- Loads skill definitions from SKILL.md files
- Parses YAML/JSON5 frontmatter with metadata
- Manages skill eligibility based on OS, binaries, environment
- Provides a central registry for skill access
- Wraps shell scripts in TypeScript classes for type-safe execution

## Installation

```bash
pnpm add @i-clavdivs/skills
```

## Usage

### Loading Skills

```typescript
import { SkillRegistry } from '@i-clavdivs/skills';

//configure registry with skill directories
const registry = SkillRegistry.getInstance();
registry.configure({
    bundledSkillsDir: './skills',
});

//load skills
await registry.loadSkills();

//get all skills
const allSkills = registry.getAllSkills();

//get a specific skill
const githubSkill = registry.getSkill('github');

//format skills for AI prompt injection
const promptText = registry.formatSkillsForPrompt();
```

### Using Skill Wrappers

```typescript
import { TmuxSkill } from '@i-clavdivs/skills';

const tmux = new TmuxSkill();

//find tmux sessions
const sessions = tmux.findSessions({
    scanAll: true,
    query: 'my-session',
});

//wait for text in a pane
const found = await tmux.waitForText('session:0.0', 'Ready', {
    timeout: 30,
});
```

### Skill Structure

Skills are defined in SKILL.md files with YAML frontmatter:

```markdown
---
name: github
description: 'Interact with GitHub using the `gh` CLI'
metadata:
    {
        'i-clavdivs':
            {
                'emoji': '🐙',
                'requires': { 'bins': ['gh'] },
                'install': [{ 'kind': 'brew', 'formula': 'gh' }],
            },
    }
---

# GitHub Skill

Documentation for using the gh CLI...
```

## Features

- **54 bundled skills** from i-clavdivs (github, tmux, weather, discord, slack, etc.)
- **Metadata parsing** with JSON5 support
- **OS and binary requirements** filtering
- **Install specifications** (brew, apt, npm, etc.)
- **Script wrappers** for skills with shell utilities
- **Singleton registry** for centralized access

## API

### Types

- `ISkill` - Core skill interface
- `ISkillMetadata` - Metadata from frontmatter
- `ISkillEntry` - Skill with parsed metadata
- `ISkillRegistry` - Registry interface

### Classes

- `SkillRegistry` - Central registry (singleton)
- `TmuxSkill` - Tmux script wrapper

### Functions

- `loadSkillsFromDir()` - Load skills from directory
- `formatSkillsForPrompt()` - Format for AI injection
- `parseFrontmatterBlock()` - Parse YAML/key-value frontmatter
- `resolveSkillMetadata()` - Extract metadata from frontmatter

## License

MIT
