---
title: "ENH-021: Session Summary + Handoff Asymmetric Coupling via `continues_from`"
number: 021
status: implemented
version_target: "v0.5.10"
github_issue: null
created: 2026-05-28
related_adrs: ["ADR-049", "ADR-050", "ADR-051"]
related_enhs: ["ENH-020"]
---

# ENH-021: Session Summary + Handoff Asymmetric Coupling via `continues_from`

## Summary

Add an optional `continues_from` frontmatter field to handoff documents. When a session produces both a session summary (completed sub-work) and a handoff (unfinished work), the handoff references the summary instead of duplicating "what was built" content. One frontmatter field eliminates the duplication problem while preserving the load-bearing ephemerality distinction between the two document types.

## Plan Note

> When ENH-021 is added to an implementation plan, create an ADR documenting the session-summary/handoff coupling decision before implementation begins.

## Background

This ENH emerged from an Opus design consultation on 2026-05-28. The full comparison analysis is at:
`knowledge/analysis/session-summary-vs-handoff-comparison.md`

The consultation also surfaced a cascading finding about the Review Audit Protocol cascade check gate (tracked as issue-9).

## Problem

Session summaries and handoff documents have structural overlap:
- Both live in `knowledge/sessions/YYYY-MM/`
- Both capture date, branch, commits, and "what was built"
- Both can include decisions made and problems solved

When a session produces both documents (completed sub-work + unfinished work), "what was built" content is written twice. This is friction at exactly the moment friction is highest — end of a long session, context nearly exhausted.

The relationship between the two document types is currently undefined. No template or guidance tells the author how to handle the overlap case.

## Why Not Consolidate

Opus analysis concluded consolidation would break on three fronts:

1. **Lifecycle conflict** — Summaries are permanent (archival). Handoffs are ephemeral (consumed and deleted). A single type forces one lifecycle on both.
2. **Tense/voice conflict** — Summaries are retrospective/narrative. Handoffs are imperative/forward-looking. Merged docs produce awkward mixed tense.
3. **Trigger conflict** — Summaries trigger on completion. Handoffs trigger on interruption. A unified type with optional sections creates "which half do I fill in?" friction at every session end.

## Solution: Asymmetric Coupling

Two document types, asymmetrically coupled. **Handoff points to summary. Summary has no awareness of handoffs.**

```
session-summary.md  ←─── (referenced by) ─── handoff.md
   permanent                                   ephemeral
   retrospective                               prospective
   archival                                    operational
```

### Change: Add `continues_from` to Handoff Frontmatter

```yaml
# handoff frontmatter — new optional field
continues_from: knowledge/sessions/2026-05/2026-05-28-session-summary.md
```

When set, the handoff's "What Was Completed" section collapses to a one-liner:
> "See `continues_from` summary for completed work. This handoff covers unfinished work only."

### Change: Update Handoff Command Guidance

Add to the handoff skill/command:
> "If a session summary was created in the same session, set `continues_from` to its path instead of duplicating the 'what was built' content."

### Minimum Viable Continuation Doc

If the handoff template is also tightened, the required fields are:
1. `branch` + `parent_commit` — git resume state
2. Dirty/staged/unpushed file status
3. One concrete next action (imperative)
4. Blockers / open decisions
5. `continues_from` (optional) — pointer to summary if sub-work was completed

Everything else (related resources, full task list, session stats) is helpful but not required.

## Cascading Finding: issue-9

During this analysis, the Review Audit Protocol cascade check did not fire. Investigation confirmed this is by design:

- `core/rules-registry/review-audit-protocol.md:9-20` — protocol explicitly excludes casual inspection and inline quick checks
- Protocol only fires on formal skill invocation (`/kmgraph:review`, post-plan, pre-push, explicit audit)
- Inline analysis (like this consolidation discussion) intentionally bypasses all gates

The gap — that inline recommendations have no cascade investigation trigger — is tracked as **issue-9** (Inline Recommendation Protocol Gap). Resolution: investigate UserPromptSubmit hook feasibility in Claude Code.

**issue-9 is in v0.5.9.2 scope.** ENH-021 implementation should be sequenced after issue-9 is resolved to ensure the `continues_from` change goes through the correct cascade check gate.

## Implementation Notes (v0.5.10)

**Spec-vs-reality resolution:** The spec assumed a single handoff doc with YAML frontmatter. In practice two shapes exist:
1. **Session-style handoff** — single `.md` in `knowledge/sessions/YYYY-MM/` with YAML frontmatter. `continues_from` lives here as a frontmatter field.
2. **Package handoff** — `/kmgraph:handoff` command output: multi-file package under `./handoff-packages/YYYY-MM-DD/` with START-HERE.md header block (no YAML). `continues_from` lands here as a header field.

The session-summary template is **unchanged** (asymmetry preserved). ADR number resolved to **ADR-051** (ADR-050 was already taken by the pre-push composite gate). issue-9 confirmed resolved (2026-06-07, all 8 ACs verified).

## Action Items

- [x] Add `continues_from` optional frontmatter field to handoff template (`commands/handoff.md`)
- [x] Update handoff command guidance with the reference-instead-of-duplicate rule
- [x] Create ADR documenting the session-summary/handoff coupling decision (ADR-051)
- [x] Resolve issue-9 (UserPromptSubmit hook for cascade triggers) — resolved 2026-06-07
- [x] Include ENH-021 in v0.5.10 branch plan
- [ ] Perform a review of user-facing documentation, including commands and skills, to ensure the session summary vs handoff distinction and coupling guidance is updated to reflect changes

## Scope of Change

| File | Change |
|---|---|
| Handoff template/command | Add `continues_from` optional frontmatter + guidance |
| Handoff skill | Add one-line rule: reference summary instead of duplicating content |
| New ADR | Document the session-summary/handoff coupling decision |

No changes to session summary template. No migration of existing handoff files required (field is optional, absent on old files is valid).

## Related

- [[ENH-020]] — Preventive Cascade Template (provides the cascade check gate ENH-021 should route through)
- [[ADR-049-review-audit-protocol-post-plan-pre-push-review-governance]] — scope gap addressed by issue-9
- `knowledge/analysis/session-summary-vs-handoff-comparison.md` — full Opus analysis
- `knowledge/issues/issue-9/` — Inline Recommendation Protocol Gap (prerequisite)
