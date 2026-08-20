---
title: "ENH-002: Session Snapshot on Capture"
number: 002
status: partially-implemented
version_target: "v0.2.2"
github_issue: 41
created: 2026-03-28
related_adrs: ["ADR-022", "ADR-026"]
related_enhs: ["ENH-001"]
notes: "Snapshot gate items remain; operational sections + zone structure done (v0.5.10.1)"
---

# ENH-002: Session Snapshot on Capture

**Local ID:** ENH-002 | **GitHub Issue:** #41

## Problem Statement

When a capture-worthy moment occurs mid-session (a lesson learned, an architectural decision, a bug worth tracking, or an enhancement identified), the current workflow interrupts implementation flow with a full capture dialog. The user either:

1. Completes the capture immediately — disrupting implementation context
2. Defers the capture — risks losing the "why this mattered" context by wrap-up time

Neither is ideal. The root issue is that context is most valuable at the moment of discovery, but the full capture workflow is too heavy to run mid-task.

Additionally, when captures are deferred to session wrap-up, the session summary is written *after* the fact and must reconstruct context from memory and git history — missing the live conversational thread that explained *why* the capture was triggered.

### The Full Intent: Accumulated Summaries as Institutional Memory

The deeper problem this enhancement addresses is context transfer across Claude sessions. When `/kmgraph:session-summary` is run at context compaction, end of day, or across multiple terminal sessions in the same day, each run should **build on the previous one** — finding the existing summary for the current branch/day, synthesizing new work on top of it, and noting contradictions or reversals. The result is one growing document per branch/day, not N separate files.

The accumulated session summary is the primary mechanism for context transfer. It should contain enough layered institutional knowledge that reading it is sufficient to resume work — eliminating the need to read through chat history or reconstruct decisions from git log.

### Concrete Motivating Example (observed 2026-06-08)

On 2026-06-07, a `/kmgraph:handoff` test run found 14 errors across the codebase: stale path references, count methodology bugs, spec mismatches, broken shell commands, and process violations. These were captured in `GENERATION-NOTES.md` inside the handoff package — an ephemeral artifact not part of the permanent session record.

The next session (2026-06-08) opened cold. Reconstructing the error list required:
1. Searching chat history via context-mode recall
2. Reading multiple session and handoff files
3. Manually compiling and categorizing the 14 findings
4. Updating the handoff package by hand

This consumed a significant portion of the session before a single line of code changed.

**What should have happened:** The 2026-06-07 session summary should have included a **Session Findings** section capturing all 14 errors at session end — permanent, searchable, immediately available. The next session would read one file, not reconstruct from chat history.

This is the canonical failure mode this enhancement addresses: operational discoveries made during a session are lost in chat history instead of being captured in the permanent session record.

This means:

- Each compaction or end-of-day run **appends and synthesizes** into the existing daily file rather than creating a new one
- Contradictions and reversals within a day are explicitly noted (e.g., "Earlier this session X was decided; after investigation Y was chosen instead because Z")
- The handoff command's `continues_from` field points to this accumulated summary — the handoff does not re-compile session history
- `SESSION-COMPILATION.md` in the handoff package becomes a thin **cross-day view** that stitches together existing accumulated summaries, not a re-compilation from scratch

### Root Cause: Compliance Gap in session-summary-agent

A rule already exists in `knowledge/rules.md` under "Session Summary — One File Per Day": all sessions for a day must be consolidated into a single file; if a summary exists for today, append/update it rather than creating a new file.

The session-summary-agent does not reliably follow this rule. In practice it creates new files instead of checking for today's existing summary and appending to it. The snapshot mode (S4) has append logic defined in its spec, but the full-session path (Steps 1–9) does not enforce the same check-and-append behavior. This is the core unimplemented gap.

## Goals

1. **Preserve live context** — capture the "why" at the moment of discovery, not reconstructed at wrap-up
2. **Reduce mid-session overhead** — snapshot is lightweight; full capture happens afterward or at wrap-up
3. **Incremental session record** — session summary becomes a living document updated at each capture trigger and at each compaction, not just a terminal artifact
4. **Accumulation across compactions** — every run of `/kmgraph:session-summary` within a branch/day appends and synthesizes into one file; reading it is sufficient for context transfer without reading chat history
5. **Contradiction tracking** — when a decision or approach changes within a day, the accumulated summary records both the original and the reversal with the reason (e.g., "Earlier X was chosen; after Y was discovered, Z was chosen instead")
6. **Handoff lean-on** — the handoff package's `continues_from` field points at the accumulated summary; `SESSION-COMPILATION.md` becomes a thin cross-day stitching layer, not a re-compilation
7. **Optional git inclusion** — user controls whether git history is included in the snapshot, reducing overhead for quick captures
8. **Covers all capture types** — lessons, ADRs, issues, and enhancements all trigger the same snapshot behavior
9. **Session Findings capture** — errors, spec bugs, and audit results discovered during any command run this session are captured in the summary's "Session Findings" section at wrap-up, not left in ephemeral handoff artifacts or reconstructable only from chat history

## Implementation Status

| Area | Status | Notes |
|---|---|---|
| Snapshot Gate language (capture-lesson, create-adr, start-issue-tracking) | Implemented | Fixed in v0.2.3.2-beta; see ADR-026 |
| lesson-capture-agent Phase 2 pre-fill from today's summary | Implemented | Fixed 2026-04-06 |
| session-summary-agent snapshot mode (S1–S5, append logic) | Spec defined, behavior uncertain | Spec has append logic; real-world compliance unverified |
| session-summary-agent full-session one-file-per-day enforcement | **Implemented (v0.5.10.1)** | Step 1.5 added to full-session path + filename unified to `YYYY-MM-DD-{branch-slug}.md` across snapshot + full modes |
| session-summary Current State section | **Implemented (v0.5.10.1)** | `## Git Context` renamed + expanded with in-progress work, active KG |
| session-summary Open Issues section | **Implemented (v0.5.10.1)** | `## Open Items` renamed + expanded with GitHub issues/PRs, deferred tasks |
| session-summary Session History section | **Implemented (v0.5.10.1)** | New section — thin references to last 3 sessions (no re-compilation) |
| Contradiction tracking in accumulated summary | **Implemented (v0.5.10.1)** | Contradiction/reversal tracking added to narrative append blocks |
| Handoff `continues_from` leaning on accumulated summary | **Implemented (v0.5.10 + v0.5.10.1)** | Auto-detect added in v0.5.10.1 — handoff scans today's sessions dir for branch-slug match |
| SESSION-COMPILATION.md as thin cross-day stitcher | **Removed (v0.5.10.1)** | Removed from handoff package entirely; superseded by Session History references in session summary |
| Session Findings section in session summary | **Implemented (v0.5.10.1)** | Append+dedup within day; captures errors/findings from all session command runs; omitted when empty |

## Proposed Behavior

When any capture command fires mid-session (`/kmgraph:capture-lesson`, `/kmgraph:create-adr`, `/kmgraph:start-issue-tracking`), or when a capture skill/hook triggers:

```
Capture trigger fires
  ↓
"Before we capture — want to snapshot the session first? (yes / skip)"
  ↓ yes
"Include git history? (yes / no — adds ~5 sec if yes)"
  ↓
session-summary runs in append mode
  → records current state, open plan items, what led here
  → includes conversational context around why this capture was triggered
  ↓
Capture proceeds with session summary as context source
  ↓
User continues work
  ↓
Next capture trigger → appends to same session summary
  ↓
Wrap-up: session summary already populated; final run adds closing context only
```

## Requirements

### Functional — Snapshot Gate (Partially Implemented)

- [x] All capture entry points offer a "snapshot first" prompt before proceeding: `capture-lesson`, `create-adr`, `start-issue-tracking`
- [x] `lesson-capture-agent` checks for an existing session summary for today before asking user for context — if found, offers to pre-fill from it: "I found a session summary from today — use it to pre-fill the lesson context? [y] Yes   [n] Ask me instead"
- [ ] Snapshot prompt includes optional git inclusion: "Include git history? (yes / no)"
- [ ] When git is declined, session-summary-agent skips git log calls entirely (conversation + file changes only)
- [ ] The capture that triggered the snapshot can reference the session summary file for its "context" field
- [ ] Hooks (PostToolUse lesson check, Stop hook) also offer snapshot-first behavior before capture prompts
- [ ] Session summary skill (`session-wrap`) is aware of whether a snapshot was taken this session

### Functional — Accumulation Behavior (Implemented v0.5.10.1)

- [x] **One-file-per-day enforcement in full-session path:** Before writing, session-summary-agent checks for an existing summary for today's date on the current branch; if found, appends/synthesizes into it rather than creating a new file. Implemented via Step 1.5 + unified filename `YYYY-MM-DD-{branch-slug}.md` (v0.5.10.1).
- [x] **Contradiction and reversal tracking:** When appending to an existing summary, the agent adds explicit notes about decisions or approaches that changed: "Earlier this session X was decided; after investigation Y was chosen instead because Z." Implemented in narrative append block format (v0.5.10.1).
- [ ] **Accumulated summary as sufficient context for resumption:** The accumulated daily summary should be written such that reading it alone provides enough context to resume work — no need to read chat history or git log.
- [x] **Handoff `continues_from` points at accumulated summary:** The handoff command's `continues_from` field must resolve to the accumulated daily summary for the current branch. Auto-detect implemented in v0.5.10.1 (date+branch-slug glob).
- [x] **SESSION-COMPILATION.md removed from handoff:** SESSION-COMPILATION.md is no longer generated. Session History section in the session summary provides cross-day references. Implemented in v0.5.10.1.
- [x] Session summary runs in append mode when a summary for today already exists (Step 1.5 + `{session_file_mode} = append`; covers both snapshot and full-session modes — v0.5.10.1)

### Functional — Zone Write Rules (Implemented v0.5.10.1)

Per-zone write rules for the zone-structured session summary template:

| Zone | Sections | Rule |
|---|---|---|
| Header | YAML `as_of_commit`, `last_updated`, `title` | Overwrite every run |
| Gate | Start-of-Session Reading (Required) | Overwrite every run; omit if nothing to read |
| Operational | Current State, Open Issues, Session History | Overwrite every run (last-write-wins) |
| Operational | Session Findings | Append+dedup within day; omit from output when empty |
| Narrative | Accumulated Narrative blocks | Append-only, timestamped; never overwritten |

### Functional — Cross-Branch Daily Consolidation

- [ ] **One file per calendar day across all branches:** When multiple branches are worked on the same calendar day (e.g., v0.5.10.4 and v0.5.10.5 both active on 2026-06-12), the session summary consolidation produces ONE file per day, not one per branch per day. The filename is `YYYY-MM-DD-consolidated.md` (or equivalent pattern indicating multi-branch consolidation).
- [ ] **Branch list in consolidated file:** The consolidated file tracks which branches contributed to the day's sessions in the YAML frontmatter or a dedicated branches list section, enabling reconstruction of what work happened on which branch.
- [ ] **Content merge during consolidation:** When consolidating multiple per-branch session summaries from the same day, the consolidated file must merge operational sections (Current State, Open Issues, Session History, Session Findings) by taking the most recent state, not duplicating entries across branches.

### Functional — Temporal State Resolution During Consolidation

- [ ] **Plan → done resolution:** When consolidating multiple session entries for the same day, if an earlier entry says "plan to do X" and a later entry says "X was completed," keep only the "X was completed" state with full context of what was done. Never show both the intent and the outcome for the same item in the final consolidated file.
- [ ] **Final-state document contract:** The consolidated session summary reads as a final-state-of-day document, not as a stream of events. A reader should understand what the state of work is NOW (at end of day), not what the sequence of intentions was.
- [ ] **Contradiction tracking retained:** Reversals and contradictions within a day (e.g., "Earlier X was planned; Y was discovered; X was abandoned in favor of Z") are preserved in the Accumulated Narrative section with timestamps, but the Operational Snapshot sections (Current State, Open Issues) show only the final resolved state.

### Non-Functional

- [ ] Snapshot without git completes in under 10 seconds
- [ ] Snapshot with git completes in under 30 seconds
- [ ] Append mode does not duplicate content already in the session summary
- [ ] Behavior is identical regardless of which capture command triggered it
- [ ] Accumulated summary remains readable as a single coherent document (timestamped update blocks, not raw appended fragments)
- [ ] Cross-branch consolidation completes in under 30 seconds (3–5 branch summaries)

## Affected Components

| Component | Change | Status |
|---|---|---|
| `agents/session-summary-agent.md` | Step 1.5 (one-file-per-day check in full-session path); unified filename `YYYY-MM-DD-{branch-slug}.md`; zone structure (Operational Snapshot + Accumulated Narrative dividers); Start-of-Session Reading gate; Current State (renamed from Git Context + expanded); Open Issues (renamed from Open Items + expanded); Session History (new); Session Findings (new, append+dedup); contradiction tracking in narrative append blocks; YAML `as_of_commit` + `last_updated` | **Implemented (v0.5.10.1)** |
| `knowledge/sessions/session-template.md` | Replace with zone-structured template: Gate → Operational Snapshot → 4 operational sections → Accumulated Narrative | **Implemented (v0.5.10.1)** |
| `commands/session-summary.md` | Document four new operational sections; update Smart Defaults | **Implemented (v0.5.10.1)** |
| `commands/capture-lesson.md` | Add snapshot prompt before capture dialog | Implemented |
| `commands/create-adr.md` | Add snapshot prompt before ADR dialog | Implemented |
| `commands/start-issue-tracking.md` | Add snapshot prompt before Step 1 | Implemented |
| `agents/lesson-capture-agent.md` | Phase 2: check for today's session summary before asking user for context; offer to pre-fill from it | Implemented |
| `skills/session-wrap/SKILL.md` | Track whether snapshot taken this session; adjust Stop hook prompt | Not implemented |
| `skills/lesson-capture/SKILL.md` | Offer snapshot before dispatching to lesson-capture-agent | Not implemented |
| `scripts/post-tool-lesson-check.sh` | Add snapshot offer before lesson capture prompt | Not implemented |
| `scripts/session-end-prompt.sh` | Check if snapshot exists; adjust wrap-up prompt accordingly | Not implemented |
| `commands/handoff.md` | Thin START-HERE.md with auto-detect session summary; SESSION-COMPILATION, OPEN-ISSUES, GENERATION-NOTES removed; stale path fixes; `--skip-sessions` flag removed | **Implemented (v0.5.10.1)** |
| `agents/session-documenter.md` | SESSION-COMPILATION.md generation responsibility removed — confirmed no SESSION-COMPILATION logic present; Session History references in session summary replace it | **Confirmed clean (v0.5.10.1)** |

## Scope

This enhancement now covers two coupled behaviors:

1. **Snapshot gate** — lightweight opt-in capture at mid-session capture moments (originally the only scope)
2. **Accumulation behavior** — session-summary-agent's one-file-per-day enforcement, append/synthesize logic, contradiction tracking, and handoff integration (newly explicit scope)

The second area is the core unimplemented gap. Work on the snapshot gate is blocked on or intertwined with it, since a snapshot that creates new files instead of appending defeats the institutional memory goal.

## Out of Scope

- Automatic (no-prompt) snapshots — always user-confirmed
- Snapshot gate hooks (PostToolUse lesson check, Stop hook, session-end-prompt.sh) — not yet implemented; tracked in Affected Components table
- User-level KG integration (ENH-001 scope)

**Note:** Changing the session summary content schema — including operational sections (Current State, Open Issues, Session History, Session Findings), zone structure (Operational Snapshot divider, Accumulated Narrative divider), and zone write rules — IS in scope for this enhancement and has been implemented in v0.5.10.1.

## Related

- **ENH-001:** User-Level Global Knowledge Graphs (v0.2.2)
- **ADR-022:** Branch creation commands must guard active work context-switch
- **Session:** 2026-03-28 — conversation that identified this pattern
- **ENH-048:** Session-Wrap Status-Alignment Verification (2026-07-17) — same subsystem (session-summary/session-wrap), adjacent but distinct scope: this ENH covers accumulation/append behavior across runs, ENH-048 covers verifying that outstanding-item status characterizations are still accurate before a summary is finalized. Linked, not merged.
- [issue-11](../../issues/issue-11/issue-11-description.md) — cites this ENH as one of only 5 (of ~42) ENH specs carrying a real `github_issue` value at the time of that investigation. Backlinked 2026-08-19.
