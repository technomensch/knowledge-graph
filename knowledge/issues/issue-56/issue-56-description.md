---
id: issue-56
type: Bug
status: tracked
github-issue: "#TBD"
branch: v0.7.4-bug-fixes
created: 2026-08-22
related_issues: ["issue-31", "issue-30", "issue-55"]
---

# issue-56: `kmg-handoff`'s default-path fix (issue-31) has no `kg_upgrade` category — 17 stray `./handoff-packages/*` directories are undetected and undisclosed

## Problem

Found 2026-08-22 during a v0.7.4-bug-fixes branch closeout review, prompted by a direct question: "is there anything that impacts the user, such as moving or renaming files or architecture, that they need to be informed or asked about during `kg_upgrade`?"

issue-31 (this same branch, `Closes issue-30, issue-31` in `CHANGELOG.md`) changed `commands/kmg-handoff.md`'s default output directory from the stale pre-migration `./handoff-packages/$(date +%Y-%m-%d)` to `knowledge/handoffs/$(date +%Y-%m-%d)`. This is the same *class* of user-facing architecture change as issue-55 (a file/directory location a user depends on moved) — but unlike issue-55, it was never wired into `kg_upgrade`, and the leftover artifacts from the old location were never disclosed anywhere a user would see them before or after upgrading.

## Root Cause

Two gaps, both confirmed live on this branch:

1. **No `kg_upgrade` category.** `grep -n "handoff" mcp-server/src/tools/upgrade.ts` returns nothing but one unrelated comment. Contrast with issue-55, which added a full `stale-fts5-index-format` category (`checkStaleFts5IndexFormat`/`applyStaleFts5IndexFormat`, wired into `APPLY_ORDER`, the `z.enum([...])` list, and `kmg-upgrade-inspector.md`) for the equivalent situation in that fix.
2. **No disclosure.** `CHANGELOG.md`'s `[0.7.4]` entry for issue-30/31 states the fix but says nothing about the pre-existing leftover directories. issue-31's own description file *did* discuss disposition ("Option A — migrate" / "Option B — discard") but explicitly left it to "the user's own discretion, not resolved by this fix" — that discretion was never surfaced to the actual user anywhere outside this one issue file, which most users installing the plugin would never read.

## Reproduction (confirmed live, not hypothesized)

```
$ ls -d ./handoff-packages/*/ 2>/dev/null | wc -l
17
```

17 dated directories at repo root (`handoff-packages/2026-04-21` through at least `2026-07-28`, per issue-31's own count at planning time — re-derive live, do not trust either number as current), all gitignored (`.gitignore:94`), so `git status` never surfaces them and no automated check (test suite, `kg_upgrade` inspect pass) currently reports on them.

## Why This Matters (per explicit user policy, this session)

During issue-55's own design review, the user gave this project-wide directive: *"everything that is shipping with this update, if it impacts user-facing files or architecture, it needs to be accounted for in the upgrade script."* That directive was stated after issue-30/31 had already landed on this branch, but it is phrased as covering the whole release ("shipping with this update"), not scoped to issue-55 alone — so issue-30/31's own architecture change falls under it too, and is currently the one item on this branch not accounted for per that standard.

## Suggested Fix (not decided, not designed — for a future fix task to work out)

Mirror issue-55's pattern:
- A new `kg_upgrade` category (e.g. `"stale-handoff-packages-location"`) that detects one or more `./handoff-packages/<date>/` directories at the repo root and offers an opt-in action — likely "move contents into `knowledge/handoffs/<date>/`" (preserving the package structure) rather than silent deletion, per this project's own ADR-063 "never destroy state the user didn't agree to lose" precedent (already applied in issue-55's resolution).
- Needs a decision on exactly what "migrate" means here — issue-31's own Option A/B framing (migrate vs. discard) was never resolved; whoever designs this fix should decide, or route the choice to the user via the upgrade prompt itself rather than picking on their behalf.
- A `CHANGELOG.md`/root `README.md` disclosure of the stray-directory situation should land at the same time as (or before) the code fix — not after, per issue-50/51's own "does the category reach users" lesson.

## Status

Tracked, not yet designed or implemented. Filed as a direct consequence of a user-asked architecture-impact review of this branch, not from an independent bug hunt. GitHub issue creation deferred — file when this is scheduled for implementation, per this project's own Mode 1/Mode 2 convention in `commands/kmg-start-issue-tracking.md`.
