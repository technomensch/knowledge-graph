---
id: issue-47
type: Bug
status: tracked
github-issue: "#227"
branch: v0.7.2-issues-46-51
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

A correct reference implementation already exists in this same codebase — in
**two** places, neither reused by the other three sites:
`skills/kmg-paperwork-audit/SKILL.md:29-41` (the undeterminable-`DEFAULT_BRANCH`
handling is prose immediately after, at line 43) and, per that skill's own
line 27 ("Same method Gate 5 uses"), an identical copy at
`scripts/pre-push-gate.sh:119-127` —

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
misleadingly-empty result when run on the base branch itself. If `DEFAULT_BRANCH`
can't be determined at all (no local `main`/`master` ref — real in fresh
single-branch clones or some worktree setups), the reference implementation
skips the dependent steps and reports why, rather than guessing a fallback.
**`scripts/` is dev-only and never ships to consumer repos** (stated at
`kmg-paperwork-audit/SKILL.md:19`), so it cannot be the canonical copy for
logic that lives in shipped `agents/`/`skills/`/`commands/` files — the
`kmg-paperwork-audit/SKILL.md:29-41` copy is the one to treat as canonical and
inline at the three new sites (see solution-approach.md).

## Confirmed Scope

| File | Line | Command | Consumer |
|---|---|---|---|
| `agents/session-summary-agent.md` | 444 | `git diff --name-only main...HEAD ...` | live "key files modified" computation |
| `agents/session-summary-agent.md` | 474 | same, repeated in template instructions | "Start-of-Session Reading" checklist for next session |
| `skills/kmg-docs-impact-scan/SKILL.md` | 24 | `git diff main...HEAD` | changed-identifier extraction for docs-impact scan; codified in `knowledge/decisions/ADR-036-docs-impact-scan.md` |
| `commands/kmg-update-issue-plan.md` | 87 | `git log --name-only ... origin/main..HEAD \| grep "lessons-learned/"` | lessons-learned file discovery for issue-plan sync |

Confirmed present, unchanged, in every cached plugin version checked
(0.6.20 → 0.7.1.4).

## Backfix Requirement

The fix at the four call sites only prevents *new* silent-blank sections.
Existing session-summary files captured while on the base branch pre-branch
already have an unexplained blank "key files modified" section. **This
branch does not ship without a `kg_upgrade` migration** that distinguishes
"correctly blank" (was genuinely on the default branch) from "bug-affected"
(was on a feature branch, blanked by the bug) and attempts best-effort
reconstruction of the latter from git history — see `solution-approach.md`
items 7-8.

## Downstream Impact

- `session-summary-agent.md`: the "key files modified" section it produces is
  consumed only by the *next* session's Start-of-Session Reading checklist
  (lines 474-476), which already has an explicit "omit if empty" instruction at
  **line 485** (not 487 — that's the section divider). Net effect: silent
  context loss for the next session (a blank section, not a broken gate) —
  the failure mode is information going missing quietly, not a downstream
  check being skipped.
- `kmg-docs-impact-scan`: an empty diff means zero changed identifiers are
  extracted, so the skill has nothing to scan against docs — it would report "no
  docs impact" when in fact the tool hasn't looked, because this skill's use of
  `main...HEAD` is codified in ADR-036. **A fix here requires amending ADR-036**,
  not just patching the skill file, or the fix contradicts a standing
  architectural decision.
- `kmg-update-issue-plan`: an empty `git log` range means lessons-learned file
  discovery silently finds nothing to sync, even if lessons were captured during
  the (pre-branch) session. **This file is PROTECTED** (`commands/` per
  `CLAUDE.md` Code Protection Rules) — fixing it requires explicit user
  permission before editing.
- **Docs site references the buggy pattern too, and will contradict the fix
  once landed:** `docs/pillars/tailoring/docs-impact-scan.md` (lines 17, 28)
  states `git diff main...HEAD` as the documented behavior;
  `docs/superpowers/specs/2026-04-16-docs-impact-scan-design.md:60` says the
  same in a historic design spec (decide keep-as-history vs. annotate, don't
  silently edit a historic spec without a note).

## Related

- `knowledge/decisions/ADR-036-docs-impact-scan.md` — must be amended alongside
  the `kmg-docs-impact-scan/SKILL.md:24` fix. The codified sentence is
  specifically **Workflow item 1, line 53** — cite that directly rather than
  "amend ADR-036" generically. Three unrelated drive-by errors found in this
  same ADR while reviewing it, worth fixing in the same amendment pass since
  the file is already being touched: line 73 and line 136 both say
  `skills/docs-impact-scan/SKILL.md` (actual path is
  `skills/kmg-docs-impact-scan/`); line 184 says `**Status:** Proposed` while
  the frontmatter and line 25 both say `Accepted`.
- No ADR currently governs session-filename diff-base selection or issue-plan
  sync diff-base selection — this fix is net-new architecture for those two.
- See [[issue-46]] for the related (but separately-scoped) filename
  double-prepend bug found in the same investigation session.

## Discovery Context

Found 2026-08-16 while validating issue-46, when the user noted the repro
happened "before we had even started a new branch, we were still drafting the
specs" — which pointed directly at this second, distinct defect. Confirmed and
scoped via an Opus deep-dive subagent (`agentId: ae187d4f06180abd7`) before
filing; citations and the second-existing-copy finding (`pre-push-gate.sh`)
validated via a follow-up Opus review (`agentId: ab2c94344860e5824`). Full
snapshot of the session: `knowledge/sessions/2026-08/2026-08-16-main.md`.
