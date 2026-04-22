---
title: "ADR-043: PreToolUse Hook Injection to Enforce User Rules During Superpowers Skill Execution"
number: 043
created: 2026-04-21T00:00:00Z
status: Accepted
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: v0.5.0-beta
  commit: df061cb8b4d7e7556b18a5d20b29b9a421678a0c
  pr: null
  issue: null
implements: "[[e868a17d]] — feat(hooks): add PreToolUse skill hook to enforce user rules during superpowers execution"
related:
  adrs: ["[[ADR-033-triggersmd-platform-agnostic-rule-timing-companion-file]]", "[[ADR-028-me-and-rules-as-platform-agnostic-source-of-truth]]", "[[ADR-038-model-selection-rule-for-kg-tasks]]"]
  lessons: []
  kg_entries: []
tags: [process, hooks, superpowers, rule-enforcement]
category: process
---

# ADR-043: PreToolUse Hook Injection to Enforce User Rules During Superpowers Skill Execution

**Date:** 2026-04-21
**Status:** Accepted
**Note:** Renumbered from ADR-041 to resolve cross-branch numbering collision with ADR-041 (Tier Abstraction Label System).
**Related:** [[ADR-033-triggersmd-platform-agnostic-rule-timing-companion-file]], [[ADR-028-me-and-rules-as-platform-agnostic-source-of-truth]], [[ADR-038-model-selection-rule-for-kg-tasks]]

---

## Context

**Problem:**
- When `superpowers:brainstorming` and `superpowers:writing-plans` skills are invoked via the Skill tool, the model follows the skill's checklist in isolation
- Neither skill has a step to read `~/.kmgraph/rules.md` or `~/.kmgraph/triggers.md`
- The skill's own defaults override user rules every time: plans written to `docs/superpowers/plans/` instead of `docs/plans/`; specs to `docs/superpowers/specs/` instead of `docs/specs/`; execution mode choice presented interactively instead of pre-decided via Parallelism Analysis
- Previous fix attempts via CLAUDE.md edits and ADRs failed because they depend on model attention during skill execution — the skill's structured checklist dominates

**Scope:**
- In scope: `superpowers:brainstorming`, `superpowers:writing-plans` (and their aliases)
- In scope: all kmgraph marketplace users who also use superpowers
- Out of scope: modifying third-party skill content (superpowers CLAUDE.md explicitly prohibits project-specific changes)

---

## Decision

Use a Claude Code PreToolUse hook on the Skill tool to inject `~/.kmgraph/rules.md` + `~/.kmgraph/triggers.md` content into context **before** any `brainstorming` or `writing-plans` skill executes. Implement at two scopes:

1. **Plugin layer** — hook in `hooks/hooks.json`, script in `scripts/pre-skill-rules-inject.sh`. Ships to all kmgraph marketplace users. Reads each user's own `~/.kmgraph/rules.md` dynamically.
2. **User-scope layer** — hook in `~/.claude/settings.json`, script in `~/.kmgraph/hooks/pre-skill-rules-inject.sh`. Fires in all Claude Code sessions on the machine regardless of active plugin.

### Core Components

1. **PreToolUse hook:** Fires when Skill tool is called; script inspects the skill name and injects rules if it matches brainstorming/writing-plans
2. **Marketplace-safe script:** Gracefully no-ops if `~/.kmgraph/rules.md` does not exist; reads user's own rules dynamically; exits 0 always
3. **Model heuristics addition:** Add per-task model selection guidance to `~/.kmgraph/rules.md` and to the default `rules.md` init template so injected content is complete

---

## Rationale

### Why This Approach

1. **Infrastructure-level enforcement:** Hooks fire before the skill executes — guaranteed injection regardless of model attention or skill checklist content
2. **Non-invasive:** Third-party skill files are not modified; the fix is entirely in the hook layer
3. **Marketplace portable:** Plugin-layer hook benefits all kmgraph users who use superpowers, not just this user; user-scope layer handles solo/non-kmgraph projects

### Alternatives Considered

**CLAUDE.md edits / ADR references**
- Pros: Simple, no new infrastructure
- Cons: Depend on model attention during skill execution — skill checklist dominates; tried multiple times, failed each time
- Rejected: Root cause is attention, not configuration

**Modifying superpowers skills directly**
- Pros: Fix is in the skill itself
- Cons: Superpowers CLAUDE.md explicitly prohibits project-specific or personal configuration changes; not mergeable upstream; breaks on every superpowers update
- Rejected: Not viable for third-party skills

**PostToolUse guard (validate after)**
- Pros: Could catch and correct violations after the fact
- Cons: Correction after file is written is messier than prevention; doesn't stop interactive prompts from appearing
- Rejected as primary: May be added as a secondary guard later

### Trade-offs

**Benefits:**
- ✅ Rules enforced durably at infrastructure level
- ✅ No modification of third-party skill content required
- ✅ All kmgraph marketplace users get the fix automatically via plugin layer
- ✅ User-scope layer covers projects without kmgraph

**Costs:**
- ❌ Hook script must gracefully handle absent `~/.kmgraph/rules.md` (new user onboarding gap)
- ❌ User-scope layer requires manual install step per machine (cannot be committed)
- ❌ Injected content is truncated at 8KB — very large rules files may be partially injected

**Mitigation:**
- Script exits 0 and no-ops if rules file absent — safe for all users
- User install documented in kmgraph setup guide and `kmgraph:setup-platform` skill

---

## Consequences

### Positive

1. **Durable fix:** Rules enforced at hook layer — survives superpowers updates, CLAUDE.md resets, context compaction
2. **Marketplace reach:** Plugin hook ships to all kmgraph users who use superpowers
3. **Complete guidance:** Model heuristics addition closes the gap in Parallelism Analysis (Model column had no guidance)

### Negative

1. **Machine-local user-scope:** `~/.claude/settings.json` hook must be re-installed on each machine
2. **Truncation risk:** Rules files exceeding 8KB will be partially injected

### Neutral

1. **Two-script maintenance:** Plugin and user-scope scripts are identical in content but live in different paths; changes must be applied to both

---

## Implementation

**Affected Components:**
- `hooks/hooks.json` — add PreToolUse Skill matcher
- `scripts/pre-skill-rules-inject.sh` — new plugin-layer injection script
- `~/.claude/settings.json` — add PreToolUse Skill hook (user-scope)
- `~/.kmgraph/hooks/pre-skill-rules-inject.sh` — new user-scope injection script
- `~/.kmgraph/rules.md` — add Model heuristics block to Parallelism Analysis
- `core/templates/knowledge/rules.md` — seed model heuristics for new users

---

## Validation

**Success Criteria:**
- After hook is installed: `superpowers:writing-plans` saves plans to `docs/plans/` without prompting
- After hook is installed: `superpowers:brainstorming` saves specs to `docs/specs/` without prompting
- After hook is installed: execution mode is pre-decided (not presented interactively)
- Hook script exits 0 cleanly when `~/.kmgraph/rules.md` is absent

**Review Date:** 2026-07-21

---

## Related Decisions

- **[[ADR-033-triggersmd-platform-agnostic-rule-timing-companion-file]]:** Defines triggers.md as the timing companion; this ADR implements the enforcement mechanism for the superpowers skill triggers
- **[[ADR-028-me-and-rules-as-platform-agnostic-source-of-truth]]:** Establishes rules.md as the authoritative source; this ADR ensures it is actually loaded before skills execute
- **[[ADR-038-model-selection-rule-for-kg-tasks]]:** Model selection for KG ops; model heuristics addition extends this to cover plan execution task types

---

**Decision Made:** 2026-04-21
**Last Updated:** 2026-04-21 (renumbered from ADR-041 to ADR-043 — cross-branch collision resolution)
**Status:** Accepted
