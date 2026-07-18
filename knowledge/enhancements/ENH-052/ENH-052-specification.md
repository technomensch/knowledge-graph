---
id: ENH-052
type: Hardening
status: deferred
github-issue: null
branch: none
created: 2026-07-18
related_issues: ["issue-13", "issue-26"]
related_enhs: ["ENH-042"]
---

# ENH-052: No Pre-PR Consistency Check for the Knowledge Graph's Own Internal Paperwork

**Local ID:** ENH-052 | **GitHub Issue:** none filed (Track-only mode — deferred)

## Problem Statement

This project has no enforced, comprehensive pre-PR check for "internal paperwork"
consistency across its *own* knowledge graph. Before a PR ships, nothing verifies
that the KG's index files, status frontmatter, backlinks, and release/summary
documents actually reflect the final state of the branch. The result is that
internal documentation silently drifts, and the drift is only ever caught by a
human deciding, ad hoc, to look.

Three mechanisms exist today that each own a narrow slice of "keep our docs
honest," and none of them covers the gap this spec tracks:

1. **`kmg-docs-impact-scan` skill** — runs pre-push, but is **diff-driven and
   prose-identifier-focused**: it extracts changed identifiers (command names,
   feature names, flag names) from `git diff main...HEAD` and greps doc *prose*
   for stale references to them. It has no concept of README-index freshness,
   cross-reference/backlink completeness, or version-sync across files. This
   limitation is already documented in `knowledge/issues/issue-13/issue-13-description.md`
   ("No automated broken-link detection anywhere in the docs pipeline"), which
   establishes the precise scope boundary: the skill never runs a build, never
   inspects link targets, and is structurally unable to detect a category of
   staleness that isn't a changed identifier in prose.

2. **`scripts/pre-push-gate.sh` Gate 2 (version sync)** — compares
   `package.json` vs `.claude-plugin/plugin.json` version via `jq` (hard drift
   message on mismatch), plus **advisory-only** presence checks that the
   `package.json` version string appears in `CHANGELOG.md` and `README.md`.
   That is the entire real scope, confirmed by reading the script. It checks a
   version *number* appears somewhere; it has no notion of whether a CHANGELOG
   *entry* is complete or current relative to the branch's final commits, nor of
   any of the `knowledge/` index files.

3. **`scripts/pre-push-gate.sh` Gate 4 / `knowledge/issues/issue-11/`** — the
   github-issue-sync invariant, delegated to `scripts/check-github-issue-sync.sh`.
   It flags issue/enhancement folders missing a synced `github_issue` mapping.
   Narrow, single-purpose — it validates one frontmatter field's presence, not
   the accuracy of `status:` or the symmetry of backlinks.

### What none of the three covers

- **README-index count/freshness** across `knowledge/issues/`,
  `knowledge/enhancements/`, `knowledge/decisions/`, `knowledge/lessons-learned/`
  — e.g. whether the "Total ENHs" count and "Last Updated" date in a README match
  the actual folder count. (Live example: `knowledge/enhancements/README.md`
  reads "Total ENHs: 40 / Last Updated: 2026-07-05" while the directory holds
  well over 40 ENH folders — the index that is *about to be edited by this very
  ENH* was itself stale.)
- **Issue/enhancement `status:` frontmatter accuracy** — is a `resolved` issue
  actually resolved? Is a `deferred` one still genuinely deferred, or was it
  quietly picked up? Nothing reconciles the declared status against reality.
- **Backlink symmetry** — if file A references issue-N, does issue-N's own doc
  reference back to A where appropriate? Cross-references are maintained by hand
  and asymmetrically.
- **CHANGELOG entry currency** relative to the actual final state of a branch —
  an entry drafted mid-session can fail to reflect commits that landed after it
  was written, and Gate 2's presence check won't notice.
- **Session-summary / handoff currency** — whether the latest summary reflects
  where the branch actually ended up.

## Context That Triggered This

Discovered live on **2026-07-18**, on branch `v0.6.20-storage-migration-completion`.
A manual pre-PR audit was **explicitly requested and performed by hand** — a human
had to list out, by name, the things to check ("README indexes, version sync,
issue status, backlinks, summary/handoff") because **nothing in the pipeline does
this automatically**. That manual audit surfaced real staleness that none of the
three existing mechanisms would have caught: a CHANGELOG entry drafted mid-session
that no longer reflected later commits, a stale test-count claim, and potential
issue-status drift.

The evidence for this gap is not any single finding from that audit — it is the
fact that **a manual, hand-enumerated audit was necessary at all**. If the check
existed, no human would have had to name its steps from memory.

## This Is the Same Pattern, One Level Up

This is the third-plus independent surfacing of one root pattern this session:
*a piece of internal documentation went stale and nothing caught it.* The prior
instances hit different surfaces:

- **[issue-13](../../issues/issue-13/issue-13-description.md)** — Docusaurus
  broken links (`onBrokenLinks: 'warn'`, 45 links silently deployed for ~3 months);
  no build/link check anywhere in the pipeline.
- **[ENH-042](../ENH-042/ENH-042-specification.md)** — release-doc version-sync:
  three disconnected mechanisms (`kmg-execute-plan` Step 6.4, `kmg-update-doc`
  Tier-1 list, `kmg-docs-impact-scan`) each own a partial slice and none bumps the
  actual version number; README drifted even within itself.
- **[issue-26](../../issues/issue-26/issue-26-description.md)** — a command prompt
  file (`commands/kmg-start-issue-tracking.md`) references `docs/issue-tracker.md`,
  which never existed in git history; a surface (`commands/*.md`) that none of
  issue-13's three mechanisms even touch.

ENH-052 is the **same class one level up**: where issue-13 / ENH-042 / issue-26
are each a specific stale artifact, this item is about the absence of any
mechanism that checks the knowledge graph's *own internal consistency* — its
indexes, statuses, backlinks, and release/summary currency — before a PR ships.
The recurrence across four independent discoveries in a single session is itself
the argument that a general enforcement mechanism, not another one-off fix, is
warranted.

## Proposed Direction (Sketch — Not Decided)

This is a **Proposed-status** spec: it names the gap and sketches candidate shapes
for an enforcement mechanism, but deliberately does **not** commit to one design.
Whoever picks this up owns the design decision. Candidate approaches:

1. **A new pre-PR "KG consistency" skill** (analogous to `kmg-docs-impact-scan`,
   but self-referential to `knowledge/` rather than diff-driven over prose) that
   audits index counts/dates, `status:` plausibility, and backlink symmetry, and
   emits findings before push.
2. **New gates on `scripts/pre-push-gate.sh`** — e.g. a Gate 5 that recomputes
   each README's index count from the folder listing and compares it to the
   declared "Total" / "Last Updated" header; a Gate 6 for backlink symmetry.
   Mirrors the existing Gate 2 / Gate 4 pattern (advisory injection, exits 0).
3. **Extending `kmg-docs-impact-scan`'s scope** to add index-freshness and
   backlink checks as an additional finding category — reusing the existing
   pre-push flag-file plumbing (Gate 3) rather than adding a parallel mechanism.

Open design questions (for whoever implements, not resolved here):

- Advisory (inject-and-continue, like today's gates) vs. blocking?
- Which of the four index families (issues / enhancements / decisions /
  lessons-learned) are in scope for v1, and is "status accuracy" even
  mechanically checkable, or does it require human judgment (making it a prompt,
  not a gate)?
- Does backlink symmetry belong in the same mechanism as index-count freshness,
  or are they separate checks with different failure modes?
- Scope boundary vs. issue-13: this should explicitly note it does **not** cover
  Docusaurus link integrity or `commands/*.md` references (issue-13 / issue-26's
  domains) — those need their own mechanisms, per issue-26's scope distinction.

## Out of Scope

- Building any one of the candidate mechanisms above — this ENH documents the gap;
  design and implementation are a separate, later decision.
- Docusaurus broken-link detection (issue-13's domain) and `commands/*.md` stale
  references (issue-26's domain) — related pattern, different surfaces, tracked
  separately.
- The release-doc version-sync reconciliation already scoped by ENH-042 — this
  ENH is the superset "internal consistency" concern; ENH-042's specific
  three-mechanism reconciliation stays its own item.
- Retroactively correcting every currently-stale index/status/backlink in the KG —
  that is cleanup work, distinct from building the mechanism that would prevent
  recurrence.
