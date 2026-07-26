# issue-26: Solution Approach

**Status:** Deferred — sketch only.

## Proposed Direction

Two independent fixes, not mutually exclusive:

1. **Fix the command file:** update `commands/kmg-start-issue-tracking.md` Step 6.1 to point at the two files that actually exist and already serve this purpose — `knowledge/enhancements/README.md` (for Enhancement-type) and `knowledge/issues/README.md` (for Bug/Refactor/Hardening-type) — instead of the nonexistent `docs/issue-tracker.md`.
2. **Or create the file properly**, if a single cross-cutting tracker (spanning both issues and enhancements in one place) was the original intent and the two READMEs are considered insufficient. Would need scoping: is it generated from the two READMEs, or a third hand-maintained file that then itself risks drifting (same failure class again)?

Lean toward option 1 — it removes a broken reference rather than adding a third thing to keep in sync.

## Resolved

- `git log --all --oneline -- docs/issue-tracker.md` returns zero commits — the file never existed anywhere in this repo's history. Aspirational reference, never built, not a deletion. Confirms option 1 (fix the command's reference) over option 2 (rebuild what was there) — there's no prior content to preserve or restore.
