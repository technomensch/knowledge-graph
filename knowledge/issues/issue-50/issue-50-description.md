---
id: issue-50
type: Hardening
status: resolved
github-issue: pending
branch: v0.7.2-issues-46-51
created: 2026-08-17
related_enhs: ["ENH-052"]
---

# issue-50: No Check That a Bug Fix Requiring Data Backfill Gets a kg_upgrade Category — Or That the Category Reaches Users

## Problem

When a bug fix in this project corrupts or otherwise affects already-captured knowledge-graph
content, nothing checks whether that fix needs a corresponding `kg_upgrade` backfix category, and
nothing checks that the category — once someone does add one — is actually reachable by users
through the supported upgrade path (`/kmgraph:kmg-init`). Both steps happen only if a person
manually remembers to do them.

## Root Cause

There is no gate anywhere in the fix-authoring workflow (`kmg-execute-plan` skill, the
`kmg-start-issue-tracking` command, pre-push gates) that asks: does this change corrupt or affect
existing KG-captured content? If yes — does a `kg_upgrade` backfix category exist for it, and is
that category wired into the `kg_upgrade` wizard's routing path? Both steps are currently 100%
manual, with no mechanical trigger connecting "a fix touched captured content" to "the backfix
category exists and is reachable."

## Evidence

Each item below is a case study illustrating the gap — none of them are this issue's own fix
target:

- **issue-46** got a `capture-corruption` backfix category added to `upgrade.ts` — but only
  because the person fixing the bug happened to choose to add one. Nothing in the workflow
  required it.
- **issue-47 and issue-48** — their backfixes are still only described in prose in each issue's
  `solution-approach.md`; neither has actually been built yet. Both are further evidence that this
  step is optional in practice, not enforced.
- **issue-49** is the inverse case, and it shows the boundary problem underneath all of this: it's
  a plan-file template/protocol bug, not corrupted KG content, so it's an open question whether it
  needs `kg_upgrade` coverage at all. `kg_upgrade` today only scans
  `sessions/decisions/lessons-learned` — `knowledge/plans/` is out of its scope by design (local-only,
  gitignored). That "is this even in scope" question was never defined anywhere, which is itself
  part of the gap.

## Relationship to ENH-052

This is the same "internal documentation/consistency drifts and nothing mechanically catches it"
pattern ENH-052 already tracks, alongside issue-13, ENH-042, issue-26, issue-28, and issue-49. It
belongs under ENH-052's umbrella rather than as a new ENH — same class of gap, one level up: this
time the "internal paperwork" that goes stale is the mapping between "a fix that touches captured
content" and "`kg_upgrade` actually covering it." See [[ENH-052]] for the general pattern.

## Proposed Direction

Add a checklist item to the fix-authoring workflow — most likely the `kmg-execute-plan` skill's
completion step, or a new pre-push gate — that prompts: does this change alter how KG content is
captured or stored? If yes, does `kg_upgrade` need a new category, and has it been wired into
`kmg-upgrade-inspector.md`'s routing? The exact mechanism (skill checklist vs. hook vs. gate) is
an implementation decision for whoever picks this up; this issue documents the gap, not the fix
design.

## Impact

Every future bug fix that corrupts existing captured content risks repeating issue-46's pattern —
a backfix category gets added ad hoc, sometimes, by whoever remembers, with no guarantee the
wizard can even route to it. See issue-51, a related but separate finding, for that routing half
of the problem.

## Blast Radius

Unlike issue-51, this one doesn't have a single fully-specified fix yet — "Proposed Direction"
above deliberately leaves the enforcement mechanism open, because picking it is a design decision,
not a mechanical correction. Blast radius depends on which mechanism gets chosen:

- **MVP (prompt-only, no hard gate):** add one checklist question to `kmg-execute-plan` SKILL.md's
  existing completion step (Step 7, "Completion Verification" — the same step issue-49 already
  found does nothing but "output completion status" today). Single file, no new hook, no CI/gate
  logic. Relies on the agent actually asking the question at completion time — same class of
  "prose-only enforcement" this project's own ADR-043 already found unreliable ("previous fix
  attempts via CLAUDE.md edits and ADRs failed because they depend on model attention during skill
  execution"). Cheap, but weak — likely re-drifts the same way issue-46/47/48 did.
- **Mechanical gate (matches ADR-050's precedent):** wire a real check into
  `scripts/pre-push-gate.sh` (a new gate, alongside the existing paperwork gates ENH-052 already
  built there) that flags when a diff touches `capture.ts`/similar capture-path files without a
  corresponding `upgrade.ts` category diff in the same PR. This is the pattern ENH-052 itself
  already selected for its own problem ("Option B — Gates on `pre-push-gate.sh`, Not a Skill,"
  citing ADR-043 and ADR-050 as precedent for why hook-based enforcement beats phrase-triggered
  skill enforcement). Multi-file: new gate logic in `scripts/pre-push-gate.sh`, a test for the gate
  itself, possibly a `SKILL.md` update to document the new check. Real design work: how does the
  gate know a diff "touches how KG content is captured or stored" — heuristic (file-path match on
  `capture.ts`/`upgrade.ts`) or something smarter?

**Recommendation:** ship the MVP (prompt-only checklist item) in 7.1.5 as a low-cost stopgap — it's
a single-file edit, same shape as issue-51's fix, no design meeting required. Defer the mechanical
pre-push-gate version to its own follow-up (likely 7.1.6 or later), since it needs an actual design
pass (heuristic definition, gate placement, test coverage) that shouldn't block 7.1.5's already-large
scope (46/47/48/49/50/51 + dependabot).

## Spec (MVP scope only — see Blast Radius for why the full mechanical gate is out of scope here)

1. Add a new line to `kmg-execute-plan` SKILL.md's Step 7 ("Completion Verification"), alongside the
   existing "quote each success criterion" instruction: prompt the agent to explicitly answer, as
   part of completion output, "Does this change alter how KG content is captured, stored, or
   structured? If yes: does `kg_upgrade` need a new/updated category for it, and has
   `kmg-upgrade-inspector.md`'s routing been checked (see issue-51's fix, once landed, for why this
   should no longer need a manual allow-list edit)?"
2. No code changes — this is a `skills/kmg-execute-plan/SKILL.md` prose edit only.
3. Explicitly out of scope for this spec: the mechanical pre-push-gate version described above. File
   a follow-up issue for that if/when it's prioritized, rather than scope-creeping this one.

**Effort:** Small for the MVP scope (single skill-doc edit); Medium-to-Large if the mechanical gate
is pulled in instead (new gate script logic + tests + design decision on detection heuristic).
**Risk:** Low for the MVP (prose-only, no behavior change to any tool); the MVP's own known weakness
is that prose-based enforcement has already failed for this exact class of problem in this project
(ADR-043's own finding) — so treat the MVP as a stopgap, not a resolution, and expect this issue to
need a real follow-up.

## Reported By

Root-cause investigation initiated by the user 2026-08-17, tracing why `kg_upgrade` backfix work
for issue-46/47/48 wasn't happening automatically. Confirmed live by reading
`mcp-server/src/tools/upgrade.ts`, `commands/kmg-init-shared/kmg-upgrade-inspector.md`, and
`knowledge/plans/v0.7.1.5-orchestration-plan.md` (commit-group c5, authored by a parallel session,
already scopes the consent-gate half of the broader problem — this issue is the narrower
root-cause/process-gap finding underneath it).
