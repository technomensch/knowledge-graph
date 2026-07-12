# ENH-034: Capture-pipeline command naming and grouping

**Status:** 🟡 Proposed
**Discovered:** 2026-07-01
**Governed by:** [ADR-058](../../decisions/ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings.md)
**Related:** [ADR-053](../../decisions/ADR-053-kmg-prefix-cross-platform-naming.md) (the June `kmg-` rename whose blast radius bounds this ENH's scope), [ADR-057](../../decisions/ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth.md) (the DETECT-layer subset of the same cluster), [ENH-026](../ENH-026/ENH-026-specification.md) (KG Write Guard — its `commands/kmg-update-graph.md` guard should wait for this ENH's Option A/B rename decision, validated 2026-07-11), [ENH-042](../ENH-042/ENH-042-specification.md) (release-doc-sync reconciliation — its fix references `kmg-update-graph`/`kmg-execute-plan`/`kmg-update-doc.md` by name; hold its implementation until this ENH's Option A/B decision lands, validated 2026-07-11 — kept as a separate ENH since it's sync-logic + a new enforcement gate, not naming/IA), `docs/reference/command-guide.md`, `docs/reference/commands.md`, `commands/kmg-update-graph.md`, `commands/kmg-update-issue-plan.md`

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
   - `kmg-update-graph` — a name signaling **extraction** would be more accurate (candidate explored: `kmg-ingest-graph` — collision-clean, pairs conceptually with `kmg-backfill-graph` from ENH-035 via the shared `-graph` suffix). **Note:** this specific name is referenced by 6 mentions in ENH-035 and 2 in ADR-058 — renaming it means a follow-up pass on both documents, not just this file. Hold this decision until ENH-035 and ENH-036 are stable, so the ripple only needs to happen once.
   - `kmg-update-issue-plan` — a name signaling **sync/propagation** would be more accurate (candidate explored: `kmg-propagate-issue-plan` — deliberately avoids reusing "sync", since `kmg-sync-all` already owns that verb as the whole-pipeline orchestrator).

   Final rename decisions (including whether to rename at all, and the exact new names) are **left to this ENH's own implementation planning** — not locked here. Any rename must follow the ADR-058 naming/scope check and account for alias/back-compat per the ADR-053 precedent.

---

## Options — open question, hold until ENH-035/036 are stable

### Option A: Docs/help reordering only (no renames)
Reorder command-guide and `kmg-help` into workflow stages; leave all names as-is.

**Trade-off:** Zero blast radius; fully reversible; no ripple into ENH-035's `kmg-update-graph` references. But `kmg-update-graph` / `kmg-update-issue-plan` keep actively-misleading names.

### Option B: Docs/help reordering + the two targeted renames (with aliases)
Reorder as in Option A, and rename the two misleading commands, keeping the old names as deprecated aliases for one release.

**Trade-off:** Fixes the misleading names; adds rename/alias/migration cost, a deprecation cycle so soon after ADR-053, and requires a follow-up pass on ENH-035 (6 references) and ADR-058 (2 references) to update to the new name.

**Why not decided yet:** this ENH's rename choice ripples into documents already written (ENH-035, ADR-058) that reference `kmg-update-graph` by its current name. Deciding now risks a second edit pass on those documents later; better to decide once ENH-035/036 are otherwise settled.

### Workflow-stage grouping for the docs/help restructure

Applying the pipeline-stage mapping already established this session's swimlane design work. Names shown are **current names** — the two candidate renames are noted inline but NOT assumed; this table holds regardless of how the Option A/B rename question above resolves:

| Stage | Commands/skills/agents |
|---|---|
| **Capture** | `kmg-capture-lesson`, skill `kmg-lesson-capture`, skill `kmg-capture-router` |
| **Structure** | `kmg-update-graph` *(rename to `kmg-ingest-graph` candidate — open, see above)*, agent `knowledge-reviewer` |
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
| `commands/kmg-update-graph.md` | Candidate targeted rename (extraction, not "update") — if Option B; also requires updating references in ENH-035 and ADR-058 |
| `commands/kmg-update-issue-plan.md` | Candidate targeted rename (sync/propagate, not "update") — if Option B |

---

## Acceptance Criteria

- [ ] `command-guide.md` and `kmg-help` present the capture-pipeline cluster in workflow-stage order, not alphabetical.
- [ ] The pipeline stage each command belongs to is legible from the grouping.
- [ ] A decision is recorded (Option A vs. B) on whether `kmg-update-graph` and `kmg-update-issue-plan` are renamed; if renamed, old names remain as deprecated aliases for at least one release (ADR-053 precedent), and ENH-035 + ADR-058's references are updated in the same pass.
- [ ] No full-cluster rename is performed.
- [ ] Any new/renamed name passes the ADR-058 naming/scope check (audience, collision, accuracy).
- [ ] No behavioral change to any command in the cluster.
</content>
