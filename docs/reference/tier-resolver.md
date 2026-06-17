---
title: Model Tier Resolver
category:
  uri: reference
position: 9
slug: reference-tier-resolver
---

# Model Tier Resolver

KMGraph uses three named tiers — `fast-tier`, `standard-tier`, and `powerful-tier` — to dispatch tasks to the right model without hardcoding model names into skills or commands. Tier assignments are resolved at runtime from `me.md`.

---

## Default Tier Mappings

Personal defaults live in `~/.kmgraph/me.md`. Project-level entries in `knowledge/me.md` override them for that project only.

---

## Configuring Tiers in `me.md`

Add a `platforms[]` block to the YAML frontmatter of `knowledge/me.md` (or `~/.kmgraph/me.md` for cross-project defaults). The `profile_schema:` field pins the frontmatter version so the inspector can migrate entries when the schema evolves.

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
  - name: lm-studio
    host: localhost
    port: 1234
    tier_map:
      fast-tier: Phi-3.5-mini-instruct
      standard-tier: Meta-Llama-3.1-8B-Instruct
      powerful-tier: Meta-Llama-3.1-70B-Instruct
---
```

Local platforms (Ollama, LM Studio) add `host` and `port` fields. `kmgraph init` discovers running local instances automatically and prompts for the model list.

---

## Fallback Behavior

When a tier maps to an unreachable model, the resolver falls back down the chain:

```
powerful-tier → standard-tier → fast-tier
```

The collapse is logged once per session. If `fast-tier` is also unreachable, dispatch halts with a remediation prompt.

Skills that must not downgrade declare `required_tier` in their frontmatter:

```yaml
---
required_tier: powerful-tier
---
```

A skill with `required_tier` halts instead of collapsing to a lower tier.

---

## Precedence

Project-level `knowledge/me.md` entries take precedence over `~/.kmgraph/me.md` entries on conflict. Personal entries supply defaults for projects that don't specify a mapping.

---

## Related

- [me.md and rules.md](../pillars/portability/your-ai-profile) — Where the `platforms[]` block lives
- [Platform Adaptation](PLATFORM-ADAPTATION.md) — IDE-level platform integration
