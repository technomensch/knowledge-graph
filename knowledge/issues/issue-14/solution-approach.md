---
id: issue-14
title: Solution Approach — kg-config.json write-path split-brain
status: tracked
created: 2026-07-14
---

# Solution Approach: Issue-14

**Superseded in part by the c1/c2/c3 plans (2026-07-15):** a one-time legacy seed guard WAS added (Opus S2, user-approved), contradicting the "no fallback" line below; and kmg-switch was promoted to HIGH. See the plans + investigation-log for the current design.

## Approach

For each file in the HIGH and MEDIUM tiers, replace the literal `~/.claude/kg-config.json` path with the same resolution logic `mcp-server/src/utils.ts` uses: respect `KG_CONFIG_PATH` if set, otherwise default to `~/.kmgraph/kg-config.json`. Concretely, for bash-embedded commands:

```bash
CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"
```

This exact pattern is already used correctly by the 5 MEDIUM-tier scripts (`hooks-master.sh`, etc.) — they just have the wrong *default* inside it (`$HOME/.claude/kg-config.json` instead of `$HOME/.kmgraph/kg-config.json`). Fixing those 5 is a one-line-per-file default-value change. The 5 HIGH-tier command files have no override support at all yet — they need the full pattern introduced, not just the default value fixed.

For `mcp-server/src/cli.ts:225`, update the literal display string to match `cli.ts:67`'s already-correct wording.

No legacy-read fallback is needed at this layer (unlike `utils.ts`'s own fallback) — these files should call through to the MCP server's config resolution where possible, or at minimum match its default. Do not reintroduce a second, independent fallback-implementation in each file; prefer resolving `CONFIG_PATH` once per script/command and using it consistently.

## c1 — HIGH tier (5 files, real split-brain writes)

`commands/kmg-init.md`, `commands/kmg-init-personal-kg.md`, `commands/kmg-add-category.md`, `commands/kmg-init-shared/kmg-config-entry-write.md`, `commands/kmg-init-shared/kmg-upgrade-inspector.md`. Includes fixing `kmg-init.md`'s FTS5-consent-marker write (lines 134-135) as part of the same file's fix, not a separate task.

## c2 — MEDIUM tier (5 scripts + 1 display string)

`scripts/hooks-master.sh`, `notification-dispatch.sh`, `plan-mirror.sh`, `post-tool-lesson-check.sh`, `session-end-prompt.sh` — one-line default-value fix each. Plus `mcp-server/src/cli.ts:225` — requires a TypeScript rebuild (`mcp-server/dist/`) after the source change, matching this session's earlier precedent (commit `e71aac73`) for keeping `dist/` in sync with `src/` changes.

## c3 — LOW tier (~24 files)

Remaining read-only/prose references. Lower urgency (no write risk) but real volume — worth a single pass rather than deferring indefinitely, since it's the same root confusion (which path is authoritative) even where it's not actively dangerous.

## Verification

For each tier: after the fix, grep the fixed files to confirm zero remaining literal `~/.claude/kg-config.json` references (excluding intentional historical/legacy-fallback documentation, if any). For c1 specifically, given the "armed landmine" finding (files currently in sync only because no affected command has run since the migration), consider a live test: run the fixed `kmg-init`/`kmg-add-category` flow against a throwaway KG and confirm the write lands in `~/.kmgraph/kg-config.json`, not `~/.claude/kg-config.json`.

## Out of Scope

- Investigating why the original c2 migration (`654c13fb`) didn't include this propagation — noted as a scope gap in the issue description, not chased further here.
- `.claude/settings.local.json`'s stale Bash permission-allowlist entries (LOW tier) — cosmetic, functionally inert, low priority even within c3.
- Any resource beyond kg-config.json — blast-radius investigation confirmed this is bounded (FTS5 handling is already correct; no third resource shows the same migration-drift pattern).
