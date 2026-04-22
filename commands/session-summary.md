---
description: Create a summary of the current active chat session
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, mcp__kmgraph__kg_fts5_rebuild
---

# session-summary

Document the current Claude Code session before context limits or at major milestones.

---

## Parameters

- `--title` (optional): Custom title for the session (default: auto-generated from session content)
- `--auto` (optional): Skip confirmation prompt — generate and save automatically
- `--delegate` (optional): Hand off to `session-documenter` for deep multi-branch git archaeology

---

## Smart Defaults

Auto-detects session scope, includes recent git history, and presents a single confirmation
before saving — no multi-step interrogation. Checks for open plan steps, draft ADRs, and
uncaptured lessons before finalizing.

---

## Usage

```bash
/kmgraph:session-summary
/kmgraph:session-summary --title="Memory System Design"
/kmgraph:session-summary --auto
/kmgraph:session-summary --delegate
```

---

## When to use `--delegate`

Use `--delegate` when the session spans multiple branches or has a large commit history
that requires deep git archaeology. The `session-documenter` agent handles that heavy
lifting outside the main context window and gates all commits and pushes on your approval.

Use the default (no flag) for typical single-session, single-branch work.

---

## Level Routing Detection

Before dispatching to any agent, detect the level signal from the user's invocation and resolve it to an explicit flag.

**Invoke `gov-capture-routing` skill** to:
1. Detect level signal from the user's message (NL patterns or explicit flags)
2. Resolve `$level`, `$target_kg`, `$target_path`, `$restore_kg`
3. Handle prompts if needed (named KG not found, no project KG configured, conflict resolution)

The resolved flag (`--user`, `--project`, `--named=<kg>`, or `--active`) is then passed to the agent invocation in the Dispatch section below.

**Pass-through with `--delegate`:** If `--delegate` is present, pass both the level flag AND `$target_kg` to the `session-documenter` invocation.

---

## Tier Resolution

Set `$requested_tier`:
- Default path (session-summary-agent): `standard-tier`
- `--delegate` path (session-documenter): `powerful-tier`

Invoke `ai-model-tier-resolver` module (`commands/init-shared/ai-model-tier-resolver.md`) with `$requested_tier` and `{KG_PATH}`.

On success: pass `--model [$resolved_model]` to the subagent invocation.

## Dispatch

Evaluate the flags provided:

**If `--delegate` flag is present:**

Say: "Let me hand this off for a deeper look at the full git history — I'll loop back once it's ready."

Then invoke the `session-documenter` subagent, passing any `--title` value if provided.

**Otherwise (default path):**

Say: "Let me pull together what we worked on today..."

Then invoke the `session-summary-agent`, passing `--title` and `--auto` if provided.

---

**Version:** 2.0 (Refactored: 2026-03-27) — thin dispatcher; logic lives in session-summary-agent and session-documenter
**Related:** /kmgraph:capture-lesson, /kmgraph:recall
