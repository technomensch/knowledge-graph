---
title: "ADR-047: Profile Auto-Load — Inject Routing Layer Only (me.md + triggers.md), Not rules.md"
number: 047
created: 2026-04-28T00:00:00Z
status: Accepted
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: v0.5.4-profile-autoload
  commit: ecc9d7b9
  pr: "104"
  issue: null
implements: "v0.5.4 — Profile Auto-Load"
related:
  adrs:
    - "[[ADR-028-me-and-rules-as-platform-agnostic-source-of-truth]]"
    - "[[ADR-033-triggersmd-platform-agnostic-rule-timing-companion-file]]"
    - "[[ADR-020-lifecycle-hooks-suite-automated-capture]]"
    - "[[ADR-045-update-profile-skill-not-command]]"
  lessons: []
  kg_entries: []
tags: [hooks, session-start, profile, context-loading, routing-layer]
category: architecture
---

# ADR-047: Profile Auto-Load — Inject Routing Layer Only (me.md + triggers.md), Not rules.md

**Date:** 2026-04-28
**Status:** Accepted
**Implements:** v0.5.4 — Profile Auto-Load
**Related:** ADR-028 (me.md + rules.md as source of truth), ADR-033 (triggers.md companion file), ADR-020 (lifecycle hooks), ADR-045 (update-profile skill)

---

## Context

After context compaction, the profile files (`~/.kmgraph/me.md`, `~/.kmgraph/triggers.md`, `~/.kmgraph/rules.md`, `knowledge/me.md`, `knowledge/triggers.md`) were not reloaded into session context. `~/.claude/CLAUDE.md` instructed Claude to read them at SessionStart, but the instruction was passive — nothing enforced it. Behavioral rules, identity context, and workflow-phase gates went missing mid-session without warning.

ADR-028 established `me.md` and `rules.md` as the platform-agnostic sources of truth for identity and behavioral rules. ADR-033 introduced `triggers.md` as the timing companion that maps workflow phases to rule-section references. Both ADRs deferred the question of *how* these files get loaded into session context.

**The naive fix — bulk-inject all profile files at every SessionStart — was considered and rejected.** Loading `rules.md` (522 lines personal + 241 lines project, ~13k tokens) at every session start flattens the me/triggers/rules graph design: triggers become redundant routing glue that is already fully present in context. More importantly, it imposes a permanent context tax that grows as `rules.md` grows. The architecture was explicitly designed for on-demand loading via trigger pointers; bulk injection undermines it.

**Scope:**
- In scope: `scripts/hooks-master.sh` — adding Sections 1.5 and 3.75 for routing-layer injection
- Out of scope: changes to me.md, triggers.md, or rules.md content; MCP server; platform configs other than the hook

---

## Decision

`scripts/hooks-master.sh` (the SessionStart hook) injects **only the routing layer** at each session start:

| File | Scope | When |
|------|-------|------|
| `~/.kmgraph/me.md` | Personal identity + rule index | Section 1.5 — before early exits |
| `~/.kmgraph/triggers.md` | Personal workflow phase router | Section 1.5 — before early exits |
| `$KG_PATH/me.md` | Project identity | Section 3.75 — after `$KG_PATH` resolved |
| `$KG_PATH/triggers.md` | Project triggers | Section 3.75 — after `$KG_PATH` resolved |

`rules.md` files are **NOT** auto-injected. They load on demand when triggers fire, by referencing specific section anchors (e.g., `rules.md § Approval Gates`).

### Core Components

1. **Section 1.5 — Personal Routing Layer Injection:** Runs before the early-exit guards at lines 121–149. Defines the `_inject_profile` helper function (used by both sections). Injects `~/.kmgraph/me.md` and `~/.kmgraph/triggers.md`. Personal injection survives even when no project KG is configured.

2. **Section 3.75 — Project Routing Layer Injection:** Runs after `$KG_PATH` is resolved (after Section 3.5). Reuses `_inject_profile` to inject `$KG_PATH/me.md` and `$KG_PATH/triggers.md`. Project scope loads after personal scope; project rules override on conflict because they appear later in context.

3. **`_inject_profile` helper:** Defined once in Section 1.5; in-scope for the rest of the script (same shell process). Signature: `_inject_profile <filepath> <label>`. Silently skips missing files. Wraps output in `===== BEGIN <label> =====` / `===== END <label> =====` delimiters for debuggability. Blue label line for visual separation; file contents output raw.

### Implementation Approach

Two insertion blocks added to `scripts/hooks-master.sh`:

- **Section 1.5** inserted after the closing `fi` of the MCP auto-build block (~line 115), before the Section 2 header
- **Section 3.75** inserted after the closing `fi` of the `$GLOBAL_KG_INFO` block (~line 313), before the Section 4 header

Total routing layer: ~4k tokens (~0.4% of 1M-token context window).

---

## Rationale

### Why Routing Layer Only, Not Bulk

The me/triggers/rules three-file graph was designed so that:
- `me.md` carries identity + a pointer index to rule sections
- `triggers.md` maps workflow phases to rule-section anchors
- `rules.md` holds the actual rules, addressable by anchor

Loading `rules.md` in bulk at SessionStart defeats this design in two ways:

1. **Context tax:** 522 lines (personal) + 241 lines (project) = ~13k tokens of rules loaded on every session, even when most rules never fire in that session. The routing layer is ~4k tokens total — a 3× reduction that stays flat regardless of how much rules.md grows.

2. **Architecture flattening:** When all rules are already in context, triggers become redundant. The trigger–anchor pointer system exists precisely so Claude can pull only the relevant rule section when a workflow phase fires. Bulk injection makes the pointer system vestigial.

### Why Personal Injection Must Precede Early Exits

The hook script exits early (lines 121–149) when no `kg-config.json`, no active KG, or an invalid path is found. A user working in a project without a KG should still get personal identity and routing-layer context. Section 1.5 runs before these guards, so `~/.kmgraph/me.md` and `~/.kmgraph/triggers.md` always land in context.

### Why `_inject_profile` Silently Skips Missing Files

New projects won't have `knowledge/me.md` or `knowledge/triggers.md` yet. New users may not have `~/.kmgraph/me.md`. Noisy "file not found" warnings at SessionStart degrade UX without providing actionable information. Silent skip is the correct default; the user will add these files when they run `/kmgraph:init` or `/kmgraph:init-personal-kg`.

### Alternatives Considered

**Option A: Bulk-inject all profile files (me.md + triggers.md + rules.md)**
- Pros: All context always in scope; no risk of a rule not firing due to missing trigger
- Cons: ~13k token permanent tax; rules.md growth directly inflates every session; undermines the graph architecture; triggers become vestigial
- Rejected because: The architecture was explicitly designed to avoid this; the tax compounds as rules.md grows

**Option B: Keep CLAUDE.md passive instruction, no hook change**
- Pros: No implementation work; no risk of hook regression
- Cons: Doesn't solve the compaction problem; relies on the model reading and obeying a passive instruction after every compaction; unreliable
- Rejected because: This was the status quo that motivated the decision

**Option C: Inject routing layer + rules.md on first session only, skip on subsequent**
- Pros: Reduces per-session token cost
- Cons: No reliable mechanism to distinguish "first session" from "post-compaction session" in the hook; complex state management for marginal benefit
- Rejected because: Complexity outweighs gain; routing layer at ~4k tokens is already cheap

### Trade-offs

**Benefits:**
- Rules and identity survive context compaction reliably
- Context cost is bounded at ~4k tokens regardless of rules.md growth
- rules.md can grow to 1500+ lines without affecting hook output
- Architecture integrity preserved: triggers remain the active routing mechanism

**Costs:**
- Trigger anchors must be kept in sync with rules.md section headings — if a heading changes, its trigger pointer breaks
- If a rule has no trigger reference, it won't fire automatically; rules without trigger coverage are invisible to the system

**Mitigation:**
- Anchors are stable by convention (ADR-033 established this); heading changes should be treated as breaking changes requiring trigger updates
- `/kmgraph:capture-lesson` and future linting can flag uncovered rules

---

## Consequences

### Positive

1. **Compaction-resilient identity:** me.md and triggers.md always land in context at SessionStart, regardless of compaction history
2. **Flat context cost:** ~4k tokens routing layer is a fixed overhead; rules.md growth does not inflate session context
3. **Architecture integrity:** The trigger–anchor pointer system remains the active routing mechanism; no design flattening
4. **Cross-scope consistency:** Personal scope always loads; project scope loads when a KG is active; override semantics are preserved (project after personal)

### Negative

1. **Trigger–anchor coupling:** rules.md section headings and trigger pointers must be kept in sync; heading renames break trigger coverage without an explicit guard
2. **Uncovered rules risk:** Rules with no trigger reference never fire automatically; this is a silent gap

### Neutral

1. **Hook script growth:** `hooks-master.sh` gains two sections and one helper function; overall structure remains the same numbered-section pattern

---

## Implementation

**Timeline:** Implemented in v0.5.4 (2026-04-28)

**Affected Components:**
- `scripts/hooks-master.sh` — Sections 1.5 and 3.75 added; `_inject_profile` helper defined

**Migration Path:**
No migration required. The hook change is additive; no existing behavior is removed. New projects without `knowledge/me.md` or `knowledge/triggers.md` are handled gracefully (silent skip).

---

## Validation

**Success Criteria:**
- New session: `~/.kmgraph/me.md`, `~/.kmgraph/triggers.md`, `knowledge/me.md`, `knowledge/triggers.md` all appear in SessionStart output (where they exist)
- `rules.md` files do NOT appear in SessionStart output
- Missing files produce no output and no errors
- Each injected file is wrapped in `===== BEGIN ... =====` / `===== END ... =====` delimiters
- Project-scope injection resolves via `$KG_PATH` (not hardcoded `knowledge/`)
- Session in a project with no active KG still injects personal routing layer

**Review Date:** 2027-04-28

---

## Related Decisions

- **[ADR-028](ADR-028-me-and-rules-as-platform-agnostic-source-of-truth.md):** Established me.md + rules.md as platform-agnostic sources of truth; this ADR resolves the deferred question of how they enter session context
- **[ADR-033](ADR-033-triggersmd-platform-agnostic-rule-timing-companion-file.md):** Established triggers.md as the timing companion; this ADR promotes triggers.md to the routing layer that is always auto-loaded
- **[ADR-020](ADR-020-lifecycle-hooks-suite-automated-capture.md):** Established the lifecycle hooks suite; this ADR extends the SessionStart hook with profile injection
- **[ADR-045](ADR-045-update-profile-skill-not-command.md):** Established the update-profile skill for modifying profile files; this ADR ensures those files are reliably present in context after each session start

---

## Future Considerations

1. **Trigger–anchor lint:** A future validation step (pre-push hook or CI) could check that every `rules.md` section heading has a corresponding trigger pointer, surfacing uncovered rules before they become a silent gap
2. **Routing layer size budget:** If `me.md` or `triggers.md` grows beyond ~300 lines, reconsider whether a summary index in `me.md` pointing to anchors in a separate file is warranted
3. **MCP server parity:** The `kg_*` MCP tools currently do not inject profile context; a future enhancement could expose routing-layer content via a dedicated MCP resource so non-hook platforms (Cursor, Gemini) get equivalent behaviour

---

**Decision Made:** 2026-04-28
**Last Updated:** 2026-04-28
**Status:** Accepted
