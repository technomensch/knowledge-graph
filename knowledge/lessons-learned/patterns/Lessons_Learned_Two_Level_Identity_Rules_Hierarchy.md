---
title: "Lesson: Two-Level Identity and Rules Hierarchy for AI Agents"

created: 2026-04-09T00:00:00Z

author: technomensch

email: 917847+technomensch@users.noreply.github.com

git:
  branch: v0.3.0-beta
  commit: a6aa52f96da7318e1395ac6c02e686f3a7006700
  pr: null
  issue: null

sources:
  - url: "https://www.youtube.com/watch?v=example"
    title: "Nick Milo — AI OS Framework (Obsidian-ACE)"
    accessed: "2026-04-09"
    context: "Inspired the separation of identity from behavioral rules"

tags: [identity, rules, hierarchy, context-files, agent-design, platform-portability, gitignore, me.md, rules.md, CLAUDE.md, shim]

category: patterns
---

# Lesson Learned: Two-Level Identity and Rules Hierarchy for AI Agents

**Date:** 2026-04-09
**Category:** patterns
**Version:** 1.0

---

## Problem

Identity context and behavioral rules for AI agents were scattered across `CLAUDE.md`, platform-specific config files, and memory files. This led to:

- Rule drift: a rule updated in one file silently stayed stale in duplicates
- Platform lock-in: `CLAUDE.md`, `.cursorrules`, and equivalent files mixed identity, rules, and platform-specific syntax into one blob
- Violation surface area: rules that should govern agent behavior were not reliably surfaced in active context

**Context:**
- KMGraph v0.3.0-beta, Phase 3 implementation
- Multi-platform project (Claude Code, Cursor, Gemini, Continue)
- Multiple contributors anticipated

**Impact:**
- A behavioral rule ("always write plan to both locations") existed in memory but was violated mid-session because it was not surfaced in active context
- Demonstrated fragility of scattered rules at the worst possible moment — during live implementation

---

## Root Cause

No designated home for "who am I in this project" (identity) versus "what rules apply here" (conventions).

**Analysis:**
1. Platform files (`CLAUDE.md`, `.cursorrules`) were being used as catch-all containers for identity, project rules, and platform syntax
2. No separation between per-contributor context (identity) and shared project conventions (rules)
3. No precedence model: when a rule existed in two places with different values, there was no defined winner
4. Files duplicated rules rather than pointing to a single authoritative source

**Evidence:**
- Memory entry for "always write plan to both locations" was not loaded into active context during Phase 3 work
- Rule was violated; violation was only discovered after the fact
- `CLAUDE.md` contained a mix of contributor-specific preferences and project-wide conventions with no separation

---

## Solution

Two-level hierarchy modeled on the existing `CLAUDE.md` pattern:

| Scope | File | Committed? | Purpose |
|---|---|---|---|
| Project | `knowledge/rules.md` | Yes | Project conventions shared by all contributors |
| Project | `knowledge/me.md` | No - gitignored | Who I am in this project (per-contributor) |
| Personal | `~/.claude/knowledge-graph/rules.md` | N/A local | Cross-project behavioral rules |
| Personal | `~/.claude/knowledge-graph/me.md` | N/A local | Personal identity, cross-project preferences |

**Precedence:** Project-scoped files take precedence over personal files when they conflict. Personal files supply defaults.

**Platform shim pattern:** After scaffolding, `CLAUDE.md` and equivalent platform files become thin shims containing a single line:

> "For full context, read `knowledge/rules.md` and `knowledge/me.md` before acting."

No duplicated rules live in the shim.

### Key Design Decisions

1. **Separate identity from rules** - "who I am" and "what rules apply" are different concerns and change at different rates
2. **Gitignore identity files** - Two developers on the same project have different `me.md` files; committing one person's `me.md` surfaces the wrong identity context to every other contributor
3. **Commit rules files** - `rules.md` contains project conventions every contributor must follow; it belongs in the repo
4. **Make platform files thin pointer shims** - eliminates duplication and the drift it causes

---

## Verification

- Behavioral rules surfaced correctly in subsequent agent sessions after scaffolding
- Platform shim pattern tested across Claude Code and Gemini contexts
- No rule duplication between `CLAUDE.md` shim and `knowledge/rules.md`

---

## Prevention System

**Immediate Prevention:**
- `knowledge/rules.md` added to `.gitattributes` as required file
- `knowledge/me.md` added to `.gitignore`
- `CLAUDE.md` reduced to shim; original content migrated to `knowledge/rules.md`

**Systematic Prevention:**
- Any new platform file (`.cursorrules`, `gemini-context.md`, etc.) created as a shim from day one
- Rules changes made only in `knowledge/rules.md`, never in platform shims

---

## Replication Pattern

### For Other Projects

**When to Apply:**
- AI agents are being used across multiple platforms (Claude Code, Cursor, Gemini, Continue, etc.)
- Multiple contributors will work with AI agents on the same project
- Behavioral rules are currently scattered across platform config files
- Rules drift or violations have occurred due to stale duplicates

**Universal Pattern:**
1. Create `knowledge/rules.md` - project conventions, committed, shared by all contributors
2. Create `knowledge/me.md` - contributor identity and preferences, gitignored
3. Create `~/.claude/{project}/rules.md` and `me.md` for cross-project personal context (optional)
4. Reduce all platform files (`CLAUDE.md`, `.cursorrules`, etc.) to thin shims that point to steps 1-2
5. Define precedence: project-scoped files override personal files when they conflict

**Customization Points:**
- Path for knowledge files (`knowledge/` vs `knowledge/concepts/` vs `.agent/`)
- Whether to use personal-level files or only project-level
- Which platform files to convert to shims vs. deprecate entirely

### Example Application

**Scenario:** A team adopts a second AI coding tool (e.g., adding Cursor to an existing Claude Code project). Rules currently live only in `CLAUDE.md`.

**Implementation:**
```
# Before
.claude/CLAUDE.md        ← rules + identity + platform syntax mixed
.cursorrules             ← duplicates subset of CLAUDE.md rules

# After
knowledge/rules.md       ← single authoritative rules source (committed)
knowledge/me.md          ← contributor identity (gitignored)
.claude/CLAUDE.md        ← shim: "read knowledge/rules.md and knowledge/me.md"
.cursorrules             ← shim: "read knowledge/rules.md and knowledge/me.md"
```

---

## Related Documentation

**Architecture Decisions:**
- [ADR-028](../../decisions/ADR-028.md) - Full rationale for the two-level hierarchy design

**Other Lessons:**
- [Single Source of Truth / DRY Documentation](./Lessons_Learned_Single_Source_Of_Truth_DRY_Documentation.md) - Related principle applied to docs

**Session:**
- [2026-04-09 v0.3.0-beta Implementation Snapshot](../sessions/2026-04/2026-04-09-v0.3.0-beta-implementation-snapshot.md)

---

## Lessons & Takeaways

**Key Insights:**
1. Separating identity ("who am I") from rules ("what applies here") is a fundamental split that pays off immediately in multi-contributor and multi-platform projects
2. The right gitignore boundary is: conventions are shared (committed), identity is personal (gitignored)
3. Platform files as thin shims eliminate an entire class of drift bugs - the shim never gets stale because it contains no rules

**What Worked:**
- Modeling the hierarchy on the existing `CLAUDE.md` pattern gave contributors a familiar mental model
- Gitignoring `me.md` from day one prevented the wrong identity from being committed accidentally

**What Didn't Work:**
- Keeping rules in `CLAUDE.md` alongside platform-specific syntax made them hard to port to new platforms
- Memory entries alone are insufficient to surface behavioral rules - they need to live in an always-loaded context file

**If We Had to Do It Again:**
- Scaffold `knowledge/rules.md` and `knowledge/me.md` at project init time, not mid-project
- Add a lint check that detects rules duplicated between platform files and `knowledge/rules.md`

---

**Version:** 1.0
**Created:** 2026-04-09
**Last Updated:** 2026-04-09
