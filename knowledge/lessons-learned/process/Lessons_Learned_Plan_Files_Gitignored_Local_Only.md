---
title: 'Lesson: Plan Files Are Gitignored — Local-Only Working Copies'
category:
  uri: uri-that-does-not-map-to-process
---

# Lesson: Plan Files Are Gitignored — Local-Only Working Copies

**Date:** 2026-03-28
**Category:** Process (Development Workflow)
**Discovered during:** v0.2.1-beta implementation (ENH-001 issue tracking)

---

## Problem

During v0.2.1-beta, running `/kmgraph:start-issue-tracking` while on the implementation branch silently switched to a new `issue/ENH-001-global-kg` branch. All subsequent commits landed on the wrong branch. During cleanup, time was wasted attempting to commit `docs/plans/` files before discovering they are gitignored.

**What happened:**
- Tried to `git add docs/plans/v0.2.1-beta-master.md`
- Git silently ignored the file (`.gitignore` entry for `docs/plans/`)
- No error — the file simply wasn't staged
- Several minutes spent debugging why the file wasn't appearing in `git status`

---

## Root Cause

`docs/plans/` is in `.gitignore`. Plan files are intentionally local-only — they serve as a working reference during implementation, not a committed artifact.

| Location | Purpose | Committed? | Persistent? |
|----------|---------|-----------|-----------|
| `~/.claude/plans/` | Internal Claude Code session storage | N/A | No (ephemeral) |
| `docs/plans/` | Local working reference during implementation | **No (gitignored)** | Yes (local only) |

---

## Solution

Never attempt to commit files under `docs/plans/`. When setting up a new branch or handing off work, copy the plan file manually if needed — but treat it as a scratch pad, not a tracked artifact.

**Correct workflow:**
1. Plan mode creates `~/.claude/plans/{name}.md` (auto)
2. Copy to `docs/plans/{version}-{slug}.md` for local reference (manual, optional)
3. Implement — update checkboxes in `docs/plans/` as steps complete
4. Commit only implementation artifacts: code, tests, documentation
5. `docs/plans/` changes are never staged or committed

**When handing off work to another branch/session:**
- The implementation artifacts (committed code) are the handoff
- Plan files do not need to be transferred — they are ephemeral working notes

---

## When to Apply

- Any time a plan file needs to be "saved" or "committed" — it cannot and should not be
- When setting up a new implementation branch and wondering where the plan file went
- When a `git add docs/plans/` produces no output — this is expected, not an error

---

## Related

- **ADR-014:** Maintain Dual Plan File Locations
- **CLAUDE.md:** "Plans are LOCAL-ONLY and gitignored" in Key Workflows section
- **Lesson:** Plan File Dual-Location Protocol

---

## See Also

- [Knowledge Graph: Concepts — Dual Plan File Protocol](../../knowledge/concepts.md#dual-plan-file-protocol)

---

**Category:** process
**Status:** Captured from v0.2.1-beta implementation incident
**Last Updated:** 2026-03-28
