---
id: ENH-052
type: Hardening
status: deferred
github-issue: "#188"
branch: none
created: 2026-07-18
related_issues: ["issue-13", "issue-26", "issue-28", "issue-45"]
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
- **[issue-28](../../issues/issue-28/issue-28-description.md)** — the gap this ENH's
  own testing surfaced: Gates 5/6 exist in this working tree but the live
  `PreToolUse` hook runs from the installed plugin cache, so the gates just built
  don't yet protect a real push. Backlinked 2026-07-26 (paperwork-audit
  backlink-symmetry check).

ENH-052 is the **same class one level up**: where issue-13 / ENH-042 / issue-26
are each a specific stale artifact, this item is about the absence of any
mechanism that checks the knowledge graph's *own internal consistency* — its
indexes, statuses, backlinks, and release/summary currency — before a PR ships.
The recurrence across four independent discoveries in a single session is itself
the argument that a general enforcement mechanism, not another one-off fix, is
warranted.

## Direction Decided: Option B (Gates on `pre-push-gate.sh`), Not a Skill

The three candidate directions this spec originally sketched (new skill / new
pre-push gates / extend `kmg-docs-impact-scan`) are no longer an open question —
**Option B was selected**, on evidence already sitting in this project's own
decision history:

- **ADR-043** (PreToolUse hook injection for rule enforcement): *"Previous fix
  attempts via CLAUDE.md edits and ADRs failed because they depend on model
  attention during skill execution — the skill's structured checklist
  dominates."*
- **ADR-050** (this exact tool's own origin): *"the `kmgraph:docs-impact-scan`
  skill is not wired as a pre-push gate; a push can happen without the scan ever
  running."* The fix chosen there was Gate 3 — wiring the skill's completion
  into a `PreToolUse Bash` hook matched on `git push`, not making the skill
  trigger on more phrases.

Both prior instances in this project found phrase-triggered skill enforcement
unreliable and replaced it with a deterministic hook. Building "a smarter
`kmg-docs-impact-scan`" (Option C) or "a new self-referential skill" (Option A)
would repeat the documented failure mode rather than learn from it. **Gates 5
and 6 are implemented directly in `scripts/pre-push-gate.sh`, mirroring the
existing Gate 2 (advisory injection, always exits 0) pattern:**

- **Gate 5** — mechanically checkable, no judgment required: (a) each `knowledge/<area>/README.md`'s
  declared "Total X" count vs. the real folder count (decisions, enhancements,
  issues, lessons-learned); (b) for issue/ENH docs changed on the current
  branch, whether every cross-reference to another issue/ENH is reciprocated by
  a backlink in the referenced doc. Gate 2 was also extended in the same pass to
  compare `package.json`'s version against `.codex-plugin/plugin.json` and
  `.claude-plugin/marketplace.json`'s embedded plugin entry (previously only
  checked against `.claude-plugin/plugin.json`), and to check
  `mcp-server/package.json` when `mcp-server/src/` actually changed on the
  branch (previously treated as unconditionally independent, which was itself
  a source of drift this session).
- **Gate 6** — a completion-flag check, same pattern as Gate 3, for the parts of
  this spec's scope that genuinely require judgment and can't be checked in
  bash: issue/enhancement `status:` accuracy, and session-summary/handoff
  currency. See "Companion Skill Specification" below for what would satisfy
  this flag.

**Status of this implementation:** functionally tested via a simulated
`PreToolUse` hook invocation against this repo's real data — Gates 5/6
produced correct findings (see test-cases.md for the specific catches,
including 9 real backlink gaps the manual audit had missed). The companion
skill Gate 6 depends on, `skills/kmg-paperwork-audit/SKILL.md`, is built; its
flag/gate integration was verified directly (wrote the flag, confirmed Gate 6
cleared). Still open: the skill's judgment-based logic (Steps 2-3) hasn't been
exercised against a real resolved/deferred item, and CHANGELOG-entry-currency
remains unassigned to either mechanism. This ENH's `status:` stays `deferred`
until those close — but the core mechanism (Gates 5/6 + companion skill) now
exists and works, which the original sketch never committed to.

**Update 2026-07-26:** one of the two remaining blockers closed. `kmg-paperwork-audit`'s
Steps 2-3 were manually exercised against this branch's real data and caught a genuine
resolved-vs-deferred judgment call — this ENH's own `status:` field (paperwork-audit
flagged that the branch's diff looked like an implementation, not a deferred item, which
is exactly the class of finding Steps 2-3 are meant to produce). Still open:
CHANGELOG-entry-currency remains unassigned to either mechanism, and `issue-28` (#192,
still deferred) means Gates 5/6 don't yet protect a real push from the installed plugin
cache. `status:` stays `deferred` pending those two.

Also confirmed, as an unplanned side-effect of this test: the live
`PreToolUse` hook that governs this repo's actual pushes runs from the
installed plugin cache (`${CLAUDE_PLUGIN_ROOT}`), not this working tree —
meaning the Gates 5/6 just built won't actually protect a real push until
that gap (tracked as `issue-28`, retitled and expanded with this evidence)
is closed. Filing this ENH's mechanism doesn't yet mean it's live.

Resolved (no longer open) design questions from the original sketch:
- Advisory vs. blocking → advisory, matching every existing gate.
- Which index families → all four (decisions, enhancements, issues,
  lessons-learned).
- Backlink symmetry vs. index-count freshness → same mechanism (Gate 5), scoped
  to files changed on the current branch to keep the check cheap per push.
- Scope boundary vs. issue-13 — preserved: Gate 5/6 do **not** cover Docusaurus
  link integrity or `commands/*.md` references; those stay issue-13's and
  issue-26's domains.

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
