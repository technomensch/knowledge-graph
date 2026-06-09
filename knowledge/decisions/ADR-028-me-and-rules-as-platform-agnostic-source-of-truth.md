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
| Personal (cross-project) | `~/.kmgraph/index.md` | N/A (local) | Entry point for personal KG |
| Personal (cross-project) | `~/.kmgraph/me.md` | N/A (local) | Personal identity, cross-project preferences |
| Personal (cross-project) | `~/.kmgraph/rules.md` | N/A (local) | Personal behavioral rules across all projects |

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
- `core/templates/knowledge/kg-index.md` — project KG root index template (deployed as `$KG_PATH/index.md`)
- `core/templates/knowledge/index-personal.md` — personal KG master index template

**Files to rename:**
- `core/templates/knowledge/index.md` → `core/templates/knowledge/kg-category-index.md` (KG category navigator for patterns/gotchas/concepts/architecture/workflows; avoids ambiguity with the new kg-index.md root index)
  - Update `commands/init.md:437` to reference `kg-category-index.md`
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
- [ ] `core/templates/knowledge/kg-index.md` exists with directory map and wiki-linked key files; deployed as `$KG_PATH/index.md`
- [ ] `core/templates/knowledge/index.md` renamed to `kg-category-index.md`; `commands/init.md:437` updated
- [ ] `kmgraph init` scaffolds all three files at `$KG_PATH/` root for new installs
- [ ] Step 1.6.5 content migration offer present: prompts user to populate me.md/rules.md from existing CLAUDE.md
- [ ] Personal KG scaffold also creates `index.md`, `me.md`, `rules.md` at `~/.kmgraph/` (updated from `~/.claude/knowledge-graph/` per v0.3.5 path migration — see Path Migration section)
- [ ] At least one platform shim template exists in `core/templates/platform/`
- [ ] Two-level hierarchy is documented in GETTING-STARTED or equivalent

---

## Related Decisions

- ADR-001: Centralized KG config — `knowledge/` path is resolved from `~/.claude/kg-config.json`
- ADR-017: Four-layer architecture — this ADR extends the "thin shim" pattern to platform config files
- ADR-021: Single source of truth — `me.md` and `rules.md` are the canonical sources; all platform files are derived

---

## UX Decision: "See What's New" Before Applying Upgrade

When a user runs `/kmgraph:init` or `/kmgraph:init-personal-kg` and an existing KG is detected, Option 1 in the menu uses the label:

> **"See what's new — review improvements in this version, then decide what to apply"**

This applies to both commands:
- `/kmgraph:init` — shown when an existing project KG is detected (pre-wizard detection menu)
- `/kmgraph:init-personal-kg` — shown when an existing personal KG is already registered (Step 1)

When selected, the command **inspects the KG's actual state first** and reports only what is missing or upgradeable for that specific install — not a generic version changelog. Items already present are never listed.

Example output for a KG missing `me.md` and `rules.md`:
```
Here's what's available for your install:
  • New: me.md — your identity and working style in this project
  • New: rules.md — project conventions and behavioral rules

Apply all, pick individually, or skip?
  1. Apply all
  2. Let me choose which ones to apply
  3. Skip — my setup is already how I want it
```

If nothing is missing or upgradeable, the command says "✅ Your setup is already up to date" and exits without prompting.

The personal KG variant (`/kmgraph:init-personal-kg`) applies the same inspection pattern, scoped to `~/.claude/knowledge-graph/` and omitting the `docs/ → knowledge/` migration check (not applicable to personal KGs).

### FTS5 gitignore guard

Before migrating or removing `.fts5.db` during Step 1f.0 (legacy migration), the command checks whether the file is intentionally gitignored:

- **Gitignored (project KG):** the file is active local state — leave it in place. After path migration it will be orphaned but harmless; a fresh index is rebuilt at the new location on next use.
- **Not gitignored (project KG):** legacy stray — migrate to user cache and remove the gitignore rule.
- **Personal KG:** always outside git, so `git check-ignore` does not apply. A `.fts5.db` that exists is always intentional. Only surface it as an upgrade item when it is *missing* (offer to rebuild).

This prevents the wizard from destroying an active local search index under the assumption that it is a stray file.

---

### Rationale

A static version-keyed changelog becomes stale immediately and requires manual maintenance on every release. More critically, it tells users what changed globally, not what will change for them — a user who already has `me.md` doesn't need to see it listed.

State-derived reporting is always accurate, requires no maintenance, and respects the user's existing setup. It scales naturally: new upgrade checks added in future versions are automatically surfaced without touching any summary text.

This pattern is consistent with the ADR's broader principle — the user should understand what structure is being introduced before it takes effect, and only what is actually relevant to their install.

---

## Deferred

1. **Automated shim validation** — A hook or pre-commit check that verifies platform files contain the shim reference rather than duplicate rules. Out of scope for v0.3.0-beta.
2. **Cursor / Windsurf integration testing** — Verifying that the shim pattern produces correct behavior in non-Claude platforms. Out of scope for v0.3.0-beta; captured in [[ENH-010]].

**Moved into scope (v0.3.0-beta Phase 3B):**
- Content migration offer (Step 1.6.5) — init now prompts to populate me.md/rules.md from existing CLAUDE.md and memory files; previously deferred as the "migration wizard."

---

**Decision Made:** 2026-04-09
**Last Updated:** 2026-05-25 (Amendment: Decision Governance Protocol + Open Questions capture added)
**Status:** Proposed

---

## Amendment — 2026-05-25: Rules File Scale Pattern

As `~/.kmgraph/rules.md` grows beyond ~120 lines, mixing behavioral rules (workflow, communication, approval gates) with plan-protocol rules (execution modes, validation checklists, stuck-work escalation) in a single file creates injection noise — all rules appear in all contexts regardless of relevance.

**Observation:** A recommendation-trigger pattern has been identified (ENH-016): when a rules file exceeds ~120 lines OR contains two or more clearly separable logical domains, the system recommends splitting into focused files.

**Example split pattern:**
- `rules.md` — behavioral rules only (git workflow, communication, approval gates, knowledge capture, profile structure)
- `plan-rules.md` — plan-protocol rules only (branch placement, file location, execution modes, validation, stuck-work escalation, model selection)

**Critical constraint:** Any split requires updating ALL reference files that consume the original `~/.kmgraph/rules.md`:

1. **Platform config files:**
   - `~/.claude/CLAUDE.md` (user-global baseline)
   - `~/.gemini/GEMINI.md` (if using Gemini CLI)
   - `.cursorrules` (if using Cursor)
   - `CLAUDE.md` in each project repo

2. **Hook and automation scripts:**
   - `scripts/pre-skill-rules-inject.sh` — reads rules.md per skill branch; must be updated to read both files or split smartly
   - `scripts/hooks-master.sh` — if it references the original path

3. **Documentation:**
   - `MEMORY.md` index files (user-level and per-project) — update pointers
   - `knowledge/rules.md` / project rules files — document the split and when each is used

**Recovery tool:** The `platform-sync-agent` skill exists to propagate changes across platform config files and hook scripts after a split. Use it to automate the cross-reference update.

**Decision:** Do not split proactively. Split only when the file exceeds the ~120-line threshold AND the user explicitly requests it, OR when the split becomes the most maintainable option during a rules-related amendment (ENH-016 tracks the recommendation-trigger implementation).

**See:** `knowledge/enhancements/ENH-016/ENH-016-specification.md` for the full recommendation-trigger protocol.

**rules-capture sub-file routing (v0.5.10):** The `rules-capture` skill will be updated in v0.5.10 (Task 15) to detect sub-files in `~/.kmgraph/` matching `*rules*.md` and route captured rules to the most specific sub-file based on content keyword matching. See ENH-016 for the routing spec.

**Shipping constraint discovered during implementation (2026-05-25):** The shipped hook must use conditional fallback logic when reading split files. Hardcoding `plan-rules.md` paths in the hook breaks injection for users who haven't split — the sections silently fail to load. Pattern: `[ -f "$PLAN_RULES" ] || PLAN_RULES="$RULES"` before any `_extract_section` call. See ENH-016 spec "Shipping Constraint" section.

---

## Amendment — 2026-05-25: Decision Governance Protocol + Open Questions Capture

Established during v0.5.9 ENH-015 design session.

**Background agent pattern for ADR/ENH creation:** When a decision or enhancement crystallizes during a brainstorming session, ADR drafting and ENH spec capture fire as non-blocking background fast-agents. The brainstorm flow continues uninterrupted. When agents complete, the model presents a review-or-save prompt: "Review before saving, or save now? Files at `knowledge/decisions/ADR-NNN.md` and `knowledge/enhancements/ENH-NNN/`". If "save now": files already written, user reviews outside session at listed paths. If "review first": content surfaced inline for approve/edit/skip per item.

**Open Questions section (required in all ADRs):** All ADR template instances must include an "Open Questions" section. This is the single write path for:
- Unresolved action items surfaced during brainstorming
- Opus review feedback that requires follow-up
- Items that cannot be resolved within the current session

**Session summary deduplication:** The `session-wrap` skill reads all ADRs and ENHs created or modified this session, extracts their "Open Questions" sections, and emits a deduplicated "Open Items" list in the session summary. No direct writes to the session summary "Open Items" section are permitted — structural single-source guarantees dedup. Items scoped to one decision remain in that ADR/ENH permanently; the session summary is the aggregated view for the current session only.

**See:** `knowledge/enhancements/ENH-015/ENH-015-specification.md` for full deliverable list including `skills/session-wrap/SKILL.md` extension (Deliverable 7).

---

## Path Migration (v0.3.5-beta — 2026-04-11)

**Original decision:** The personal (cross-project) knowledge graph was initialized at `~/.claude/knowledge-graph/` by the `init-personal-kg` command.

**Correction:** This path violated the platform-agnostic principle established by this ADR. `~/.claude/` is a Claude Code-specific directory; Gemini CLI, Copilot, and Codex users cannot reach it as a shared personal KG location.

**Updated default:** `~/.kmgraph/` — a platform-neutral home-directory location consistent with the existing `mcp-server/src/cli.ts` convention for project KG home-directory defaults.

**Scope of change:** All commands, skills, agents, and templates that referenced `~/.claude/knowledge-graph/` have been updated. Existing users with a personal KG at the old path should run `/kmgraph:init-personal-kg` which will detect and offer to migrate the installation, or migrate manually:

```bash
mv ~/.claude/knowledge-graph ~/.kmgraph
# Then update ~/.claude/kg-config.json personal.path field
```

**Historical context preserved:** This note records the correction. The original decision text above remains unchanged.