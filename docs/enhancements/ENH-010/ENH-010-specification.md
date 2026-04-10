---
title: "ENH-010: v0.3.0-beta — Default KG Path Change, Migration Step, and me.md/rules.md Scaffold"
date: 2026-04-09
branch: main
tags: [enhancement, v0.3.0-beta, default-path, migration, me-md, rules-md, init]
---
# ENH-010: v0.3.0-beta — Default KG Path Change, Migration Step, and me.md/rules.md Scaffold

## Problem

Three related gaps addressed in this enhancement:

### Gap 1: Wrong default KG folder

`kmgraph init` defaults the knowledge graph to `./docs/`. This collides with the established convention that `docs/` is a documentation site root (MkDocs, Docusaurus, Jekyll, GitHub Pages). Users who run KMGraph alongside a documentation site discover the collision only after they have invested in a setup.

The correct default is `./knowledge/` at project root, consistent with XDG conventions, open-source patterns (Obsidian, Foam, Logseq), and semantic clarity.

### Gap 2: No migration path for existing installs

Users on the old default (`docs/`) have no guided path to move their KMGraph-managed subdirectories to `knowledge/`. A manual move risks breaking path references in `~/.claude/kg-config.json`.

### Gap 3: Behavioral rules and identity are platform-locked

Behavioral rules and user identity context live in CLAUDE.md and memory files — Claude Code-specific. Users who add Cursor, Windsurf, or Copilot must rewrite equivalent rules in each platform's format. There is no platform-agnostic source of truth.

---

## Expected Behavior

### Phase 1: Change default KG path

`commands/init.md` Step 1a changes the suggested default from `docs/` to `knowledge/`. No other files change — all path resolution is already runtime-dynamic from `~/.claude/kg-config.json`.

### Phase 2: Migration step in init Verify/Upgrade flow

When `kmgraph init` detects a `docs/`-based layout, Step 1f.1 is added:

- Lists KMGraph-managed directories found under `docs/`
- Shows what would move; confirms non-KMGraph content will not be touched
- Requires explicit user confirmation before any move — prompt discloses that rollback is available
- Updates `~/.claude/kg-config.json` after move
- Rewrites internal cross-references in all moved `.md` files and platform config files (CLAUDE.md, GEMINI.md, .cursorrules, .windsurfrules, .github/copilot-instructions.md, .aider.conf.yml)
- Scans project MEMORY.md for stale `docs/` references and surfaces them
- Updates `.gitignore` path rules including `tmp/`, `me.md`, and blanket `docs/` rule if present
- Provides full rollback via re-running `/kmgraph:init` — restores files, config, and cross-references

Migration is opt-in, reversible, and never automatic.

### Phase 4: Migration hardening (v0.3.2)

Opus audit of the migration execution block identified 13 gaps after initial v0.3.0-beta implementation. Two were fixed in v0.3.0-beta (exit code trap in upgrade-inspector; cross-reference rewrite gap). The remaining 11 are addressed in v0.3.2:

- Move loop: adds `tmp/`, symlink guard, merge-safe `docs/knowledge/` handling (rsync), root scaffold file moves
- `.gitignore`: adds `tmp/`, `me.md`, and blanket `docs/` rule (with safety gate)
- Cross-reference rewrite: expands to all platform config files; replaces passive MEMORY.md warning with active scan
- Portability: replaces macOS-only `sed -i ''` with cross-platform `_sed_inplace` helper
- Rollback: full implementation with `rollback_in_progress` atomicity flag; disclosed to users in migration prompt before confirmation

### Phase 3: Scaffold me.md, rules.md, and kg-index.md templates

`kmgraph init` Phase 3 scaffolds three new files at the `knowledge/` root:

- `knowledge/rules.md` — behavioral rules and workflow conventions (platform-agnostic)
- `knowledge/me.md` — user identity and working style for this project (always gitignored)
- `knowledge/kg-index.md` — primary entry point and navigation hub for the KG

**Naming convention (established during live testing, 2026-04-10):**
- `kg-` prefix avoids collision with documentation site `index.md` files (MkDocs, Docusaurus, etc.)
- Project KG: `kg-index.md`, `kg-category-index.md`
- Personal/global KG: `kg-index-global.md`, `kg-category-index-global.md` — mirrors git's `--local`/`--global` scope convention

**Scaffold path fix:** When upgrading a docs/-based KG, root scaffold files write directly to `knowledge/` (the final destination), not `docs/` (which would require migration to move them).

Platform shim templates generated in `core/templates/platform/` for Claude, Cursor, Windsurf, and Copilot.

---

## Affected Files

**Phase 1:** `commands/init.md` — change default path suggestion

**Phase 2:** `commands/init.md` — add Step 1f.1 migration detection, prompt, cross-reference rewrite, MEMORY.md scan

**Phase 4 (v0.3.2):** `commands/init.md` — migration hardening (move loop, .gitignore, cross-ref rewrite, portability, rollback)

**Phase 3:**
- `core/templates/knowledge/me.md` (create)
- `core/templates/knowledge/rules.md` (create)
- `core/templates/knowledge/kg-index.md` (create) — project KG root index
- `core/templates/knowledge/kg-index-global.md` (create) — personal KG root index
- `core/templates/platform/claude-md-shim.md` (create)
- `core/templates/platform/cursorrules-shim.md` (create)
- `core/templates/platform/copilot-instructions-shim.md` (create)
- `core/templates/platform/windsurf-shim.md` (create)
- `commands/init.md` — add Phase 3 scaffold step

**Documentation:** `docs/GETTING-STARTED.md` (or equivalent) — document `knowledge/` as default and the me.md/rules.md pattern

**Command fix:** `commands/create-adr.md` — add "update existing" option to the snapshot gate prompt (currently only offers [y] run new, [n] skip, [?] explain; missing [u] update existing session summary)

---

## Architecture Decision

See ADR-028: me.md + rules.md as Platform-Agnostic Source of Truth.

---

## Acceptance Criteria

- [ ] `kmgraph init` on a fresh project creates KG at `knowledge/` by default
- [ ] `kmgraph init` on an existing `docs/`-based project detects old layout and offers migration
- [ ] Migration moves only KMGraph-managed directories; no non-KMGraph `docs/` content is touched
- [ ] Migration updates `~/.claude/kg-config.json` correctly
- [ ] Migration prompt informs user that rollback is available before confirmation
- [ ] Migration rewrites internal cross-references in moved files and platform config files
- [ ] Migration scans project MEMORY.md and surfaces stale `docs/` references
- [ ] Rollback restores files, config, and cross-references atomically
- [ ] `knowledge/rules.md` is scaffolded with documented structure
- [ ] `knowledge/me.md` is scaffolded with documented structure
- [ ] `knowledge/index.md` is scaffolded as graph entry point with directory map and wiki-linked key files
- [ ] At least one platform shim template exists in `core/templates/platform/`
- [ ] All existing path-resolution tests pass (no regressions)

---

## Out of Scope (v0.3.0-beta)

- Automated shim validation (hook/pre-commit check)
- Automated rules.md migration wizard (fully automated extract-and-rewrite of CLAUDE.md without user review)
  - Note: Phase 3B Step 1.6.5 includes an interactive content migration *offer* — this is in scope
- Cross-platform shim behavior testing (Cursor, Windsurf)
- Pluggable storage backends
- Obsidian wiki link formatting (Phase 4) — moved to v0.3.1-beta (see docs/plans/v0.3.1-beta-obsidian-wiki-links.md)

---

## Session Reference

- 2026-04-09 Planning Session: sessions/2026-04/2026-04-09-v0.3.0-beta-planning-default-path-and-rules-scaffold.md
- 2026-04-10 Implementation + Hardening: sessions/2026-04/2026-04-10-feature-development-refactoring-session-init-shared-modules.md

## Plan Reference

`~/.claude/plans/swift-juggling-narwhal.md` (local only, not committed)
`docs/plans/v0.3.0-beta.md` — Phase 4 Migration Hardening added 2026-04-10