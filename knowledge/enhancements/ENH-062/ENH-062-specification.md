---
id: ENH-062
type: Enhancement
status: implemented
status_category: done
github_issue: "#241"
branch: none
created: 2026-08-22
related_issues: ["[[issue-53-description|issue-53]]", "[[issue-54-description|issue-54]]", "[[issue-61-description|issue-61]]"]
related_enhs: ["[[ENH-065-specification|ENH-065]]", "[[ENH-059-specification|ENH-059]]"]
related_docs: ["[[ENH-062-relationship-scan-mcp-tool-spec|ENH-062 relationship scan tool spec]]"]
---

# ENH-062: Track issue/ADR/ENH relationships (blocked-by, related-to, depends-on) in local KG metadata, and formalize the `status` field schema

**Status:** ✅ Implemented in v0.7.11

**Local ID:** ENH-062 | **GitHub Issue:** #N (filed via `/kmgraph:kmg-start-issue-tracking`, Mode 3, track only)

## Problem Statement

This session mapped a real, useful relationship graph across open issues and enhancements — file-level overlap clusters, sequence dependencies (`blocked by`), parent/child groupings (sub-issues), and loose "related to" pointers — and wired all of it natively on GitHub (`blockedBy`/`blocking` relations, sub-issues, Project Priority field). None of that structure exists in this repo's own local KG metadata. Today, relationships between issue-N/ENH-NNN docs live only as prose links inside `## Related` sections — readable, but not machine-queryable, not validated, and not kept in sync with what GitHub actually has wired.

## Proposal

Add structured relationship fields to the local KG's frontmatter schema for issues and enhancements — something like `blocked_by: []`, `blocking: []`, `depends_on: []`, `related_to: []`.

**Corpus verification (2026-09-19):** grepped frontmatter across `knowledge/issues/` and `knowledge/enhancements/` before assuming the premise above. Findings:

- `related_issues`, `related_enhs`, `related_adrs` are **not** ad hoc — they're an established, consistently-named convention already in use across 60+ files, with a stable shape (array of string IDs, e.g. `["issue-53", "issue-54"]`, `["ADR-067"]`). This ENH does not need to "formalize" these three; they're already solid.
- One drift found, not a naming inconsistency but a type inconsistency: `knowledge/decisions/ADR-067-implementation-spec.md` stores `related_adrs`/`related_enhs`/`related_issues` as bare numbers (`[1, 19, 55]`) instead of the `"ADR-NN"`/`"ENH-NNN"`/`"issue-NN"` string format every other file uses. ~~Worth a follow-up fix, but out of scope for this ENH.~~ **Now in scope — see "Frontmatter Hygiene" below (added 2026-10-17).**
- `blocked_by`, `blocking`, `depends_on` have **zero** existing usage anywhere in frontmatter — confirmed via grep, no false positives. These are genuinely net-new fields, not a consistency fix to existing ones.

This changes the shape of the work: this ENH is about **adding three new directional-relationship fields** alongside the existing, already-solid `related_*` trio — not about renaming or reconciling inconsistent existing fields.

### GitHub Issue relationships

Users should be ask if the graph Enhancement/Issues metadata should mirror GitHub's relationship model 1:1 (blockedBy/blocking/parent/subIssues) to ensure consistency.  The project owner acknowledges, and accepts, that this may not map to [[ENH-052]]'s broader "keep KG paperwork internally consistent" umbrella.

## Decision — Where This Belongs

Decided (design only, not implemented): the "some combination" option, split across three layers by lifecycle stage.

- **Templates** (`core/default-templates/.../issue-template.md`, `ENH-template.md`) — the relationship fields (`blocked_by`, `blocking`, `depends_on`, `related_to`, etc.) are added to the YAML frontmatter schema here. This is the source of truth for what fields exist on new docs.
- **Command** (`kmg-start-issue-tracking.md`) — when drafting a *new* issue/enhancement entry, the command populates these fields at creation time (not just scaffolding empty keys — actually filling in known relationships where detectable).
- **Skill — fold into `kmg-paperwork-audit` as a new step** (design decided 2026-09-19, via `kmgraph:kmg-recall`; built in v0.7.11 as Step 7 — see "Relationship Scan: Where the Logic Lives"; this ENH's overall `status:` remains `proposed` until the maintainer decides the flip). Not a new standalone skill — ADR-043 already found phrase/skill-triggered enforcement unreliable twice in this project and replaced it with the deterministic-hook pattern (`pre-push-gate.sh` Gate 6 checking a completion-flag file). A new standalone skill would have no gate forcing it to run, repeating a failure mode this project already fixed once. `kmg-paperwork-audit` already runs under that enforced gate, so the new check inherits real enforcement for free.
  - **Numbering note (2026-10-17):** as built on the v0.7.11 branch the new check is **Step 7** and the report-and-flag step is **Step 8** (the audit had six steps plus the report, not seven). Read "Step 8 / Step 9" in this bullet as "Step 7 / Step 8". Where the scan logic lives was changed afterwards — see "Relationship Scan: Where the Logic Lives" below.
  - **Mechanics:** Step 8 (current Step 7 "report + write flag" renumbers to Step 9) — mechanical bash detection: build a shared-file/topic index across docs' frontmatter + prose, flag doc pairs that reference the same file/topic but declare no `related_to`/`blocked_by`/`blocking`/`depends_on` between them. Detection raises a flag; it does not auto-wire the relationship — matches the project's established "trigger, not verdict" principle (ENH-052): the user confirms or dismisses each finding, same shape as Steps 2/3/6.
  - **Trigger condition:** fires under Gate 6, pre-push, full-repo scan (not diff-scoped) — matches Steps 5/6's precedent for repo-wide checks, since an undeclared relationship can exist between two docs neither of which changed on the current branch.
  - **Naming:** no new skill name is needed for this design. If a narrower/faster standalone scan is wanted later, `kmg-relationship-scan` is confirmed free and pattern-consistent (`kmg-{verb}-{noun}`, per `kmg-docs-impact-scan`) — but is not the default recommendation.
  - **Framing correction:** this repurposes ENH-062's original "periodic" language — under this design the check is event-driven (runs at pre-push time), not time-based. A true timer-driven periodic scan independent of push activity would be a different mechanism (no precedent in this repo) and would need its own justification for why push-time enforcement isn't sufficient.

### Should `kmg-paperwork-audit` be split up instead of growing? (design decided 2026-09-19; as built in v0.7.11: not split, Step 7 added to the existing skill)

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

## `status` Schema Design — via Verified Upstream Prior Art (decided 2026-09-19; built in v0.7.11 as the stored `status_category` field)

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

## Frontmatter Hygiene (scope added 2026-10-17, per user approval)

The 2026-09-19 corpus check above found `related_*` solid and called naming "not inconsistent". A recount on 2026-10-17 shows that was true for enhancements but not for issues. This ENH now also owns cleaning the relationship fields, so the new typed fields are built on consistent ground.

**Findings (file counts, grep of frontmatter keys, 2026-10-17):**

| Field | issues/ | enhancements/ | decisions/ |
|---|---|---|---|
| `related_issues` / `related-issues` | 19 / 9 | 24 / 0 | 1 / 0 |
| `related_enhs` / `related-enhs` | 14 / 11 | 45 / 0 | 1 / 0 |
| `related_adrs` / `related-adrs` | 7 / 9 | 35 / 0 | 1 / 0 |
| `github_issue` / `github-issue` | 0 / 59 | 34 / 14 | 0 / 0 |

- **Spelling drift:** issues mix underscore and hyphen for the same relationship fields. `github_issue` vs `github-issue` is split across enhancements.
- **Value-type drift:** `ADR-067-implementation-spec.md` stores bare numbers instead of string IDs (already noted above).
- **Not links:** none of these fields hold `[[wikilinks]]`; rendering them as links is owned by [ENH-059](../ENH-059/ENH-059-specification.md), which depends on the field names and value shapes settled here.

**In scope:** pick one canonical spelling per field, define the value shape (string IDs), and define the migration for existing files.

**Not yet decided (needs user decision):** underscore or hyphen as the canonical spelling; whether the fix runs through the `kg_upgrade` backfill path or as a one-time rename; whether a validator rejects the old spelling afterwards.

## Impact List (blast radius sweep, 2026-10-17)

Read-only survey of what reads, writes or checks the relationship and status fields. Includes the effect of [ENH-059](../ENH-059/ENH-059-specification.md) (quoted wikilink values). Items marked PROTECTED need explicit user permission to change. Not exhaustive — see "Not checked".

**Key facts**
- Frontmatter is parsed by hand everywhere (grep/sed and regex in TypeScript). No yaml library in `mcp-server/src`. Any list or multi-line field change must be made in each parser separately.
- Quoted values like `"[[ENH-042-specification]]"` are valid YAML. No existing script rejects them.
- `knowledge/` is not part of the docs build (user, 2026-10-17), so wikilinks in `knowledge/` cannot break the Docusaurus build. Docs-build and broken-link concerns were handed to the `fix-broken-links` session.

**Breaks or needs update**

| Type | Item | Effect |
|---|---|---|
| Script | `scripts/check-github-issue-sync.sh` and `.test.sh` | Reads `github_issue`/`github-issue`; breaks on rename |
| Script | `scripts/pre-push-gate.sh` Gate 5 (backlink symmetry) | Counts every ID mention as a relationship (issue-61 noise); typed fields could scope it |
| Script | `pre-push-gate.sh` Gate 4 and Gate 6 | Gate 4 follows the sync script; Gate 6 follows `status` if `status_category` is added |
| Script | `fix-numbering-collision.sh`, `check-numbering-collision.sh` | Renumbering must also rewrite wikilinks and relationship values (unchecked) |
| MCP | `mcp-server/src/tools/capture.ts` (`kg_capture`) | Only TypeScript writer of `implements:` and `related:`; needs new fields and quoting |
| MCP | `mcp-server/src/tools/upgrade.ts` (`kg_upgrade`) | Own frontmatter parser and merge; new backfill category needed |
| Test | `mcp-server/tests/capture.test.ts`, `tests/test-create-adr-implements.sh` | Assert current field format |
| Command (PROTECTED) | `commands/kmg-start-issue-tracking.md` | Hard-codes `github-issue:` in the write and verify steps |
| Skill | `skills/kmg-adr-guide`, `skills/kmg-paperwork-audit` | ADR template block; `status: resolved` check |
| Agent | `agents/create-adr-agent.md` | Builds the `kg_capture` payload; source of the 12 ADRs that already have frontmatter wikilinks |
| Template (PROTECTED) | `core/default-templates/decisions/ADR-template.md`, `lessons-learned/lesson-template.md`, issues and enhancements READMEs | Field definitions and hard-coded status lists. No issue or ENH frontmatter template exists |

**Likely unaffected:** `fts5.ts` (indexes only `title:`), `hooks/hooks.json`, 13 skills with no field hits, `sanitization.ts`.

**Backfill — two different things (recall, 2026-10-17)**
- `kmg-backfill` and `kg_extract` are a standalone, implemented extraction process (ADR-071, ENH-035, ENH-025). It extracts knowledge from chat history, lessons and decisions. It was extracted out of `kmg-init` and `kmg-update-graph`, not out of `kg_upgrade`. It is not a field backfill.
- The field backfill this ENH describes ("Upgrade & Backfill Behavior") does not exist as a module. Today upgrade backfill lives inline in `upgrade.ts` (categories such as `missing-root-readme`) and in the `kmg-upgrade-inspector` shared module (section h, interactive backfill for me.md, rules.md, triggers.md). ADR-064 flags overlapping config-field backfill logic between `upgrade-inspector` and `config-entry-write`; whether that cleanup was done is unchecked.
- **Decided 2026-10-17 (user approved):** the relationship/status field backfill is a new category in `kg_upgrade`, not an ADR-064 shared module. Reasons: it is deterministic frontmatter editing that belongs in tested code; it must work cross-platform through the MCP tool; and only `kg_upgrade` would call it (ADR-064 pays off at two or more command callers). One shared TypeScript normalizer (spelling, string IDs, and later the ENH-059 wikilink form) is called by `kg_upgrade`, `kg_capture` and a validator, so the writers cannot drift apart again. Revisit if a second command needs the same backfill or it must run on demand like `kmg-backfill`.
- **Size concern (user, 2026-10-17):** `upgrade.ts` is already about 3,110 lines. Proposed guardrails, **not decided**: (1) put the migration and normalizer in their own file(s) that `upgrade.ts` only registers, so the category adds little to the big file; (2) make the migration one-shot and idempotent, so it is skipped once applied (note: the existing `kmgraph_schema` is NOT a general graph version. It is one integer in one file's frontmatter, hard-coded to `2`, marking the earlier me.md/rules.md platform-split migration in `upgrade.ts`. A separate marker would be needed; how it is stored is undecided); (3) set a retirement rule for legacy fixes, for example removing the code after a set number of releases or a schema version. The retirement rule needs your decision.
- **Opus design review, adopted by user 2026-10-17** (report is model output; code claims not independently verified):
  - **One umbrella category** (e.g. `frontmatter-schema`), not one category per schema change. Each new category means about 7 edits in `upgrade.ts` plus the PROTECTED `commands/kmg-init-shared/kmg-upgrade-inspector.md`. The umbrella registers check/apply functions from a new `mcp-server/src/lib/frontmatter/` folder (`parse.ts`, `normalize.ts`, `migrations/NNN-*.ts`), so later schema changes add a step file and never touch `upgrade.ts` or the inspector.
  - **Ordered, versioned, idempotent steps** (`{id, introducedIn, detect, apply}`). Shape-detection is the source of truth; a version marker only decides skip, or ask the user.
  - **Nothing is applied without user approval** (user requirement). Inspect mode reports; apply needs its own confirm parameter, not the shared `confirmBackfix` boolean, so consent to an unrelated backfix cannot authorize rewriting about 350 files.
  - **Retirement: a schema floor.** A step is removed only once the minimum upgrade-from version has passed it and its detector finds no hits. A graph below the floor gets a "run vX first" message. This replaces guardrail (3) above.
  - **Parser:** rewrite only the target keys line by line, leaving everything else byte-for-byte. Add the `yaml` package as a runtime dependency (approved by user) used only to verify before/after equivalence. Keep `.bak` copies and add a golden-file test over a snapshot of real frontmatter. Reuse `detectDoubledFrontmatter` and skip flagged files.
  - **Marker location (decided 2026-10-17):** in the graph, as Opus advised: next to `.kmgraph-id`, not in per-user config (which does not travel with git) and not per document (clutters 350 docs and shows in Obsidian and Nimbalyst properties).
  - **Consumers:** read both spellings for one release, then have the validator reject the old one. `github-issue` hyphen form is the majority (about 73 vs 34 files); choosing it avoids editing the PROTECTED `kmg-start-issue-tracking.md`. Spelling choice still needs the user's decision.

**Data files that carry the fields** (approximate, top-level frontmatter keys)
- `knowledge/enhancements/` 113 files, `knowledge/issues/` 161 (about 60 with relationship fields), `knowledge/decisions/` 75 (12 already have `[[` in frontmatter), `knowledge/lessons-learned/` 2 with relationship fields. Sessions and handoffs carry only `tags`, which stays unchanged.
- Issue and ENH READMEs hard-code status text and `Total X:` counts.

**Not checked:** several commands flagged only by a generic `[[` or "status" match, four test scripts, `scripts/validate-plugin.sh`, `knowledge/kg-index.md`, `copilot/`, `site/`.

## Canonical Schema and Step Plan (approved by user 2026-10-17)

Approved by the user on 2026-10-17: the schema and step plan below, the version marker living in the graph, and the retirement rule. Link rendering results are recorded in [ENH-059](../ENH-059/ENH-059-specification.md).

- **Directive (user): avoid ambiguous naming.** No generated link may use a target name shared by more than one file. Targets that cannot be made unique are reported, not written.
- **One flat shape for every doc type.** Obsidian's Properties editor does not support nested properties (web sources, unverified here), so ADRs move from the nested `related: {adrs, lessons, kg_entries}` map to flat lists. ADR `lessons` becomes `related_lessons` and `kg_entries` becomes `related_docs`, so nothing is dropped.
- **Value form:** quoted wikilinks in flat lists with the short ID as label, for example `["[[ENH-042-specification|ENH-042]]"]`. In the Obsidian test, frontmatter wikilinks rendered as links and drew graph edges.
- **Spelling:** underscore everywhere (`related_issues`, `github_issue`). Read both spellings for one release, then have the validator reject the old one. This requires editing the PROTECTED `kmg-start-issue-tracking.md` (permission needed). Hyphen for `github-issue` alone would avoid that but leave two styles.
- **Leave alone:** `implements:` (holds a release number, not a relationship) and the free-text `status:` (belongs to the `status_category` work).
- **Separate approvals, in order:** Step 001 renames keys and uses string IDs for issues and ENHs (no protected files). Step 002 writes the wikilinks. Step 003 flattens ADRs. Before step 003, change `capture.ts` and the ADR agent so new ADRs are written flat, so drift stops growing. The PROTECTED `ADR-template.md` needs permission first. Until then the tool reads both ADR forms.
- **Version marker (decided by user 2026-10-17): in the graph**, not in each document (per-document markers would clutter 350 files and show in Obsidian and Nimbalyst properties). The marker records the highest step applied and is used only to decide skip versus ask the user; shape-detection stays the source of truth. The tool asks before applying anything. Exact storage location inside the graph (next to the tracked `.kmgraph-id`, per the Opus review) is an implementation detail still to be specified.
- **Retirement rule (approved by user 2026-10-17):** a single schema floor. Each step declares `introducedIn`. The maintainer raises one constant (the minimum version a graph may upgrade from) deliberately in a release, never automatically. A step's code is deleted only when both hold: the floor is above that step's `introducedIn`, and the step's detector finds zero hits on this repo's graph and the test fixtures. A graph older than the floor gets an explicit "upgrade with release X first" message, never a silent skip. "After N releases" alone is rejected because users skip versions and this project ships many patch releases.
- **Dry run:** inspect mode prints a per-file before/after diff and reports unresolved or ambiguous targets; nothing is written without explicit confirm.

## Relationship Scan: Where the Logic Lives (approved by user 2026-10-17, "option C"; in scope for v0.7.11; implemented in commit 085ab87f, reviewed fixes follow)

**Problem found by the third Opus review.** The first build put the scan in `scripts/relationship-scan.sh` and had the audit skill run `bash scripts/relationship-scan.sh` from the repo root. That works only inside this source repo. In a user's project the file is not there (the package ships `scripts/`, listed in `package.json` `files`, and hooks run them from `${CLAUDE_PLUGIN_ROOT}/scripts/`, but it is not copied into the user's project folder). The step would be skipped silently for every other user. Pointing the skill at `${CLAUDE_PLUGIN_ROOT}/scripts/...` would fail the same way, because that variable is not set in the Bash tool environment (only the hook system expands it) and there is no evidence it is substituted in skill text. The skill is the script's only caller, and Steps 5 and 6 of the same skill are already inline bash for the same reason.

**Design (option C): the scan moves into the skill.**

- In `skills/kmg-paperwork-audit/SKILL.md` Step 7 the scan logic is a fenced `bash` block between two fixed marker comments (so a test can extract exactly that block). `scripts/relationship-scan.sh` is deleted.
- **Which folder is scanned.** Step 7 first asks `kg_resolve` for the graph. Its `path` is the graph folder itself (not the repo root), so it works for a graph that is not called `knowledge` and for a graph that lives outside the repo. `kg_resolve` returns an error when the current folder matches no project graph (checked in `mcp-server/src/tools/resolve.ts`: the personal graph is returned only for `scope:"user"`), and the skill never asks for the personal graph. On a `kg_resolve` error, or when the MCP server is not available, the skill falls back to the git top level plus `/knowledge`; only if that folder is missing too does it skip Step 7, saying "no knowledge graph resolved". The block reads the folder from an environment variable `KG`, set in single quotes on the line before it runs.
- **What it keeps from the first build:** the ignore list, ignoring bare filenames and hub paths shared by more than 4 docs (`REL_SCAN_HUB_MAX`, default 4), flag-only behavior (never edits), exit 0 always, output lines `UNDECLARED: <idA> <-> <idB> (shared: <path>)`.
- **Graphs not shaped like this repo.** The block looks only for `issues/issue-*-description.md` and `enhancements/ENH-*-specification.md` under the resolved folder. A graph with no `issues/` and no `enhancements/` folder gives empty output, exit 0, and a message on stderr saying the graph has nothing to scan. The old message told consumers to "pass the repo root", which is wrong in this design and is removed. A graph with only one of the two folders is scanned normally.
- **Dismissals are not stored.** Whenever pairs are flagged the block prints a one-line warning on stderr: how many were flagged, and that the same pairs reappear on every audit until a relationship is declared in either note's frontmatter. The skill passes it on to the user. Nothing is printed when nothing is flagged.
- **Many flagged pairs.** The first real run on this repo's graph produced 140 pairs. Walking through that many one at a time is too many. When Step 7 gets more than about 20 lines, the skill groups them by shared file, shows each group with its document IDs, and lets the user dismiss a whole group at once (or step into a group, or record the lot as a backlog). One question at a time.
- **Tests.** `scripts/relationship-scan.test.sh` is rewritten to extract the marked block from the skill and run it against the existing fixtures, so the test checks the code users actually run. New cases: a graph folder not named `knowledge`; a graph with no `issues/` or `enhancements/`; a graph with only `enhancements/`; `KG` unset; running from a different working directory; running exactly the way the skill instructs (`bash -s` with the block fed through a heredoc) and as a plain file, each under both the macOS system bash (3.2) and the first `bash` on the PATH, requiring an empty stderr; and a missing marker, which must fail the test rather than pass silently. Mutation checks (a stdin-reading command added to the block; a bash-4-only command added) were confirmed to fail the test.
- **Documentation fixes that come with it:** the skill's scope-boundary sentence says `scripts/` is "never distributed"; that is wrong and is reworded (the package ships `scripts/`; it is just not in the user's project folder, and `CLAUDE_PLUGIN_ROOT` is not available in the Bash tool). The CHANGELOG line that names `scripts/relationship-scan.sh` is rewritten to describe the step in the skill.

**Cross-platform MCP tool: built in v0.7.11.** The inline block runs only where the skill runs, so platforms that do not run the skill got no relationship scan. A read-only `kg_relationship_scan` MCP tool that returns the flagged pairs as data was built on branch `v0.7.11.2-mcp-relationship-scan`, a child of this one. It is specified separately in [[ENH-062-relationship-scan-mcp-tool-spec|ENH-062-relationship-scan-mcp-tool-spec]] (same enhancement, not a new ENH). The skill's bash block is kept as is; the tool is for platforms that do not run the skill. Differences from the bash (no git fallback, relative file paths added, `hubMax` as a parameter, the SIGPIPE bug not ported) are listed in that spec.

## Known Risks (accepted for v0.7.11)

Found by the Opus review of the v0.7.11 branch (2026-10-17) and accepted by the user. Recorded here so they are not forgotten.

- **Approval is not bound to the exact dry run that was shown (review finding F4).** `kg_upgrade` apply recomputes the plan when it runs. A file added or edited between the inspect the user reviewed and the apply would be rewritten without having been shown. Mitigations in place: each rewrite is verified (YAML parsed before and after, only the step's own keys changed, body byte-identical), a `.bak` copy is written once per file, and in the guided flow the gap between inspect and apply is seconds. A possible future fix: inspect returns a fingerprint of the planned changes and apply refuses when the plan no longer matches it.
- **Notes that do not follow the expected shapes (graphs that predate the plugin).** The migration never guesses. Whole-file problems (doubled frontmatter, both key spellings present) skip that file. Field-level problems (an unusual `related:` shape, an unknown group name, a multi-line `status`) leave only that field exactly as it is and are listed under "needs your attention" in the inspect output and the apply summary; the rest of the file is still migrated. A plain `related:` list (flow or block) becomes `related_docs`, with clearly-prefixed IDs (ENH, ADR, issue) turned into links. These notes do not hold the schema marker back, and inspect goes quiet once nothing is left to apply, so anything on the attention list stays until someone edits it by hand. Files with no frontmatter or with CRLF line endings are counted as "ignored". A field is also left as it is when a real YAML parse disagrees with how the tool read it (anchors and aliases, nested lists, unusual quote escapes) or when it carries comments (a rewrite would lose them); files whose YAML does not parse at all (for example duplicate keys) are skipped. Files starting with a byte-order mark or containing CR characters are counted as ignored. The verifier refuses any rewrite that changes the number of relationship entries or cuts an entry short, and the same check runs during the dry run, so a file that would be refused shows up as needing attention instead of staying pending and blocking later steps.

- **Relationship scan behavior notes (2026-10-17).** (a) It is a flag, not a verdict: it only looks at which files two documents mention, so many flagged pairs are not real relationships (see the lesson about scan noise). (b) A pair the user dismisses is not remembered: the next audit flags it again, because the scan has no place to store dismissals. Declaring the relationship in either document's frontmatter is what silences a pair. So the scan prints a one-line warning whenever it flags pairs (how many, and that the same pairs reappear on every audit until a relationship is declared), and the skill passes it on to the user. Whether to add a persistent "not related" list is undecided. (c) The inline scan only runs where the skill runs; platforms that do not run the skill use the `kg_relationship_scan` MCP tool (built in v0.7.11, see [[ENH-062-relationship-scan-mcp-tool-spec|ENH-062-relationship-scan-mcp-tool-spec]]). The logic now lives in two copies (the skill's bash and the tool's TypeScript); the parity tests are the guard against drift. (d) The scan reads the first graph `kg_resolve` returns; a user with several graphs scans only the one matching the current folder.

## Open Questions

Updated 2026-10-18 to match what v0.7.11 built. Earlier questions that are now answered are listed as "Settled", with where the answer lives.

**Settled in the v0.7.11 build**
- Canonical spelling and migration route: underscore spelling everywhere; both spellings are read for one release; the move runs through a `kg_upgrade` category (`frontmatter-schema`) in four separately approved steps (see "Canonical Schema and Step Plan").
- Where the backfill lives, and the size and retirement guardrails: a new `mcp-server/src/lib/frontmatter/` module that `upgrade.ts` only registers; one graph-level marker file (`.kmgraph-frontmatter-schema`); one schema floor constant (`FRONTMATTER_SCHEMA_FLOOR`, currently 0, so nothing has been retired yet).
- Where `status_category` is stored: as a stored field, written by migration step 4 and by `kg_capture` for ADRs. Unrecognized `status` values map to `pending`, never `done` or `cancelled`, and are reported.
- Status migration mechanics: step 4 adds `status_category` and leaves the free-text `status` alone.
- The fourth backfill path (scaffolding empty typed fields onto old documents): not built. As built, `blocked_by`, `blocking`, `depends_on` and `related_to` are written only on newly created issue and enhancement documents, or on old ones when a real relationship is found and the user confirms it. The approved plan made this choice; it was not separately re-confirmed in the spec.

**Still open**
- **Mapping table sign-off against the whole corpus.** The table in "`status` Schema Design" is what the code uses, plus one alias the build added: `tracked-not-implemented` maps to `pending` (that value is documented in `kmg-start-issue-tracking`). Running the upgrade's inspect step on a real graph lists any `status` value the table does not recognize; that run is the corpus check.
- **A validator that rejects the old key spellings.** Deliberately not in this release (both spellings are still read). Needs a later release and a decision on when.
- **Computed `blocked` state and mirroring GitHub's relationship model** (the "GitHub Issue relationships" question near the top). Neither was built in v0.7.11; the typed fields exist, nothing reads them yet.
- **A remembered "not related" list** for pairs the user dismisses in the relationship scan (see "Relationship Scan: Where the Logic Lives" and Known Risks). Undecided.
- **A cross-platform MCP tool for the relationship scan.** Built in v0.7.11 as `kg_relationship_scan`, specified in [[ENH-062-relationship-scan-mcp-tool-spec|ENH-062-relationship-scan-mcp-tool-spec]]. Settled; kept here for the record. Making the skill call the tool instead of carrying the bash is deferred.
- **Status flip.** Settled 2026-10-18: this ENH and ENH-059 are marked `implemented` for v0.7.11, matching the other implemented enhancements. Running the migration on this repo's own graph is still not part of the release.

## Related

- [issue-61](../../issues/issue-61/issue-61-description.md) — proposes that Gate 5 read this ENH's relationship fields as its machine-readable source instead of grepping whole files.
- [ENH-065](../ENH-065/ENH-065-specification.md) — shares the `status` schema and `kg_upgrade` backfill surface, so a `workflow` field must be designed together with this ENH.
- [issue-53](../../issues/issue-53/issue-53-description.md), [issue-54](../../issues/issue-54/issue-54-description.md) — the ADR-006/orphan-file incident that prompted this session's manual relationship-mapping exercise in the first place.
- [ENH-059](../ENH-059/ENH-059-specification.md) — depends on this ENH's field vocabulary; renders the relationship fields as real Obsidian links while keeping `tags:`.
- [ENH-052](../ENH-052/ENH-052-specification.md) — broader "internal KG paperwork consistency" umbrella; this ENH's schema work would be a natural input to ENH-052's consistency checks once it exists.
- [ENH-062-relationship-scan-mcp-tool-spec](ENH-062-relationship-scan-mcp-tool-spec.md) — separate spec in this enhancement for the `kg_relationship_scan` MCP tool (built in v0.7.11).

## Status

Built in release v0.7.11 (branch `v0.7.11-kg-frontmatter-links`, not yet merged at the time of writing), including the cross-platform `kg_relationship_scan` MCP tool (branch `v0.7.11.2-mcp-relationship-scan`, see [[ENH-062-relationship-scan-mcp-tool-spec|ENH-062-relationship-scan-mcp-tool-spec]]). This document's `status:` is `implemented` for the v0.7.11 release (maintainer decision 2026-10-18); the items under "Still open" and "Not part of the release" below are follow-ups, not blockers.

**Built:** the `frontmatter-schema` category in `kg_upgrade` (inspect first; its own consent flag `confirmFrontmatterSchema` plus an explicit `frontmatterSteps` list; four separately approved steps; `.bak` copies; real-YAML cross-check; schema marker file and floor); `kg_capture` writing the flat wikilink `related_*` fields and `status_category`; the typed relationship fields in new issue and enhancement documents (`kmg-start-issue-tracking`); the updated protected templates; and the relationship scan as `kmg-paperwork-audit` Step 7, running inside the skill; and the cross-platform `kg_relationship_scan` MCP tool, which returns the same pairs as data (specified in `ENH-062-relationship-scan-mcp-tool-spec.md`).

**Not part of the release:** running the migration on this repo's own graph (the maintainer does that later); a validator for the old spellings; computed `blocked` state; mirroring GitHub's relationship model; scaffolding typed fields onto old documents.

Filed via `/kmgraph:kmg-start-issue-tracking` Mode 3 (track only) on 2026-08-22. Design history and decisions are in the sections above.
