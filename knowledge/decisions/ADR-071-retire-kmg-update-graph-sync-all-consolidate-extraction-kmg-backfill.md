---
title: "ADR-071: Retire kmg-update-graph/kmg-sync-all, Consolidate Extraction into kmg-backfill and kg_extract"
number: 071
created: 2026-09-04T00:00:00Z
status: Accepted
author: technomensch
email: mkitact@gmail.com
git:
  branch: v0.7.7-remove-stale-commands
  commit: 1a66f25a
  pr: null
  issue: null
implements: null
related:
  adrs:
    - "[[ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings]]"
    - "[[ADR-053-kmg-prefix-cross-platform-naming]]"
    - "[[ADR-062-gemini-pb-project-scoping-fail-closed]]"
  lessons: []
  kg_entries: []
tags: [command-lifecycle, extraction-pipeline, consolidation, kmg-backfill, kg_extract, deprecation]
category: architecture
---

# ADR-071: Retire kmg-update-graph/kmg-sync-all, Consolidate Extraction into kmg-backfill and kg_extract

**Date:** 2026-09-04
**Status:** Accepted
**Related:** [[ENH-034-capture-pipeline-command-naming-and-grouping]], [[ENH-035-chat-history-and-lessons-to-kg-backfill-extractor]], [[ENH-025-cross-platform-knowledge-extractor-backfill-from-chat-history]], [[issue-37-explore-auto-trigger-vs-manual-invocation-for-kmg-sync-all]]

---

## Provenance — how these decisions were surfaced

All decisions recorded here were made during a single brainstorming session on 2026-09-04 that started as a routine review of [ENH-034](../enhancements/ENH-034/ENH-034-specification.md)'s command-grouping spec and expanded significantly through iterative research: git archaeology (tracing `kmg-update-graph`'s origin to a different, unrelated prior project — `optimize-my-resume` — via its own commit history), cross-referencing dead-pipeline evidence already on record in `issue-37`, an independent second-opinion review (Opus model) on flag design, and a full open-ticket overlap sweep that surfaced two previously-unconnected specs (`ENH-025`) and issues (`issue-37`) whose questions this work directly answers. No code has shipped yet — this ADR formalizes decisions recorded in the three ENH specs above so the reasoning survives independent of any one spec's future edits, per this project's ADR-first documentation convention.

---

## Context

**Problem:** The capture-pipeline command cluster (`kmg-update-graph`, `kmg-sync-all`, `sync-all-agent`, and the `knowledge-extractor` subagent's "update-graph" mode) traces back to a single 2026-02-12 import — "8 skills converted from optimize-my-resume project," an unrelated prior tool — and was never re-validated against this project's actual needs or architecture. Investigation this session found:

1. `kmg-update-graph`'s only orchestrated caller, `kmg-sync-all` → `sync-all-agent`, has zero confirmed real-world use (`issue-37`, filed 2026-08-01: "the user has never invoked `/kmgraph:kmg-sync-all`").
2. No recall evidence exists of `kmg-update-graph` itself being manually invoked either.
3. Meanwhile, a real, unmet need existed: nothing extracted lessons/decisions/KG-entries from `chat-history/` on demand (only inside the one-shot `kmg-init` flow) — and a genuine bug was found in that flow: `kmg-init`'s Step 1.10 `sources[]` array never actually scanned pre-existing `knowledge/lessons-learned/`/`knowledge/decisions/` directories, despite `agents/knowledge-extractor.md`'s own documentation claiming it did.
4. Separately, `ENH-025` (proposed 2026-06-12, previously unconnected to this cluster) had already designed a cross-platform MCP tool (`kg_extract`) solving the same "extraction logic is Claude-Code-subagent-only" problem for Codex/Gemini users.

**Scope:** This ADR covers the command-lifecycle and extraction-architecture decisions made while resolving all of the above in one coordinated pass, so the four dependent artifacts (ENH-034, ENH-035, ENH-025, issue-37) don't each carry a fragment of the same reasoning independently.

---

## Decision

### Decision 1 — Remove `kmg-update-graph`, `kmg-sync-all`, and `sync-all-agent` (retire, not rename)

`kmg-update-graph` was originally scoped in ENH-034 as a rename candidate (to `kmg-ingest-graph`, for verb accuracy — "update" implies editing, but it actually extracts/creates). That framing is **superseded**: the command is removed outright. Its only orchestrator, `kmg-sync-all` (and the agent it delegates to, `sync-all-agent`), is removed alongside it — its sole purpose was orchestrating a command being retired, and it is independently confirmed dead (`issue-37`).

**Rejected alternative — rename `kmg-update-graph` to `kmg-ingest-graph`.** Rejected because the command's problem isn't just its name — it's that its entire orchestration path has zero confirmed use, and its one genuinely-live responsibility (indexing already-written `lessons-learned/`/`decisions/` files into KG entries) is better served by consolidation (Decision 2) than by a standalone command with an accurate name but no real callers.

### Decision 2 — Consolidate extraction into one new command, `kmg-backfill`

A new standalone command, `kmg-backfill`, absorbs the live responsibilities of both the original ENH-035 proposal (chat-history extraction) and `kmg-update-graph`'s actual job (existing-lessons/decisions indexing):

- Reads `chat-history/`, `knowledge/lessons-learned/`, and `knowledge/decisions/`.
- Drafts candidate lesson/decision/KG-entry artifacts from `chat-history/`; extracts quick-reference KG index entries from already-existing `lessons-learned/`/`decisions/` files.
- Prints resolved source/destination paths before any write (ENH-033 step-3a pattern); presents drafts for human confirmation; never auto-writes.
- Supports positional `[path]` and `--date=`/`--after=`/`--before=` (chat-history only) for scoping, and `--delegate knowledge-extractor` (or defaults to it) for large reads.
- Deliberately does **not** implement `--source`, `--output-dir`, `--today`, `--rebuild`, `--dry-run`, `--yes`/`--no-confirm`, or the ADR-062 `--project`/`--confirm-unscoped` fail-closed pair (see Decision 5).

`agents/knowledge-extractor.md`'s "update-graph" mode (KG Entry Extraction Mode) is deprecated/removed — its logic relocates into `kmg-backfill`. Its separate "init-backfill" mode is functionally unaffected, just reached one hop further downstream (see Decision 3).

**Naming:** settled on `kmg-backfill`, not the originally-proposed `kmg-backfill-graph`. The `-graph` suffix existed for exactly one reason — pairing with `kmg-ingest-graph`, `kmg-update-graph`'s rename candidate under Decision 1's now-superseded framing. That sibling will never exist, so the suffix's only justification evaporated.

**Rejected alternative — extend `kmg-update-graph` to also read `chat-history/`.** Rejected in ENH-035 before this session (already documented there) and doubly so now — extending a command being removed makes no sense.

### Decision 3 — Fix `kmg-init` Step 1.10's `sources[]` bug and delegate to `kmg-backfill`

Step 1.10's `sources[]` array is corrected to detect `knowledge/lessons-learned/` and `knowledge/decisions/` (previously never checked, a real spec/code mismatch against `knowledge-extractor.md`'s own documented behavior). All three of `chat-history/`/`lessons-learned/`/`decisions/` are then routed through `kmg-backfill` instead of a direct, now-inconsistent `knowledge-extractor` call. Step 1.10 continues owning its other five source types (`plans/`, `research/`, `specs/`, `README.md`, `CHANGELOG.md`) — drafting brand-new lesson/decision candidates from raw docs is a different job than indexing already-existing ones, and stays put.

This refactor must preserve [ENH-032](../enhancements/ENH-032/ENH-032-specification.md)'s already-resolved pattern: the extractor is read-only/extract-only; the coordinator session shows the final "write N files?" confirmation and performs the write. Nothing here reopens that relay-approval deadlock.

### Decision 4 — Adopt `kg_extract` (ENH-025) as `kmg-backfill`'s cross-platform equivalent, implemented together

ENH-025 (proposed 2026-06-12) already designed a platform-agnostic MCP tool, `kg_extract`, for exactly the problem `kmg-backfill` solves on Claude Code — Codex/Gemini users have no subagent-spawning equivalent of `knowledge-extractor`. Rather than treat cross-platform parity as an open question for `kmg-backfill` to answer independently, this ADR adopts `kg_extract`'s existing design as the answer, with its scope widened to match `kmg-backfill`'s three-source consolidation (originally scoped to chat-history only). Both ship in the same implementation pass, not sequentially — avoiding a second edit pass on the same files (`agents/knowledge-extractor.md`, `commands/kmg-init.md` Step 1.10) that a standalone `kg_extract` effort would otherwise require later.

### Decision 5 — Do not apply the ADR-062 fail-closed `--project`/`--confirm-unscoped` pattern to `kmg-backfill`

ADR-062 exists because `kmg-extract-chat`'s *read* side globs every project's session logs on the machine while only the *write* side respects cwd — a genuine trust-boundary crossing. `kmg-backfill` reads and writes within the same already-resolved graph; there is no foreign, unscoped source it could leak in from. Adding the pair here would be cargo-culting a gate onto an operation that already has a stronger one — human review of every draft before write.

### Decision 6 — `kmg-update-issue-plan`: no rename (left as-is)

Originally flagged in ENH-034 alongside `kmg-update-graph` as a second misleading name (candidate rename: `kmg-propagate-issue-plan`). Re-reading the full command on this session showed the "actively misleading" framing overstated the problem: its 5-step loop's first three steps (extract KG insight, update the plan doc, update the local issue file) genuinely match "update issue" + "plan." Steps 4-5 (GitHub posting, a separate CHANGELOG/version-file governance gate) aren't reflected in the name, but that's a scope-completeness gap, not the same kind of broken-verb mismatch `kmg-update-graph` had (where "update" implied editing something that already exists, but it actually created new content). Not renamed; may be revisited later if the gap proves confusing in practice.

---

## Rationale

### Why this approach

1. **Provenance matters for lifecycle decisions, not just naming.** A command inherited wholesale from an unrelated project, never re-validated, sitting on a confirmed-dead orchestration pipeline, is a different category of problem than a command with a merely-inaccurate name. Treating `kmg-update-graph` as a rename candidate (as originally scoped) would have preserved dead architecture under a better label. Removal addresses the actual problem.
2. **Consolidate before removing, don't remove-then-gap.** The naive sequence — remove `kmg-update-graph`, ship `kmg-backfill` for chat-history only — would have silently dropped the ability to index existing `lessons-learned/`/`decisions/` files into the KG, since (per the bug found in Decision 3) `kmg-init`'s backfill never actually covered that despite looking like it might. Validating the overlap *before* deciding removal was safe is what surfaced the bug and the correct consolidated scope.
3. **Don't solve the same problem twice under two names.** ENH-025 and this session's cross-platform question for `kmg-backfill` are the identical problem (extraction logic trapped in a Claude-Code-only subagent) discovered independently five months apart. Merging them avoids a near-future second pass on `agents/knowledge-extractor.md` and `kmg-init.md` once someone eventually rediscovers ENH-025.
4. **Don't over-guard.** Decision 5 is a deliberate act of restraint — matching an existing security pattern (ADR-062) to a new command without checking whether its actual risk profile calls for it would add unjustified complexity. Not every new command needs every existing command's gates.

### Alternatives considered

**Option A (Decision 1): rename `kmg-update-graph` instead of removing it.**
- Pros: smaller edit, preserves a command in case an unknown caller exists.
- Cons: no confirmed caller was ever found (direct invocation or orchestrated); a rename preserves dead architecture under a more accurate label instead of removing it.
- Rejected because: the research (dead pipeline, no recall evidence, inherited-scaffold provenance) supports removal, and consolidation gives its one real job a better home anyway.

**Option B (Decision 2): keep `kmg-backfill` chat-history-only, leave `kmg-update-graph`'s job unaddressed or duplicated elsewhere.**
- Pros: smaller initial scope for ENH-035.
- Cons: would have left `kmg-update-graph`'s removal (Decision 1) with a real capability gap — nothing would index existing lessons/decisions into the KG, on init or afterward.
- Rejected because: the gap was real (confirmed via the Step 1.10 `sources[]` bug), not hypothetical.

**Option C (Decision 4): treat `kg_extract`/cross-platform parity as `kmg-backfill`'s own separate open question, decide later.**
- Pros: keeps ENH-035's scope narrower in the short term.
- Cons: ENH-025 already exists with a fleshed-out design; deciding "later" here means a second full design pass on files this ADR is already touching.
- Rejected because: the answer already existed — adopting it now costs less than re-deriving it later.

---

## Consequences

### Positive

1. **Dead architecture removed, not relabeled.** `kmg-update-graph`, `kmg-sync-all`, `sync-all-agent` — all confirmed-dead — are retired rather than carried forward under better names.
2. **A real bug fixed as a side effect of due diligence.** `kmg-init`'s Step 1.10 `sources[]` gap (never scanned `lessons-learned/`/`decisions/`) would likely have gone unnoticed indefinitely without the overlap check this consolidation required.
3. **One consolidated extractor instead of three partial ones.** `kmg-backfill` (chat-history + lessons + decisions) plus its cross-platform equivalent `kg_extract` replaces `kmg-update-graph`, `kmg-init`'s partial/buggy backfill, and ENH-025's previously-standalone proposal.
4. **Two dangling tickets close as a side effect.** `issue-37`'s deprecation question and ENH-025's cross-platform question both resolve through this work rather than needing independent follow-up.

### Negative / Open

1. **Larger one-time edit surface than a simple rename would have been.** References across ENH-035 (12 mentions), ADR-058 (6 mentions), and `docs/pillars/organizing/backfill.md` (3 mentions) all need updating in the same implementation pass — tracked in ENH-034/035's own Affected Files tables, not repeated here.
2. **`knowledge-reviewer`'s fate, resolved during implementation:** retired (Option X) — deleted outright. It was called only by `kmg-update-graph` (Step 6) and `kmg-sync-all`, both retired by Decision 1; `kmg-backfill` ships without a dedicated quality-check step, matching this project's convention that human confirmation before write is the quality gate (no other capture-pipeline command has a separate reviewer agent either).

### Neutral

1. **`kmg-update-issue-plan` is explicitly out of scope for renaming** (Decision 6) — recorded here so a future session doesn't re-litigate it without first reading this rationale.

---

## Related Decisions

- **[[ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings]]:** governs the audience/collision/accuracy naming check applied to `kmg-backfill`'s name; explicitly does not cover command *removal* or lifecycle decisions (checked directly — its own Scope section excludes re-deciding individual ENH implementations), which is why this ADR exists separately rather than appending there.
- **[[ADR-053-kmg-prefix-cross-platform-naming]]:** precedent for the alias/deprecation mechanics considered (but not required here, since removal — not rename — is the decision for `kmg-update-graph`).
- **[[ADR-062-gemini-pb-project-scoping-fail-closed]]:** the fail-closed pattern explicitly declined for `kmg-backfill` in Decision 5.

---

## Related Documentation

**Specs implementing these decisions:**
- `knowledge/enhancements/ENH-034/ENH-034-specification.md` — Decision 1, Decision 6
- `knowledge/enhancements/ENH-035/ENH-035-specification.md` — Decisions 2, 3, 4, 5
- `knowledge/enhancements/ENH-025/ENH-025-specification.md` — Decision 4 (source design, now folded in)
- `knowledge/issues/issue-37/issue-37-description.md` — resolved by Decision 1
- `knowledge/enhancements/ENH-026/ENH-026-specification.md` — its guard work on `update-graph.md`/`sync-all.md` is superseded by Decision 1 (noted there directly)

**Files this ADR's decisions will touch (see the ENH specs' own Affected Files tables for the authoritative list):**
- `commands/kmg-update-graph.md`, `commands/kmg-sync-all.md`, `agents/sync-all-agent.md` — removed
- `commands/kmg-backfill.md` (new), `commands/kmg-init.md` (Step 1.10), `agents/knowledge-extractor.md` — refactored
- `mcp-server/src/` — new `kg_extract` tool
- `docs/pillars/organizing/backfill.md`, `docs/reference/commands.md` — updated

---

**Decision Made:** 2026-09-04
**Last Updated:** 2026-09-05
**Status:** Accepted

---

## Open Questions

Both resolved at implementation completion (2026-09-05):

- `knowledge-reviewer`'s fate: retired (Option X) — see Consequences → Negative/Open, item 2.
- When to flip Proposed → Accepted: now, at implementation completion — matching this project's usual Proposed → Accepted convention.
