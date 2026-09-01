# Architecture Snapshot — Tier System (v0.5.x) — 2026-04-21

## Tier Label System (ADR-041)

Three platform-agnostic labels replace all hardcoded model names across rules, skills, agents, and commands:

| Tier Label | Claude | Gemini | Local (Ollama/LM Studio) |
|---|---|---|---|
| `fast-tier` | Haiku | Flash | user-configured |
| `standard-tier` | Sonnet | Pro | user-configured |
| `powerful-tier` | Opus | Ultra | user-configured |

Tier-to-model mapping is user-owned, defined in `me.md` YAML frontmatter under `platforms[].tier_map`. Dispatchers read this at invocation time and pass a resolved concrete model name to subagents — labels never reach subagents directly.

---

## Dispatcher → Agent Model (ADR-034 + ADR-041)

```
User → Dispatcher (commands/*.md)
           │
           ├─ Reads me.md tier_map
           ├─ Resolves tier label → concrete model name
           └─ Invokes subagent with --model [resolved]
                       │
                  Agent (agents/*.md)
                  receives --model [resolved]
                  executes — NO re-resolution
```

**Ownership rule:** Dispatchers own invocation policy (NL detection, tier resolution, flag passing). Agents own execution only. Neither duplicates the other's job.

**Shared skill pattern (ADR-034):** `gov-capture-routing` is the single source of truth for routing logic across 6 dispatchers. Phase 3 introduces a parallel pattern: `commands/init-shared/ai-model-tier-resolver.md` as single source of truth for tier resolution across 4 dispatchers.

---

## No `model:` in Agent Frontmatter (ADR-034 + ADR-041 — Critical Rule)

**Rule:** `agents/*.md` files MUST NOT contain a `model:` field.

**Why:** A frontmatter `model:` field overrides any `--model [resolved]` flag passed by the dispatcher — silently bypassing the entire tier resolution pipeline.

**Correct pattern:**
```yaml
# agents/my-agent.md frontmatter — correct
---
description: "..."
# NO model: field
---
```

**Applied:** Removed from all 8 agents in `agents/*.md` during v0.5.1-beta Phase 2 remediation.

---

## Tier Collapse Chain

When a requested tier's mapped model is absent/empty:

`powerful-tier → standard-tier → fast-tier`

- Logged once per session
- Skills with `required_tier: <label>` in frontmatter opt out — they halt rather than collapse (primary use case: `stuck-work-escalation`)

---

## Backwards Compatibility Alias Map (ADR-041 — sunset v0.6.0)

| Legacy name | Resolves to |
|---|---|
| Haiku, claude-haiku-* | `fast-tier` |
| Sonnet, claude-sonnet-* | `standard-tier` |
| Opus, claude-opus-* | `powerful-tier` |
| Gemini Flash, flash-* | `fast-tier` |
| Gemini Pro, gemini-pro-* | `standard-tier` |
| Gemini Ultra, Ultra, ultra-* | `powerful-tier` |

Alias match emits a once-per-session deprecation warning. Implemented in Phase 3 `tier-resolver.md` Step R-1.

---

## ADR-042: implements Field Format

Every ADR must include the implementation commit hash in the `implements` YAML field:

```yaml
implements: "[[e0ccfe41]] — feat(tiers): description of commit"
```

- Design-first ADRs set `implements: null` at creation time; back-fill after the implementation commit lands
- `create-adr-agent` wizard (Phase 3) prompts for the hash at question 9 and wires it into Phase 5 frontmatter
- Format: `[[<short-hash>]]` wiki-link style — not a bare hash string

---

## me.md Profile Schema

Platform and tier config in `me.md` YAML frontmatter (`profile_schema: 1`):

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

User profile (`~/.kmgraph/me.md`) is the base; project profile (`{KG_PATH}/me.md`) overrides on conflict. `upgrade-inspector.md` checks `profile_schema:` before any migration.

---

## Key Files

| File | Role |
|---|---|
| `~/.kmgraph/me.md` | User-level tier_map (base) |
| `knowledge/me.md` | Project-level tier_map (override) |
| `commands/init-shared/ai-model-tier-resolver.md` | Single source of truth for tier resolution (Phase 3, new) |
| `knowledge/decisions/ADR-041-*.md` | Tier system decision record |
| `knowledge/decisions/ADR-034-*.md` | Dispatcher/agent split decision record |
| `knowledge/decisions/ADR-042-*.md` | implements field mandatory rule |
