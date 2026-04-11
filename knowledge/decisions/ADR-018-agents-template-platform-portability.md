# ADR-018: Platform-Agnostic AGENTS-template for Cross-Platform Portability

**Date:** 2026-03-27
**Status:** Accepted
**Implements:** v0.2.0-beta — Layered Architecture Restructuring (Platform Portability)
**Related:** [ADR-017](ADR-017-four-layer-architecture-thin-commands.md), [ADR-009](ADR-009-three-tier-installation-architecture.md)

---

## Context

KMGraph behaviors — lesson capture, recall, session summary, ADR suggestions — are encoded entirely in Claude Code-specific syntax: `/kmgraph:` slash commands, `skills/` auto-invoked context providers, and `hooks/hooks.json` lifecycle hooks. None of these mechanisms exist in Gemini CLI, Cursor, Windsurf, Continue.dev, VS Code Copilot, or Aider.

Users of these platforms have no way to adopt KMGraph behaviors without manually writing their own instruction files from scratch. There is no authoritative, platform-neutral specification of what KMGraph behaviors look like.

Additionally, even for Claude Code users, skills and commands are not readable as plain behavioral guidance — they are implementation files, not intent documents.

**Problem:**
- KMGraph behaviors exist only as Claude Code-specific implementation files
- Non-Claude Code platforms (Gemini CLI, Cursor, Windsurf, etc.) cannot adopt any KMGraph behaviors
- No platform-neutral specification of the behaviors exists
- Installer has no standard content to write when configuring a non-Claude Code platform

**Scope:**
- In scope: `core/templates/AGENTS-template.md` specification; installer integration (detection + per-platform file write); validated against Gemini CLI
- Out of scope: Platform-specific customization beyond content selection; MCP tool access on non-MCP platforms; maintaining parity of platform files after changes (deferred to `platform-sync-agent`)

---

## Decision

Create `core/templates/AGENTS-template.md` — a single plain-markdown behavioral specification that any LLM, given the file as context, can follow to provide KMGraph behaviors without any platform-specific syntax.

The template is organized into four behavioral sections matching natural workflow moments:
1. **Capturing knowledge** — when to offer to capture; how to ask; never save without approval
2. **Recalling existing knowledge** — when to search before answering; how to use `kg_search` MCP tool; how to present results conversationally
3. **Wrapping up work** — session end signals; plan status check; open ADRs check; lesson-worthy commits check; session summary offer
4. **Working with decisions** — when to suggest an ADR; how to frame the offer; when not to (day-to-day choices don't need this treatment)

The file uses no Claude Code syntax. No `/kmgraph:` commands. No agent names. No skill invocation. Tone is instructional: "If you notice X, do Y."

The installer (`/kmgraph:init` and `/kmgraph:setup-platform`) detects installed AI coding tools and writes the template content (or relevant sections) to the appropriate platform config file:

| Platform | Target file |
|---|---|
| Gemini CLI | `GEMINI.md` in project root |
| Cursor | `.cursorrules` |
| Windsurf | `.windsurfrules` |
| Continue.dev | `.continue/config.json` prompt section |
| VS Code Copilot | `.github/copilot-instructions.md` |
| Aider | `.aider.conf.yml` conventions section |

If the target file already exists, the installer shows a diff and asks before overwriting.

### Core Components

1. **`core/templates/AGENTS-template.md`:** The authoritative plain-markdown behavioral spec. Protected path — not modified without explicit user permission (per `CLAUDE.md` code protection rules).
2. **Platform detection logic:** `setup-platform` command and `init` command detect installed platforms and offer to configure each. Uses filesystem checks (`which gemini`, `~/.gemini/`, `~/.cursor/`, etc.).
3. **`agents/platform-sync-agent.md`:** Handles the content judgment step — which sections of the template are relevant for a given target platform's context window constraints and capabilities.
4. **Verification step:** After writing a platform file, the installer provides an exact verification prompt: "Ask your AI: 'Is there a knowledge graph available?' — it should respond with [expected response]."

### Implementation Approach

The template is written to be useful to any LLM that receives it as context, regardless of whether MCP tools are available:
- Where `kg_search` MCP tool is available: use it
- Where MCP is not configured: tell the user how to search manually
- Where filesystem tools are available: write lessons directly
- Where neither is available: describe what to save and ask the user to do it

---

## Rationale

### Why This Approach

1. **Plain markdown is the universal LLM instruction format:** Every AI coding platform accepts some form of instructional markdown file — GEMINI.md, .cursorrules, .windsurfrules, CLAUDE.md, copilot-instructions.md. A single well-written template can be adapted to all of them.
2. **Behavioral specification, not implementation:** The template describes what the assistant should do and why, not how a particular platform's internals work. This makes it durable — behaviors described in prose survive platform API changes.
3. **Installer handles adaptation:** Rather than maintaining six separate platform-specific files, one canonical template exists and the installer (with `platform-sync-agent` for content judgment) handles per-platform adaptation. Single source of truth.
4. **Validated on Gemini Flash:** The template was tested against Gemini Flash in Gemini CLI. Given the template as context, the model correctly offered to capture a lesson after a bug fix, searched existing notes before answering a repeat question, and offered a session summary when the user said they were done.

### Alternatives Considered

**Option A: Maintain separate platform-specific files (no template)**
- Pros: Each file can be deeply customized for the platform
- Cons: Six files to maintain; divergence inevitable; no single source of truth; new platforms require a new file from scratch
- Rejected because: Maintenance burden and divergence risk are not acceptable

**Option B: Claude Code skills only (no portability)**
- Pros: No new files needed; existing skill files already encode the behaviors
- Cons: Non-Claude Code users cannot benefit; KMGraph becomes permanently Claude Code-only; market for the tool is artificially limited
- Rejected because: Platform portability is an explicit equal goal of v0.2.0-beta

**Option C: MCP-only portability (behaviors exposed as MCP tools)**
- Pros: MCP is a cross-platform standard; tools work identically on any MCP client
- Cons: Behavioral guidance (when to offer to capture, how to ask the user) cannot be expressed as MCP tool schemas — MCP tools handle data, not UX; requires MCP client support which is not universal
- Rejected because: MCP handles data layer portability, not behavioral guidance portability; the two are complementary

### Trade-offs

**Benefits:**
- ✅ Any LLM on any platform can adopt KMGraph behaviors from one file
- ✅ Single source of truth — one template, not six diverging files
- ✅ Installer automates platform configuration — users don't write instruction files manually
- ✅ Template is durable — describes intent, not platform internals

**Costs:**
- ❌ Non-Claude Code platforms cannot invoke `/kmgraph:` commands — they follow the behaviors but cannot call the MCP tools unless separately configured
- ❌ Platform files go stale when the template changes — `platform-sync-agent` mitigates but doesn't eliminate this (PostToolUse hook detects AGENTS-template.md changes and prompts for sync)
- ❌ Template must be written at the right abstraction level — too specific and it becomes platform-dependent; too vague and it gives no actionable guidance

**Mitigation:**
- Template tested against Gemini Flash before merging; validated against the four core behaviors
- `platform-sync-agent` handles content adaptation per platform and will be invoked when the template changes
- PostToolUse hook on `core/templates/AGENTS-template.md` writes prompts user to run platform sync

---

## Consequences

### Positive

1. **KMGraph is no longer Claude Code-only:** Any user of Gemini CLI, Cursor, Windsurf, or other platforms can add `AGENTS-template.md` content to their platform config and get the same behavioral guidance.
2. **Installer becomes a first-class setup step:** `/kmgraph:init` now actively configures the user's full AI toolchain, not just Claude Code.
3. **Behavioral spec is readable documentation:** `AGENTS-template.md` doubles as user-facing documentation of what KMGraph behaviors look like — the intent is explicit and readable without understanding implementation details.

### Negative

1. **Platform file staleness:** When `AGENTS-template.md` is updated, platform files (GEMINI.md, .cursorrules, etc.) must be manually re-synced. The PostToolUse hook prompts for this but does not automate it.
2. **MCP availability varies:** Platforms without MCP support get behavioral guidance but not the `kg_search` and `kg_fts5_rebuild` tools. The template handles this gracefully but behaviors are less powerful without MCP.

### Neutral

1. **`core/templates/` is a protected path:** Changes to `AGENTS-template.md` require explicit user permission, consistent with the existing code protection rule for `commands/` and `core/templates/`.
2. **`platform-sync-agent` is the adaptation mechanism:** Content judgment (which sections of the template apply to a given platform) is delegated to an agent rather than hardcoded — allows nuanced adaptation as platforms evolve.

---

## Implementation

**Timeline:** Implemented 2026-03-27 in v0.2.0-beta (Phase 1 + Phase 5)

**Affected Components:**
- `core/templates/AGENTS-template.md` — new; the canonical behavioral specification
- `agents/platform-sync-agent.md` — new; content adaptation for per-platform writes
- `commands/init.md` — updated with multi-platform detection + auto-config step
- `commands/setup-platform.md` — updated with detection logic and per-platform write capability
- `hooks/hooks.json` — PostToolUse hook fires when `AGENTS-template.md` changes and prompts for platform sync

**Migration Path:**
Existing users see no changes. New platform configuration is opt-in during `/kmgraph:init` or explicitly via `/kmgraph:setup-platform`. No existing files are modified without user confirmation.

---

## Validation

**Success Criteria:**
- ✅ `core/templates/AGENTS-template.md` contains no Claude Code-specific syntax (`/kmgraph:`, `skills/`, `hooks.json`)
- ✅ Template validated against Gemini Flash — four core behaviors confirmed working
- ✅ Installer shows diff and asks before overwriting existing platform files
- ✅ Installer provides manual instructions and verification step for any platform user declines to auto-configure
- [ ] Installer detects all six target platforms and offers to configure each — pending manual test on machine with all tools installed

**Review Date:** 2026-09-27 — reassess as new AI coding platforms emerge and MCP adoption broadens

---

## Related Decisions

- **[ADR-017](ADR-017-four-layer-architecture-thin-commands.md):** Four-layer architecture — the agent layer being plain markdown is what makes the template possible
- **[ADR-009](ADR-009-three-tier-installation-architecture.md):** Three-tier installation — platform portability extends the reach of Tier 2 (project-level config) to non-Claude Code platforms

---

## Related Documentation

**Implementation:**
- `core/templates/AGENTS-template.md`
- `agents/platform-sync-agent.md`
- `docs/plans/v0.2.0-beta-master.md` — Phase 1 (template creation) and Phase 5 (installer integration)

---

## Future Considerations

1. **MCP portability:** As MCP client support broadens across platforms, the data layer (kg_search, kg_capture) will become available to more non-Claude Code users. The behavioral template will benefit from having more tool capability available. Revisit template `kg_search` section when Cursor/Windsurf MCP support is confirmed.
2. **Template versioning:** As KMGraph adds new behaviors (e.g., ADR automation, plan management), the template will need versioning to communicate which behaviors require which MCP tool versions. Consider a `<!-- KMGraph-template-version: X.Y -->` comment.

---

**Decision Made:** 2026-03-27
**Last Updated:** 2026-03-27
**Status:** Accepted
