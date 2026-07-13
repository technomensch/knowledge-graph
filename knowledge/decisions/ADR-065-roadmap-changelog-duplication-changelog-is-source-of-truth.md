---
title: "ADR-065: ROADMAP.md and CHANGELOG.md duplication — CHANGELOG is the single source of truth for shipped history"
number: 065
status: Accepted
date: 2026-07-12
author: technomensch
email: mkitact@gmail.com
git:
  branch: v0.6.18-misc-patches
  commit: null
  pr: null
  issue: null
implements: null
related:
  adrs: []
  lessons: []
  kg_entries: []
tags: [documentation, governance, drift, process, roadmap, changelog]
category: process
---

# ADR-065: ROADMAP.md and CHANGELOG.md duplication — CHANGELOG is the single source of truth for shipped history

**Date:** 2026-07-12
**Status:** Accepted
**Implements:** null (documentation-governance rule; triggers a follow-up cleanup pass against `ROADMAP.md`, executed separately)

---

## Context

**Problem:** confirmed today (2026-07-12) that `ROADMAP.md` and `CHANGELOG.md` independently carry full paragraph-level narrative for the same shipped releases. This is not a verbosity complaint — it is measured content duplication: `v0.6.16`, `v0.6.17`, and `v0.6.18` each have a complete, separately-written detailed narrative section in **both** files describing the same work. Every release therefore requires two documents to be updated in lockstep to stay accurate, and there is no structural mechanism catching drift between them when that doesn't happen.

Two concrete instances of that drift were found in this same session, in the same file:

1. **Stale planned-state checkboxes.** Three `ROADMAP.md` "Planned" line items — the issue-10 fix, the kg-config migration, and mcp-server version sync — were still marked 🔲 unchecked despite all three already being shipped commits on the current branch.
2. **Missing shipped-version rows.** The `v0.3.0-beta` / `v0.3.1-beta` / `v0.3.2-beta` sections were marked "(Planned)" in `ROADMAP.md`, despite having shipped on 2026-04-10 per `CHANGELOG.md` — and they are missing entirely from `ROADMAP.md`'s own "Version History & Planning" summary table.

`ROADMAP.md` is currently 985 lines and carries full narrative sections going back to `v0.0.1-alpha`. Two independently-maintained copies of the same historical narrative will drift — this session found it drifting twice, in one file, in one sitting.

**Scope:**
- In scope: how `ROADMAP.md` and `CHANGELOG.md` divide responsibility for **shipped** release history.
- Out of scope: how deferred/future/backlog items (not yet started, no target version) are tracked — that mechanism is unchanged by this ADR.
- Constraint: `CHANGELOG.md` already exists, is Keep-a-Changelog-style, and is the more appropriate home for this content per standard OSS convention — no new document is being introduced.

---

## Decision

**`CHANGELOG.md` is the single source of truth for full historical detail.** Keep-a-Changelog style (see [keepachangelog.com](https://keepachangelog.com)), one entry per release, full paragraph-level narrative, kept forever, never trimmed.

**`ROADMAP.md` is forward-looking only.** It carries full narrative detail (bulleted feature/fix lists, "Completed"/"Planned" sections) **only** for:
1. The currently in-progress release/branch, and
2. The next one (1) planned release.

Every other version — any version whose `CHANGELOG.md` entry already exists — is represented in `ROADMAP.md` as a **single row** in the "Version History & Planning" summary table only: version, one-line focus description, release date, status. Any existing full narrative section for that version is **deleted from `ROADMAP.md` entirely**, not shortened — the detail lives in `CHANGELOG.md`; duplicating even a trimmed version defeats the point.

**Deferred/future/backlog items are unaffected.** Items with no target version stay as short bullet lists in `ROADMAP.md`'s "Future / Deferred" section. This ADR governs how **shipped** work is represented, not how backlog items are tracked.

### Core Components

1. **Ownership split:** `CHANGELOG.md` owns "what happened" (permanent, detailed). `ROADMAP.md` owns "what's next" (current + one lookahead, detailed) and "what happened" (everything else, one table row).
2. **Trigger for demotion:** the moment a version's `CHANGELOG.md` entry exists (i.e., it has shipped), its `ROADMAP.md` narrative section is deleted and replaced by its table row on the next `ROADMAP.md` edit touching that version.
3. **One-time cleanup authorization:** this ADR is the trigger/authorization for a one-time pass trimming `ROADMAP.md`'s existing over-scoped historical sections (everything before the in-progress release and its one lookahead) down to table rows. A second agent executes this cleanup immediately after this ADR is recorded.

---

## Rationale

### Why This Approach

`CHANGELOG.md` is already the correct, conventional home for this content — Keep a Changelog is a widely adopted standard specifically for "what changed, when, in detail," and this project's `CHANGELOG.md` already follows that shape. `ROADMAP.md`'s job is narrower: tell a reader what's being worked on now and what's coming next. Once a release ships, its story permanently belongs to the changelog; carrying it forward in the roadmap too creates a second copy that only degrades over time, because nothing forces edits to both files to happen together.

### Alternatives Considered

**Option A — Keep both files fully detailed, rely on discipline to keep them in sync.**
- Pros: no immediate rewrite needed; each file remains independently readable.
- Cons: this is the status quo, and it has already drifted twice in one session — proof, not speculation, that discipline alone doesn't hold.
- Rejected: the whole reason this ADR exists is that "just be careful" already failed, twice, today.

**Option B — Make `ROADMAP.md` the source of truth, trim `CHANGELOG.md` instead.**
- Pros: keeps a single narrative file readers might already be using.
- Cons: inverts standard OSS convention (Keep a Changelog exists precisely for this purpose); `ROADMAP.md`'s framing ("Planned"/"Completed" checkboxes) is oriented around forward planning, not permanent historical record — repurposing it as the permanent archive fights its own structure.
- Rejected: `CHANGELOG.md` is already shaped correctly for this job; `ROADMAP.md` is not.

**Option C — Single-row table entry in `ROADMAP.md` pointing at `CHANGELOG.md`'s entry for anything already shipped, full narrative only for current + next (chosen).**
- Pros: eliminates the duplication and the drift vector entirely; each file's scope matches what it's structurally good at; `ROADMAP.md` shrinks to a size that stays readable and current.
- Cons: a reader browsing `ROADMAP.md` alone loses the release-by-release "story" of the past at a glance — must follow the table row to `CHANGELOG.md`.
- **Accepted:** the cost is acceptable because `CHANGELOG.md` already exists and is one click away; the alternative (two documents, permanently in sync only by manual effort) is the proven-failing status quo.

### Trade-offs

**Benefits:**
- ✅ `ROADMAP.md` shrinks substantially (currently 985 lines carrying full narrative back to `v0.0.1-alpha`).
- ✅ Future release work updates one document (`CHANGELOG.md`) instead of two.
- ✅ The version-history table becomes a fast lookup/index; `CHANGELOG.md` is the detail — each file does one job.
- ✅ Removes the specific drift vector that produced both incidents found today (stale checkboxes, missing table rows for shipped betas).

**Costs:**
- ❌ Anyone browsing `ROADMAP.md` alone loses the at-a-glance narrative of past releases — must follow the table row's version to `CHANGELOG.md` for detail.

**Mitigation:**
- Acceptable trade-off since `CHANGELOG.md` already exists and is the more appropriate home for this content per standard OSS convention; the table row's version number is the only lookup a reader needs.

---

## Consequences

### Positive
1. Eliminates a proven, actively-occurring content-duplication and drift vector between `ROADMAP.md` and `CHANGELOG.md`.
2. `ROADMAP.md` becomes and stays substantially shorter — narrative scope is capped at "in progress" + "next one planned," rather than growing unboundedly with every release.
3. Release maintenance work is reduced from two documents to one (`CHANGELOG.md`) going forward.
4. `ROADMAP.md`'s Version History table becomes reliably useful as a fast index precisely because it's the only remaining record of superseded versions in that file.

### Negative
1. A reader who only opens `ROADMAP.md` loses the full "story" of a past release at a glance; they must follow the table row to `CHANGELOG.md`. Accepted as a reasonable cost given `CHANGELOG.md` is the standard, appropriate home for that detail.

### Neutral
1. Deferred/future/backlog item tracking (short bullet lists, no target version) is unchanged by this ADR.

---

## Implementation

**Timeline:** Decided 2026-07-12. A one-time cleanup pass against `ROADMAP.md`'s existing over-scoped historical sections is authorized by this ADR and executed by a second agent immediately after this ADR is recorded.

**Affected Components:**
- `ROADMAP.md` — full narrative sections for every version except the currently in-progress release and its one lookahead are deleted and replaced by single rows in the "Version History & Planning" summary table; the three stale 🔲 checkboxes and the missing `v0.3.0-beta`/`v0.3.1-beta`/`v0.3.2-beta` table rows found today are corrected as part of the same pass.
- `CHANGELOG.md` — unaffected by this ADR; already holds the authoritative detailed entries this decision routes readers to.

**Migration Path:** One-time cleanup pass on `ROADMAP.md` only; no code or tooling changes required. `CHANGELOG.md` requires no changes — it is already the correctly-shaped source of truth.

---

## Validation

**Success Criteria:**
- Every version in `ROADMAP.md`'s Version History table that has a corresponding `CHANGELOG.md` entry appears as exactly one row, with no accompanying full-narrative section elsewhere in the file.
- Only the currently in-progress release and its one planned lookahead retain full narrative ("Completed"/"Planned" bulleted) sections in `ROADMAP.md`.
- No version is marked "(Planned)" or left with an unchecked 🔲 item in `ROADMAP.md` if a corresponding `CHANGELOG.md` entry already exists for it.

**Review Date:** Reassess at the next release after the cleanup pass lands — confirm the next release only required a `CHANGELOG.md` edit plus one `ROADMAP.md` table-row update, not a second narrative rewrite.

---

## Related Decisions

- **[[ADR-059]]** (plans must not hardcode derivable counts) — a related but distinct pattern: ADR-059 governs stale hardcoded *counts* in plan documents going out of sync with a changing repo; this ADR governs a different artifact (permanent release documentation) and a different failure mode (structural duplication of narrative across two files, not a single stale number). Both are instances of the same broader class — unenforced drift between a document's claimed state and actual repo state — but the fix here is a scope/ownership split between two files, not a "derive at run time" rule.

---

## Related Documentation

**Knowledge Graph:**
- None

**Lessons Learned:**
- None yet — candidate for a future lesson capture if a third instance of ROADMAP/CHANGELOG-style duplication is found elsewhere in this project's documentation set.

**Implementation:**
- `ROADMAP.md` — cleanup pass authorized by this ADR, executed separately.
- `CHANGELOG.md` — unaffected; confirmed as the correctly-shaped source of truth.

---

## Future Considerations

1. **Cleanup execution:** the one-time trim of `ROADMAP.md`'s over-scoped historical sections, authorized here, should land as its own commit so the diff is auditable against this ADR's rule.
2. **Recurrence check:** if other project documents are found carrying duplicate full-narrative copies of the same shipped-work detail (beyond ROADMAP/CHANGELOG), consider whether the same single-source-of-truth-plus-index pattern applies, and whether it's time to promote this from a two-document rule to a general documentation-governance rule.

---

**Decision Made:** 2026-07-12
**Last Updated:** 2026-07-12
**Status:** Accepted
