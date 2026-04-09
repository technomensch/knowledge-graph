---
title: "ADR-028: me.md + rules.md as Platform-Agnostic Source of Truth"
status: Proposed
date: 2026-04-09
tags: [adr, identity, rules, platform-portability, me-md, rules-md, source-of-truth, v0.3.0-beta]
---
# ADR-028: me.md + rules.md as Platform-Agnostic Source of Truth for Identity and Behavioral Rules

**Date:** 2026-04-09
**Status:** Proposed
**Implements:** v0.3.0-beta
**Related:** ADR-001 (centralized KG config), ADR-017 (four-layer architecture), ADR-021 (single source of truth)

---

## Context

KMGraph users currently maintain behavioral rules and identity context across several disconnected locations:

- `CLAUDE.md` (project-level) — project conventions, workflow rules, tool preferences
- `~/.claude/CLAUDE.md` (user-global) — personal preferences, cross-project conventions
- Platform-specific config files — Cursor rules, Copilot instructions, Windsurf rules
- `~/.claude/projects/.../memory/MEMORY.md` — session-derived memory, per-project
- `~/.claude/memory/` — cross-project user-level memory

This fragmentation creates several problems:

1. **Platform lock-in.** Rules written in CLAUDE.md syntax are Claude Code-only. A user switching to or adding Cursor, Windsurf, or Copilot must rewrite the same rules in each platform's format.

2. **Rule drift.** When a rule is updated in one file, its duplicate in another file is silently stale. There is no enforcement mechanism.

3. **Violation surface area.** Rules distributed across 4–6 files are harder to internalize — for both users writing them and AI systems reading them. Rules that require cross-file assembly to understand are rules that get missed.

4. **Identity fragmentation.** A user's working style, communication preferences, and domain expertise are implicit or split across CLAUDE.md and memory files. There is no single "who am I in this project" document.

The problem was demonstrated directly during the 2026-04-09 planning session: a behavioral rule ("always write plan to both locations and open in VS Code") existed in memory but was violated because it was not surfaced as part of the active working context. The rule existed; the shim that would have surfaced it did not.

Nick Milo's "AI OS" framework (Obsidian-ACE, 2024) articulates the same pattern: platform files should be thin shims that say "read these foundation files first." The foundation files are platform-agnostic markdown — readable by any AI tool.

---

## Decision

KMGraph will scaffold three platform-agnostic files as part of the `knowledge/` directory:

### `knowledge/index.md`

The entry point for any agent or human navigating the graph. Contains a one-line project description, directory map linking each pillar to its purpose, wiki links to key standing files (`[[me]]`, `[[rules]]`, `[[lessons-learned/README]]`, `[[decisions/README]]`), and a "Start here" instruction for AI agents. Updated whenever major new subdirectories are added.

### `knowledge/rules.md`

The authoritative home for behavioral rules, conventions, and workflow constraints. Platform files (CLAUDE.md, `.cursorrules`, Copilot instructions) become thin shims with a single line:

```
Before responding, read knowledge/rules.md. Those rules take precedence over anything in this file.
```

**Contents structure:**

```markdown
# Rules — [Project Name]

## Workflow Rules
[git conventions, branch rules, commit format, etc.]

## Tool Preferences
[read/grep/glob preferences, parallel calls, etc.]

## Plan Protocol
[plan language, plan locations, capture checkpoints, etc.]

## Code Protection
[what not to modify, what requires explicit permission, etc.]

## Communication
[response style, approval gates, "never auto-merge", etc.]
```

### `knowledge/me.md`

The authoritative home for user identity, working style, and domain expertise in this project context. **This file is gitignored** — each contributor maintains their own. Committing `me.md` would impose one person's identity and working style on every collaborator. Platform files become thin shims:

```
Before responding, read knowledge/me.md to understand who you are working with.
```

**Contents structure:**

```markdown
# About Me — [Project Name]

## Role and Context
[what this project is, what the user's role is]

## Working Style
[preferences: concise/verbose, async/sync, approval gates, etc.]

## Domain Expertise
[what the user knows well — AI tools, TypeScript, DevOps, etc.]

## Communication Preferences
[output style, emoji policy, markdown vs prose, etc.]

## What I Value
[correctness over speed, clarity over cleverness, etc.]
```

### Two-level hierarchy

Mirrors the existing CLAUDE.md two-level pattern:

| Scope | File | Committed? | Contents |
|---|---|---|---|
| Project | `knowledge/index.md` | ✅ Yes | Entry point, directory map, key file links |
| Project | `knowledge/rules.md` | ✅ Yes | Rules specific to this project — shared by all contributors |
| Project | `knowledge/me.md` | ❌ Gitignored | Who I am in this project — personal, per-contributor |
| Personal (cross-project) | `~/.claude/knowledge-graph/index.md` | N/A (local) | Entry point for personal KG |
| Personal (cross-project) | `~/.claude/knowledge-graph/me.md` | N/A (local) | Personal identity, cross-project preferences |
| Personal (cross-project) | `~/.claude/knowledge-graph/rules.md` | N/A (local) | Personal behavioral rules across all projects |

Project-scoped files take precedence over personal files when they conflict. Personal files supply defaults.

### Platform shim pattern

Each supported platform gets a template shim in `core/templates/platform/`:

- `claude-md-shim.md` — CLAUDE.md shim template
- `cursorrules-shim.md` — `.cursorrules` shim template
- `copilot-instructions-shim.md` — `.github/copilot-instructions.md` shim template
- `windsurf-shim.md` — `.windsurfrules` shim template

The shims are generated during `kmgraph init` (Phase 3 of v0.3.0-beta) and reference the project's `knowledge/rules.md` and `knowledge/me.md` paths.

---

## Rationale

### Why not just keep everything in CLAUDE.md

CLAUDE.md is a Claude Code-specific convention. Users who work across multiple AI tools must maintain separate equivalent files for each platform. Every rule update requires N edits. Platform files are already shims in practice — they configure platform behavior, not store knowledge. Making them explicit shims reduces cognitive load and eliminates silent drift.

### Why markdown files in `knowledge/`

`knowledge/` is the KMGraph-managed directory. Files there are indexed and searchable by the same tooling as lessons and decisions. `rules.md` is version-controlled alongside the project — it is shared team knowledge. `me.md` is gitignored — it is personal context that belongs to the individual contributor, not the repo.

### Why `me.md` is gitignored but `rules.md` is committed

`rules.md` contains project conventions that every contributor must follow — branching rules, commit format, tool preferences. It belongs in the repo alongside the code it governs.

`me.md` contains who *you* are: your working style, domain expertise, communication preferences. Two developers on the same project have different `me.md` files. Committing one person's `me.md` would surface the wrong identity context to every other contributor. It is scaffolded locally and gitignored, just like `sessions/` and `chat-history/`.

### Why two files instead of one

`rules.md` and `me.md` serve different readers. Rules are instructions to AI systems — imperative, behavioral. `me.md` is context for AI systems — descriptive, identity. Mixing them produces a document that is neither good instructions nor good context. Separation also allows platform shims to include only what the platform needs — some platforms benefit more from identity context, others from hard rules.

### Why two-level hierarchy

The two-level pattern is already established in KMGraph via CLAUDE.md (project vs user-global). Extending it to `me.md` and `rules.md` is consistent with existing mental models. Personal preferences should not need to be re-entered in every project; project-specific overrides should not contaminate personal preferences.

---

## Consequences

### Positive

1. **Platform portability.** A user adding Cursor or Windsurf to their workflow gets full rule and identity context by adding one shim line, not rewriting everything.
2. **Single authoritative file.** Rule updates happen in one place. Shims require no maintenance.
3. **Reduced violation surface.** Rules in a dedicated, well-known file are more likely to be surfaced in active context than rules scattered across memory and CLAUDE.md.
4. **KMGraph-indexed.** `rules.md` and `me.md` are searchable via `/kmgraph:recall` alongside lessons and decisions.

### Negative

1. **Discipline required on shim pattern.** If users add rules directly to CLAUDE.md instead of to `rules.md`, the single-source guarantee breaks. No automated enforcement exists yet.
2. **Migration work for existing users.** Existing rules in CLAUDE.md must be manually moved to `rules.md` — the scaffolding creates the file, but does not migrate content.
3. **Shim adoption is voluntary.** The shim templates are generated but not enforced. A user who ignores them gets no benefit.

### Neutral

1. **No change to existing CLAUDE.md behavior.** KMGraph does not modify or delete CLAUDE.md. The shim pattern is additive.
2. **No change to memory files.** `MEMORY.md` remains the session-derived memory store. `me.md` is intentional static identity, not session-derived.
3. **`me.md` gitignore is consistent with existing pattern.** `sessions/`, `chat-history/`, and `tmp/` are already always-gitignored in KMGraph scaffolds. `me.md` joins this list as personal/local-only content.

---

## Implementation

**Phase:** v0.3.0-beta, Phase 3

**Files to create:**
- `core/templates/knowledge/me.md` — platform-agnostic me.md template
- `core/templates/knowledge/rules.md` — platform-agnostic rules.md template
- `core/templates/knowledge/index.md` — project KG master index template
- `core/templates/knowledge/index-personal.md` — personal KG master index template
- `core/templates/platform/claude-md-shim.md`
- `core/templates/platform/cursorrules-shim.md`
- `core/templates/platform/copilot-instructions-shim.md`
- `core/templates/platform/windsurf-shim.md`

**Files to update:**
- `commands/init.md` — scaffold `me.md` and `rules.md` during Phase 3 init
- `docs/GETTING-STARTED.md` (or equivalent) — document the two-file pattern

**Plan reference:** `~/.claude/plans/swift-juggling-narwhal.md` (Phase 3)

---

## Validation

**Success criteria:**
- [ ] `core/templates/knowledge/me.md` exists with documented structure
- [ ] `core/templates/knowledge/rules.md` exists with documented structure
- [ ] `core/templates/knowledge/index.md` exists with directory map and wiki-linked key files
- [ ] `kmgraph init` scaffolds all three files in `knowledge/` for new installs
- [ ] Step 1.6.5 content migration offer present: prompts user to populate me.md/rules.md from existing CLAUDE.md
- [ ] Personal KG scaffold also creates `index.md`, `me.md`, `rules.md` at `~/.claude/knowledge-graph/`
- [ ] At least one platform shim template exists in `core/templates/platform/`
- [ ] Two-level hierarchy is documented in GETTING-STARTED or equivalent

---

## Related Decisions

- ADR-001: Centralized KG config — `knowledge/` path is resolved from `~/.claude/kg-config.json`
- ADR-017: Four-layer architecture — this ADR extends the "thin shim" pattern to platform config files
- ADR-021: Single source of truth — `me.md` and `rules.md` are the canonical sources; all platform files are derived

---

## Deferred

1. **Automated shim validation** — A hook or pre-commit check that verifies platform files contain the shim reference rather than duplicate rules. Out of scope for v0.3.0-beta.
2. **Cursor / Windsurf integration testing** — Verifying that the shim pattern produces correct behavior in non-Claude platforms. Out of scope for v0.3.0-beta; captured in [[ENH-010]].

**Moved into scope (v0.3.0-beta Phase 3B):**
- Content migration offer (Step 1.6.5) — init now prompts to populate me.md/rules.md from existing CLAUDE.md and memory files; previously deferred as the "migration wizard."

---

**Decision Made:** 2026-04-09
**Last Updated:** 2026-04-09 (added index.md as third scaffolded file; content migration offer moved from Deferred to in-scope)
**Status:** Proposed