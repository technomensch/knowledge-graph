# Solution Approach — issue-47

## Approach

Replace the hardcoded `main...HEAD` / `origin/main..HEAD` comparisons at all four
sites with the merge-base pattern already proven in
`skills/kmg-paperwork-audit/SKILL.md:29-41` — resolve the default branch
dynamically, compute `git merge-base "$DEFAULT_BRANCH" HEAD`, and diff from there.
When `HEAD` IS the default branch, the merge-base equals `HEAD` and the diff range
is legitimately empty — same end state as today for that case, but every other
case (feature branch off a renamed/non-`main` default, detached HEAD, etc.) is now
handled instead of silently assumed.

**Resolved (no longer an open decision):** inline the verbatim 9-line block
from `skills/kmg-paperwork-audit/SKILL.md:29-41` at each of the three new
sites, with a one-line comment at each naming that file as the canonical
copy. There is no shared-shell-lib convention for `agents/`, `commands/`, or
`skills/` in this repo — they ship to consumer repos as standalone markdown,
so there's no import mechanism to extract into. `scripts/` is dev-only and
never ships (`kmg-paperwork-audit/SKILL.md:19`), so a shared file there
couldn't be referenced by shipped skills/agents even if one were created —
that's also why `scripts/pre-push-gate.sh:119-127`'s copy (identical, per
paperwork-audit's own line 27) is a second inline copy, not the canonical
source. Three inline copies plus the existing two is five total instances of
the same 9 lines — accepted as the cost of this repo having no shared-code
mechanism for markdown-shipped instructions, not something to solve as part
of this fix.

**Undeterminable-default-branch fallback, required at all three new sites:**
`kmg-paperwork-audit/SKILL.md:43` handles the case where neither `main` nor
`master` exists as a local ref (`refs/heads/`) — real in fresh single-branch
clones and some worktree setups — by skipping the dependent steps and
reporting why, rather than guessing. `git merge-base "" HEAD` fails and
`MERGE_BASE` comes back empty if this isn't handled, and the subsequent
`git diff --name-only "" HEAD` errors out. Each of the three new sites must
carry this same fallback, not just the merge-base happy path:
- **`session-summary-agent.md:444`** — if undeterminable, show "Files changed
  this session: unknown (no local main/master branch found)" instead of
  running the diff.
- **`kmg-docs-impact-scan/SKILL.md:24`** — if undeterminable, skip identifier
  extraction and report the reason, same as the reference implementation's
  own behavior.
- **`kmg-update-issue-plan.md:87`** — if undeterminable, skip lessons-learned
  discovery for this run and report the reason.

## Changes required

1. **`agents/session-summary-agent.md:444`** — replace the live diff command with
   the merge-base pattern (inlined per above) plus the undeterminable-branch
   fallback. When current branch equals resolved default branch, explicitly
   label the section (e.g. "No feature branch yet — showing
   uncommitted/staged changes only" or similar) rather than leaving it silently
   blank, since this is a legitimate and common state (drafting specs pre-branch),
   not an edge case to hide.
2. **`agents/session-summary-agent.md:474`** — update the template instruction
   text to match the corrected command from (1).
3. **`skills/kmg-docs-impact-scan/SKILL.md:24`** — replace with the merge-base
   pattern plus fallback. **Requires amending
   `knowledge/decisions/ADR-036-docs-impact-scan.md`** to reflect the new
   diff-base logic — do not change the skill's behavior without updating the
   ADR that governs it (specifically Workflow item 1, line 53), or the two go
   out of sync.
4. **`commands/kmg-update-issue-plan.md:87`** — replace `origin/main..HEAD` with
   the merge-base-derived range (inlined per above) plus fallback, for the
   `git log --name-only` lessons-learned discovery. **This file is
   PROTECTED** (`commands/` per `CLAUDE.md` Code Protection Rules) — obtain
   explicit user permission before editing; do not proceed on this item
   without it.
5. **`docs/pillars/tailoring/docs-impact-scan.md`** (lines 17, 28) — update to
   describe the merge-base behavior instead of `git diff main...HEAD`, once
   item 3 lands.
6. **`docs/superpowers/specs/2026-04-16-docs-impact-scan-design.md:60`** — this
   is a dated historic design spec, not living documentation. Decide: leave
   as-is with a note that behavior has since changed (preferred — it's a
   point-in-time record), or update in place. Do not silently edit a historic
   spec without flagging the decision.

## Backfix for existing users (required before this branch ships)

Fixing the four call sites only prevents *new* silent-blank sections. Every
existing session-summary file captured while on the base branch pre-branch
already has a blank/missing "key files modified" section, with no
indication why — that's not corrupted data to repair, but it is a silent,
unexplained gap that should not ship unaddressed once the fix exists to
explain it.

7. **`mcp-server/src/tools/upgrade.ts`** — add a migration (new `kg_upgrade`
   category, or fold into issue-46's `"capture-corruption"` category if by
   the time this is implemented that's the more natural home — decide at
   implementation time) that scans `sessions/*/*.md` for files with an
   empty/missing "key files modified" section. For each:
   - If the file's frontmatter `branch:` is the repo's actual default
     branch (`main`/`master`) — the blank section is *correct*, not a gap.
     Nothing to backfix; optionally add the explicit label from item 1
     above for consistency with newly-captured files, but this is cosmetic,
     not a data-loss repair.
   - If `branch:` is a feature branch and the recorded `commit`/
     `as_of_commit` is still resolvable in local git history — this is the
     genuinely bug-affected case (the file was captured while `HEAD`
     equaled `main`, i.e., a merge or rebase happened before this session
     summary was written, or the branch itself has since been deleted but
     the commit is still reachable). Attempt to regenerate the section
     using the corrected merge-base diff logic against that historical
     commit. If the commit/branch is no longer resolvable (deleted, gc'd),
     leave a note explaining the gap can no longer be reconstructed, rather
     than silently doing nothing.
8. This is inherently best-effort — old commits and deleted branches are
   sometimes genuinely gone. Report what could and couldn't be
   reconstructed; never fabricate a plausible-looking file list for a commit
   that isn't actually resolvable.

## ADR-036 amendment

Add a section documenting: (a) why `main...HEAD` was insufficient (silently empty
pre-branch), (b) the merge-base replacement, (c) the explicit-label behavior for
the on-base-branch case adopted per item 1 above, (d) the undeterminable-branch
fallback behavior. This should be a new "Amendment" or "Update" section in
ADR-036, not a silent behavior change — ADR-036 is the architectural record
for this skill's diff logic and should stay accurate.

**Drive-by fixes while this file is already being edited** (found during
review, unrelated to the diff-base logic itself but cheap to fix in the same
pass): line 73 and line 136 both say `skills/docs-impact-scan/SKILL.md` —
actual path is `skills/kmg-docs-impact-scan/`. Line 184 says
`**Status:** Proposed` while the frontmatter and line 25 both say `Accepted` —
resolve to whichever is actually true and make both consistent.

## Linked Knowledge

- Lesson: `knowledge/lessons-learned/patterns/Lessons_Learned_Patterns_Hardcoded_Main...head_Branch_Comparison_Base_Silently_Returns_Empty_Pre_Divergence.md`

## Out of scope

- Re-confirmed via a second Opus review pass (2026-08-16) with a repo-wide
  grep over `agents/ commands/ skills/ hooks/ scripts/ core/ mcp-server/src`:
  no fifth call site exists beyond the four already listed. When
  implementation Step 8 re-greps, widen scope to also include `docs/` (see
  items 5-6 above) — the original re-grep instruction covered only
  `agents/ commands/ skills/`.
