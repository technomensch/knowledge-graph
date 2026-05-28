---
title: "ADR-049: Review Audit Protocol — Post-Plan/Pre-Push Review Governance"
number: 049
created: "2026-05-28T00:00:00Z"
status: Accepted
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: v0.5.9-decision-governance
  commit: ad7f015188b11392a42a1f37c746a20915ddb915
  pr: null
  issue: null
implements: null
related:
  adrs:
    - "[[ADR-043-pretooluse-hook-injection-superpowers-rule-enforcement]]"
    - "[[ADR-033-triggersmd-platform-agnostic-rule-timing-companion-file]]"
  lessons: []
  kg_entries:
    - ENH-015
    - ENH-020 (pending)
  issues:
    - "[[issue-6]]  — Bug: post-plan validation not enforced (advisory-only hook, static stub); GitHub #125"
tags:
  - process
  - governance
  - review
category: process
---

# ADR-049: Review Audit Protocol — Post-Plan/Pre-Push Review Governance

## Status

Accepted — Implementation pending on branch `v0.5.9.1-review-audit-protocol`.

## Context

During the session on 2026-05-28, a formal review workflow was designed for post-plan/pre-push audits. Previously there was no defined protocol for how findings discovered during reviews should be handled. Reviews would get sidetracked mid-pass as findings were addressed ad-hoc, no audit trail was produced, and recall checks against prior context were left to the reviewer's discretion. This created inconsistent review quality and lost traceability.

## Decision

Implement a formal review audit protocol with the following locked behaviors:

**Trigger scope:** The protocol activates for post-plan/pre-push audits, PR audits, and explicit "full review" or "audit" requests only. It does NOT apply to casual code inspection.

**Non-blocking investigation:** When findings are encountered mid-review, the reviewer must not get sidetracked. Background agents are dispatched to investigate (non-blocking). The full review pass completes first before any findings are acted upon.

**Recall gate:** After the review pass completes, the reviewer presents the findings list and asks: "Run recall to check for prior context? [all / select / skip]" — all selected recalls are batched into one call.

**Display:** Agent reports and recall results are displayed inline, never collapsed.

**Per-finding decision options:**
- `fix now` — triggers cascade check stub first
- `ignore` — dismissed and recorded in audit trail
- `track` — routes to start-issue-tracking
- `dig deeper` — agent investigates further
- `discuss` — session snapshot taken first

**Cascade check stub:** Before any `fix now` action, ask: does this affect initialization scripts, user profile files, or existing graphs? User-local or project-wide? Full cascade protocol deferred to ENH-015 and ENH-020 (pending creation — see plan task 1.1).

**Halt pattern:** HALT after findings are displayed; resume only after user provides a decision per finding.

**Final report:** An audit trail table recording ALL findings regardless of resolution — permanent record required at the end of every audit.

## Rationale

The absence of a formal review protocol caused reviews to be inconsistent and produced no audit artifacts. Key design choices:

- **Non-blocking investigation over ad-hoc interruption** — completing the full pass before acting ensures comprehensive coverage; partial fixes mid-review risk missing related issues.
- **Recall gate as explicit step** — batching recall into one decision point avoids context noise and respects reviewer control over when prior knowledge is loaded.
- **HALT pattern** — prevents silent auto-resolution; each finding requires an explicit user decision, creating accountability and traceability.
- **Cascade check stub** — lightweight pre-fix gate that surfaces blast radius before committing to a fix, deferring full logic to ENH-015/ENH-020 rather than duplicating it here.
- **Audit trail table** — ensures permanent record even for "ignore" decisions, supporting future retrospectives.

## Consequences

**Positive:**
- Reviews produce a consistent, replayable audit trail.
- No findings are silently dropped or addressed without a recorded decision.
- Cascade risk is surfaced before fixes are applied.
- Recall context is loaded efficiently via batching rather than per-finding noise.

**Negative:**
- Review sessions are longer due to HALT gates and explicit per-finding decisions.
- Requires reviewers (human or agent) to follow the protocol consistently — enforcement depends on rules deployment.

**Neutral:**
- Protocol only activates on formal audit triggers, not casual inspection — low overhead for routine work.

## Rule Deployment

The protocol is authored in `core/rules-registry/review-audit-protocol.md` and deployed to:
- `~/.kmgraph/governance-rules.md` — personal deployment with ENH references by name
- `core/templates/` — genericized variant planned for v0.5.9.1

## Related

- ENH-015 — Cascade governance framework (full cascade protocol)
- ENH-020 — Preventive cascade template (extends ENH-015)
- `v0.5.9.1-review-audit-protocol` — implementation branch
