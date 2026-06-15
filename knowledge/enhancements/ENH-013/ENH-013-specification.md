---
title: "ENH-013: Rename kg-recall Skill to Reduce Slash Command UI Confusion"
number: 013
status: in-progress
version_target: "v0.6.0"
github_issue: null
created: 2026-05-21
related_adrs:
  - ADR-053
related_enhs: []
---

# ENH-013: Rename kg-recall Skill to Reduce Slash Command UI Confusion

> **v0.6.0 scope note:** Absorbed into full kmg- prefix normalization (ADR-053). Final name is `kmg-auto-recall` — `kmg-` prefix per ADR-053 cross-platform convention, `auto-` per ENH-013 intent to signal internal/auto-trigger behavior.

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

**v0.6.0 update:** Combined with ADR-053 `kmg-` prefix normalization, the final name is **`kmg-auto-recall`** (preserves the `auto-` signal while applying the cross-platform prefix).

---

## Implementation

Minimal change — rename the skill directory and update any internal references:

| Task | Files |
|------|-------|
| Rename `skills/kg-recall/` → `skills/kmg-auto-recall/` | directory rename |
| Update skill title/name in `SKILL.md` | `skills/kmg-auto-recall/SKILL.md` |
| Update `kg-recall` references | `commands/handoff.md`, `docs/CHEAT-SHEET.md` |
| Update spec status/version_target/chosen option | `knowledge/enhancements/ENH-013/ENH-013-specification.md` |
| Verify no hardcoded `kg-recall` references in other skills/commands | grep audit |
| Bump version files to v0.6.0 | `package.json`, `.claude-plugin/plugin.json`, `mcp-server/package.json`, `CHANGELOG.md`, `README.md`, `INSTALL.md` |

**Branch:** v0.6.0 implementation branch (phase plans in `knowledge/enhancements/ENH-013/v0.6.0-phase-*.md`)

---

## Acceptance Criteria

- [ ] `skills/kg-recall/` directory renamed to `skills/kmg-auto-recall/`
- [ ] `SKILL.md` internal name updated to `kmg-auto-recall`
- [ ] `grep -r "kg-recall" skills/ commands/ agents/` returns zero hits
- [ ] `/kmgraph:kmg-auto-recall` still fires automatically on trigger phrases
- [ ] `/kmgraph:kg-recall` no longer appears in slash command autocomplete
- [ ] No regression to `/kmgraph:recall` command behavior
- [ ] Version files bumped to v0.6.0 (package.json, plugin.json, mcp-server/package.json, CHANGELOG.md, README.md, INSTALL.md)

---

## Status

**In Progress** — v0.6.0 target. Branch: `v0.6.0-kg-recall-rename`.

Phase 0 (mcp-server security fix) complete — commit b579c177.
ENH-013 absorbed into full kmg- prefix normalization (ADR-053). Phase plans in `knowledge/enhancements/ENH-013/v0.6.0-phase-*.md` (not yet written).

**Selected option:** A, final name `kmg-auto-recall` — `kmg-` prefix per ADR-053, `auto-` suffix per ENH-013 intent.
