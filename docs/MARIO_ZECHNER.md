# @mariozechner packages

v0.0 depends on 4 private packages by Mario Zechner, all pinned at `0.52.12`.
They are not published to the public npm registry.

```json
"@mariozechner/pi-agent-core":    "0.52.12"
"@mariozechner/pi-ai":            "0.52.12"
"@mariozechner/pi-coding-agent":  "0.52.12"
"@mariozechner/pi-tui":           "0.52.12"
```

They are referenced across **168 source files** in v0.0.

---

## @mariozechner/pi-agent-core

**Role:** Core type definitions for the agent execution model. No runtime logic — pure types.

**What v0.0 uses from it:**

| Export            | Used for                                                                          |
| ----------------- | --------------------------------------------------------------------------------- |
| `AgentMessage`    | The shape of a single message in a conversation (role + content)                  |
| `AgentTool`       | Definition of a tool the agent can call                                           |
| `AgentToolResult` | The result returned by a tool invocation                                          |
| `AgentEvent`      | Event emitted during agent streaming (message start, text delta, tool call, etc.) |
| `StreamFn`        | Function type for the underlying LLM stream call                                  |
| `ThinkingLevel`   | Enum for extended thinking depth (`off`, `low`, `medium`, `high`)                 |

**v0.1 equivalent:** Already covered by `packages/models/src/core/types.ts` (`Message`, `ToolDefinition`, `ToolCall`, `CompletionChunk`) and `packages/agents/src/core/types.ts`. No blocker.

---

## @mariozechner/pi-ai

**Role:** The HTTP client layer that talks to LLM provider APIs (Anthropic, OpenAI, Google, Ollama, etc.). Also handles OAuth flows for providers that need it.

**What v0.0 uses from it:**

| Export                                                                 | Used for                                                                                |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `streamSimple`                                                         | The main streaming call to the LLM — wraps SSE/chunked responses into an async iterable |
| `completeSimple`                                                       | Non-streaming single-turn completion                                                    |
| `complete`                                                             | Lower-level completion with full context control                                        |
| `getModel`                                                             | Resolves a model config object by provider + model ID                                   |
| `streamOpenAIResponses`                                                | Streams from the OpenAI Responses API (newer API format)                                |
| `loginOpenAICodex`                                                     | OAuth login flow for OpenAI Codex                                                       |
| `createAssistantMessageEventStream`                                    | Converts a raw HTTP response into typed agent events                                    |
| `Model`, `Api`, `Context`                                              | Types for model config, API variant, and conversation context                           |
| `AssistantMessage`, `TextContent`, `ImageContent`, `ToolResultMessage` | Message content types                                                                   |
| `OAuthCredentials`, `OAuthProvider`                                    | OAuth credential and provider types                                                     |
| `SimpleStreamOptions`                                                  | Options passed to `streamSimple`                                                        |
| `convertMessages`, `convertTools` (internal path)                      | Google-specific message/tool format conversion                                          |

**v0.1 equivalent:** `packages/models/src/providers/anthropic.ts` already implements raw HTTP streaming to the Anthropic API. OpenAI is also implemented. This is the most direct replacement — we build on what's there rather than needing this package.

---

## @mariozechner/pi-coding-agent

**Role:** The full coding agent orchestration layer. This is the heaviest dependency — it owns session persistence, tool definitions, skill loading, compaction, and the agent loop itself.

**What v0.0 uses from it:**

| Export                                                               | Used for                                                                                                |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `createAgentSession`                                                 | Creates a stateful agent session: loads session file, wires model + tools, returns `{ session, agent }` |
| `SessionManager`                                                     | Reads/writes the session JSONL file on disk; manages conversation history, branching, custom entries    |
| `SettingsManager`                                                    | Reads/writes per-workspace agent settings (compaction reserve tokens, etc.)                             |
| `ModelRegistry`                                                      | Registry of all available models; used by the session to resolve model configs at runtime               |
| `AuthStorage`                                                        | Stores and retrieves API keys at runtime (set dynamically per-profile, per-provider)                    |
| `estimateTokens`                                                     | Estimates token count for a set of messages                                                             |
| `generateSummary`                                                    | Compacts a session by summarising old turns (used for context overflow recovery)                        |
| `loadSkillsFromDir`                                                  | Loads skill definitions from a directory on disk                                                        |
| `createEditTool`, `createReadTool`, `createWriteTool`                | Built-in file editing/reading/writing tools for the coding agent                                        |
| `CURRENT_SESSION_VERSION`                                            | Version constant for the session file format                                                            |
| `AgentSession`                                                       | Type of the live session object returned by `createAgentSession`                                        |
| `SessionEntry`, `SessionHeader`                                      | Types for individual entries in the session JSONL file                                                  |
| `Skill`, `ToolDefinition`                                            | Types for skills and tool definitions                                                                   |
| `ExtensionAPI`, `ExtensionContext`, `ContextEvent`, `FileOperations` | Plugin/extension system types                                                                           |

**v0.1 equivalent:** This is the main gap. Nothing in v0.1 currently replaces `SessionManager` or `createAgentSession`. This is what `packages/runner` will provide — a simpler file-based session store and agent loop that covers the same responsibilities without the full feature set.

---

## @mariozechner/pi-tui

**Role:** Terminal UI rendering framework. Used exclusively by the interactive TUI (the `src/tui/` subsystem in v0.0). Not used by the agent runner core, Discord integration, or any channel code.

**What v0.0 uses from it:**

| Export                                           | Used for                                  |
| ------------------------------------------------ | ----------------------------------------- |
| `Box`, `Container`, `Spacer`, `Text`, `Markdown` | Layout and text rendering components      |
| `Editor`                                         | Interactive text input component          |
| `Key`, `matchesKey`                              | Keyboard event handling                   |
| `SelectList`, `SettingsList`                     | List/settings UI components               |
| `FilterableSelectList`, `SearchableSelectList`   | Searchable list components                |
| `SlashCommand`                                   | Slash command definition type for the TUI |
| `TUI`, `Component`, `SelectItem`, `SettingItem`  | Core TUI framework types                  |

**v0.1 equivalent:** Not needed. The CLI app in v0.1 uses stdout directly. The Discord bot uses the Discord API. Neither needs a TUI renderer.

---

## Summary: what we actually need to replace

| Package           | Needed for CLI runner?          | v0.1 replacement                                          |
| ----------------- | ------------------------------- | --------------------------------------------------------- |
| `pi-agent-core`   | Types only                      | Already covered by `packages/agents` + `packages/models`  |
| `pi-ai`           | HTTP streaming to LLM           | Already covered by `packages/models/AnthropicProvider`    |
| `pi-coding-agent` | Session management + agent loop | **Must build** → `packages/runner` (SessionStore + Agent) |
| `pi-tui`          | Terminal UI                     | Not needed                                                |

The only real work is replacing `pi-coding-agent`'s `SessionManager` and `createAgentSession` with a simpler implementation in `packages/runner`. Everything else is already in place.
