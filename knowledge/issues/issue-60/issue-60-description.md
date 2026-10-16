---
id: issue-60
type: Hardening
status: deferred
github-issue: "#261"
branch: none
created: 2026-09-17
related_enhs: ["ENH-065"]
---

# Issue-60: Meta-issue attempt-sync only fires on `--add-attempt`/`--log-attempt`, not on hand-created attempt folders

## Problem

Found 2026-09-17 while auditing broken links in this repo's own teaching example (`docs/examples/meta-issue/example-performance-saga/`) during branch `v0.7.10-fix-release-doc-sync-and-broken-links`.

`commands/kmg-meta-issue.md`'s "SOP 1: Creating New Attempt Folder" (`--add-attempt`) and "Command: Log Attempt with Hypothesis" (`--log-attempt`) were patched on that branch to update `README.md`'s Timeline Summary table and `description.md`'s attempt-count/status field in the same step as `implementation-log.md` — closing the specific drift that broke the example content (a status field claiming N attempts while supporting detail only reflected N-1).

That patch only helps when a user actually invokes one of those two commands. It does nothing if:
- An attempt folder is created by hand (`mkdir attempts/003-foo`) instead of via `--add-attempt`
- `README.md`, `description.md`, or `implementation-log.md` is edited directly, outside the command flow
- An agent or user copies/adapts an existing meta-issue structure without going through the command

In all of these cases, the three files can silently drift out of sync again — exactly the failure mode this issue's own motivating example (`example-performance-saga`) hit in the first place. The fix landed on v0.7.10 closes the common path, not the underlying gap.

This is explicitly recorded as an open, not-yet-closed limitation in `knowledge/decisions/ADR-072-meta-issue-tracking-pattern.md`'s "Future Considerations" section (Automation Opportunities item): *"this sync is only triggered by those two commands... True automation (e.g. a hook or lint check that verifies the three files agree regardless of how they were edited) remains a future consideration, not yet closed."*

## Scope

- In scope: real projects using `/kmgraph:kmg-meta-issue` for actual (non-example) multi-attempt problem tracking — the same class of drift that hit this tool's own bundled example content could hit any real meta-issue in any project using this pattern.
- Out of scope (this issue): implementing the fix. This issue only tracks the gap for future work (Mode 3 — track only, deferred).

## Related

- [ENH-065](../../enhancements/ENH-065/ENH-065-specification.md) — same artifact-drift shape, here for meta-issue attempts folders and logs.
- `knowledge/decisions/ADR-072-meta-issue-tracking-pattern.md` — records the pattern's origin, the v0.7.10 patch, and this exact limitation in its Future Considerations section.
- `commands/kmg-meta-issue.md` — the command whose SOP 1 / `--log-attempt` steps were patched (partial fix) on v0.7.10.
- `docs/examples/meta-issue/example-performance-saga/` — the teaching-content example where this exact drift pattern was first discovered (missing `attempts/003-connection-pooling/` files while README/description/implementation-log/test-cases all narrated a 3rd attempt as real).
