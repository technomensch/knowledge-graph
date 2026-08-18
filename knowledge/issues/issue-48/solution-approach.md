# Solution Approach — issue-48

**Status: proposed only. No implementation in this issue's branch.**

## Constraint

`commands/kmg-create-adr.md` is **PROTECTED** (`CLAUDE.md` / `knowledge/rules.md`
Code Protection Rules). Any of the options below that touch this file require
explicit user permission before implementation begins — this is a hard gate,
not a suggestion, and applies even though the option itself may otherwise be
low-risk.

## Option A (preferred): command becomes a thin dispatch wrapper to the agent

This is the direction `create-adr-agent.md`'s own header already names
("v0.2.2 will refactor it to a thin dispatch wrapper") — Option A simply
proposes finally doing what was already decided and never executed, rather
than opening a new design question.

- `commands/kmg-create-adr.md` keeps Steps 0-3 (KG resolution, snapshot gate,
  interactive wizard) as-is — these are legitimately command-layer concerns
  (user interaction, flag routing) and already match the agent's own
  Phase -1/0/2/3 structure closely.
- Steps 4-7 (filename generation, frontmatter assembly, body assembly, direct
  write, index update, commit) are replaced with a single dispatch to
  `create-adr-agent` with `context_provided: true` and the wizard answers as
  the payload — the same contract `create-adr-agent.md` Phase 0.5 already
  defines for non-interactive callers.
- Net effect: one implementation of filename/frontmatter/write logic
  (`create-adr-agent.md` Phase 5 → `kg_capture` → `capture.ts`), not two.
  The `implements` field gap (confirmed in `issue-48-description.md`) is
  closed for free, since the command would gain the agent's full Phase 3
  wizard (including question 9) by dispatching to it rather than
  reimplementing a subset.
- Cost: touches the PROTECTED command file. Requires explicit user
  permission per the constraint above.

## Option B: extract shared logic into a common reference both files inline

Same "no shared-code mechanism" constraint issue-47's `solution-approach.md`
already documented for this repo (`agents/`, `commands/`, `skills/` ship to
consumer repos as standalone markdown — there is no import mechanism). Under
this option, one file (likely `create-adr-agent.md`, since it is not
PROTECTED and is the more complete of the two) becomes the canonical
reference, and `commands/kmg-create-adr.md`'s Steps 4-7 are edited to
literally match it field-for-field (filename derivation, full frontmatter
field set including `implements`/`commit_short`, wizard question 9), with a
comment at each site naming the other as the paired copy that must be kept in
sync by hand.
- Net effect: reduces the *current, confirmed* divergence to zero, but does
  not remove the maintenance burden Option A removes — a future edit to one
  file still has no structural mechanism forcing the paired edit to the
  other. This is the same "N inline copies with a comment" pattern
  issue-47 already accepted as unavoidable for actual shell-command logic,
  but ADR frontmatter/filename generation is not shell logic — it already
  has a canonical single implementation available (`capture.ts` via
  `kg_capture`), which Option A reuses instead of duplicating. Option B
  should only be preferred over Option A if there turns out to be a reason
  the command path cannot dispatch to the agent (not currently known).
- Cost: still touches the PROTECTED command file (to bring it in sync).
  Requires explicit user permission.

## Option C: do nothing, document the divergence as accepted

Record the confirmed field-set divergence (author/email nesting,
`commit_short` presence, `implements` always-null) as a known, accepted
limitation rather than fixing it. Lowest cost, but leaves the `implements`
feature gap unresolved indefinitely (mirrors the "v0.2.2 will refactor it"
promise that was already never kept for ~20 patch versions) and leaves two
frontmatter shapes in the corpus going forward, not just retroactively.
Not recommended given the self-acknowledged intent already on record in
`create-adr-agent.md`'s own header, but included for completeness since this
issue's mandate is to propose, not decide.

## Recommendation

Option A. It is the smallest actual code-path change (delete Steps 4-7's
reimplementation, add one dispatch call), it closes the confirmed
`implements` gap as a side effect rather than a separate task, and it
finally executes a decision this repo already made and recorded
(`create-adr-agent.md`'s header) rather than introducing a new one.

## What a consistency check would look like (for test-cases.md)

Regardless of which option is chosen, a regression guard should exist so a
future edit to one ADR-creation code path cannot silently drift from the
other again without being caught — see `test-cases.md`.

## Backfix requirement (applies once an option above is implemented)

Whichever option is eventually chosen, existing ADRs created through the
command path (`commands/kmg-create-adr.md`, before any fix) already carry
the divergent schema documented above — `author`/`email` at top level
instead of nested under `git:`, no `commit_short`, `implements` hardcoded
`null`. **Fixing the code path going forward does not repair those
existing files.** When this issue moves from "tracked" to implementation,
its plan must include a `kg_upgrade` migration (or extension of whichever
migration category issue-46/47 have already established in
`mcp-server/src/tools/upgrade.ts` by then — check its current state first)
that:
- Detects ADRs matching the command-path schema shape (top-level
  `author`/`email`, no `commit_short`, `implements: null` with no
  corresponding wizard answer on record).
- Normalizes structurally-safe cases (moving `author`/`email` under `git:`
  is a pure reshape, no information loss, always safe to automate).
- Does **not** attempt to fabricate a value for `implements` — a null that
  really means "no implementing commit was ever recorded" is not
  reconstructable, and guessing one would be worse than leaving it null.
  Flag these for optional manual backfill rather than guessing.

This is deferred out of *this issue's* current scope (tracking + proposal
only, per user direction) but must be included in the plan whenever
implementation actually starts — noted here now so it isn't rediscovered
and re-litigated later, per explicit user direction (2026-08-17) that
issue-46, issue-47, and this issue should each carry their own backfix
requirement rather than treating "migrate existing users" as a separate,
easily-dropped follow-up.

## Out of scope for this issue

- Implementing any of the options above — this issue is tracking +
  proposing only, per user direction.
- issue-46 and issue-47's own fixes — unrelated root-cause pattern, tracked
  and (for issue-46) partially landed separately.
- Auditing other command/agent pairs in this repo for the same
  two-implementations pattern (e.g. `kmg-capture-lesson` vs.
  `lesson-capture-agent`) — not investigated as part of this issue; flagged
  here as a plausible follow-up but not confirmed, so not claimed as fact.
