---
id: issue-47
type: Bug
status: tracked
github-issue: "#227"
branch: v0.7.1.5-capture-filename-diffbase-fix
created: 2026-08-16
---

# Issue 47: git diff main...HEAD empty pre-branch, silently blanks "files changed" in session-summary and docs-impact-scan

## Summary

Four sites across three subsystems compute "what changed this session/branch" via
`git diff ... main...HEAD` (or `origin/main..HEAD`), with `main` hardcoded as the
base. When the current branch IS `main` — e.g. mid spec-drafting, before a feature
branch has been created — `HEAD == main`, so the diff is main-against-itself:
silently empty. Not an error, just a blank or missing section. This is the exact
condition this issue was discovered under.

## Root Cause

No file in the affected set derives the actual default/base branch or guards for
"current branch equals base branch" before running the diff. `main` is a literal
string.

A correct reference implementation already exists in this same codebase, unused
by the other three: `skills/kmg-paperwork-audit/SKILL.md:30-44` —

```bash
if git show-ref --verify --quiet "refs/heads/${candidate}" 2>/dev/null; then
  ...
fi
...
MERGE_BASE=$(git merge-base "$DEFAULT_BRANCH" HEAD 2>/dev/null)
git diff --name-only "$MERGE_BASE" HEAD -- ...
```

It resolves the default branch dynamically (checking for `main`/`master` via
`show-ref`), computes an actual merge-base, and diffs from there — which degrades
gracefully (empty merge-base range) rather than silently producing a
misleadingly-empty result when run on the base branch itself, and explicitly
handles the undeterminable case.

## Confirmed Scope

| File | Line | Command | Consumer |
|---|---|---|---|
| `agents/session-summary-agent.md` | 444 | `git diff --name-only main...HEAD ...` | live "key files modified" computation |
| `agents/session-summary-agent.md` | 474 | same, repeated in template instructions | "Start-of-Session Reading" checklist for next session |
| `skills/kmg-docs-impact-scan/SKILL.md` | 24 | `git diff main...HEAD` | changed-identifier extraction for docs-impact scan; codified in `knowledge/decisions/ADR-036-docs-impact-scan.md` |
| `commands/kmg-update-issue-plan.md` | 87 | `git log --name-only ... origin/main..HEAD \| grep "lessons-learned/"` | lessons-learned file discovery for issue-plan sync |

Confirmed present, unchanged, in every cached plugin version checked
(0.6.20 → 0.7.1.4).

## Downstream Impact

- `session-summary-agent.md`: the "key files modified" section it produces is
  consumed only by the *next* session's Start-of-Session Reading checklist
  (lines 474-476), which already has an explicit "omit if empty" instruction at
  line 487. Net effect: silent context loss for the next session (a blank
  section, not a broken gate) — the failure mode is information going missing
  quietly, not a downstream check being skipped.
- `kmg-docs-impact-scan`: an empty diff means zero changed identifiers are
  extracted, so the skill has nothing to scan against docs — it would report "no
  docs impact" when in fact the tool hasn't looked, because this skill's use of
  `main...HEAD` is codified in ADR-036. **A fix here requires amending ADR-036**,
  not just patching the skill file, or the fix contradicts a standing
  architectural decision.
- `kmg-update-issue-plan`: an empty `git log` range means lessons-learned file
  discovery silently finds nothing to sync, even if lessons were captured during
  the (pre-branch) session.

## Related

- `knowledge/decisions/ADR-036-docs-impact-scan.md` — must be amended alongside
  the `kmg-docs-impact-scan/SKILL.md:24` fix.
- No ADR currently governs session-filename diff-base selection or issue-plan
  sync diff-base selection — this fix is net-new architecture for those two.
- See [[issue-46]] for the related (but separately-scoped) filename
  double-prepend bug found in the same investigation session.

## Discovery Context

Found 2026-08-16 while validating issue-46, when the user noted the repro
happened "before we had even started a new branch, we were still drafting the
specs" — which pointed directly at this second, distinct defect. Confirmed and
scoped via an Opus deep-dive subagent (`agentId: ae187d4f06180abd7`) before
filing. Full snapshot of the session: `knowledge/sessions/2026-08/2026-08-16-main.md`.
