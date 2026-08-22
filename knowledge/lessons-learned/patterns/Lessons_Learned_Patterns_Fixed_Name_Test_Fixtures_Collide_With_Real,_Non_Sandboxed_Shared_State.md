---
title: "Fixed-Name Test Fixtures Collide With Real, Non-Sandboxed Shared State"
created: 2026-08-22T22:17:00.644Z
updated: 2026-08-22T22:17:00.644Z
author: technomensch
git:
  branch: v0.7.4-bug-fixes
  commit: 7ce68ecc
tags: [testing, test-isolation, sandboxing, fts5, config, env-override, fixtures]
category: patterns
---
## Problem

Twice in this project, a test suite used a fixed, predictable identifier — a hardcoded knowledge-graph name or a hardcoded config-file path — instead of a randomized/sandboxed one. This let a test run read or write real, non-test, shared state left over from a previous run or from actual production usage, producing a silent, hard-to-diagnose failure (stale or clobbered data treated as current) rather than a clean crash.

## Root Cause

- **Occurrence 1 — `kg-config-silent-overwrite`** (resolved `ac70b490`, PR #164, GitHub [#163](https://github.com/technomensch/knowledge-graph/issues/163), closed 2026-07-11): `scripts/hooks-master.sh:12` hardcoded `CONFIG_PATH="$HOME/.claude/kg-config.json"` with no environment-variable override. `tests/test-hooks.sh` and `tests/test-stop-hook.sh` had no way to sandbox that path, so they `cp`/`rm -f` the *real* config file in place, relying on a single `trap cleanup EXIT` to restore it afterward. `~/.claude/kg-config.json` was found containing only a leftover `test-kg` fixture entry — the user's real graph registrations had been wiped.
- **Occurrence 2 — [issue-55](../../issues/issue-55/issue-55-description.md)** (resolved on `v0.7.4-bug-fixes`, GitHub #242): `mcp-server/src/tools/fts5.ts`'s `getProjectDbPath(kgName)` keyed the FTS5 search-index file path only by the KG's `name` field, never by its actual filesystem path. `tests/test-mcp-tools.sh` always registered its test KG under the fixed name `"test-kg"`. A prior, unrelated test run (2026-08-18) had left `~/.kmgraph/index/projects/test-kg.db` on disk. A later, unrelated run's `kg_search` found that stale file, trusted it as the current index without checking provenance, and silently returned "No results found" for content that was actually present in the fresh fixture — confirmed live by deleting the one stale file and watching the suite go from 25/27 to 27/27 passing with zero code changes.

In both cases the fixed name/path was the enabling condition, not incidental: any two independent things that happen to share the same predictable identifier — two test runs, two repos, a test run and real production usage — collide on the same real, persistent file, and the collision produces silently wrong output rather than a visible error.

## Solution

Both fixes added an environment-variable override so tests can point the affected code at a temp directory instead of real shared state:

- `KG_CONFIG_PATH` (occurrence 1).
- `KG_INDEX_DIR` (occurrence 2) — `getIndexDir()` in `mcp-server/src/utils.ts`, explicitly modeled on the `KG_CONFIG_PATH` precedent, wired into `mcp-server/tests/jest.setup.ts` and `tests/test-mcp-tools.sh`.

Occurrence 2 additionally fixed the underlying keying defect itself — the FTS5 index path is now keyed by both the KG name and a hash of the KG's normalized real filesystem path, so even real production usage of two same-named KGs no longer collides. The env-override alone would only have fixed test isolation, not the production-facing version of the same bug class (any two repos registering same-named KGs would still have shared an index file).

## General Pattern

A test suite that addresses a persistent resource — a config file, a cache/index file, a database row — by a fixed, predictable identifier (a hardcoded name or hardcoded path) will eventually collide with real state that happens to share that identifier: state left over from a prior test run, or from genuine non-test usage. Because the lookup by that identifier still *succeeds* (it finds *a* file/row at that name/path), the failure is silent — stale or wrong data is read, or real data is overwritten, as if it were the current test's own fixture, rather than the system raising a clear "not found" or "conflict" error.

## How to Replicate

1. Audit test setup/fixture code for any hardcoded name or path used to register or address a resource that persists outside the test process (a config file, a cache/index file, a database row keyed by name, anything under the user's home directory).
2. For each one, ask: does anything else in the system — another test run, another repo, real production usage — resolve to that same identifier? If yes, it is a collision risk regardless of whether it has manifested yet.
3. Add an environment-variable override for the resource's real-state location (mirror an existing precedent's naming if one exists, e.g. `KG_*_PATH` / `KG_*_DIR`), defaulting to the real location in production and overridden to a `mktemp`-style temp location by the test harness.
4. If the identifier collision is also reachable outside of tests (i.e., it is a real production bug and not just test-isolation breakage), fix the underlying keying/lookup logic too — an env-override alone only isolates tests, it does not fix the production-facing exposure.
5. Prefer a suite-generated random/unique identifier per run over a fixed literal wherever the code under test allows it, in addition to (not instead of) the env-override escape hatch.

## When to Apply

- Reviewing or writing any test fixture/setup that registers something under a literal, hardcoded name (e.g. `"test-kg"`, `"test-user"`, `"test-db"`).
- Reviewing or writing any test that reads or writes a file under a fixed path inside `$HOME`, `~/.config`, or any other location shared with real production state.
- A test failure that looks like stale or wrong data being silently returned or consumed, rather than a crash or a clear error — this is the signature symptom of this pattern, not a coincidence.
- Adding a new cache, index, or registry file that is addressed by a user-chosen or fixture-chosen name rather than a guaranteed-unique identifier.

## Audience

Anyone writing or reviewing test fixtures/harnesses in this project, and anyone designing a new cache/index/registry keyed by a non-guaranteed-unique name.

## Context

- Discovered as a named recurrence while closing out [issue-55](../../issues/issue-55/issue-55-description.md) on `v0.7.4-bug-fixes`, which explicitly cross-references the first occurrence.
- First occurrence: [kg-config-silent-overwrite](../../issues/kg-config-silent-overwrite/description.md) — resolved `ac70b490`, PR #164, GitHub [#163](https://github.com/technomensch/knowledge-graph/issues/163).
- Second occurrence: [issue-55](../../issues/issue-55/issue-55-description.md) — resolved this branch, GitHub [#242](https://github.com/technomensch/knowledge-graph/issues/242).
- Capture deferred per `knowledge/plans/v0.7.4-tracker-fixes-plan.md` Task 5 Step 8, run after Task 5's review went clean.
- Branch: v0.7.4-bug-fixes
- Commit: 7ce68ecc
