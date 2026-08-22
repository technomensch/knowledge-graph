---
id: issue-38
type: Bug
status: deferred
github-issue: "#201"
branch: none
created: 2026-08-01
related_adrs: ["ADR-067"]
related_issues: ["issue-31", "issue-35"]
---

# issue-38: Multiple `tests/` Suites Reference Pre-`kmg-`-Prefix Command/Skill Names — Silently Broken Since the Rename Migration

## Problem

Several suites under `tests/` assert against command and skill filenames using a naming
convention that predates the `kmg-` prefix rename. The prefixed names (`kmg-help.md`,
`kmg-sync-all.md`, `kmg-create-adr.md`, etc.) are the only ones that exist in `commands/`
and `skills/` today — confirmed live throughout the ADR-067 session referenced below and
re-confirmed directly in this session by re-running each suite. Because these tests were
never updated through whatever migration introduced the `kmg-` prefix, they fail on
file-not-found errors rather than on any real regression, and have likely been silently
broken since that migration landed.

## Confirmed Failures (re-run 2026-08-01)

- `tests/test-commands.sh` — looks for `commands/help.md`, `commands/sync-all.md`;
  actual files are `commands/kmg-help.md`, `commands/kmg-sync-all.md`.
  Result: 8 passed, 4 failed.
- `tests/test-skills-agents.sh` — looks for `skills/lesson-capture/`, `skills/kg-recall/`,
  `skills/session-wrap/`, `skills/adr-guide/`, `skills/brainstorm-recall/`, none of which
  exist under those names (current convention uses `kmg-`-prefixed skill directories).
  Result: 10 passed, 7 failed.
- `tests/test-tier-resolver-smoke.sh` — looks for
  `commands/init-shared/ai-model-tier-resolver.md`, which does not exist at that path.
  Result: 0 passed, 6 failed.
- `tests/test-tier-resolver-edge.sh` — same missing resolver path.
  Result: 2 passed, 13 failed.
- `tests/test-create-adr-implements.sh` — looks for `commands/create-adr.md`; actual file
  is `commands/kmg-create-adr.md`.
  Result: 5 passed, 2 failed (both failures are the stale path — Test 1 file-exists and
  Test 3 content-check).
- `tests/test-dispatcher-tier-refactor.sh` — looks for
  `commands/init-shared/ai-model-tier-resolver.md` plus old command names
  (`commands/capture-lesson.md`, `commands/session-summary.md`, `commands/sync-all.md`).
  Result: 4 passed, 4 failed.
- `tests/test-decision-governance.sh` — looks for `skills/brainstorm-recall/SKILL.md` and
  references old `adr-guide`/`gov-execute-plan` content under pre-prefix paths.
  Result: 7/19 passed.

Exact pass/fail counts are a snapshot at spec time, not load-bearing — they will drift as
other unrelated test/content changes land on this branch. The load-bearing fact is the
failure *class*: file-not-found against pre-`kmg-`-prefix paths, not real regressions in
the subsystems under test.

## Why This Matters

Because these suites fail on missing files rather than exercising real behavior, the test
suite currently cannot validate any change to the command dispatch, skills/agents
inventory, or tier-resolver subsystems — including future work that touches those areas.
A passing run of `tests/run-all-tests.sh` today does not mean those subsystems are sound;
it means those suites never got the chance to check.

## Root Cause

Same shape as issue-31 and issue-35: a rename/migration (in this case, whatever change
introduced the `kmg-` prefix convention for commands and skills) never had its
verification scope extended to cover `tests/`. Both prior issues found this exact pattern
in `commands/*.md` path literals (issue-31) and in `mcp-server/src/tools/` directory-list
literals (issue-35); this issue is the same migration-verification gap surfacing a third
time, this time in the test suite itself.

## Where This Was First Surfaced

`knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md`
§ "Known Gap — Full Test Suite Findings, Cross-Session (2026-08-01)" — surfaced while a
different plan (`v0.7.0-c3-adr-068-pilot.md`, ADR-068) ran `tests/run-all-tests.sh` as a
verification step. That addendum triaged 12 of 18 failing suites into three groups; this
issue covers group 2 (the stale `kmg-`-prefix test paths), which the addendum explicitly
recommended filing as "its own standalone bug, same general shape as issue-31/issue-35's
stale-pre-migration-path pattern but in the test suite rather than command/tool source."

Group 1 (`test-mcp-edge-cases.sh`, possibly related to ADR-067's own WIP) and group 3
(`test-stop-hook.sh`, `test-hooks.sh`, confirmed unrelated to either ADR) are out of scope
for this issue — not investigated here.

## Scope

Not pre-decided here (tracking only). At minimum, whoever picks this up should:

1. Update the stale filenames/paths in each affected suite to the current `kmg-`-prefixed
   equivalents.
2. Confirm whether `commands/init-shared/ai-model-tier-resolver.md` was renamed,
   relocated, or removed outright — `test-tier-resolver-smoke.sh` and
   `test-tier-resolver-edge.sh` both depend entirely on that one path and currently fail
   100%/87% of their assertions respectively.
3. Re-run `tests/run-all-tests.sh` after fixes to confirm the affected suites now exercise
   real behavior instead of failing on file-not-found.
4. Consider whether a repo-wide grep for other pre-`kmg-`-prefix literals across `tests/`
   (beyond the suites listed here) is warranted, per the same recommendation issue-31 and
   issue-35 already made for `commands/*.md` and `mcp-server/src/`.

## Notes

Filed via full workflow (GitHub issue + local issue file), not the lightweight
capture-only path, because code in `tests/` will change as a direct result once someone
fixes this — it needs GitHub visibility, unlike issue-35 which was deliberately kept
local-only.

## Related

- `knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md`
  § "Known Gap — Full Test Suite Findings, Cross-Session (2026-08-01)" — where this was
  first surfaced and triaged (group 2)
- `knowledge/issues/issue-31/issue-31-description.md` — first instance of this exact
  migration-verification-gap pattern (`kmg-handoff.md` hardcoded path)
- `knowledge/issues/issue-35/issue-35-description.md` — second recurrence (dead
  `"knowledge"` directory-list literal in `mcp-server/src/tools/`)
- `tests/test-commands.sh`, `tests/test-skills-agents.sh`,
  `tests/test-tier-resolver-smoke.sh`, `tests/test-tier-resolver-edge.sh`,
  `tests/test-create-adr-implements.sh`, `tests/test-dispatcher-tier-refactor.sh`,
  `tests/test-decision-governance.sh` — the affected suites
- [issue-40](../issue-40/issue-40-description.md), [issue-41](../issue-41/issue-41-description.md)
  — same-file batching candidate: this issue's `tests/test-create-adr-implements.sh`
  failure and issue-40/41's fixes both touch `commands/kmg-create-adr.md`/
  `commands/kmg-capture-lesson.md`'s comparison logic; good single-PR candidate
  alongside those two.
- `commands/kmg-sync-all.md` hotspot: also touched by
  [issue-37](../issue-37/issue-37-description.md), issue-40 (above), and ENH-026 —
  FYI, not batched with this issue.
