---
title: "ADR-058: Command/skill naming and scope decisions require an upfront check, not ad-hoc creation"
number: 058
status: Accepted
date: 2026-07-03
author: technomensch
email: mkitact@gmail.com
git:
  branch: main
  commit: 588f0bfd70d1f7b2d78956fe698ca80ee4d1cd1d
  pr: null
  issue: null
implements: null
related:
  adrs: [053, 056, 057]
  lessons: []
  kg_entries:
    - knowledge/enhancements/ENH-033/ENH-033-specification.md
    - knowledge/enhancements/ENH-034/ENH-034-specification.md
    - knowledge/enhancements/ENH-035/ENH-035-specification.md
    - knowledge/enhancements/ENH-036/ENH-036-specification.md
tags: [governance, process, naming, scope, commands, skills, docstrings, contributing]
category: process
---

# ADR-058: Command/skill naming and scope decisions require an upfront check, not ad-hoc creation

**Date:** 2026-07-03
**Status:** Accepted
**Implements:** (design-first — no implementation commit yet; target release v0.7.0)
**Related:** [ADR-056](ADR-056-reject-plugin-split-for-contributor-only-doc-commands.md) (evidence: scope-leakage instance), [ADR-057](ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth.md) (evidence: architectural-accretion instance), [ADR-053](ADR-053-kmg-prefix-cross-platform-naming.md) (the June rename whose blast radius bounds [[ENH-034]]'s scope), [[ENH-033]] / [[ENH-034]] / [[ENH-035]] / [[ENH-036]] (the individual fixes this ADR governs)

---

## Context

A design session (2026-07-01 through 2026-07-03) set out to investigate recurring naming and scope confusion across kmgraph's commands and skills. Five findings surfaced, in order:

1. **`kmg-sync-all` naming** — inspected and found fine; kept as-is. No defect here; not part of scope going forward. (Recorded only so the negative result is not re-investigated later.)

2. **`kmg-update-doc` / `kmg-create-doc` scope leakage** — these commands were built to manage kmgraph's **own** documentation but ship to **all** installers, forcing kmgraph's house style (v0.0.7 third-person voice, Section 508 conventions) onto any file they touch, including an installer's unrelated project files. Resolved by **[ADR-056](ADR-056-reject-plugin-split-for-contributor-only-doc-commands.md)** (Accepted): a `kmgraph-contrib` plugin split was rejected — Claude Code has no runtime command-hiding mechanism (`plugin.json` has no `commands` field; discovery is filesystem-scan-based) — in favor of repo-context auto-detection plus severity-dot labeling. Implementation tracked in **[[ENH-033]]** (Proposed, not yet built).

3. **Capture-pipeline command cluster** — an inventory found **14** commands/skills/agents doing overlapping-sounding work: commands `kmg-capture-lesson`, `kmg-update-graph`, `kmg-update-issue-plan`, `kmg-sync-all`, `kmg-link-issue`, `kmg-meta-issue`, `kmg-start-issue-tracking`, `kmg-session-summary`, `kmg-handoff`; skills `kmg-lesson-capture`, `kmg-session-wrap`, `kmg-capture-router`; agents `knowledge-reviewer`, `session-documenter`. Their names do not signal which pipeline stage each belongs to, producing "which command do I run" friction (confirmed via direct maintainer usage, not just theory). Mapped but not resolved — now specced as **[[ENH-034]]**.

4. **DETECT-layer accretion** — 5 independent skills (`kmg-lesson-capture`, `kmg-adr-guide`, `kmg-rules-capture`, `kmg-update-profile`, `kmg-capture-router`) each independently detect knowledge-worthy signals and dispatch to drafting agents. A recall investigation proved these were built piecemeal over 2+ months with no governing spec — two born in one generic batch commit, others each created for a narrow one-off gap, cross-skill coupling patched in reactively within a day of creation. The clinching evidence: [[ADR-045-update-profile-skill-not-command]] (governing `update-profile`'s creation) literally states its approach is "consistent with how other behavioral enforcements ... are implemented" — i.e. it explicitly copied an observed pattern rather than following a designed architecture. Documented by **[ADR-057](ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth.md)** (Accepted). **Final outcome (settled 2026-07-03):** [[ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth]] originally proposed consolidating the detection layer, but four different consolidation architectures were investigated extensively over the same day and **each was rejected on independent review**. The settled decision is **no consolidation — keep all 5 skills as separate, standalone files**, with only two minor changes (clean up `rules-capture-agent`'s input contract into a pure write-executor, and add a shared `skills/tests/trigger-fixtures.md` guardrail against trigger-vocabulary drift). The accretion *characterization* still stands; it was the *fix* that did not survive scrutiny. See [[ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth]]'s rewritten Decision section and Investigation Summary. **[[ENH-036]] (which had tracked the consolidation) is therefore Withdrawn** — see the child-ENH table below.

5. **`kmg-extract-chat` functional gap** — its own docstring claims it is "ideal for backfilling knowledge graphs from large chat histories," but it only archives raw session transcripts as markdown. Nothing in the current command set extracts lessons/decisions/KG-entries **from** `chat-history/` (`kmg-update-graph` only extracts from `lessons-learned/`). A second opinion, consulted specifically to test whether this should be "pipeline slice 1" of the deferred auto-capture design, concluded: do **not** couple it to the pipeline — build it standalone, fix the docstring, add a narrow extractor, no `capture_mode` dependency. Now specced as **[[ENH-035]]**.

### The unifying finding

A second opinion was consulted to sanity-check whether these five findings are "the same bug." Its conclusion — recorded here deliberately, not oversimplified — is that they are **NOT the same technical problem**. Doc drift (finding 2), scope leakage, architectural accretion (finding 4), and a missing feature (finding 5) are **different failure modes with different fixes**. There is no single shared technical defect to patch.

What they **do** share is one **process gap**: kmgraph has never had an upfront naming/scope decision check for new commands, skills, or docstrings. At creation time, nobody was required to ask:

- **(a) Audience** — who is this for: the installer's own project, or kmgraph's own repo?
- **(b) Collision** — does a name or trigger like this already exist?
- **(c) Accuracy** — does the docstring's claim match what the code actually does?

Every finding above is an instance of that missing check — not one shared technical defect. Finding 2 is a missed audience question; findings 3 and 4 are missed collision/overlap questions; finding 5 is a missed accuracy question.

**Problem:**
- Each individual defect is already being fixed ([[ADR-056-reject-plugin-split-for-contributor-only-doc-commands]], [[ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth]], and the ENHs below), but nothing stops the **next** instance of the same pattern from being created and only discovered later via a recall investigation.
- The recurring cost is not any one defect; it is that the pattern is caught **after** merge, retroactively, rather than **before** merge, at creation.

**Scope:**
- In scope: establishing the upfront naming/scope check itself, and where it lives.
- Out of scope: re-deciding the individual fixes ([[ADR-056-reject-plugin-split-for-contributor-only-doc-commands]], [[ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth]]) or specifying the ENHs' implementations ([[ENH-033]]/034/035/036 own those).

---

## Decision

**Establish an upfront naming/scope check that must be applied before any new command, skill, or docstring ships.** The check formalizes the three questions the five findings each skipped, so future instances of this pattern are caught before merge rather than discovered later.

This ADR does **NOT** re-decide [[ADR-056-reject-plugin-split-for-contributor-only-doc-commands]]'s or [[ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth]]'s individual fixes. It cites them as evidence and adds a **governance layer above** them: they are the retroactive cures for two instances; this ADR installs the preventive check so there is not a sixth, seventh, and eighth instance.

### Core components

1. **The three-question check.** Before a new command/skill/docstring merges, the author must answer:
   1. **Audience** — Is this for the installer's own project, or for kmgraph's own repo? If contributor-only, is that reflected in labeling and repo-context behavior (per [[ADR-056-reject-plugin-split-for-contributor-only-doc-commands]]'s pattern)?
   2. **Collision** — Does a command/skill/agent with a similar **name** or **trigger vocabulary** already exist? If so, does this belong as a new artifact, or as an extension of the existing one? (This is the question findings 3 and 4 skipped.)
   3. **Accuracy** — Does the docstring/description claim only what the code actually does? (This is the question finding 5 skipped — `kmg-extract-chat` claimed a backfill capability it never had.)

2. **Home for the check.** The check is added as a lightweight section to the existing contributor guidance rather than as new machinery. This repo already has `CONTRIBUTING.md` at its root and a `docs/contributing/` area; the check lives there as a short "Before you add a command or skill" checklist. The `kmg-adr-guide` skill (which already nudges ADR creation on architectural decisions) is the natural place to also surface a reminder of this check when a new command/skill is being introduced — but wiring that is left to the implementing ENH/PR, not locked here.

3. **Lightweight, not gated.** The check is a checklist/review-prompt, not a CI-enforced hard gate. The failure mode being prevented is "nobody asked the question," which a visible checklist at the point of authoring addresses directly. A heavier enforcement mechanism can be revisited if the checklist proves insufficient (see Future Considerations).

### Implementation approach

Target release: **v0.7.0** (minor bump from current 0.6.15 — this adds a governance process, not a behavioral code change).

Add the three-question check to `CONTRIBUTING.md` / `docs/contributing/`, phrased as a pre-merge checklist, and cross-link it from the ADR-guide surface. The four child ENHs below are the concrete backlog this governance layer sits above.

---

## Child ENHs governed by this ADR

Three ([[ENH-033]]/034/035) are **ready to spec/build now**. **[[ENH-036]] is Withdrawn** (2026-07-03) — the detection-layer investigation concluded no consolidation should proceed; see [[ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth]]'s final Decision.

| ENH | Scope (one line) | Status | Governing ADR(s) |
|---|---|---|---|
| **[[ENH-033]]** | Repo-context auto-detection for `kmg-update-doc` / `kmg-create-doc` (stop imposing kmgraph house style on installer projects) + contributor labeling | 🟡 Proposed — **ready** | [[ADR-056-reject-plugin-split-for-contributor-only-doc-commands]] |
| **[[ENH-034]]** | Capture-pipeline command naming/grouping: workflow-ordered COMMAND-GUIDE/`kmg-help` sections + targeted renames only for actively-misleading names | 🟡 Proposed — **ready** | [[ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings]] |
| **[[ENH-035]]** | Standalone chat-history-to-KG backfill extractor + fix `kmg-extract-chat`'s overclaiming docstring | 🟡 Proposed — **ready** | [[ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings]] |
| **[[ENH-036]]** | DETECT-layer consolidation. **Withdrawn** — investigation concluded no consolidation should proceed; see [ADR-057](ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth.md)'s final Decision (all 5 skills kept as separate, standalone files). Preserved as a historical record of what was considered and rejected. | ⚪ **Withdrawn** (2026-07-03) | [[ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth]], [[ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings]] |

---

## Rationale

### Why this approach

1. **The findings are genuinely different failure modes — so a single technical fix would be wrong.** The second opinion explicitly rejected "these are all the same bug." Trying to build one mechanism to fix doc-drift + scope-leakage + accretion + a missing feature would over-couple unrelated concerns — the exact anti-pattern [[ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth]] diagnosed. The correct shared layer is **process**, not code.
2. **The cost being addressed is recurrence, not any single defect.** [[ADR-056-reject-plugin-split-for-contributor-only-doc-commands]] and [[ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth]] already cure their instances. Without an upfront check, the same class of mistake keeps being created and only found later by expensive recall archaeology. A cheap checklist at authoring time is the proportionate intervention.
3. **Reuse existing surfaces.** `CONTRIBUTING.md` and `kmg-adr-guide` already exist; the check attaches to them. No new plugin, no new command, no new enforcement engine — consistent with [[ADR-056-reject-plugin-split-for-contributor-only-doc-commands]]'s "don't add machinery for a lightweight problem" reasoning.
4. **Governance layered above, not merged into, the individual fixes.** Keeping [[ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings]] as a governance ADR that *cites* [[ADR-056-reject-plugin-split-for-contributor-only-doc-commands]]/057 preserves each decision's separate, auditable scope — rather than retroactively swelling those ADRs.

### Alternatives considered

**Option A: Treat all five findings as one technical bug and build a single unifying fix**
- Pros: superficially tidy — "one root cause, one fix."
- Cons: the findings are different failure modes; one mechanism spanning them would couple unrelated concerns and recreate the accretion problem [[ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth]] named.
- Rejected because: the second opinion explicitly disproved the "same bug" premise; a shared *technical* fix does not exist.

**Option B: Fix each finding individually and stop (no governance layer)**
- Pros: minimal; each ENH/ADR stands alone.
- Cons: leaves the process gap open — the sixth instance gets created and discovered late, same as the first five.
- Rejected because: it treats symptoms and ignores the one thing the findings actually share.

**Option C: Establish an upfront naming/scope check as a governance layer above the individual fixes (chosen)**
- Pros: prevents recurrence at the cheapest point (authoring time); reuses existing surfaces; keeps individual fixes' scopes intact.
- Cons: a checklist is only as good as authors' discipline in reading it; not hard-enforced.
- Selected because: it addresses the actual shared defect (a missing question) without over-coupling genuinely different fixes.

### Trade-offs

**Benefits:**
- ✅ Future naming/scope/accuracy mistakes get caught before merge, not via later recall investigation.
- ✅ No new machinery — attaches to `CONTRIBUTING.md` and the ADR-guide surface.
- ✅ Preserves the separate, auditable scope of [[ADR-056-reject-plugin-split-for-contributor-only-doc-commands]] and [[ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth]].

**Costs:**
- ❌ A checklist is advisory; a determined or hurried author can skip it.
- ❌ Value is preventive and therefore hard to measure directly (absence of future instances).

**Mitigation:**
- Surface the check at the ADR-guide moment (when a new command/skill is being introduced), not only in a static doc, so it appears at the point of authoring.

---

## Consequences

### Positive

1. **Preventive, not just curative:** the class of mistake behind all five findings now has a catch point before merge.
2. **Backlog anchored:** the four child ENHs have a single governing decision to cite; their ready/blocked status is recorded in one place.
3. **Cheap to adopt:** reuses `CONTRIBUTING.md` / `docs/contributing/` and an existing skill surface.

### Negative

1. **No hard enforcement:** the check relies on author discipline; a skipped checklist is invisible until a later recall investigation.

### Neutral

1. **This ADR changes no runtime behavior** — it installs a process. The behavioral changes live in the child ENHs.

---

## Prior Discussion / Evidence Sources

- **[ADR-056](ADR-056-reject-plugin-split-for-contributor-only-doc-commands.md)** — the scope-leakage instance (audience question skipped); cited as evidence, not re-decided here.
- **[ADR-057](ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth.md)** — the architectural-accretion instance (collision/overlap question skipped); its 2026-07-03 amendment unblocking [[ENH-036]] is what makes all four child ENHs ready now.
- **[ADR-053](ADR-053-kmg-prefix-cross-platform-naming.md)** — the June `kmg-` prefix rename; its blast radius is why [[ENH-034]] is scoped as workflow-ordering + targeted renames, not a second full rename.
- **Session second opinion (2026-07-03)** — confirmed the five findings are different failure modes sharing one process gap, not one technical bug.

---

## Related Decisions

- **[ADR-056](ADR-056-reject-plugin-split-for-contributor-only-doc-commands.md):** Evidence instance (audience/scope); this ADR adds the preventive layer above it.
- **[ADR-057](ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth.md):** Evidence instance (accretion); its amendment unblocks [[ENH-036]].
- **[ADR-053](ADR-053-kmg-prefix-cross-platform-naming.md):** Bounds [[ENH-034]]'s rename scope.

---

## Cross-ENH Dependency Map (2026-07-03)

After all four child ENHs were drafted, a direct trace was run across all seven documents ([[ADR-056-reject-plugin-split-for-contributor-only-doc-commands]]/057/058, [[ENH-033]]/034/035/036) to check for hidden dependencies, contradictions, and supersession relationships — since several documents reference each other by command name and it was not otherwise obvious which decisions were load-bearing on which.

### Contradiction found and fixed

[[ENH-034]]'s rename decision (whether `kmg-update-graph`/`kmg-update-issue-plan` get renamed) was reverted from a premature decision back to "open question" — but its workflow-stage grouping table was not updated in the same pass, and briefly asserted the renamed names as settled fact while the section above it said the opposite. Fixed same-session: the table now shows current names as primary, with renames noted inline as open candidates, not assumed.

**Lesson for future ADR/ENH edits:** when a decision inside a document is reverted, grep the whole document for other places that assumed the reverted outcome — a decision can leave residue in tables/examples even after its "decision" section is corrected.

### Task-level dependency graph (2026-07-03, supersedes the ENH-container framing below)

Treating [[ENH-034]] as a single node hid real structure — it holds two decision items with no edge to each other (a rename choice and a docs-table choice). Rebuilt at the level of individual decision items, tagged to their source ENH, verified in a second independent pass:

**Note:** T-numbers are IDs only (assigned in the order items were first identified during decomposition), **not priority.** Priority is the **Tier** column below — lower tier number = decide first. Tier 0 is already done; work starts at Tier 1.

| Item | What it actually is | Source | Tier (= priority) | Status |
|---|---|---|---|---|
| **T3** | The `Updating: {path} / Repo: {name}` confirmation line printed before any write | [[ENH-033]] | 0 | ✅ Closed |
| **T4** | The repo-detection check (is this cwd actually the kmgraph repo?) + the contributor-only labeling in docs | [[ENH-033]] | 0 | ✅ Closed |
| **T8** | The new `kmg-backfill-graph` command — standalone chat-history extractor | [[ENH-035]] | 0 | ✅ Closed |
| **T8a** | Fixing `kmg-extract-chat`'s docstring so it stops claiming a backfill capability it doesn't have | [[ENH-035]] | 0 | ✅ Closed, fully independent |
| **T9** | ~~Picking the name for the shared engine that would replace/back the detection skills.~~ **→ MOOT / CLOSED.** The task presupposed a new skill or engine that needed naming. Per [ADR-057](ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth.md)'s final settled Decision, **no consolidation proceeds** — there is no new skill and no new engine to name. `kmg-capture-router` keeps its current name and current scope; `kmg-rules-capture`, `kmg-lesson-capture`, `kmg-adr-guide`, and `kmg-update-profile` all keep their current names, unchanged. There is nothing to decide. *(Prior wording, kept for traceability: earlier drafts of T9 variously read "name the new shared classifier skill that replaces the 5," "name the shared engine/library backing 3 of 5," and "resolved — engine is `kmg-capture-router`." All are superseded: the consolidation those framings assumed was ultimately rejected.)* | [[ENH-036]] (Withdrawn) | — | ⚪ Moot / closed (no new artifact to name; all 5 skills keep their current names) |
| **T5** | Reorganizing `COMMAND-GUIDE.md`/`kmg-help` into workflow-stage sections (Capture/Structure/Track-Link/Propagate/Session) instead of alphabetical | [[ENH-034]] | **1 — decide now** | 🟡 Open (draftable now, name-agnostic by design) |
| **T6** | Whether to rename `kmg-update-graph` to something like `kmg-ingest-graph` | [[ENH-034]] | 2 — wait for T9 | 🟡 Open, gated |
| **T7** | Whether to rename `kmg-update-issue-plan` to something like `kmg-propagate-issue-plan` | [[ENH-034]] | 2 — wait for T9 | 🟡 Open, gated |
| **T10** | [[ENH-036]]'s rollout strategy | [[ENH-036]] | off-graph | ⚪ Belongs to [[ENH-036]]'s own implementation plan, not this ADR — see note below |
| **T11** | [[ENH-036]]'s confidence-model design | [[ENH-036]] | off-graph | ⚪ Belongs to [[ENH-036]]'s own implementation plan, not this ADR — see note below |

**Edges (validated in a second independent pass, one correction from the first pass noted):**

- **T3 → T8**: T8 reuses T3's pattern verbatim. Non-blocking — T3 is closed.
- **T8 → T6** (one-way, corrected from an earlier bidirectional draft): T8 is closed and locked (`kmg-backfill-graph`). T6, if renamed, must be chosen *with* T8's `-graph`-family sibling in mind — the constraint only flows toward T6, since T8 will not move.
- **T9 → T5** (soft): T5 is deliberately drafted name-agnostic — it shows current names with renames noted as open candidates, so it holds regardless of how T6/T7/T9 resolve. Can be drafted now, patched once names land.
- **T6, T7 → gated on T8 (done) and [[ENH-035]]/036 stabilizing (both now settled)**: [[ENH-034]]'s own spec text says the rename question is "held until [[ENH-035]]/036 are stable." Both gates are now cleared — [[ENH-035]]'s T8 is closed, and **[[ENH-036]] is Withdrawn (no consolidation), so it is settled and no longer moving.** This gate applied to *both* T6 and T7 — not just T6 via the naming-sibling constraint. **Correction from the first pass:** T7 was initially treated as fully independent; it is not — it shares [[ENH-034]]'s blanket hold with T6, even though it carries no naming-sibling constraint of its own.
- **T9 is moot / closed.** The detection-layer investigation settled on **no consolidation** ([[ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth]]'s final Decision), so there is no new skill or engine to name — `kmg-capture-router` and the other four skills all keep their current names and scopes. [[ENH-036]] is Withdrawn. T9 requires no decision and gates nothing. *(Prior wording, kept for traceability: earlier drafts treated T9 as an active naming task — first "name the new classifier skill," then "name the engine backing 3 of 5," then "resolved — engine is `kmg-capture-router`." All are superseded by the no-consolidation outcome.)*
- **T10 and T11 are [[ENH-036]] implementation-plan substance, not this ADR's concern.** Both [[ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth]] and [[ENH-036]]'s own text already state this explicitly ([[ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth]]: "out of scope: the exact shape of the consolidated classifier"; [[ENH-036]]: the confidence-model question is "the substance of this ENH's implementation plan — not the wiring"). This ADR's own stated scope also excludes "specifying the ENHs' implementations." **Correction (2026-07-03):** an earlier pass in this session drifted past that boundary and produced several paragraphs of rollout/validation-rigor analysis directly in this document — removed here to restore [[ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings]] to its own stated scope. That analysis, if still useful, belongs in [[ENH-036]]'s eventual implementation plan, not in this governance ADR.

### Topological order (spec-level items only; T10/T11 excluded — see above)

- **Tier 0 — closed, no action:** T3 (target-confirmation UI line), T4 (repo-detection + contributor labeling), T8 (`kmg-backfill-graph` command), T8a (`kmg-extract-chat` docstring fix)
- **Tier 1 — open, decide now, in parallel:** ~~T9 (name of the shared detection engine)~~ **— T9 is moot / closed: no consolidation proceeds ([[ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth]]'s final Decision), so there is no new artifact to name; all 5 skills keep their current names. [[ENH-036]] is Withdrawn.** T5 (docs/`kmg-help` workflow-stage grouping table — draft name-agnostic now, patch later) remains the live Tier 1 item.
- **Tier 2 — open, gated on Tier 0/1 settling:** T6 (rename `kmg-update-graph`?), T7 (rename `kmg-update-issue-plan`?) — parallel with each other; T6 additionally carries the T8-sibling naming constraint (must account for `kmg-backfill-graph` as a fixed `-graph`-family neighbor)

**Practical upshot:** the earlier "[[ENH-036]] before [[ENH-034]]" sequencing advice was directionally right but too coarse — it should read as "T9 before T6/T7," not "[[ENH-036]] before [[ENH-034]]" as whole units. T5 does not need to wait at all; it was already written to tolerate either outcome.

### What supersedes what: nothing — verified

Checked directly rather than assumed: **[[ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings]] does not supersede [[ADR-056-reject-plugin-split-for-contributor-only-doc-commands]] or [[ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth]].** It cites both as evidence and sits as a governance layer above them (see Rationale, "Governance layered above, not merged into, the individual fixes"). This was deliberate — [[ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings]]'s own **Option A** ("treat all five findings as one bug, build one unifying fix") was explicitly rejected in favor of Option C precisely to avoid collapsing distinct decisions into a single supersession chain. The citation graph among [[ADR-056-reject-plugin-split-for-contributor-only-doc-commands]] / [[ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth]] / [[ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings]] is intentionally flat: each stands as its own Accepted decision; [[ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings]] only adds a preventive process on top. No ADR in this session's set supersedes another.

---

## Future Considerations

1. **If the checklist proves insufficient** (instances keep slipping through), revisit a heavier enforcement mechanism — e.g. a PR-template gate or a lint check on command/skill frontmatter.
2. **Close the ENH loop:** as [[ENH-033]]/034/035/036 land, confirm each was created under the new check and note any question the check would have caught earlier.
3. **Contributor-base growth:** if contributors beyond the maintainer appear, the audience question (a) becomes more load-bearing; reassess whether labeling alone is enough.
4. **A distinct, newly-discovered governance layer: runtime write-target confirmation.** While scoping [[ENH-033]]'s Option A/B question (2026-07-03), a different failure mode surfaced — not a creation-time naming/scope mistake, but a **runtime** one: a user who has lost track of which repo/directory they're actually operating in tells a write command to act, expecting it to touch a different project than the one it's really in. [[ENH-033]] now requires printing the resolved target file path + detected repo before any write (see its step 3a) as a first, narrow instance of this fix. This is a **distinct concern from the three-question check above** — that check governs whether a command/skill should be *created*; this one governs whether a write should *proceed* once a command already exists and is invoked. Worth a future ADR/ENH to generalize this "show resolved target before write" pattern across kmgraph's other write commands (`kmg-capture-lesson`, `kmg-update-graph`, `kmg-create-adr`, etc.), not just `kmg-update-doc`/`kmg-create-doc`. Not scoped here — flagged for later investigation.

---

**Decision Made:** 2026-07-03
**Last Updated:** 2026-07-03
**Status:** Accepted
</content>
</invoke>
