---
title: "Resource-Path Migrations Must Grep the Prompt Layer, Not Just the Server Layer"
created: 2026-07-14T00:00:00.000Z
updated: 2026-07-14T00:00:00.000Z
author: technomensch
git:
  branch: v0.6.18-misc-patches
  commit: 654c13fb
tags: [config-migration, split-brain, prompt-layer, embedded-shell, grep-audit, process, issue-14, github-171]
category: process
---

## Problem

Commit `654c13fb` migrated `mcp-server/src/utils.ts`'s `CONFIG_PATH` default from `~/.claude/kg-config.json` to `~/.kmgraph/kg-config.json`, with a legacy-read fallback added in follow-up commits `2d0aba01` and `dd62385b`. This migration was correct, thorough, and independently reviewed (see the "Two-Cycle Cross-Model Review" lesson) — entirely within `mcp-server/src/`.

It was never propagated to the command/agent/script layer. A full-repo grep for the old path string found **35 files** still containing literal references to `~/.claude/kg-config.json` — and several of these were not documentation staleness but raw `jq`/`mv` shell commands embedded directly inside command-prompt markdown files (e.g. `commands/kmg-init.md`, 38 references) that read/write the file directly, completely bypassing `mcp-server/src/utils.ts`'s `CONFIG_PATH` resolution logic. This became issue-14 (GitHub [#171](https://github.com/technomensch/knowledge-graph/issues/171)).

## Root Cause: Two Independent Access Paths to the Same Resource

A "server layer" migration (fixing a shared utility function's default path) only fixes callers that go through that function. In this codebase, slash-command and agent markdown files embed raw bash directly in their prompt text — a "prompt layer" that reads/writes the same resource through its own literal path string, never calling into `utils.ts` at all. Migrating the server layer does nothing to the prompt layer; they are two independent code paths converging on one resource, and only one got updated.

This is a **split-brain** bug, not staleness: if an un-migrated command runs and writes to the old path while the server layer reads/writes the new path, the two diverge silently. The migration's own test suite only exercises the server-layer code path (that's what it imports and calls), so it can never catch a prompt-layer reference — the test suite structurally cannot see markdown-embedded shell.

## How This Was Discovered (the reusable method)

It was **not** found by testing the migration itself — that worked correctly when exercised through the MCP server, and the two-cycle Fable/Opus review of the server-layer change passed cleanly. It was found by chance: the user manually re-read `commands/kmg-init.md`'s prompt text days later while preparing to demo the init flow, and noticed it still said the old path.

The systematic part came next:

1. **Full-repo grep for the OLD literal path**, run immediately after the chance discovery: `grep -rl '\.claude/kg-config\.json' commands/ agents/ scripts/ skills/ core/ mcp-server/src/ .claude/`. This surfaced the true scope — 35 files, not just the one noticed by accident.
2. **Severity triage by write-vs-read pattern**, not by treating all 35 hits equally: grep specifically for WRITE patterns (`.tmp` + `mv`, direct `jq` write) vs. read-only lookups (`jq -r` reads) vs. pure prose mentions. This separated "actively dangerous" (embedded writes creating real split-brain state) from "cosmetically stale" (a comment or doc line).
3. **Blast-radius check — has it already manifested?** Two parallel agents checked whether the two config files had already diverged in practice on the real machine. They hadn't — purely because no affected command had been run since the migration landed. The bug was "armed but not yet triggered," a live landmine rather than already-manifested corruption. This distinction changes both urgency framing and whether a data-reconciliation step is needed in the fix.
4. **Sibling-migration audit.** The same investigation checked whether any OTHER resource that had undergone a similar `~/.claude/` -> `~/.kmgraph/` migration (the FTS5 search index had also moved) showed the same split-brain pattern. It did not — the FTS5 migration's downstream references were correctly migration-aware. This confirmed the bug was specific to kg-config.json's incomplete migration scope, not a systemic problem affecting every migration in the codebase.

## Solution / Pattern

- **Immediately after any resource-path/format migration in a shared utility, grep the ENTIRE codebase for the OLD literal string** — not just the files already known to call the utility. Do this as a mandatory migration-completion step, not an afterthought triggered by luck.
- **Triage findings by actual risk, not by count.** A reference that WRITES to the resource via a mechanism independent of the migrated code path is high severity (creates real split-brain state). A read-only lookup is medium. A prose/doc mention is low. Fix in that order.
- **Before framing urgency, check whether the bug has already manifested** — diff the old and new resource's current real-world state. "Armed but not triggered" is a different fix (add the missing update) than "already diverged" (also needs a reconciliation/migration step for existing corrupted state).
- **Audit sibling migrations for the same gap.** One instance of "migration didn't propagate everywhere" is a signal to check whether other similar migrations in the codebase have the same completeness gap — don't assume it's isolated, but also don't assume it's systemic without checking (in this case it wasn't).

## General Pattern: When to Apply This

Apply this any time a resource's canonical path, filename, or format changes in a "server layer" — a shared utility function, an SDK, a client library, a config resolver:

- Especially urgent in codebases with markdown-embedded shell (Claude Code slash commands, agent definitions) since these are invisible to normal "search all callers of this function" refactoring tools and to the migration's own test suite.
- Also applies to docs, READMEs, onboarding scripts, CI config, and any other artifact that might reference the old literal path/format outside the code path being refactored.
- The test suite passing is not evidence of migration completeness — it only proves the server-layer code path works. A full-repo literal-string grep is the actual completeness check.

## Evidence

- `654c13fb` — original kg-config.json path migration (server layer only)
- `2d0aba01`, `dd62385b` — legacy-fallback follow-ups to the server-layer migration
- 35 files found referencing the old `~/.claude/kg-config.json` path via `grep -rl '\.claude/kg-config\.json' commands/ agents/ scripts/ skills/ core/ mcp-server/src/ .claude/`
- `commands/kmg-init.md` — 38 references, including embedded `jq`/`mv` writes bypassing `mcp-server/src/utils.ts`
- 3 severity tiers identified: embedded writes (high), read-only lookups (medium), prose mentions (low)
- Sibling check: FTS5 search index migration (also `~/.claude/` -> `~/.kmgraph/`) did NOT exhibit the same split-brain pattern
- Tracked as issue-14, GitHub [#171](https://github.com/technomensch/knowledge-graph/issues/171)

## Context

- Branch: v0.6.18-misc-patches (merged to main); discovery and triage occurred during subsequent v0.6.19 work
- Category: process
