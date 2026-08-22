
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
/kmgraph:kmg-session-summary
/kmgraph:kmg-session-summary --title="Memory System Design"
/kmgraph:kmg-session-summary --auto
/kmgraph:kmg-session-summary --delegate
```

---

## When to use `--delegate`

Use `--delegate` when the session spans multiple branches or has a large commit history
that requires deep git archaeology. The `session-documenter` agent handles that heavy
lifting outside the main context window and gates all commits and pushes on your approval.

Use the default (no flag) for typical single-session, single-branch work.

---

## Level Routing Detection

Before dispatching to any agent, detect the user's intent for WHERE this session summary
should be captured, directly from their message or an explicit flag — no separate
routing skill needed (`gov-capture-routing`, formerly invoked here, has been retired —
see issue-18 — this detection is now native to how `kg_capture`/`session-summary-agent`
already resolve scope):

- Personal/global-KG language ("my personal", "global session"), or an explicit `--user`
  flag → `--user` (`session-summary-agent` passes `scope: "user"` to `kg_capture`)
- This-project language, or an explicit `--project` flag → `--project`
- A specific KG named by the user, or `--named=<kg>` → `--named=<kg>` (resolves to
  `targetKg` at the `kg_capture` call)
- Nothing specified, or `--active` → `--active` (default, cwd-derived resolution)
- No `$restore_kg` to resolve — knowledge graphs resolve from context per call, not a
  mutable "active" pointer, so there is nothing to restore after (ADR-067 Phase 6).
- Handle prompts if genuinely needed (named KG not found, no project KG configured) —
  the conflict-resolution flow the retired skill supported for two ambiguous signals in
  one message is not reproduced here; see issue-18's decision record for why this is an
  accepted scope narrowing.

The resolved flag (`--user`, `--project`, `--named=<kg>`, or `--active`) is then passed to the agent invocation in the Dispatch section below.

**Pass-through with `--delegate`:** If `--delegate` is present, pass both the level flag AND `$target_kg` to the `session-documenter` invocation.

---

## Tier Resolution

Set `$requested_tier`:
- Default path (session-summary-agent): `standard-tier`
- `--delegate` path (session-documenter): `powerful-tier`

Invoke `kmg-ai-model-tier-resolver` module (`commands/kmg-init-shared/kmg-ai-model-tier-resolver.md`) with `$requested_tier` and `{KG_PATH}`.

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
The Accumulated Narrative zone is append-only by default — new blocks are added, not merged into old ones. If the user explicitly asks to correct or redact a specific past block, edit that block directly rather than only appending a correction below it.

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
- [ ] `knowledge/plans/v0.5.10.1-session-summary-ops.md`
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
**Related:** /kmgraph:kmg-capture-lesson, /kmgraph:kmg-recall
