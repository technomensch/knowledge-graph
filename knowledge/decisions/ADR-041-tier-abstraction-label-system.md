---
title: "ADR-041: Tier Abstraction Label System for Model Selection"
number: 041
created: 2026-04-21T00:00:00Z
status: Accepted
author: technomensch
email: mkitact@gmail.com
git:
  branch: v0.5.0-beta-phase1-foundation
  commit: null
  pr: null
  issue: null
implements: v0.5.1-beta
related:
  adrs: [34, 38, 39]
  lessons: []
  kg_entries: []
tags: [tiers, model-selection, platform-abstraction, dispatcher]
category: architecture
---

# ADR-041: Tier Abstraction Label System for Model Selection

**Date:** 2026-04-21
**Status:** Accepted
**Implements:** v0.5.1-beta (Phase 2)
**Related:** ADR-034 (dispatcher/agent split), ADR-038 (model selection rule), ADR-039 (profile terminology)

---

## Context

All rules, skills, agents, and commands that reference models hardcode platform-specific names (Haiku, Sonnet, Opus). This creates three problems:

1. Rules break silently when users are on Gemini, local Ollama, or LM Studio
2. Model name changes (e.g., Haiku 4.5 → Haiku 4.6) require global find-replace across the codebase
3. There is no mechanism to express "use the fast model for this task" independently of the user's platform

---

## Decision

Replace all hardcoded model names in rules, skills, and commands with three platform-agnostic tier labels:

| Tier Label | Claude | Gemini | Local (Ollama/LM Studio) |
|---|---|---|---|
| `fast-tier` | Haiku | Flash | user-configured |
| `standard-tier` | Sonnet | Pro | user-configured |
| `powerful-tier` | Opus | Ultra | user-configured |

Tier-to-model mapping is defined in `me.md` YAML frontmatter under `platforms[].tier_map`. The dispatcher resolver reads this at invocation time and resolves the tier label to the concrete model name before passing it to a subagent.

### Tier Collapse Policy

When a tier is requested and the mapped model is absent or unreachable, the resolver falls back down the chain: `powerful-tier → standard-tier → fast-tier`. If `fast-tier` also fails, halt with an actionable error including remediation steps.

Collapse is logged once per session. Skills may declare `required_tier: <label>` in frontmatter to opt out — those skills halt rather than collapse (Stuck-Work escalation is the primary use case).

### Backwards Compatibility Alias Map

During Phase 2 rollout, the resolver accepts legacy model names as aliases and emits a once-per-session deprecation warning. Aliases are removed in v0.6.0. A sed pass converts repo-owned references; aliases are the safety net for user-owned content we cannot rewrite.

| Legacy name | Resolves to |
|---|---|
| Haiku, claude-haiku-* | `fast-tier` |
| Sonnet, claude-sonnet-* | `standard-tier` |
| Opus, claude-opus-* | `powerful-tier` |
| Gemini Flash, flash-* | `fast-tier` |
| Gemini Pro, pro-* | `standard-tier` |
| Gemini Ultra, Ultra, ultra-* | `powerful-tier` |

### me.md YAML Frontmatter Schema

Platform and tier config lives in YAML frontmatter at the top of `me.md` (profile_schema: 1). Example:

```yaml
---
profile_schema: 1
platforms:
  - name: claude
    tier_map:
      fast-tier: claude-haiku-4-5-20251001
      standard-tier: claude-sonnet-4-6
      powerful-tier: claude-opus-4-7
  - name: ollama
    host: localhost
    port: 11434
    tier_map:
      fast-tier: llama3.2:3b
      standard-tier: llama3.1:8b
      powerful-tier: llama3.1:70b
---
```

`upgrade-inspector.md` reads `profile_schema:` before any profile migration — missing or outdated schema triggers an offer-to-upgrade flow, mirroring the `kmgraph_schema:` pattern in `rules.md`.

---

## Rationale

Tier labels are platform-neutral vocabulary that any LLM ecosystem supports. Mapping is user-controlled and lives in `me.md` alongside other behavioral configuration. This makes the platform abstraction visible and editable without touching rules or skills.

---

## Consequences

**Positive:**
- Rules and skills work unmodified across Claude, Gemini, and local platforms
- Model upgrades require only updating `me.md`, not the entire codebase
- Tier labels are self-documenting ("powerful-tier" conveys intent)

**Negative:**
- Phase 2 rename pass required across all rules, skills, commands
- Backwards compat alias map adds resolver complexity (temporary, sunset v0.6.0)
- Users must run init walkthrough to configure tier mappings for local platforms

---

## Implementation

**Phase 1 (this ADR):** Document the decision, tier table, collapse policy, alias map, schema versioning.
**Phase 2:** Implement resolver, rename pass, `me.md` YAML schema, init walkthrough, dispatcher flags.

---

## Amendments

### 2026-04-21 — Agent Frontmatter Must Not Specify `model:` (Phase 2 remediation)

**Rule:** Agent frontmatter (agents/*.md) MUST NOT include a `model:` field. Hardcoding a platform-specific model name in frontmatter overrides any `--model [resolved]` flag passed by a dispatcher, making the entire tier resolution pipeline inert.

**Correct pattern:** Omit `model:` from agent frontmatter entirely. Claude Code's default behavior when `model:` is absent is to inherit from the caller — exactly what tier resolution requires.

**Rationale:** The entire premise of ADR-041 is that tier→model mapping is user-owned data in `me.md`, resolved at invocation time by the dispatcher. Frontmatter `model:` hardcodes a platform-specific model name into the agent file — the exact anti-pattern this ADR eliminates. ADR-034 establishes that dispatchers own invocation policy; frontmatter `model:` inverts that ownership.

**Applied to:** All 8 agents in `agents/*.md` — `model:` field removed in v0.5.1-beta Phase 2 remediation commit.

### 2026-04-21 — Gemini Ultra alias added to backwards compatibility alias map (N2 fix)

**Change:** Added `Gemini Ultra, Ultra, ultra-*` → `powerful-tier` row to the alias map. The original alias table included Flash and Pro but omitted Ultra, creating an inconsistency with the tier table's Gemini column (which lists Ultra for `powerful-tier`).

---

**Decision Made:** 2026-04-21
**Last Updated:** 2026-04-21
**Status:** Accepted
