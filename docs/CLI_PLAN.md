# CLI Agent Runner — Implementation Plan

## Goal

Build a minimal CLI app in v0.1 that can run an agent from the command line:

```
node apps/cli/dist/index.js "what is 2 + 2?"
```

With persistent session history across invocations, ready to be wired into a Discord bot in a later phase.

---

## Why we are not porting v0.0's runner directly

The core of v0.0's agent runner (`runEmbeddedAttempt`) depends on two private closed-source packages:

- `@mariozechner/pi-agent-core` — provides `createAgentSession`, `SessionManager`, `SettingsManager`
- `@mariozechner/pi-coding-agent` — provides the full coding tool suite
- `@mariozechner/pi-ai` — provides `streamSimple`, `ImageContent`

These are not available in v0.1 and cannot be installed. The v0.0 runner is not extractable without them.

Instead, we build a clean implementation on top of what v0.1 already has:

- `packages/models` — working `AnthropicProvider` with streaming support (raw HTTP, no SDK dependency)
- `packages/agents` — `IAgentRunner` interface, `IAgentRequest`/`IAgentRunResult` types
- `packages/channels` — channel ID types

---

## What we are porting from v0.0

These files from v0.0 have no private package dependencies and are worth porting as reference or direct adaptation:

| v0.0 file                                     | What we take                                                          | Where it goes in v0.1                                                      |
| --------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/agents/pi-embedded-runner/types.ts`      | `EmbeddedPiRunResult` shape                                           | Already mirrored in `packages/agents/src/core/types.ts` — no action needed |
| `src/agents/pi-embedded-runner/run/params.ts` | `RunEmbeddedPiAgentParams` shape                                      | Reference only — `IAgentRequest` in v0.1 covers the minimal subset         |
| `src/agents/cli-runner/helpers.ts`            | `parseCliJson`, `parseCliJsonl`, `buildCliArgs`, `resolvePromptInput` | `packages/runner/src/cli-backend.ts` — for future CLI-subprocess mode      |
| `src/agents/pi-embedded-runner/logger.ts`     | Simple named logger pattern                                           | `packages/runner/src/logger.ts`                                            |

---

## Architecture

```
packages/runner/          ← new package: implements IAgentRunner
apps/cli/                 ← new app: CLI entrypoint
```

### packages/runner

Implements the `IAgentRunner` interface from `packages/agents` using `AnthropicProvider` from `packages/models`.

**Responsibilities:**

- Accept an `IAgentRequest` (sessionId, prompt, provider, model, workspaceDir)
- Load conversation history from a JSON session file
- Call the Anthropic API (via `AnthropicProvider.getModel().complete()`)
- Append the user+assistant turn to the session file
- Return an `IAgentRunResult`

**Files to create:**

```
packages/runner/
  src/
    runner.ts              ← AgentRunner implements IAgentRunner
    session-store.ts       ← reads/writes session history as JSON (replaces SessionManager)
    system-prompt.ts       ← minimal system prompt (date, cwd, model name)
    logger.ts              ← simple console logger (ported from v0.0 pattern)
    index.ts               ← exports
  package.json
  tsconfig.json
```

**Key design decisions:**

- Session file: `~/.i-clavdivs/sessions/<sessionId>.json` — array of `Message[]`
- No tool calls in Phase 1 (plain text only, `disableTools: true` equivalent)
- No compaction in Phase 1 — history is passed as-is, truncated at N messages if needed
- Streaming: use `AnthropicProvider._requestStream` + `model.stream()` for live output to stdout
- Auth: read `ANTHROPIC_API_KEY` from environment

### apps/cli

Minimal Node.js CLI entry point.

**Files to create:**

```
apps/cli/
  src/
    index.ts               ← main entrypoint
    args.ts                ← parse argv: prompt, --session, --model, --stream flags
    output.ts              ← print streamed chunks to stdout
  package.json
  tsconfig.json
```

**Usage:**

```sh
# New session, prints response
node apps/cli/dist/index.js "hello"

# Continue existing session
node apps/cli/dist/index.js --session my-session "what did I just say?"

# Choose model
node apps/cli/dist/index.js --model claude-sonnet-4-5-20250929 "hello"

# Stream output token by token
node apps/cli/dist/index.js --stream "write me a poem"
```

---

## Implementation phases

### Phase 1 — packages/runner + apps/cli (this work)

- [ ] Create `packages/runner` with `AgentRunner`, `SessionStore`, `SystemPrompt`, `Logger`
- [ ] Create `apps/cli` with arg parsing, runner wiring, streaming stdout output
- [ ] Wire `packages/runner` → `packages/models/AnthropicProvider`
- [ ] Wire `packages/runner` → `packages/agents/IAgentRunner` interface
- [ ] Add `apps/cli` to workspace `pnpm-workspace.yaml`
- [ ] Add `packages/runner` to workspace `pnpm-workspace.yaml`
- [ ] Test: `node apps/cli/dist/index.js "hello world"`

### Phase 2 — Discord bot (future)

- [ ] Create `apps/discord-bot` using `discord.js`
- [ ] Listen for messages in configured channels
- [ ] Route each message through `AgentRunner` (same package as CLI)
- [ ] Send the reply back via Discord API
- [ ] Session key = `discord:<guild_id>:<channel_id>:<user_id>` (one session per user per channel)

### Phase 3 — Tool support (future)

- [ ] Add bash execution tool to `packages/runner`
- [ ] Add file read/write tools
- [ ] Wire tool results back into the conversation loop

---

## Dependencies to add

| Package              | Where                        | Purpose                         |
| -------------------- | ---------------------------- | ------------------------------- |
| `@i-clavdivs/models` | `packages/runner`            | AnthropicProvider for API calls |
| `@i-clavdivs/agents` | `packages/runner`            | IAgentRunner interface + types  |
| `discord.js`         | `apps/discord-bot` (Phase 2) | Discord gateway + REST API      |

No new external npm packages are needed for Phase 1 — `packages/models` already does raw HTTP via `fetch`.

---

## Files to create (Phase 1 only)

```
packages/runner/package.json
packages/runner/tsconfig.json
packages/runner/src/index.ts
packages/runner/src/runner.ts
packages/runner/src/session-store.ts
packages/runner/src/system-prompt.ts
packages/runner/src/logger.ts

apps/cli/package.json
apps/cli/tsconfig.json
apps/cli/src/index.ts
apps/cli/src/args.ts
apps/cli/src/output.ts
```

And update:

```
pnpm-workspace.yaml        ← add apps/* and packages/runner
```
