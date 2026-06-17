
## Module: ai-model-tier-resolver

### Input Contract

Caller sets these variables before invoking this module:

| Variable | Description |
|---|---|
| `$requested_tier` | A tier label (`fast-tier`, `standard-tier`, `powerful-tier`) or a legacy model name (e.g., `Haiku`, `claude-sonnet-4-6`) |
| `{KG_PATH}` | Active KG path (for me.md lookup) |

---

### Step R-1: Alias Map (Backwards Compatibility — ADR-041)

Check if `$requested_tier` is a legacy model name rather than a tier label.

**Valid tier labels** (pass through to R-2 unchanged):
- `fast-tier`
- `standard-tier`
- `powerful-tier`

**Alias map** (match case-insensitively):

| Legacy name pattern | Resolves to |
|---|---|
| `Haiku`, `haiku`, `claude-haiku-*` | `fast-tier` |
| `Sonnet`, `sonnet`, `claude-sonnet-*` | `standard-tier` |
| `Opus`, `opus`, `claude-opus-*` | `powerful-tier` |
| `Gemini Flash`, `flash-*`, `gemini-flash-*` | `fast-tier` |
| `Gemini Pro`, `pro-*`, `gemini-pro-*` | `standard-tier` |
| `Gemini Ultra`, `Ultra`, `ultra-*`, `gemini-ultra-*` | `powerful-tier` |

**If alias matched:**

1. Resolve `$requested_tier` → tier label (e.g., `Haiku` → `fast-tier`)
2. Emit this message **once per day** (tracked via `/tmp/.kg-tier-alias-warned-$(date +%Y-%m-%d)` — one flag file per calendar day; multiple sessions on the same day suppress after the first):

   > ⚠️ Model name `[legacy_name]` is deprecated — use tier label `[resolved_tier]` instead. Update your `me.md` tier_map or dispatcher invocation. Aliases will be removed in v0.6.0.

3. Continue to R-2 with the resolved tier label.

**If no alias matched and `$requested_tier` is not a valid tier label:**

Halt with:
> "Unknown tier or model name: `[$requested_tier]`. Use `fast-tier`, `standard-tier`, or `powerful-tier`. Run `/kmgraph:kmg-init` to configure tier mappings."

---

### Step R-2: Read me.md and Identify Active Platform

Read `me.md` YAML frontmatter in this order (project overrides user on conflict):

1. User profile: `~/.kmgraph/me.md`
2. Project profile: `{KG_PATH}/me.md` (override layer)

Identify the active platform:
- Claude Code: platform name = `claude`
- Gemini CLI: platform name = `gemini`
- Ollama: platform name = `ollama`
- LM Studio: platform name = `lm-studio`
- Detection: check `$CLAUDE_CODE_VERSION`, `$GEMINI_VERSION`, etc. (same as init walkthrough)

Find the platform entry in `platforms[]` matching the active platform name.

**If no `platforms[]` block found in either me.md:**

Halt with:
> "No tier mappings configured. Run `/kmgraph:kmg-init` (or `/kmgraph:upgrade`) to set up tier mappings for your platform."

**If active platform not found in `platforms[]`:**

Halt with:
> "No tier mapping for platform `[platform_name]`. Run `/kmgraph:kmg-init` to add it."

---

### Step R-3: Look Up Tier in tier_map

Look up `tier_map[$requested_tier]` in the platform entry.

Store result as `$mapped_value`.

**If `$mapped_value` is non-empty:** Continue to R-4 (validation).

**If `$mapped_value` is empty or absent:** Apply collapse chain (R-3C).

#### R-3C: Collapse Chain

**Direction: downward only.** Starting from `$requested_tier`, try progressively cheaper tiers. Never upgrade (never try a higher tier than what was requested).

| If `$requested_tier` is | Try fallbacks in order |
|---|---|
| `powerful-tier` | `standard-tier` → `fast-tier` |
| `standard-tier` | `fast-tier` only |
| `fast-tier` | (none — halt immediately if empty) |

For each fallback tier:
- Look up `tier_map[$fallback_tier]`
- If non-empty: log once > "Tier `[$requested_tier]` not configured — falling back to `[$fallback_tier]`." Then set `$mapped_value` and continue to R-4.

If all three tiers are empty:

Halt with:
> "No model available. Run `/kmgraph:kmg-init` to configure tier mappings."

---

### Step R-4: Validation Gate (S5 — Scoped to Dispatcher Resolution Only)

**This gate fires only here — never from file scanning, frontmatter inspection, or grep over arbitrary files.**

Validate `$mapped_value` by applying these checks in order. Fail on the first match:

1. **Reject bare tier labels:** if `$mapped_value` is `fast-tier`, `standard-tier`, or `powerful-tier` → suspicious (tier label used as model value).
2. **Reject bare alias names:** if `$mapped_value` case-insensitively matches any key in the R-1 alias map (e.g., `Haiku`, `Sonnet`, `Opus`, `Flash`, `Ultra`) → suspicious (alias used as model value).
3. **Require structural marker:** if `$mapped_value` contains no hyphen (`-`), colon (`:`), or numeric suffix → suspicious (bare word with no version or type separator).

A value that passes all three checks is treated as a valid model ID (e.g., `claude-sonnet-4-6`, `llama3.1:8b`, `gemini-pro-1.5`).

**If any check triggers** (value is suspicious):

Emit **once per day** (tracked via `/tmp/.kg-model-suspicious-$(date +%Y-%m-%d)`):

> ⚠️ Tier `[$requested_tier]` maps to `[$mapped_value]` which may not be a valid model ID. Check your `me.md` tier_map. Continuing anyway — invocation may fail.

Do NOT halt. Continue with `$mapped_value` as-is so the user sees the downstream error rather than a silent block.

---

### Output Contract

On success: `$resolved_model = $mapped_value`

Caller passes this to the subagent:
```
--model [$resolved_model]
```

---

### Error Summary

| Condition | Action |
|---|---|
| Unknown tier label, no alias match | Halt with actionable message |
| No platforms[] in me.md | Halt with actionable message |
| Active platform missing from platforms[] | Halt with actionable message |
| All tiers empty (collapse exhausted) | Halt with actionable message |
| Suspicious model ID (validation gate) | Warn once, continue |
| Legacy alias used | Warn once (deprecation), continue |
