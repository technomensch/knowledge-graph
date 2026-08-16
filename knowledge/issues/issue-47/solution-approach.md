# Solution Approach — issue-47

## Approach

Replace the hardcoded `main...HEAD` / `origin/main..HEAD` comparisons at all four
sites with the merge-base pattern already proven in
`skills/kmg-paperwork-audit/SKILL.md:30-44` — resolve the default branch
dynamically, compute `git merge-base "$DEFAULT_BRANCH" HEAD`, and diff from there.
When `HEAD` IS the default branch, the merge-base equals `HEAD` and the diff range
is legitimately empty — same end state as today for that case, but every other
case (feature branch off a renamed/non-`main` default, detached HEAD, etc.) is now
handled instead of silently assumed.

Do not invent a second implementation — extract or directly copy the
`paperwork-audit` logic (lines 30-44) into a shared shell snippet the other three
sites reuse, so there is exactly one merge-base resolution pattern in the
codebase, not four independent almost-copies.

## Changes required

1. **`agents/session-summary-agent.md:444`** — replace the live diff command with
   the merge-base pattern. When current branch equals resolved default branch,
   consider explicitly labeling the section (e.g. "No feature branch yet — showing
   uncommitted/staged changes only" or similar) rather than leaving it silently
   blank, since this is a legitimate and common state (drafting specs pre-branch),
   not an edge case to hide.
2. **`agents/session-summary-agent.md:474`** — update the template instruction
   text to match the corrected command from (1).
3. **`skills/kmg-docs-impact-scan/SKILL.md:24`** — replace with the merge-base
   pattern. **Requires amending `knowledge/decisions/ADR-036-docs-impact-scan.md`**
   to reflect the new diff-base logic — do not change the skill's behavior without
   updating the ADR that governs it, or the two go out of sync.
4. **`commands/kmg-update-issue-plan.md:87`** — replace `origin/main..HEAD` with
   the merge-base-derived range for the `git log --name-only` lessons-learned
   discovery.

## ADR-036 amendment

Add a section documenting: (a) why `main...HEAD` was insufficient (silently empty
pre-branch), (b) the merge-base replacement, (c) the explicit-label behavior for
the on-base-branch case if adopted per item 1 above. This should be a new
"Amendment" or "Update" section in ADR-036, not a silent behavior change — ADR-036
is the architectural record for this skill's diff logic and should stay accurate.

## Linked Knowledge

- Lesson: `knowledge/lessons-learned/patterns/Lessons_Learned_Patterns_Hardcoded_Main...head_Branch_Comparison_Base_Silently_Returns_Empty_Pre_Divergence.md`

## Out of scope

- No other files beyond the four listed use `main...HEAD`/`origin/main..HEAD`
  per the deep-dive grep — do not expand scope without re-confirming via grep at
  implementation time in case new sites were added since 2026-08-16.
