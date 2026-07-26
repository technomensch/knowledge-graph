# ENH-052: Solution Approach

**Status:** Option B implemented in `scripts/pre-push-gate.sh` (Gates 5 and 6),
functionally tested against real repo data (see test-cases.md). Gate 6's
companion skill, `skills/kmg-paperwork-audit/SKILL.md`, is built and its
flag/gate integration verified — its judgment-based checks (Steps 2-3) have
not yet been exercised against a real resolved/deferred item.

## Direction Decided: Option B (rejected A and C)

### Option A — New self-referential "KG consistency" skill — REJECTED
A pre-ship skill that audits `knowledge/` against itself, distinct from
`kmg-docs-impact-scan`. Rejected because it repeats the exact failure mode
ADR-043 already documented for this project: skill-based enforcement depends on
the model recognizing a trigger phrase and choosing to invoke it — a
probabilistic dependency, not a deterministic one.

### Option B — New gates on `scripts/pre-push-gate.sh` — SELECTED, IMPLEMENTED
Added Gate 5 (index-count freshness + backlink symmetry) and Gate 6 (paperwork-
audit completion flag) alongside the existing Gate 2 (version sync, also
extended) and Gate 4 (github-issue-sync). Advisory injection, exits 0, same
`additionalContext` channel as every existing gate. Lowest-surface-area option —
no new skill for the mechanically-checkable parts, extends a script that
already owns pre-push invariants and already has the exact ADR-050 precedent
for pairing a gate with a skill's completion flag (Gate 3 + `kmg-docs-impact-scan`).

### Option C — Extend `kmg-docs-impact-scan`'s scope — REJECTED
Rejected for the same evidence as Option A: `kmg-docs-impact-scan` is already
documented (issue-13, ADR-050) as insufficiently reliable on its own — its
whole reason for having Gate 3 wired to it is that the skill alone wasn't
enough. Adding more responsibility to the skill without addressing that root
cause would compound the problem, not fix it.

## What Was Actually Implemented

**Gate 5 (mechanical, no judgment required):**
- Index-count check: for each of `decisions`, `enhancements`, `issues`,
  `lessons-learned`, parses the declared "Total X" count out of that area's
  `README.md` and compares it against the real count on disk (`find` with the
  area-appropriate pattern — flat `.md` files for decisions/lessons-learned,
  directories for enhancements/issues). On mismatch, the message explicitly
  says entries are missing from the list and must be added by hand — not "edit
  the number to match" (a real wording bug caught and fixed during review).
- Backlink symmetry check: scoped to only the issue/ENH docs that changed on
  the current branch (`git diff` against the merge-base with `main`/`master`) —
  not a full-KG scan, to keep the check cheap on every push. For each changed
  doc, extracts every `issue-N`/`ENH-NNN` reference it makes, and checks whether
  the referenced doc's own file contains a backlink to the source.

**Gate 2 (extended in the same pass):** previously only compared `package.json`
against `.claude-plugin/plugin.json`. Now also compares against
`.codex-plugin/plugin.json` and `.claude-plugin/marketplace.json`'s embedded
plugin entry. Also now checks `mcp-server/package.json`, but only when
`mcp-server/src/` actually changed on the branch (detected via the same
merge-base diff) — the old "mcp-server is independent, ignore" framing was
itself inaccurate: this project bumps `mcp-server/package.json` in lockstep
with the plugin release whenever its source changes, which is most releases.

**Gate 6 (flag-file check, mirrors Gate 3 exactly):** checks for
`/tmp/kmgraph-paperwork-audit-<branch>-<sha>.flag` (same naming convention as
Gate 3's `kmgraph-docs-scan` flag, substring-swapped). If absent, injects a
reminder naming the two things it can't verify itself: issue/enhancement
`status:` accuracy and session-summary currency. **Nothing currently writes
this flag** — see the companion skill spec below.

## Companion Skill Specification: `kmg-paperwork-audit`

Gate 6 depends on a skill that doesn't exist yet. This section specs it so
Gate 6 isn't a permanent, unsatisfiable reminder.

**Purpose:** handle the two checks Gate 5 explicitly cannot — they require
reading and understanding content, not just counting files or grepping for a
reference pattern.

**Trigger:** same class as `kmg-docs-impact-scan` — phrase-triggered
(something like "before I push" / "run the paperwork audit" / "check issue
status") **and** explicitly invocable by name. Should fire naturally in the
same pre-push conversational moment `kmg-docs-impact-scan` already targets, so
a user doesn't need to remember two separate names.

**Steps:**
1. Identify the branch's diff scope the same way Gate 5 does (merge-base
   against `main`/`master`).
2. For every `knowledge/issues/*/issue-N-description.md` and
   `knowledge/enhancements/*/ENH-NNN-specification.md` changed or created on
   this branch: read its `status:` frontmatter. If `resolved`, look for
   evidence backing that claim in the same diff (a fix commit, a passing test,
   an explicit "Fix" section referencing verified behavior — the kind of
   evidence this session's own `issue-27`/`issue-28` docs already contain).
   Flag any `resolved` item with no such evidence as *questionable, not wrong*
   — this is advisory, the skill cannot know for certain, only note the absence
   of expected support.
3. For every item still `deferred`: check whether the diff contains commits
   that look like they implement it anyway (e.g. touch the exact file/line the
   deferred item names). Flag a mismatch the same way — advisory, not a hard
   verdict.
4. Read the current session summary (`knowledge/sessions/<latest>.md` for this
   branch) and compare its "as of" state against the actual latest commit on
   the branch. If they've diverged (new commits since the summary's last
   update), flag it as stale.
5. Report findings the same way `kmg-docs-impact-scan` does — as advisory notes
   for the user to review before pushing, not auto-corrections.
6. Write the completion flag (`/tmp/kmgraph-paperwork-audit-<branch>-<sha>.flag`,
   detached-HEAD fallback matching Gate 3's pattern) so Gate 6 sees it ran,
   **regardless of whether it found anything** — same "ran vs. found nothing"
   distinction Gate 3 already makes for `kmg-docs-impact-scan`.

**Explicitly not this skill's job:** anything Gate 5 already covers mechanically
(index counts, backlink presence) — re-checking those here would be redundant
work across two mechanisms for the same fact.

**Not built as part of this pass.** This is a specification only — building the
actual skill file, testing its trigger phrasing, and verifying its flag-writing
against Gate 6 are separate future work.

## Explicit Non-Goals of the Mechanism

- Does **not** cover Docusaurus link integrity (issue-13) or `commands/*.md`
  references (issue-26). Gates 5/6 never touch `docs/` (the Docusaurus site) or
  `commands/`.
- Does **not** subsume ENH-042's release-doc version-sync reconciliation; that
  stays its own item, though Gate 2's extension in this pass narrows the gap
  between the two.
