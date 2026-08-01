---
id: issue-35
type: Bug
status: deferred
github-issue: null
branch: none
created: 2026-07-30
related_adrs: ["ADR-066"]
related_issues: ["issue-31", "issue-34"]
---

# issue-35: `kg_search`/FTS5's `"knowledge"` Directory Entry Is a Dead Pre-Migration Path Literal — Recurrence of issue-31's Pattern

## Problem

Found 2026-07-30 in the same code read that surfaced issue-34. Verified directly against the real code and against `kg-config.json`'s actual runtime value, then confirmed via `kg_search`/recall — not assumed:

- `kg-config.json` resolves this project's KG path (`kgPath`) to `/Users/mkaplan/GitHub/knowledge-graph/knowledge` — i.e. `kgPath` **is** the `knowledge/` folder itself, not the repo root.
- `mcp-server/src/tools/fts5.ts`'s `rebuildIndex()` builds `contentDirs = ["knowledge", "lessons-learned", "decisions", "sessions", "chat-history"]`, each joined directly onto `kgPath`.
- `mcp-server/src/tools/search.ts`'s fallback `searchDirs` list carries the identical `"knowledge"` entry.
- Since `kgPath` already points at `knowledge/`, joining the literal string `"knowledge"` onto it resolves to `knowledge/knowledge` — a path that has never existed. This entry indexes/searches nothing in both functions; it is dead weight left over from an earlier state of the code where `kgPath` likely pointed at the repo root instead of directly at `knowledge/`.

## Why This Is Its Own Issue (Not Folded Into issue-34)

issue-34 (recall never searching `knowledge/issues/`/`knowledge/enhancements/`) and this issue share a discovery moment and a file, but are unrelated defects with different fixes: issue-34 is a missing-directory omission, this is a dead/stale-path entry that was probably valid once and never updated when `kgPath`'s meaning changed. Splitting per the user's explicit instruction — these are two bugs, not one.

## Recurrence, Not a New Pattern

This is the same failure class `issue-31` already documents: `commands/kmg-handoff.md` hardcoded `./handoff-packages/` instead of the post-v0.6.20-migration `knowledge/handoffs/`, because the migration's verification scope never grepped for old path literals across the codebase. issue-31's own "Open Questions" section explicitly asked *"Are there other commands ... with similarly stale hardcoded paths left over from the same v0.6.20 migration? Not audited as part of this issue."* This issue answers that question: yes — and not just in `commands/*.md` as issue-31 scoped, but in `mcp-server/src/tools/` itself, meaning the migration's blast radius on stale path literals is broader than issue-31 alone accounted for.

## Proposed Behavior

- Remove (or correct) the dead `"knowledge"` entry from both `contentDirs` (`fts5.ts`) and `searchDirs` (`search.ts`) — it should not be re-added once issue-34's fix adds `issues`/`enhancements`, since `kgPath` is already `knowledge/` itself.
- As issue-31 already flagged: consider a repo-wide grep for other stale pre-migration path literals (e.g. `./handoff-packages`, `~/.claude/knowledge-graphs`, `~/.claude/cowork-knowledge`, and now confirmed: bare `"knowledge"` as a joined subdirectory name) across both `commands/*.md` and `mcp-server/src/`, rather than treating each recurrence as a one-off.

## Notes

Captured live, lightweight, local-only — track only, no plan, no branch. Second confirmed recurrence of the same migration-verification gap issue-31 first documented.

## Related

- issue-31 (`knowledge/issues/issue-31/issue-31-description.md`) — the first instance of this exact pattern (`kmg-handoff.md` hardcoded path), whose own "Open Questions" section predicted this recurrence
- issue-34 (`knowledge/issues/issue-34/issue-34-description.md`) — separate bug found in the same investigation (recall never searches `issues`/`enhancements`)
- `ADR-066` (`knowledge/decisions/ADR-066-kg-content-storage-location-for-global-and-cowork-modes.md`) — § "Post-Implementation Gap," root cause shared with issue-31
- `mcp-server/src/tools/fts5.ts` (`rebuildIndex`, `contentDirs`)
- `mcp-server/src/tools/search.ts` (fallback `searchDirs`)

## Fix Plan (C2, branch v0.7.0)

Plan: `v0.7.0-c2-issue-34-35-patch` — locked in 2026-08-01, reviewed by Opus before lock-in. Folded together with issue-34 (same two array literals, same test fixtures) — separate commits within the plan, per ADR-014 commit-per-governing-group.

**Opus pre-lock review findings:**

1. **BLOCKER (fixed in plan before lock-in):** the `"knowledge"` literal is not actually dead in tests — `mcp-server/tests/fts5.test.ts` and `mcp-server/tests/search.test.ts` both use `<kgRoot>/knowledge/` as their primary fixture content directory (`scaffoldKg()` plus ~13 direct fixture writes across the two files). Removing the literal without migrating these fixtures first would silently zero out ~13 tests' indexed content and fail their `indexed > 0` / `results.length > 0` assertions. Plan's Phase 1 now includes a mandatory fixture-migration step (move fixtures to a surviving dir, e.g. `lessons-learned`) before the array edit is considered complete, and Phase 2 gates on `npm test` passing.
2. Verification steps in the original draft ("confirm no errors", "expect no regressions") were unfalsifiable — replaced with a concrete baseline/after `indexed`/`skipped` count comparison from `kg_fts5_rebuild`.
3. Phase 0's "working tree clean" pre-check was too broad given other in-flight `knowledge/` changes on this branch — narrowed to `git status -- mcp-server/`.
4. Confirmed accurate: file paths, `contentDirs` at `fts5.ts:293`, fallback `searchDirs` at `search.ts:86`, no `issues`/`enhancements` scope leakage into issue-34's territory, and no third occurrence of the dead literal in either array (other `"knowledge"` hits in `cli.ts`/`config.ts`/`upgrade.ts` are unrelated repo-root-scoped code). `upgrade.ts:65`/`:253` already fixed the same root cause once before — cited as commit-body precedent.

Status unchanged (`deferred` → will move to in-progress once Phase 1 execution starts).
