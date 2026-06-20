---
title: "Codex upgrade trigger: version sentinel + AGENTS-template.md as canonical source"
created: 2026-06-19T21:50:16.367Z
updated: 2026-06-19T21:50:16.367Z
tags: [codex, upgrade, kg_upgrade, version-sentinel, AGENTS.md, ENH-022, v0.6.4]
category: process
---
## Problem

Codex has no wizard or hook system. When a user installs a new version of the kmgraph plugin, `kg_upgrade` never fires automatically. Upgrades are silently skipped unless the user knows to call it manually.

Claude Code solves this via re-running initialization (which triggers the upgrade inspector). Codex has no equivalent.

## Solution (implemented in v0.6.4 Task 6)

Two-part fix:

### 1. Version sentinel in config

Store `lastAppliedVersion` in the KMGraph config (per graph entry). `kg_upgrade` inspect detects when installed MCP version > stored version and surfaces a `version-update` upgrade item.

Design decision: **absent `lastAppliedVersion` = first install, NOT a mismatch.** No upgrade item is shown on first install. This avoids noise for clean installs where no migration is needed.

After any `apply` run, `lastAppliedVersion` is written back to config = installed version.

### 2. Session-start instruction in AGENTS-template.md

Add a `## Startup Protocol` section instructing Codex to call `kg_upgrade` (inspect mode) at session start and ask before applying any reported upgrades.

## Key Insight: Template vs Personal File

`AGENTS.md` in the project root is the **user's personal file** — patching it directly only fixes the current install.

`core/default-templates/AGENTS-template.md` is the **canonical source** — `kmg-setup-platform` writes this into new `AGENTS.md` files on every new Codex install.

**Always update `AGENTS-template.md` first.** The direct `AGENTS.md` edit is only the upgrade-path patch for existing installs.

## Files Changed

- `mcp-server/src/tools/upgrade.ts` — `checkVersionMismatch`, `updateLastAppliedVersion`
- `core/default-templates/AGENTS-template.md` — canonical Startup Protocol section
- `AGENTS.md` — upgrade-path patch for existing installs

## Tracked In

`knowledge/enhancements/ENH-022/v0.6.4-plan.md` Task 6 (T-50, T-51)
