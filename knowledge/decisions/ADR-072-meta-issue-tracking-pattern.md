# ADR-072: Meta-Issue Tracking Pattern for Complex Problems

**Date Originally Decided:** 2026-02-02
**Recorded in This Repo:** 2026-09
**Status:** Accepted
**Implements:** `commands/kmg-meta-issue.md`
**Related:** v9.3.x enforcement saga (original case study, different project)

---

## Provenance

This decision was originally made on 2026-02-02 in a different project (`optimize-my-resume`, commit `4b41f99`, released as v9.3.8), where the pattern was designed and first applied to a "v9.3.x-enforcement-saga" case study. It is being retroactively recorded here because this repo's own `commands/kmg-meta-issue.md` already implements the pattern in production — it only ever carried a dangling citation ("Based on: ADR-008 Meta-Issue Tracking Pattern") pointing at an ADR-008 that, in this repo, is actually `ADR-008-third-person-language-standard.md`, an unrelated document. This ADR-072 supersedes that dangling citation with a real, adapted record of the design this repo actually uses.

---

## Context

The v9.3.x enforcement saga (in the original project) revealed gaps in documenting complex problems that span multiple versions and require 3+ solution attempts:

**Problem:**
- Single case study files are insufficient for multi-attempt tracking
- Root cause understanding evolves over many attempts, but the evolution isn't documented
- No clear traceability between plans and outcomes
- No reusable pattern for future complex issues
- Knowledge graph and issue documentation are disconnected

**Scope (as applied in this repo):**
- Any problem meeting 2+ of the SOP 0 criteria (see below), tracked via `/kmgraph:kmg-meta-issue`
- Auto-triggered from the `stuck-work-escalation` skill at 3 attempts (Opus/powerful-tier gate) and 5 attempts (mandatory exit-path decision) — see `ADR-035-stuck-work-escalation.md`
- Future applicability: performance investigations, data migrations, system redesigns, any multi-attempt debugging session

---

## Decision

**Establish a generalized Meta-Issue Tracking Pattern** for documenting complex, multi-attempt problems that evolve understanding over time, implemented in this repo via `/kmgraph:kmg-meta-issue`.

### Core Components (this repo's implementation)

1. **Structured Directory:** `{active_kg_path}/issues/[meta-issue-name]/` (path resolved via `kg_resolve`, not a hardcoded project path)
   - `README.md` (navigation hub)
   - `description.md` (living document)
   - `implementation-log.md` (all attempts with plan references)
   - `test-cases.md` (validation scenarios)
   - `related-issues/` (GitHub issue links)
   - `attempts/` (numbered folders with attempt details)
   - `analysis/` (root cause evolution, timeline, lessons)

2. **Reusable Templates** — sourced from `core/default-templates/meta-issue/` (core files, attempt-template, analysis files, related-issues), copied and customized per meta-issue.

3. **Standard Operating Procedures** (4 SOPs, documented in `commands/kmg-meta-issue.md`):
   - SOP 0: Creating a new meta-issue (decision criteria)
   - SOP 1: Creating a new attempt folder (as of the v0.7.10 patch, also syncs `README.md`'s Timeline Summary table and `description.md`'s attempt-count/status field in the same step — see Addendum below)
   - SOP 2: Documenting root cause evolution
   - SOP 3: Knowledge Graph bidirectional sync
   - SOP 4: Troubleshooting with meta-issue reference

4. **Knowledge Graph Integration:**
   - Bidirectional synchronization (KG ↔ meta-issue), resolved via `kg_resolve` rather than reading `.active`/`.graphs["$active_kg"].path` directly (issue-41 fix, pre-ADR-067)
   - Evidence linking (patterns → attempt-results)
   - `{active_kg_path}/knowledge/meta-issues.md` as the active-issues index

5. **Naming Convention:**
   - Format: `[version-range]-[domain]-saga/` OR `[domain]-investigation/`
   - Examples: `v2.x-performance-investigation/`, `data-migration-saga/`

---

## Rationale

### Why This Pattern

1. **Captures Root Cause Evolution** — Living documents (`description.md`, `analysis/root-cause-evolution.md`) track belief shifts explicitly, preventing lost context between sessions.
2. **Generalized & Reusable** — Templates and SOPs apply to any problem domain; the investment pays off across future complex problems, not just one.
3. **Creates Traceability Chain** — Issue → Plan → Attempt → Results → KG. Complete audit trail for future stakeholders; evidence linking prevents guessing about decisions.
4. **Enables Knowledge Graph Bidirectionality** — Patterns discovered from attempts feed the KG; KG updates explicitly reference attempt evidence.
5. **Provides Structured Investigation** — Templates ensure completeness; SOPs guide when/how to use the pattern; ties directly into `stuck-work-escalation`'s auto-trigger thresholds.

### Trade-offs

**Benefits:**
- ✅ Reusable across problems and domains
- ✅ Root cause evolution explicitly documented
- ✅ Complete audit trail for stakeholders
- ✅ Bidirectional KG integration
- ✅ Structured investigation process, wired into `stuck-work-escalation`'s auto-trigger

**Costs:**
- ❌ Higher initial setup cost (multiple templates, SOPs)
- ❌ Requires discipline to maintain bidirectional links
- ❌ More comprehensive than a simple case study
- ❌ Learning curve for new contributors

**Mitigation:**
- Templates make creation mechanical (`kg_resolve` + copy + customize)
- SOPs provide step-by-step guidance directly in `commands/kmg-meta-issue.md`
- `stuck-work-escalation` auto-triggers the pattern so it doesn't rely on someone remembering to invoke it manually

---

## Consequences

### Positive

1. **Root Cause Understanding Documented** — belief shifts are visible and reusable across sessions.
2. **Reusable Infrastructure** — templates and SOPs are ready for the next complex problem with low friction.
3. **Knowledge Graph Fully Integrated** — meta-issue evidence feeds KG patterns; pattern updates reference specific attempts.
4. **Clear Decision Audit Trail** — why approaches were chosen, why they failed, what was learned.

### Negative

1. **Requires Discipline** — bidirectional links must be maintained; SOPs must be followed consistently.
2. **Learning Curve** — contributors need to understand the SOPs and template structure.
3. **More Documentation** — higher maintenance burden if not kept current.

---

## Related Decisions

- **[[ADR-035-stuck-work-escalation]]** — genuinely extends this pattern in this repo: auto-triggers meta-issue creation at 3 attempts (Opus/powerful-tier gate) and forces a structured exit-path decision at 5 attempts.

---

## Future Considerations

1. **Automation Opportunities** — auto-detect when to create a meta-issue (3+ attempts, evolving understanding), auto-generate attempt folders from plan files, auto-sync the KG when a meta-issue updates. The auto-detect piece is already partially realized via `stuck-work-escalation`. The v0.7.10 patch (see Addendum below) is a **partial realization of the auto-sync piece**: it makes `README.md` and `description.md` update automatically alongside `implementation-log.md` whenever `--add-attempt`/`--log-attempt` runs. What's still open: this sync is only triggered by those two commands — an attempt folder edited by hand, or a manual edit to any of the three files outside the command flow, can still drift out of sync silently. True automation (e.g. a hook or lint check that verifies the three files agree regardless of how they were edited) remains a future consideration, not yet closed.
2. **Scalability** — how to handle very high attempt counts (pagination, archival); how to track multiple concurrent meta-issues.
3. **Integration with Other Systems** — link to GitHub issues/PRs in automation; dashboard for meta-issue status.

---

## Acceptance Criteria

✅ **Implemented (this repo, via `commands/kmg-meta-issue.md`):**
- [x] Templates in `core/default-templates/meta-issue/`
- [x] 4 SOPs documented in the command file
- [x] `kg_resolve`-based path resolution (issue-41 fix)
- [x] Knowledge graph bidirectional sync workflow defined
- [x] Auto-trigger integration with `stuck-work-escalation` (ADR-035)
- [x] Reusable for future meta-issues across any KG

✅ **v0.7.10 patch (attempt-sync gap closed — see Addendum below):**
- [x] SOP 1 / `--log-attempt` updated to sync `README.md`'s Timeline Summary table and `description.md`'s attempt-count/status field alongside `implementation-log.md`, in the same step rather than as separate manual follow-up

---

## References

- Original design: `optimize-my-resume` repo, `docs/decisions/ADR-008-meta-issue-tracking-pattern.md`, commit `4b41f99` (v9.3.8)
- This repo's implementation: `commands/kmg-meta-issue.md`
- Templates: `core/default-templates/meta-issue/`
- Extending decision: `knowledge/decisions/ADR-035-stuck-work-escalation.md`

---

**Decision Made:** 2026-02-02 (original project)
**Recorded in This Repo:** 2026-09
**Last Updated:** 2026-09
**Status:** Accepted and Implemented

---

## Addendum (2026-09, v0.7.10): Attempt-Sync Gap Found and Fixed

While auditing broken links in `docs/examples/meta-issue/example-performance-saga/` (this tool's own teaching example of the pattern) during branch `v0.7.10-fix-release-doc-sync-and-broken-links`, found that `commands/kmg-meta-issue.md`'s "SOP 1: Creating New Attempt Folder" only auto-updates `implementation-log.md` when `--add-attempt`/`--log-attempt` runs — it never touches `README.md`'s Timeline Summary table or `description.md`'s attempt-count/status fields.

This is a real structural gap: it lets exactly the kind of drift seen in the example content occur silently in any real project using this command — a status/summary field claiming N attempts happened while supporting detail only reflects N-1, or vice versa.

**Decision:** SOP 1 and the `--log-attempt` variant are patched (this same branch) to also update `README.md`'s table row and `description.md`'s attempt count in the same step as `implementation-log.md`, not as a separate manual task.
