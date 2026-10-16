---
id: ENH-062
type: Enhancement
status: proposed
github-issue: "#241"
branch: none
created: 2026-08-22
related_issues: ["issue-53", "issue-54"]
---

# ENH-062: Track issue/ADR/ENH relationships (blocked-by, related-to, depends-on) in local KG metadata, and formalize the `status` field schema

**Local ID:** ENH-062 | **GitHub Issue:** #N (filed via `/kmgraph:kmg-start-issue-tracking`, Mode 3, track only)

## Problem Statement

This session mapped a real, useful relationship graph across open issues and enhancements — file-level overlap clusters, sequence dependencies (`blocked by`), parent/child groupings (sub-issues), and loose "related to" pointers — and wired all of it natively on GitHub (`blockedBy`/`blocking` relations, sub-issues, Project Priority field). None of that structure exists in this repo's own local KG metadata. Today, relationships between issue-N/ENH-NNN docs live only as prose links inside `## Related` sections — readable, but not machine-queryable, not validated, and not kept in sync with what GitHub actually has wired.

## Proposal

Add structured relationship fields to the local KG's frontmatter schema for issues and enhancements — something like `blocked_by: []`, `blocking: []`, `depends_on: []`, `related_to: []`.

**Corpus verification (2026-09-19):** grepped frontmatter across `knowledge/issues/` and `knowledge/enhancements/` before assuming the premise above. Findings:

- `related_issues`, `related_enhs`, `related_adrs` are **not** ad hoc — they're an established, consistently-named convention already in use across 60+ files, with a stable shape (array of string IDs, e.g. `["issue-53", "issue-54"]`, `["ADR-067"]`). This ENH does not need to "formalize" these three; they're already solid.
- One drift found, not a naming inconsistency but a type inconsistency: `knowledge/decisions/ADR-067-implementation-spec.md` stores `related_adrs`/`related_enhs`/`related_issues` as bare numbers (`[1, 19, 55]`) instead of the `"ADR-NN"`/`"ENH-NNN"`/`"issue-NN"` string format every other file uses. Worth a follow-up fix, but out of scope for this ENH.
- `blocked_by`, `blocking`, `depends_on` have **zero** existing usage anywhere in frontmatter — confirmed via grep, no false positives. These are genuinely net-new fields, not a consistency fix to existing ones.

This changes the shape of the work: this ENH is about **adding three new directional-relationship fields** alongside the existing, already-solid `related_*` trio — not about renaming or reconciling inconsistent existing fields.

### GitHub Issue relationships

Users should be ask if the graph Enhancement/Issues metadata should mirror GitHub's relationship model 1:1 (blockedBy/blocking/parent/subIssues) to ensure consistency.  The project owner acknowledges, and accepts, that this may not map to [[ENH-052]]'s broader "keep KG paperwork internally consistent" umbrella.

## Decision — Where This Belongs

Decided (design only, not implemented): the "some combination" option, split across three layers by lifecycle stage.

- **Templates** (`core/default-templates/.../issue-template.md`, `ENH-template.md`) — the relationship fields (`blocked_by`, `blocking`, `depends_on`, `related_to`, etc.) are added to the YAML frontmatter schema here. This is the source of truth for what fields exist on new docs.
- **Command** (`kmg-start-issue-tracking.md`) — when drafting a *new* issue/enhancement entry, the command populates these fields at creation time (not just scaffolding empty keys — actually filling in known relationships where detectable).
- **Skill — fold into `kmg-paperwork-audit` as a new Step 8** (design decided 2026-09-19, via `kmgraph:kmg-recall` — not yet implemented; this ENH's overall `status:` remains `proposed`). Not a new standalone skill — ADR-043 already found phrase/skill-triggered enforcement unreliable twice in this project and replaced it with the deterministic-hook pattern (`pre-push-gate.sh` Gate 6 checking a completion-flag file). A new standalone skill would have no gate forcing it to run, repeating a failure mode this project already fixed once. `kmg-paperwork-audit` already runs under that enforced gate, so the new check inherits real enforcement for free.
  - **Mechanics:** Step 8 (current Step 7 "report + write flag" renumbers to Step 9) — mechanical bash detection: build a shared-file/topic index across docs' frontmatter + prose, flag doc pairs that reference the same file/topic but declare no `related_to`/`blocked_by`/`blocking`/`depends_on` between them. Detection raises a flag; it does not auto-wire the relationship — matches the project's established "trigger, not verdict" principle (ENH-052): the user confirms or dismisses each finding, same shape as Steps 2/3/6.
  - **Trigger condition:** fires under Gate 6, pre-push, full-repo scan (not diff-scoped) — matches Steps 5/6's precedent for repo-wide checks, since an undeclared relationship can exist between two docs neither of which changed on the current branch.
  - **Naming:** no new skill name is needed for this design. If a narrower/faster standalone scan is wanted later, `kmg-relationship-scan` is confirmed free and pattern-consistent (`kmg-{verb}-{noun}`, per `kmg-docs-impact-scan`) — but is not the default recommendation.
  - **Framing correction:** this repurposes ENH-062's original "periodic" language — under this design the check is event-driven (runs at pre-push time), not time-based. A true timer-driven periodic scan independent of push activity would be a different mechanism (no precedent in this repo) and would need its own justification for why push-time enforcement isn't sufficient.

### Should `kmg-paperwork-audit` be split up instead of growing? (design decided 2026-09-19, not yet implemented)

Checked against this project's actual split precedent — ENH-016's rules.md auto-split rule (line count > 120, or 2+ top-level sections with 5+ subsections each) — before adding Step 8. Conclusion: **do not split; add Step 8 to the existing skill** (a decision for the eventual implementation plan — no file has been changed yet).

- ENH-016's threshold is tuned for a *rules-injection* file: the failure mode there is unrelated domains getting force-fed into every skill invocation's context window. `kmg-paperwork-audit` (315 lines as of this check) is a *procedure* file, not an injected-context file — a different failure mode entirely. Its length comes from one coherent audit with 7 (soon 9) sequential, narrow, mechanical steps — not from unrelated concerns getting mixed together.
- The actual reason ENH-052 and ADR-043 converged on *one* audit skill was enforcement reliability: one flag file, one Gate 6 check, one guaranteed-to-run entry point. Splitting into multiple skills means multiple flags and multiple gates — reintroducing the exact "some checks silently don't run" risk this design exists to prevent.
- **What would actually justify a split later:** not line count or step count, but a *run-cadence mismatch* — e.g., if a step's full-repo scan becomes slow enough that it shouldn't run on every single push while the other steps still should. That's a cadence problem, not a length problem, and ENH-016's line-count trigger would not catch it or apply to it. If this comes up, the split criterion should be "this step needs a different trigger cadence than the rest of the audit," not any size threshold.

## Upgrade & Backfill Behavior (existing installs)

New fields must be introduced without breaking or silently skipping already-installed knowledge graphs.

- **`kg_upgrade`** (triggered by the init process on an already-installed graph) is the entry point. When it runs and detects the new relationship fields aren't part of the installed schema yet, it asks the user whether to add these fields to existing entries.
- **Backfill logic**, per existing doc, in this order:
  1. **Fields absent** → skip entirely. Do not add fields to a doc that doesn't already participate in this schema version.
  2. **Fields present but empty/incomplete** → backfill: populate them automatically.
  3. **Fields present and already populated** → do not silently overwrite. Prompt the user: fields appear populated; offer to run a scan for missing gaps or new relationships to add, rather than assuming they're complete or stale.

This gives three distinct outcomes per doc (skip / auto-backfill / prompt-to-rescan) rather than a single blanket backfill pass — avoids clobbering relationships someone already hand-maintained while still catching docs that never got the fields at all.

**Corpus-verified expected distribution (2026-09-19):** the three outcomes above will not land evenly across the two field groups. For `related_issues`/`related_enhs`/`related_adrs` — already populated in the large majority of the 60+ files checked — branch 3 (prompt-to-rescan) is the expected common case, not branch 2. For `blocked_by`/`blocking`/`depends_on` — confirmed absent everywhere — branch 1 (skip) will fire on every pre-existing doc the first time `kg_upgrade` runs, since no doc has adopted this schema version yet; branch 2 (auto-backfill) only becomes reachable once a doc has been touched by the new `kmg-start-issue-tracking` behavior or manually edited to add empty placeholders. Worth confirming this matches intent before implementation — if the goal is to get `blocked_by`/`blocking`/`depends_on` onto *all* existing docs (not just new ones), branch 1's "skip if absent" default won't achieve that, and the upgrade prompt may need a fourth path: offer to scaffold the new fields as empty on docs where they're missing, distinct from backfilling values into fields that already exist.

## Root Cause: the `status` field itself has no governing spec (scope expanded 2026-09-19)

A separate conversation (2026-09-18, auditing status consistency for a Kanban board) found 20+ spellings of the same handful of status concepts across issues and enhancements, `resolved`/`implemented`/`closed` used interchangeably, and `deferred` ambiguously meaning both "shelved but still relevant" and "abandoned" depending on the file. That conversation also independently found this ENH's exact gap: no `blocked_by`/`depends_on` field exists, so two docs (ENH-023, ENH-051) are mis-labeled `proposed`/`deferred` while actually blocked on open dependencies.

Verified directly: `knowledge/enhancements/README.md` (lines 88–92) and `knowledge/issues/README.md` each define their own `status` enum inline, in prose, as an undocumented 3-line convention — and the two don't even agree with each other (issues/ has `🔴 Investigating`; enhancements/ has no equivalent value). No ADR or ENH governs the `status` field's schema anywhere in this repo.

**Scope decision (2026-09-19, agreed):** rather than fork this into a separate ENH, this ENH's scope is expanded to own both schemas — the relationship fields (`blocked_by`/`blocking`/`depends_on`/`related_to`) *and* the `status` enum — since they're coupled (a `blocked` status should relate to `blocked_by` somehow). **This is scope agreement only.**

## `status` Schema Design — via Verified Upstream Prior Art (decided 2026-09-19, design only, not implemented)

**Source:** the `nimbalyst/nimbalyst` upstream repo (a separate, third-party project — not our code), specifically `packages/tracker-core/src/trackerStatusCategory.ts` and `trackerReadiness.ts`, read directly (with line numbers) after a `git merge upstream/main` pulled substantial new tracker functionality into a local fork at `/Users/mkaplan/GitHub/nimbalyst`. Cited as verified reference design, not assumed.

**The core design — two layers, not one enum:**

1. **Literal `status` value** — free per doc-type (`proposed`, `fixed`, `deferred`, whatever we already use). Never changes.
2. **`status_category`** — a small, fixed enum every literal value maps onto: `backlog | pending | started | done | cancelled` (Nimbalyst's own `unstarted` renamed to `pending` per this project's preference — everything else adopted as-is).

Proposed mapping of our existing literal values onto these categories:

| Category | Meaning | Existing literal values it would absorb |
|---|---|---|
| `backlog` | Captured, not committed to | `proposed`, `draft`, `Draft` |
| `pending` | Committed, not begun | `open`, `OPEN`, `tracked` |
| `started` | Actively being worked | `in-progress`, `designed` |
| `done` | Finished successfully | `resolved`, `implemented`, `IMPLEMENTED`, `closed`, `fixed` |
| `cancelled` | Abandoned, doesn't count as done | `withdrawn`, and *some* `deferred` |

**Borrowed safety rule** (`trackerStatusCategory.ts:161-164`): an unrecognized literal value must never be guessed into `done`/`cancelled` — default it to visible/open (`pending`). Guessing terminal hides real, unfinished work; guessing open is just a visual papercut. This protects against ever silently disappearing an ENH/issue nobody actually reviewed.

**How this answers the questions raised when scope was expanded:**

- **Canonical enum + issue/enhancement sharing:** one shared `status_category` enum (the 5 values above) across both issues and enhancements. The literal `status` string stays free-form/per-doc as today — categories are what boards and audits key off, not the literal spelling.
- **`resolved` stricter definition:** `resolved`/`implemented`/`fixed`/`closed` all map to category `done` specifically, meaning *successful, shipped* completion only. Anything abandoned or superseded maps to `cancelled` instead, never `done` — this is the direct fix for the "marked resolved but wasn't implemented" mistake made earlier in this same spec's drafting (see the wording corrections throughout this document).
- **`blocked` relationship to `blocked_by`:** confirmed via `trackerReadiness.ts` — `blocked` is **not** a status or category at all. It's a separate, *computed* state (`ready | blocked | closed`), derived live from graph analysis over the `blocked_by`/`depends_on` relationship fields this ENH already proposes. An item is `blocked` if it has at least one open (non-terminal) blocker — never hand-set, never goes stale, recomputes automatically as blockers close.
- **`deferred` ambiguity:** resolved by the category model itself — `deferred` isn't one value with two meanings, it's two different literal-to-category mappings depending on intent. "Shelved, may revisit" → `backlog`. "Abandoned" → `cancelled`. Going forward, docs should stop overloading bare `deferred` for both; reserve `deferred` for the `backlog` case and use `withdrawn` for the abandoned case (matching what `enhancements/README.md` already partially does).

**What's still genuinely open (not answered by the upstream reference — see Open Questions below):**

- The exact literal-to-category mapping table above is a starting proposal, not verified against every one of the 60+ files in the corpus.
- Migration mechanics for existing docs' `status` values — likely the same three-way skip/backfill/prompt-to-rescan shape used for the relationship fields, but not yet drafted for `status` specifically.
- Whether `status_category` is computed at read-time from a lookup table (as Nimbalyst does, backed by a type-schema registry we don't have) or stored as a second frontmatter field kept in sync — Nimbalyst's approach assumes a schema registry our docs don't currently have, so this needs its own decision.

## Open Questions (not yet decided)

- Migration/backfill treatment for existing `status` values across both READMEs' current, mutually incompatible conventions.
- Where `status_category` is computed/stored (see "what's still open" above).
- Final sign-off on the literal-to-category mapping table above against the full corpus.

## Related

- [issue-53](../../issues/issue-53/issue-53-description.md), [issue-54](../../issues/issue-54/issue-54-description.md) — the ADR-006/orphan-file incident that prompted this session's manual relationship-mapping exercise in the first place.
- [ENH-052](../ENH-052/ENH-052-specification.md) — broader "internal KG paperwork consistency" umbrella; this ENH's schema work would be a natural input to ENH-052's consistency checks once it exists.

## Status

Proposed — no implementation yet. Design decided so far: relationship-field ownership layer (templates + command + `kmg-paperwork-audit` Step 8; see Decision section above), upgrade/backfill behavior for the relationship fields, consistency-scan design (naming + trigger conditions), and the `status_category` schema design (backlog/pending/started/done/cancelled, with `blocked` as a derived state — see `status` Schema Design section above), based on verified upstream prior art. Remaining before implementation planning: confirm the fourth backfill path (scaffold-empty) noted in the Upgrade & Backfill section, and resolve the items in Open Questions above (status migration mechanics, where `status_category` is computed/stored, final corpus sign-off on the mapping table). Filed via `/kmgraph:kmg-start-issue-tracking` Mode 3 (track only) on 2026-08-22.


