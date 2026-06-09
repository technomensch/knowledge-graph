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
uncaptured lessons before finalizing. Generates Current State and Open Issues operational sections
on every run.

**One file per day per branch.** Subsequent runs on the same branch update the same file: operational
sections (Current State, Open Issues, Session History) are overwritten; Session Findings append+dedup
within the day; narrative blocks are append-only and timestamped.

**Pairing with a handoff:** If you also create a handoff this session, point the handoff's `continues_from` field at this summary's path rather than duplicating completed-work content. The summary itself does not reference the handoff (asymmetric, one-way coupling — see ADR-051).

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

After the agent returns, extract the draft content and display it verbatim in your main-thread response before asking save/edit/cancel. Do not rely on the tool result being visible to the user.

---

## Output Sections

Every session summary includes:

| Section | Zone | Write rule |
|---|---|---|
| **Start-of-Session Reading (Required)** | Gate | Overwrite each run; omit if nothing to read |
| **Current State** | Operational | Overwrite each run |
| **Open Issues** | Operational | Overwrite each run |
| **Session History** | Operational | Overwrite each run |
| **Session Findings** | Operational | Append+dedup within day; omit if empty |
| **Accumulated Narrative** | Narrative | Append-only, timestamped blocks |

The Operational Snapshot zone is bounded by `═══` dividers and labeled `as-of {commit}`.
The Accumulated Narrative zone is append-only — narrative blocks are never overwritten.

**Example structure:**

```markdown
---
title: "2026-06-09-v0.5.10.1-session-summary-ops"
date: 2026-06-09
branch: v0.5.10.1-session-summary-ops
as_of_commit: 3d9fd52c
last_updated: 2026-06-09 14:30
tags: [session]
---

# Session Summary — 2026-06-09 — v0.5.10.1-session-summary-ops

## Start-of-Session Reading (Required)
- [ ] `docs/plans/v0.5.10.1-session-summary-ops.md`
      WHY: current step and acceptance criteria.
- [ ] `## Current State` — branch, commit, uncommitted changes

═══════════════════════════════════════════════
## Operational Snapshot (point-in-time, as-of 3d9fd52c)
═══════════════════════════════════════════════
*These sections are overwritten every run. They describe NOW, not history.*

## Current State
## Open Issues
## Session History
## Session Findings

═══════════════════════════════════════════════
## Accumulated Narrative (append-only, newest first)
═══════════════════════════════════════════════

### Update — 14:30 (as-of 3d9fd52c) — triggered by: manual
## What Was Built / Fixed / Learned
```

---

**Version:** 2.1 (2026-06-09) — operational sections + zone structure (ENH-002 partial)
**Related:** /kmgraph:capture-lesson, /kmgraph:recall
