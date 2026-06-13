---
title: "ENH-012: Rules and Identity File Hardening — Platform Split for Tool Directives"
number: 012
status: implemented
version_target: "v0.3.5-beta"
github_issue: null
created: 2026-04-11
related_adrs: ["ADR-028", "ADR-032"]
related_enhs: []
---
# ENH-012: Rules and Identity File Hardening — Platform Split for Tool Directives

## Problem

`knowledge/rules.md` is designed to be platform-agnostic (ADR-028), but contains Claude Code-specific tool references in its Tool Preferences section:

- `Glob`, `Grep`, `Bash`, `Read`, `Edit` — Claude Code tool API names
- `context-mode MCP tools` — Claude Code-specific plugin
- `subagents` — Claude Code delegation pattern
- `.jsonl` — Claude Code transcript format

On non-Claude platforms (Gemini CLI, Cursor, Codex), these directives reference tools that do not exist. This violates ADR-028's platform-agnostic guarantee and prevents `knowledge/rules.md` from traveling cleanly to other platforms.

---

## Expected Behavior

After this enhancement:

1. `knowledge/rules.md` contains zero Claude Code-specific tool names
2. Claude-specific tool directives live in `CLAUDE.md` (root) under `## Platform Preferences (Claude Code)` — `CLAUDE.md` IS the platform config file for Claude Code; no separate `knowledge/platform/` directory
3. Other platforms use their native files: `GEMINI.md`, `.cursorrules`, `AGENTS.md`
4. `core/templates/knowledge/rules.md` reflects the same platform split with a guidance comment
5. `kmgraph init` upgrade flow detects contamination in existing `knowledge/rules.md` and offers relocation to `CLAUDE.md`

---

## Implementation Plan

See `docs/plans/v0.3.5-beta.md` for the full plan.

| Task | Description | Files |
|------|-------------|-------|
| 0 | Audit pass — enumerate contamination sites | read-only |
| 1 | Scaffold `knowledge/platform/` + ADR-032 | create `knowledge/platform/claude.md`, update `CLAUDE.md`, create ADR-032 |
| 2 | Clean `knowledge/rules.md` | remove Claude-specific entries, add ADR-032 reference comment |
| 3 | Restructure `core/templates/knowledge/rules.md` | adopt new H2/H3 hierarchy, add guidance comment |
| 4 | Update `commands/init.md` upgrade flow | detect contamination, offer relocation |
| 5 | Version bump + CHANGELOG + PR | bump to 0.3.5-beta, open PR |

---

## Architecture Decision

**ADR-032** originally proposed a `knowledge/platform/` directory pattern. Superseded in v0.3.5-beta fixup: `CLAUDE.md` at repo root IS the platform config for Claude Code — no intermediate directory needed. Native platform files (`CLAUDE.md`, `GEMINI.md`, `.cursorrules`, `AGENTS.md`) own tool directives directly.

---

## Acceptance Criteria

- [x] `knowledge/rules.md` passes `grep -E 'Glob|Grep|Bash|Read|Edit|WebFetch|\.jsonl'` — zero hits on tool-specific lines
- [x] `CLAUDE.md` has `## Platform Preferences (Claude Code)` with all relocated directives
- [x] `knowledge/platform/` directory removed
- [x] ADR-032 marked Superseded in both `knowledge/decisions/` and `knowledge/decisions/`
- [ ] `core/templates/knowledge/rules.md` guidance comment updated (protected — pending permission)
- [ ] `commands/init.md` upgrade flow target updated from `knowledge/platform/claude.md` → `CLAUDE.md` (protected — pending permission)
- [ ] Version bumped to `0.3.5-beta`; CHANGELOG updated; PR opened

---

## Status

**In progress** — v0.3.5-beta branch
