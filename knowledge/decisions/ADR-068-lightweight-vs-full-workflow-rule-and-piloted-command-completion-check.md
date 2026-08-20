---
title: "ADR-068: Lightweight-vs-Full Workflow Rule, and a Piloted Command-Completion Check for Handoff/Recall File Tracing"
number: 068
status: Accepted
date: 2026-08-01
author: technomensch
email: mkitact@gmail.com
git:
  branch: v0.7.0
  commit: null
  pr: null
  issue: null
implements: knowledge/plans/v0.7.0-c3-adr-068-pilot.md
related:
  adrs: []
  lessons: []
  kg_entries:
    - knowledge/issues/issue-25/issue-25-description.md
    - knowledge/issues/issue-33/issue-33-description.md
    - knowledge/enhancements/ENH-056/ENH-056-specification.md
    - knowledge/enhancements/ENH-056/solution-approach.md
    - knowledge/enhancements/ENH-056/test-cases.md
tags: [governance, workflow-enforcement, hooks, process, v0.7.0]
category: architecture
---

# ADR-068: Lightweight-vs-Full Workflow Rule, and a Piloted Command-Completion Check for Handoff/Recall File Tracing

**Date:** 2026-08-01
**Status:** Accepted
**Implements:** `knowledge/plans/v0.7.0-c3-adr-068-pilot.md` (both halves implemented 2026-08-01, commits `85c29a15`, `9d90f25b`, `08b828c2`, `4753ea0c`)

---

## Context

**Problem, two coupled gaps:**

1. **issue-25:** two overlapping mechanisms exist for capturing an enhancement/issue in this project — a lightweight hand-written spec file (no command, no branch, no GitHub issue), and the full `/kmgraph:kmg-start-issue-tracking` workflow (branch + GitHub issue + `solution-approach.md` + gates). Both claim the same territory (`knowledge/enhancements/ENH-NNN/`), and nothing documents which one governs. This has already caused a real miss ([[ENH-051]] was filed lightweight, then redone through the formal workflow after the user caught it).

2. **issue-33, an instance of [[ENH-056]]:** a session picking up work via a handoff/recall package read only the top-level pointer files (a progress tracker, a README) and produced a "caught up" summary without tracing into the linked source files those pointers referenced (implementation log, root-cause notes, full review reports). The user caught it live: *"you only read the package, you didn't trace back and read the full context and linked files."* [[ENH-056]] documents this as one of four confirmed instances of a broader pattern — commands/workflows described as multi-step prose processes are inconsistently executed in full, because nothing verifies the documented steps actually happened.

**Why these two are in one ADR:** [[ENH-056]]'s own acceptance criteria (AC-3, AC-4) make issue-25's rule a hard dependency — a completion-check gate cannot distinguish "a step was legitimately skipped because the lightweight path was correct" from "a step was silently abbreviated" without issue-25's rule existing first. They are separate decisions but not independently actionable.

**Prior art considered and explicitly not reused wholesale:** `docs-readme-poc` (a sibling project) built a structurally similar mechanism — `ADR-023-terminal-validation-requires-independent-content-verification` — to fix self-attested "Pass" results in a style-guide validator that turned out to share identical, non-page-specific evidence text across 182 checks. Its fix (evidence-hardening + a second, independent agent-verification pass for judgment-requiring checks + moving mechanically-checkable items to a dedicated linter) is real, proven, and took a 14-attempt saga (`style-guide-required-sections-saga`, multiple Opus/Codex/Fable review rounds) to build and hold up. That system solves a much larger problem than this ADR needs to: hundreds of judgment-requiring checks across an entire content corpus. This ADR's scope (did a file get opened) has no judgment component, so the expensive parts of that precedent — the independent-verification agent pass, the evidence-citation requirement, the corpus-wide sweep — are deliberately not adopted here. See Non-Goals.

---

## Decision

### Half A — issue-25's lightweight-vs-full workflow rule

**Use the lightweight path** (hand-written file under `knowledge/enhancements/ENH-NNN/` or `knowledge/issues/issue-NNN/`, no branch, no GitHub issue) when **all** of the following hold:
- No code change is planned as a near-term direct result
- No one outside the current session needs visibility into it right now (no external accountability need)
- The write-up is small enough to be captured fully in a paragraph or two

**Use the full `/kmgraph:kmg-start-issue-tracking` workflow** (branch + GitHub issue + `solution-approach.md` + gates) when **any** of the following hold:
- Code is going to change as a direct result
- It needs to be discoverable/trackable by someone other than the current session (a GitHub issue for visibility)
- It's large enough that a lightweight write-up would need to sprawl across multiple files anyway

This formalizes the de facto pattern already in informal use across issue-30, [[ENH-053]]/054/055, and issue-33 itself (each explicitly captured as "small, deferred, write it down" with a stated no-branch-overhead rationale) — it does not introduce new judgment, it documents judgment already being exercised inconsistently.

### Half B — piloted command-completion check (ENH-056 / issue-33)

**Scope: one pilot only.** This ADR authorizes a completion check for exactly one failure mode — handoff/recall commands producing a "caught up" summary without opening every file their own pointer layer names. It does **not** authorize a general per-command completion-criteria framework (see Non-Goals).

**Mechanism:**
1. **Manifest, not invented:** the handoff/recall document already names its own linked files (e.g. a "Where to pick up work" section, or a handoff package's own file list). No new authoring step — the check reads an existing list.
2. **Enforcement point:** fires at the end of the turn/session that consumed the handoff/recall package. Compares the manifest's file list against every file actually opened (via `Read` tool calls) across the full session — not just the current turn, since a file may legitimately have been read earlier in the same conversation.
3. **Hard stop, not advisory.** If any manifest file was not opened, the session is blocked from finalizing its "caught up" summary until it opens the remaining files. This is a deliberate departure from this project's usual advisory-only hook pattern (`ADR-050`'s `exit 0`-always convention) — decided explicitly, not by default, because a nudge that can be silently ignored is exactly the failure mode issue-33 already demonstrated once.
4. **Fail open when there's no manifest.** If a handoff/recall document doesn't clearly enumerate linked files, the check does nothing. It only fires where there's an actual list to check against — it must never block a command that never opted in.

---

## Rationale

### Why This Approach

1. **The mechanical/judgment split keeps this cheap.** "Was file X opened" is a boolean, checkable from tool-call history with no interpretation required. `docs-readme-poc`'s `ADR-023` explicitly separated mechanical checks (like list-length counting) from judgment checks (like "does this sentence follow the style rule") for the same reason — mechanical checks don't need a second opinion, judgment checks do. This ADR only takes on the mechanical half.
2. **Hard-stop over advisory, for this specific check only.** issue-33 already proved that a session can read a pointer-layer summary, believe itself caught up, and be wrong — an ignorable nudge doesn't change that outcome. A hard, mechanical, low-false-positive check (fail-open when no manifest exists, checked across the whole session not just the last turn) is safe to make blocking because it has no judgment component that could be wrong in a way that traps a legitimate session.
3. **issue-25's rule must exist first, or this check misfires.** Without a documented distinction between "legitimately lightweight, no files to trace" and "full package with files silently skipped," any completion gate either over-fires on legitimate short paths or is toothless everywhere. Resolving issue-25 alongside, not after, closes that gap before Half B's mechanism could otherwise be second-guessed.

### Alternatives Considered

**Option A: Reuse `docs-readme-poc`'s full `ADR-023` pattern (evidence-hardening + independent second-agent verification + dedicated linter) directly.**
- Pros: proven, already fought over and hardened through 14 attempts and multiple model reviews.
- Cons: solves a much larger problem (hundreds of judgment-requiring checks across a content corpus) than this ADR needs. Adopting the independent-verification-pass machinery for a single boolean check is expensive for no benefit — there is no judgment call in "was this file opened."
- Rejected because: scope mismatch. The user explicitly flagged the risk of re-running that same multi-round build process for a problem that doesn't require it.

**Option B: Advisory-only nudge (matches this project's existing hook convention, `ADR-050`).**
- Pros: consistent with existing hook style, lower risk of a false positive blocking legitimate work.
- Cons: issue-33 is direct evidence that an ignorable nudge doesn't prevent the failure — the whole point is that the session believed itself done and wouldn't have acted on a nudge it didn't think applied to it.
- Rejected because: explicitly overridden by user decision — hard stop, not a nudge, for this specific check.

**Option C: General per-command completion-criteria framework (per `ENH-056`'s `solution-approach.md`, generalized immediately rather than piloted).**
- Pros: one mechanism to maintain long-term, closes all four of [[ENH-056]]'s documented instances at once.
- Cons: `solution-approach.md` itself already warns against this ("prototype one command's completion gate end-to-end before generalizing"). `ADR-057` (this repo, unrelated subsystem — detection-layer consolidation) is sharper precedent than "build too early": it tested **4 separate consolidation architectures** for merging 5 independently-evolved detection skills, and every one failed independent review because it silently dropped real capability — one proposal alone lost 13+ real behaviors with no home in the simplified design. Final decision: no consolidation, all 5 stay separate (`ENH-036`, the concrete 5→2 proposal, was formally Withdrawn on the same governing decision). The transferable risk for Option C: each command's completion criteria are already documented as non-uniform (`solution-approach.md`'s own point [#1](https://github.com/technomensch/knowledge-graph/issues/1)), the same way the 5 skills' trigger logic was — forcing them into one framework risks the identical silent-capability-loss failure mode [[ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth]] already lived through and rejected.
- Rejected for now because: not yet earned, and this repo has direct, recent evidence (not just a general heuristic) that premature consolidation of genuinely-different-per-instance logic tends to lose capability rather than simplify. This ADR authorizes the first pilot; a generalized framework is a future decision made with real evidence from this pilot, not a default.

### Trade-offs

**Benefits:**
- ✅ Closes issue-25's real, already-demonstrated ambiguity ([[ENH-051]] was mis-filed once already)
- ✅ Closes issue-33's confirmed gap with a check that can't be silently ignored
- ✅ Cheap to build — mechanical, single pilot, no new agent dispatch, no linter, no corpus sweep
- ✅ Explicit Non-Goals prevent the scope creep that turned `docs-readme-poc`'s equivalent work into a 14-attempt saga

**Costs:**
- ❌ Hard-stop risks a false block if the manifest-detection logic misreads a handoff document's file list — mitigated by fail-open-on-no-manifest, but not eliminated
- ❌ Does not address [[ENH-056]]'s other three documented instances (kmg-handoff not invoking kmg-session-summary; kmg-meta-issue attempt logging; [[ENH-056]]'s own first capture attempt) — those remain open, tracked separately
- ❌ Does not address issue-33's second gap (a buried recommendation in a linked file never promoted to the checklist) — that's judgment-shaped and explicitly out of scope here

---

## Consequences

### Positive
1. issue-25 and issue-33 close as resolved instances of [[ENH-056]] once implemented.
2. Establishes a template for future [[ENH-056]] pilots: mechanical checks get hard-stop treatment when they're genuinely boolean; judgment checks stay out of scope until deliberately taken on with their own cost accounted for.

### Negative
1. [[ENH-056]] remains open as an umbrella — this ADR resolves one pilot, not the general problem.
2. issue-33's second gap (buried recommendations not promoted to the checklist) remains open, undesigned.

### Neutral
1. No change to existing hooks' advisory-only convention (`ADR-050`) — this ADR carves out one explicit exception, it does not change the default.

---

## Non-Goals

- **No general per-command completion-criteria framework.** This ADR authorizes exactly one pilot (handoff/recall file-tracing). Extending to `kmg-start-issue-tracking`'s artifact checks (branch/issue/spec existence) or `kmg-meta-issue`'s attempt-logging auto-capture is future [[ENH-056]] work, not designed here.
- **No verification of comprehension.** The check confirms a file was *opened* (a `Read` tool call occurred), not that its content was understood or correctly acted on. Verifying comprehension would require the same judgment-heavy apparatus `docs-readme-poc` built for its style-guide validator, and is not being repeated here.
- **No independent second-agent verification pass.** Unlike `ADR-023`'s pattern, there is no second, blind check of the first check's result — the underlying check (was a file opened) is deterministic and doesn't benefit from a second opinion the way a judgment call would.
- **No promotion of buried recommendations to the checklist** (issue-33's second, distinct gap) — that requires reading and interpreting a file's prose, which is judgment-shaped and explicitly deferred.

---

## Implementation

**Timeline:** Not yet implemented. This ADR authorizes the decision; a separate implementation plan enumerates the exact diffs.

**Affected components (anticipated, to be confirmed at plan time):**
- `commands/kmg-handoff.md`, handoff/recall consumption flow — manifest source
- A new hook (event type TBD at plan time — likely `Stop` or equivalent end-of-turn check) comparing session `Read` tool-call history against the manifest
- `knowledge/enhancements/ENH-056/` — retype `ENH-056-specification.md` frontmatter from `type: Enhancement` to `type: Hardening`; record this ADR as the design authority for the pilot
- `knowledge/issues/issue-25/issue-25-description.md`, `knowledge/issues/issue-33/issue-33-description.md` — close/update once implemented, referencing this ADR

---

## Validation

**Success Criteria:**
- A deliberately-constructed test case where a linked file is skipped confirms the hard-stop actually fires (matching `docs-readme-poc`'s own hard-won lesson: an unwatched check is a check you can't trust)
- A handoff/recall package with no clear file manifest does not trigger a block (fail-open confirmed)
- A session that reads a manifest file earlier in the conversation (not the final turn) is not falsely blocked

**Review Date:** Re-assess once the pilot has run against a handful of real handoff/recall sessions, to decide whether generalizing to other [[ENH-056]] instances is warranted.

**Full-suite test run findings (2026-08-01):** `tests/run-all-tests.sh` showed 12/18 suites failing at implementation time. This ADR's own new suite (`test-handoff-file-tracing-gate.sh`) passed 4/4 clean. Of the other 12, triaged into four groups (corrected 2026-08-01 — an earlier pass of this note vaguely said "9... plus 2 more" without identifying the 2; both are now identified, see group 4):

1. **7 suites** (`test-commands.sh`, `test-skills-agents.sh`, `test-tier-resolver-smoke.sh`, `test-tier-resolver-edge.sh`, `test-create-adr-implements.sh`, `test-dispatcher-tier-refactor.sh`, `test-decision-governance.sh`) — pre-existing staleness against a pre-`kmg-`-prefix naming convention, unrelated to this ADR. Filed as [issue-38](../issues/issue-38/issue-38-description.md) / GitHub [#201](https://github.com/technomensch/knowledge-graph/issues/201).
2. **2 suites** (`test-stop-hook.sh`, `test-hooks.sh`) — confirmed unrelated, pre-existing output-format assertions against scripts this ADR doesn't touch.
3. **1 suite** (`test-mcp-edge-cases.sh`, a KG-path search error-handling case) — plausibly related to the concurrent ADR-067 session's in-progress `search.ts` rewiring, not this ADR's scope.
4. **2 suites** (`test-mcp-resources.sh`, `test-v050-misc.sh`) — a *second, distinct* stale-path bug, found and fixed the same session: both die under `set -e`+`pipefail` against a hardcoded `core/templates/` path that no longer exists (renamed to `core/default-templates/` at some point, never caught). Same failure class as issue-31/35/38 but a different migration instance. Fixed directly in this session rather than filed, since it was small and mechanical — see the corresponding commit on `v0.7.0`.

Full detail and triage appended to `ADR-067`'s "Known Gap — Full Test Suite Findings" section per the concurrent-session boundary (findings only, no edits to ADR-067's design).

---

## Related

- [issue-25](../issues/issue-25/issue-25-description.md) — the lightweight-vs-full workflow ambiguity this ADR's Half A resolves
- [issue-33](../issues/issue-33/issue-33-description.md) — the handoff/recall file-tracing gap this ADR's Half B pilots a fix for
- [ENH-056](../enhancements/ENH-056/ENH-056-specification.md) — umbrella enhancement; this ADR is the design authority for its first pilot
- `docs-readme-poc` repo, `ADR-023-terminal-validation-requires-independent-content-verification` — external precedent considered and deliberately not fully adopted; see Context and Option A above
- `ADR-050` (pre-push composite gate / advisory hook convention) — this ADR's Half B is an explicit, narrow exception to that convention's default advisory-only pattern
- `ADR-057` (this repo — detection-layer consolidation decision, Accepted, settled 2026-07-03: no consolidation) — cited as the reason a generalized framework is rejected for now (Option C)
- `ENH-036` (this repo — the concrete 5→2 detection-skill consolidation proposal, Status: Withdrawn) — governed by the same [[ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth]] decision; confirms the rejected-consolidation precedent was a real, specced proposal, not just a hypothetical caution

---

**Decision Made:** 2026-08-01
**Last Updated:** 2026-08-01
**Status:** Accepted
