---
id: ENH-013
title: "ENH-013: Rename kg-recall Skill to Reduce Slash Command UI Confusion"
type: Refactor
status: deferred
github-issue: ""
branch: none
version-target: ""
created: 2026-05-21
tags: [enhancement, skills, kg-recall, ux, slash-commands]
---

# ENH-013: Rename kg-recall Skill to Reduce Slash Command UI Confusion

## Problem

Both `kg-recall` (a skill) and `recall` (a command) appear in Claude Code's slash command autocomplete under the `kmgraph` namespace:

- `/kmgraph:recall` — user-invoked command with explicit topic + flags (`--type`, `--format`, `--scope`, etc.)
- `/kmgraph:kg-recall` — auto-trigger skill, designed to fire on keyword phrases like "have we done this before?"

The skill was never intended to be user-invoked. Claude Code lists all registered skills and commands in autocomplete regardless of intent, so both surface identically. This creates:

1. **User confusion** — two recall-related entries with no obvious distinction
2. **Misuse risk** — users may invoke `kg-recall` directly, bypassing the richer `recall` command interface
3. **Naming inconsistency** — `kg-recall` uses the `kg-` prefix (MCP tool convention) rather than a skill naming convention

---

## Expected Behavior

After this refactor:

1. The skill is renamed to something that signals "internal/auto-trigger" rather than "user command"
2. The slash command autocomplete shows only one obvious user-facing recall entry: `/kmgraph:recall`
3. The auto-trigger behavior is preserved — skill still fires on keyword phrases

---

## Proposed Rename Options

| Option | Name | Rationale |
|--------|------|-----------|
| A | `auto-recall` | "auto-" prefix signals automatic behavior |
| B | `recall-trigger` | "-trigger" suffix signals it's a trigger, not a command |
| C | `_kg-recall` | Leading underscore convention for internal/private skills |
| D | `recall-context` | Signals ambient context provision vs active search |

**Recommendation:** Option A (`auto-recall`) — most readable, clearly distinguishes from user-facing `recall` command without cryptic conventions.

---

## Implementation

Minimal change — rename the skill directory and update any internal references:

| Task | Files |
|------|-------|
| Rename `skills/kg-recall/` → `skills/auto-recall/` | directory rename |
| Update skill title/name in `SKILL.md` | `skills/auto-recall/SKILL.md` |
| Verify no hardcoded `kg-recall` references in other skills/commands | grep audit |

**Branch name when implemented:** `ENH-013-rename-kg-recall-skill`

---

## Acceptance Criteria

- [ ] `skills/kg-recall/` directory renamed to `skills/auto-recall/` (or chosen option)
- [ ] `SKILL.md` internal name updated
- [ ] `grep -r "kg-recall" skills/ commands/ agents/` returns zero hits
- [ ] `/kmgraph:auto-recall` still fires automatically on trigger phrases
- [ ] `/kmgraph:kg-recall` no longer appears in slash command autocomplete
- [ ] No regression to `/kmgraph:recall` command behavior

---

## Status

**Deferred** — no version target. No branch created yet.
