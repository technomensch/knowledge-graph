---
title: "ADR-032: Platform-Specific Tool Directives Belong in knowledge/platform/<platform>.md"

number: 032

created: 2026-04-11T00:00:00Z

status: Superseded

author: technomensch

email: 917847+technomensch@users.noreply.github.com

git:
  branch: v0.3.5-beta
  commit: null
  pr: null
  issue: null

implements: v0.3.5-beta

related:
  adrs: [ADR-028, ADR-017, ADR-021]
  lessons: []
  kg_entries: []

tags: [platform-portability, rules-md, tool-preferences, claude, architecture, v0.3.5-beta]

category: architecture
---
# ADR-032: Platform-Specific Tool Directives Belong in `knowledge/platform/<platform>.md`

**Date:** 2026-04-11
**Status:** Superseded (v0.3.5-beta fixup)
**Superseded by:** `CLAUDE.md` at repo root is the platform config for Claude Code. Other platforms use their native files (`GEMINI.md`, `.cursorrules`, `AGENTS.md`). The `knowledge/platform/` directory is removed — native platform files own tool directives directly.
**Implements:** v0.3.5-beta
**Related:** ADR-028 (me.md + rules.md as platform-agnostic source of truth), ADR-017 (four-layer architecture), ADR-021 (single source of truth)

---

## Context

ADR-028 established `knowledge/rules.md` as a platform-agnostic source of truth — designed to travel unchanged to Gemini, Cursor, Codex, and any future AI tool. However, an audit of `knowledge/rules.md` on 2026-04-11 found that the Tool Preferences section contained Claude Code-specific tool names:

- `Glob`, `Grep`, `Bash`, `Read`, `Edit` — Claude Code tool API names
- `context-mode MCP tools` — Claude Code-specific context management plugin
- `subagents` — Claude Code subagent delegation pattern
- `.jsonl` — Claude Code transcript format; referencing it creates a Claude-specific scoping rule

These entries violate ADR-028's platform-agnostic guarantee. On Gemini CLI or Cursor, these directives reference tools that do not exist, either silently degrading or confusing the agent.

**Architecture decision required:** Where should Claude-specific directives live?

The original plan considered `CLAUDE.md`, but CLAUDE.md is already a thin shim (ADR-028, ADR-017) and must not take on a dual role as a directive store. Mixing shim responsibilities with tool directives creates a second source of truth and breaks the single-shim-line pattern.

---

## Decision

Introduce `knowledge/platform/` as the canonical directory for per-platform tool directives. Each supported platform gets its own file:

```
knowledge/platform/
  claude.md      ← Claude Code-specific tool directives (created in v0.3.5-beta)
  gemini.md      ← future: Gemini CLI directives
  cursor.md      ← future: Cursor rules directives
  codex.md       ← future: Codex directives
```

**Platform directive files contain:**
- Tool names and their platform-specific equivalents
- Output/context management rules specific to that platform's constraints
- Delegation patterns (subagents, MCP tools, etc.) specific to that platform
- Any "never do X in this platform" rules that reference platform-specific file formats

**`knowledge/rules.md` contains:**
- Platform-agnostic workflow rules (branch naming, commit format, PR policy)
- Platform-agnostic knowledge capture rules
- A guidance comment in the Tool Preferences section pointing to `knowledge/platform/<platform>.md`

**`CLAUDE.md` contains:**
- A thin `## Platform Preferences` section pointing to `knowledge/platform/claude.md`
- No tool directive content — it remains a shim

---

## Rationale

### Why not CLAUDE.md

CLAUDE.md is already a thin shim. Its role is to load the platform-agnostic foundation files (`knowledge/rules.md`, `knowledge/me.md`) and add minimal project-identification context. Adding tool directives creates a second source of truth, making it unclear whether a tool preference lives in `rules.md` or `CLAUDE.md`. The shim pattern (ADR-028) requires that `rules.md` is the single authoritative source; CLAUDE.md must not store directives that duplicate or extend it.

### Why `knowledge/platform/` not `knowledge/rules-claude.md`

The `knowledge/platform/` directory scales naturally to multiple platforms without naming collisions. A flat file like `rules-claude.md` at the `knowledge/` root implies the same level of authority as `rules.md`, creating confusion about precedence. Directory structure makes the per-platform scope explicit at a glance.

### Why not a single `knowledge/platform.md` file

A single file containing all platforms in separate sections creates merge conflicts when platform-specific entries are updated, and allows Claude-specific entries to bleed into Gemini sessions (or vice versa) if an agent reads the entire file without filtering by section. Per-platform files are unambiguous: each platform agent reads only its own file.

---

## Consequences

### Positive

1. **ADR-028 compatibility restored.** `knowledge/rules.md` contains zero Claude-specific tool references after this change.
2. **Multi-platform extensibility.** Adding Gemini, Cursor, or Codex support is a new file in `knowledge/platform/` — no surgery on `rules.md`.
3. **Clear ownership.** Tool directives for each platform are discoverable in a single, predictable file.
4. **CLAUDE.md stays thin.** The shim pattern is preserved; CLAUDE.md continues to point rather than store.

### Negative

1. **One more file to scaffold.** `kmgraph init` must create `knowledge/platform/claude.md` for new Claude Code users. Existing users must migrate manually or via the upgrade flow.
2. **Agents must read two files.** Claude Code agents must read both `knowledge/rules.md` (platform-agnostic) and `knowledge/platform/claude.md` (Claude-specific) for full context. CLAUDE.md and the `## Platform Preferences` shim section handle this.

### Neutral

1. **No change to `me.md` or `knowledge/` directory structure.** This ADR only adds `knowledge/platform/`.
2. **`rules-capture` skill deferred.** Platform-awareness in the `rules-capture` skill (routing new rules to the correct platform file) is deferred to v0.3.6.

---

## Directory Layout

```
knowledge/
  index.md
  me.md               (gitignored)
  rules.md            ← platform-agnostic source of truth
  platform/
    claude.md         ← Claude Code-specific tool directives
    gemini.md         ← (future)
    cursor.md         ← (future)
  decisions/
    ADR-032-...md
  lessons-learned/
    ...
```

---

## Implementation

**Files created/modified in v0.3.5-beta:**
- Create: `knowledge/platform/claude.md`
- Update: `knowledge/rules.md` — remove Claude-specific tool entries; add ADR-032 reference comment
- Update: `CLAUDE.md` — add `## Platform Preferences` shim section
- Update: `core/templates/knowledge/rules.md` — apply same split; add guidance comment
- Update: `commands/init.md` — scaffold `knowledge/platform/claude.md` for new installs; upgrade flow for existing users
- Create: `docs/decisions/ADR-032-...md` and `knowledge/decisions/ADR-032-...md`

---

**Decision Made:** 2026-04-11
**Status:** Accepted
