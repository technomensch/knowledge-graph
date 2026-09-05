---
id: ENH-034
type: Enhancement
status: implemented
---

# ENH-034: Capture-pipeline command naming and grouping

**Local ID:** ENH-034 | **GitHub Issue:** [#232](https://github.com/technomensch/knowledge-graph/issues/232) (filed 2026-08-22, retroactively — see [issue-52](../../issues/issue-52/issue-52-description.md) for why brainstorm-originated specs don't reliably get one automatically)

**Status:** ✅ Implemented
**Discovered:** 2026-07-01
**Governed by:** [ADR-058](../../decisions/ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings.md)
**Related:** [ADR-053](../../decisions/ADR-053-kmg-prefix-cross-platform-naming.md) (the June `kmg-` rename whose blast radius bounds this ENH's scope), [ADR-057](../../decisions/ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth.md) (the DETECT-layer subset of the same cluster), [ENH-026](../ENH-026/ENH-026-specification.md) (KG Write Guard — its `commands/kmg-update-graph.md` guard should wait for this ENH's Option A/B rename decision, validated 2026-07-11), [ENH-035](../ENH-035/ENH-035-specification.md) (chat-history backfill extractor `kmg-backfill` — its own blast-radius deep-dive (2026-09-04) independently found and needs to fix 2 `kmg-update-graph` references in `docs/pillars/organizing/backfill.md`; coordinate so this ENH's removal and ENH-035's fix don't land as conflicting edits to the same file), [ENH-042](../ENH-042/ENH-042-specification.md) (release-doc-sync reconciliation — its fix references `kmg-update-graph`/`kmg-execute-plan`/`kmg-update-doc.md` by name; hold its implementation until this ENH's Option A/B decision lands, validated 2026-07-11 — kept as a separate ENH since it's sync-logic + a new enforcement gate, not naming/IA), `docs/reference/command-guide.md`, `docs/reference/commands.md`, `docs/pillars/organizing/backfill.md`, `commands/kmg-update-graph.md`, `commands/kmg-update-issue-plan.md`

---

## Problem

The capture-pipeline cluster spans **14** commands, skills, and agents whose names do not signal which pipeline stage each belongs to:

- **Commands:** `kmg-capture-lesson`, `kmg-update-graph`, `kmg-update-issue-plan`, `kmg-sync-all`, `kmg-link-issue`, `kmg-meta-issue`, `kmg-start-issue-tracking`, `kmg-session-summary`, `kmg-handoff`
- **Skills:** `kmg-lesson-capture`, `kmg-session-wrap`, `kmg-capture-router`
- **Agents:** `knowledge-reviewer`, `session-documenter`

Because the names cluster around generic verbs (`update`, `capture`, `sync`) rather than pipeline stages (detect → draft → propagate), users hit "which command do I run" confusion. This was confirmed via **direct maintainer usage friction during the 2026-07-01 session**, not just theoretical review. Two names actively mislead:

- **`kmg-update-graph`** — it **extracts** lessons into the graph; it does not "update" an existing graph in the sense the name implies.
- **`kmg-update-issue-plan`** — it **syncs/propagates** plan state to GitHub; "update" undersells the outbound GitHub-post side.

---

## Proposed Behavior

Scope this as a **grouping + targeted-rename** effort, **not** a full cluster rename. A full rename was explicitly discussed and **rejected** mid-session: stacking a second high-blast-radius rename on top of the June [ADR-053](../../decisions/ADR-053-kmg-prefix-cross-platform-naming.md) `kmg-` prefix rename carries too much risk for too little marginal clarity.

1. **Restructure discovery surfaces by workflow, not alphabet.** Reorganize `docs/reference/command-guide.md` and `kmg-help` output into **workflow-ordered sections** that map to pipeline stages (e.g. Detect → Draft/Capture → Review → Propagate/Sync → Session lifecycle), so a user reads them in the order they would actually use them. This is the primary deliverable and carries near-zero blast radius (docs + help text only).

2. **Targeted renames — OPEN QUESTION, not yet decided.** Two candidates identified this session:
   - `kmg-update-graph` — superseded below by Option C (removal), see that section for current framing and reference counts. (Original rename framing, kept for history: a name signaling **extraction** would be more accurate; candidate explored was `kmg-ingest-graph`, which is why ENH-035's new command was initially named `kmg-backfill-graph` to pair via a shared `-graph` suffix — both since dropped, see Option C.)
   - `kmg-update-issue-plan` — a name signaling **sync/propagation** would be more accurate (candidate explored: `kmg-propagate-issue-plan` — deliberately avoids reusing "sync", since `kmg-sync-all` already owns that verb as the whole-pipeline orchestrator).

   Final rename decisions (including whether to rename at all, and the exact new names) are **left to this ENH's own implementation planning** — not locked here. Any rename must follow the ADR-058 naming/scope check and account for alias/back-compat per the ADR-053 precedent.

---

## Options — DECIDED 2026-09-04 (hold lifted; ENH-036 withdrawn, no longer a blocker)

**`kmg-update-graph`: Option C (remove).** **`kmg-update-issue-plan`: Option A (leave as-is, no rename)** — validated 2026-09-04 that the original "actively misleading" framing overstated it; steps 1-3 of its 5-step loop genuinely match "update issue" + "plan," the GitHub-post/version-audit steps (4-5) are a scope-completeness gap, not a broken-verb problem like `kmg-update-graph` had. Rename may be revisited later but isn't warranted now.

### Option A: Docs/help reordering only (no renames, no removal)
Reorder command-guide and `kmg-help` into workflow stages; leave all names as-is.

**Trade-off:** Zero blast radius; fully reversible; no ripple into ENH-035's `kmg-update-graph` references. But `kmg-update-issue-plan` keeps its actively-misleading name, and `kmg-update-graph` stays in place despite the provenance/usage findings below.

### Option B: Docs/help reordering + rename `kmg-update-issue-plan` only (with alias) — REJECTED 2026-09-04
Reorder as in Option A, and rename `kmg-update-issue-plan` (candidate: `kmg-propagate-issue-plan`), keeping the old name as a deprecated alias for one release. `kmg-update-graph` is handled separately under Option C (removal), not renamed.

**Trade-off:** Fixes one misleading name; standard alias/migration cost, no ENH-035/ADR-058 ripple (those documents reference `kmg-update-graph`, not `kmg-update-issue-plan`).

**Rejected because:** re-reading the full command (`commands/kmg-update-issue-plan.md`) showed the original "actively misleading" framing overstated the problem — see decision note above. Going with Option A for this command instead: no rename, docs/help reorder only.

### Option C: Remove `kmg-update-graph` entirely (superseding the earlier rename candidate)
**Re-contextualized 2026-09-04** — original framing (rename to `kmg-ingest-graph`) is dropped in favor of removal, based on research below. Retire the command; fold its one genuinely-live extraction responsibility into whatever path already exercises `knowledge-extractor` (its `kmg-init` backfill / `kmg-handoff` entry points), rather than keeping a standalone command whose own pipeline is dead.

**Why removal, not rename — research findings (2026-09-04 session):**

1. **Its background pipeline is confirmed dead.** `kmg-update-graph`'s only orchestrated caller, `kmg-sync-all` → `sync-all-agent`, is documented as never manually invoked by the user (`issue-37`, filed 2026-08-01, GitHub #238, status deferred: *"the user has never invoked `/kmgraph:kmg-sync-all`"*). Since `sync-all-agent`'s sole caller in the repo is `kmg-sync-all.md`, it has never run either. No hooks.json/cron/settings.json wiring exists for any of `kmg-update-graph`, `kmg-sync-all`, `sync-all-agent`, `knowledge-reviewer`, or `knowledge-extractor` — nothing here is auto-triggered.
2. **No recall evidence of direct manual invocation either.** Searches across auto-memory, indexed session content, and this session's batch reads turned up zero "ran `/kmgraph:kmg-update-graph`" events — only doc mentions (ENH-034, ENH-026 discussing its rename-candidate status).
3. **Its downstream callers' logic is absorbed, not orphaned — confirmed by a deeper check (2026-09-04).** `knowledge-extractor` has two distinct, mutually-exclusive modes (confirmed directly in `agents/knowledge-extractor.md`'s Mode-Based Behavior table): **`init-backfill` mode** (no write tools, no approval gate — coordinator handles writes) and **`update-graph` mode**, a.k.a. "KG Entry Extraction Mode" (has the write/approval gate). `kmg-update-graph` is the **only** trigger for `update-graph` mode. Initial read: removing the command would just orphan that mode. Deeper check while validating whether `kmg-init`'s existing backfill already covered this (it doesn't, see below) led to a full resolution instead: **per ENH-035's 2026-09-04 update, `kmg-backfill` (its new standalone command) absorbs `update-graph` mode's actual job** (indexing already-existing `lessons-learned/`/`decisions/` files into KG entries) as part of a 3-source consolidation (`chat-history/` + `lessons-learned/` + `decisions/`). Bonus finding from that check: `agents/knowledge-extractor.md`'s own docs claimed `init-backfill` mode already scanned `lessons-learned/`/`decisions/` — false; `kmg-init`'s actual `sources[]` array never included them, a real pre-existing bug ENH-035 now also fixes. Net result: **no orphaned capability at all** — `update-graph` mode's logic relocates to `kmg-backfill`, and `init-backfill` mode is unaffected either way. `knowledge-reviewer` (called at `kmg-update-graph`'s Step 6, and by `kmg-sync-all` — both confirmed-dead paths) is a separate, smaller open item: whether `kmg-backfill` should incorporate an equivalent quality-check step (possibly reusing `knowledge-reviewer` itself) is left to ENH-035's implementation, not a blocker to this removal decision.
4. **Provenance: ported wholesale from a different, unrelated project, never re-validated against this project's needs.** Git archaeology on `~/GitHub/optimize-my-resume` (a prior, unrelated resume-optimization tool) traces the true origin:
   - Born there as commit `1120042` (2026-01-23, *"feat(issue-80): finalize safety workflows and implementation hardening"*) — added as part of a safety/governance hardening pass, not a resume-optimization core feature.
   - 2026-02-05: a Step 7 "sync to MEMORY.md" addition was bolted on (tied to that project's ADR-011).
   - 2026-02-11: renamed under that project's own prefix convention.
   - 2026-02-12: imported into kmgraph's repo root commit `f0515daa` ("Phase 1 foundation") as one of "8 skills converted from optimize-my-resume project" — never redesigned for kmgraph's actual per-entry-directory KG structure (`knowledge/enhancements/ENH-XXX/`, ADRs). The original's whole design targeted a single flat file (`docs/knowledge/patterns.md`) and used domain vocabulary (`Shadow Sync Protocol`, `Gold Master`) meaningless to kmgraph.
   - kmgraph's own 2026-05-05 "governance migration" then **removed** the one distinguishing feature (Step 7 MEMORY.md write) that the original project's 2026-02-05 change had added — so what's left in kmgraph today is closer to the bare v1.0 shape (2026-01-16), stripped of the update that had justified its later existence, running against a repo structure it was never designed for.

**Trade-off:** Removes maintenance burden of an unused, architecturally-mismatched inherited command; requires updating references — **counts current as of ENH-035's 2026-09-04 update: 12 mentions in ENH-035's spec (up from 6, since it now documents the `kmg-init` Step 1.10 refactor and its own blast-radius deep-dive), 6 in ADR-058, and 3 newly-surfaced in `docs/pillars/organizing/backfill.md`** (ENH-035's blast-radius scan independently found this doc references `kmg-update-graph` in its "After init" and "no candidates" troubleshooting sections — same file ENH-035 is already touching for its own docstring-overclaim fix; coordinate the two edits, don't duplicate) — plus the caller references in `kmg-sync-all.md`, `sync-all-agent.md`, `knowledge-reviewer.md`, `knowledge-extractor.md`. Higher one-time edit cost than a rename, but avoids carrying forward a command with no confirmed use case indefinitely.

**Decided 2026-09-04 (hold lifted):** removal is chosen despite ENH-035 not yet being formally accepted/implemented — ENH-035's design (consolidated `kmg-backfill`) is settled enough that this decision no longer needs to wait on its status. `kmg-update-graph` is referenced by ENH-035 (12 mentions), ADR-058 (6 mentions), and `docs/pillars/organizing/backfill.md` (3 mentions) — all three ripple passes should land together with ENH-035's implementation so the ripple only happens once. ENH-036 was withdrawn and was never a real blocker either.

### Workflow-stage grouping for the docs/help restructure

Applying the pipeline-stage mapping already established this session's swimlane design work. Names shown are **current names** — the two candidate renames are noted inline but NOT assumed; this table holds regardless of how the Option A/B rename question above resolves:

| Stage | Commands/skills/agents |
|---|---|
| **Capture** | `kmg-capture-lesson`, skill `kmg-lesson-capture`, skill `kmg-capture-router` |
| **Structure** | `kmg-update-graph` *(removal candidate, not rename — open, see Option C above)*, agent `knowledge-reviewer` |
| **Track / Link** | `kmg-start-issue-tracking`, `kmg-link-issue`, `kmg-meta-issue` |
| **Propagate** | `kmg-update-issue-plan` *(rename to `kmg-propagate-issue-plan` candidate — open, see above)*, `kmg-sync-all` *(orchestrator, listed last in this section — see below)* |
| **Session** | `kmg-session-summary`, `kmg-handoff`, skill `kmg-session-wrap`, agent `session-documenter` |

`kmg-sync-all` gets its own short callout at the end of the Propagate section (or its own final subsection) as "runs the full pipeline on demand" rather than being alphabetized into any single stage — it spans all of them.

---

## Explicitly Out of Scope

- A full rename of the 14-item cluster (rejected mid-session — blast-radius risk stacked on ADR-053).
- Any change to what the commands **do** — this ENH is naming/grouping/discoverability only.

---

## Affected Files

| File | Role |
|---|---|
| `docs/reference/command-guide.md` | Restructure into workflow-ordered sections instead of alphabetical |
| `commands/kmg-help.md` (help output) | Same workflow-ordered grouping in surfaced help |
| `docs/reference/commands.md` | Reflect new grouping; note any aliases if renames land |
| `commands/kmg-update-graph.md` | Removal candidate (Option C, not rename) — dead pipeline + inherited-scaffold provenance; requires updating references in ENH-035 (12), ADR-058 (6), and `docs/pillars/organizing/backfill.md` (3) |
| `commands/kmg-update-issue-plan.md` | Candidate targeted rename (sync/propagate, not "update") — if Option B |
| `commands/kmg-sync-all.md`, `agents/sync-all-agent.md` | **Decided 2026-09-04 (via open-ticket check): remove, not "likely" — this decision doubles as issue-37's resolution.** `issue-37` (deferred, GitHub #238) exists solely to ask "should `kmg-sync-all` be deprecated?"; `kmg-update-graph`'s removal makes that answer concrete (its only orchestrated pipeline is provably dead, per issue-37's own finding). Close issue-37 with a pointer to this ENH when implemented, rather than leaving its question open after the fact. |
| `agents/knowledge-extractor.md` | Its `update-graph` mode's job is **absorbed into `kmg-backfill`**, not orphaned (ENH-035, 2026-09-04) — its own doc's KG Entry Extraction Mode section should be removed/deprecated in the same pass as this removal, coordinated with ENH-035, not deleted twice. Its `init-backfill` mode is unaffected either way. |
| `agents/knowledge-reviewer.md` | Called only by `kmg-update-graph` (Step 6) and `kmg-sync-all` (both confirmed-dead paths). Not a blocker to this removal — whether `kmg-backfill` incorporates an equivalent quality-check step (possibly reusing this agent) is an ENH-035 implementation decision, tracked there |
| `docs/pillars/organizing/backfill.md` | Shared with ENH-035 — that ENH is already fixing this file's `kmg-extract-chat` overclaim and troubleshooting sections; this ENH's removal must land its `kmg-update-graph` reference fixes in the same pass, not a conflicting separate edit |

**Docs-impact-scan findings (2026-09-04, run via `kmg-docs-impact-scan` before writing the implementation plan) — 19 additional files reference `kmg-update-graph`/`kmg-sync-all`/`sync-all-agent` as live, current behavior and will go stale once this ENH ships:**

| File | What needs to change |
|---|---|
| `README.md` | `## Commands` table lists both as live commands — remove/replace rows |
| `ROADMAP.md` | ENH-034/ENH-026 tracker entries still say "Option A/B open... rename to kmg-ingest-graph" — stale even pre-implementation, already superseded by this spec's Option C |
| `docs/CHEAT-SHEET.md` | Quick-reference row, command table rows, agent table rows, and a numbered workflow example invoking `kmg-update-graph` |
| `docs/reference/command-guide.md` | Full `### kmg-update-graph` and `### kmg-sync-all` sections plus ~10 index/cross-ref mentions |
| `docs/reference/agents.md` | Example command `--delegate knowledge-extractor` invocation |
| `docs/reference/templates.md` | "Created by" column cites `kmg-update-graph` for 6 template rows |
| `docs/reference/ARCHITECTURE.md` | "Automation" section names `kmg-sync-all` as the pipeline orchestrator |
| `docs/GLOSSARY.md` | Glossary entry describing `kmg-sync-all`'s 4-step pipeline |
| `docs/reference/PLATFORM-ADAPTATION.md` | Cross-platform comparison text references `kmg-sync-all` equivalent |
| `docs/pillars/tailoring/customize-templates.md` | "Created by" table row |
| `docs/pillars/tailoring/automation-layer.md` | Mermaid sequence diagram references `kmg-update-graph` |
| `docs/pillars/recalling/search-the-graph.md` | Describes `kmg-sync-all` as the FTS5 first-run-prompt trigger |
| `docs/pillars/recalling/session-memory.md` | "Run kmg-update-graph after capturing lessons... updates MEMORY.md" |
| `docs/templates/MEMORY-template.md` | Live shipped template instructs "Run kmg-update-graph Step 7 for bidirectional sync" |
| `docs/templates/knowledge/entry-template.md` | Comment: "Most KG entries are auto-generated via kmg-update-graph" |
| `docs/templates/meta-issue/README.md` | "Sync to KG: Run kmg-update-graph to extract insights" |
| `docs/examples/knowledge/sample-patterns.md` | Illustrative workflow example |
| `docs/examples/knowledge/sample-concepts.md` | "kmg-sync-all: Runs entire 4-step pipeline" description |
| `docs/examples/lessons-learned/patterns/Example_Complete_Memory_System.md` | `### /kmgraph:kmg-sync-all` section + phase-history note |

**Explicitly NOT touched (checked, correctly excluded):** `CHANGELOG.md` and `docs/specs/2026-06-12-kmg-prefix-normalization-design.md`/`docs/specs/2026-05-05-update-graph-governance-migration-design.md` — historical records of already-shipped work; editing these would rewrite history, not reflect it. 11 other files with incidental `kmg-init`/`kmg-extract-chat` mentions checked and correctly excluded as unaffected.

---

## Acceptance Criteria

- [x] `command-guide.md` and `kmg-help` present the capture-pipeline cluster in workflow-stage order, not alphabetical.
- [x] The pipeline stage each command belongs to is legible from the grouping.
- [x] A decision is recorded on `kmg-update-issue-plan` (rename vs. leave, Option A vs. B); if renamed, old name remains a deprecated alias for at least one release (ADR-053 precedent). Decided: Option A, kept as-is, no rename — see ADR-071 Decision 6.
- [x] Decision recorded 2026-09-04: `kmg-update-graph` removed (Option C). `kmg-sync-all`/`sync-all-agent` removed in the same pass (this also resolves `issue-37`'s open deprecation question — close it with a pointer here). ENH-035 (12 refs) + ADR-058 (6 refs) + `docs/pillars/organizing/backfill.md` (3 refs) updated in the same pass — coordinated with ENH-035's own edits to that last file, not duplicated.
- [x] `knowledge-extractor`'s `update-graph` mode section (KG Entry Extraction Mode) is removed/deprecated from `agents/knowledge-extractor.md` in the same pass as this removal, coordinated with ENH-035 (which absorbs its logic into `kmg-backfill`) so it isn't deleted twice or left half-updated. Its `init-backfill` mode is unaffected.
- [x] `knowledge-reviewer`'s fate (retained for reuse by `kmg-backfill`, or retired alongside `kmg-update-graph`/`kmg-sync-all`) is decided during ENH-035's implementation — not a gating condition for this removal. Decided: retired (Option X) — see ADR-071.
- [x] No full-cluster rename is performed.
- [x] Any new/renamed name passes the ADR-058 naming/scope check (audience, collision, accuracy). `kmg-backfill` checked in ENH-035's own Naming decision section.
- [x] No behavioral change to any command in the cluster, other than the `kmg-update-graph` removal itself if Option C is chosen (plus `kmg-init` Step 1.10's scoped bug fix, tracked explicitly under ENH-035).

**Post-implementation ticket sync (do not skip — these were left "pending"/"not yet implemented" specifically so this work would close them):**
- [x] `issue-37` updated from its 2026-09-04 "accepted" note to `resolved`/closed, pointing at the shipped removal.
- [x] `ENH-025` updated from `accepted` to `implemented` (its `kg_extract` design shipped as part of ENH-035's implementation).
- [x] `ENH-026` — its 2026-09-04 update note (guard items 1 superseded/moot) re-checked against what actually shipped; wording updated to confirmed past tense.
- [x] `issue-40` — `kmg-sync-all.md` dropped from its file list.
- [x] `ADR-071` status moved from `Proposed` to `Accepted`.
</content>
