---
name: kmg-capture-router
description: Route capture-that / remember-that requests to the correct destination via auto-detection
---

# Skill: kmg-capture-router

**Purpose:** Route "capture that" / "remember that" requests to the correct destination (memory, lesson, or ADR) via auto-detection and single confirmation prompt. Provides visibility into where content lands and allows user correction before write.

## Trigger Patterns (match any)

- "capture that"
- "remember that"
- "save that"
- "note that"
- "log that"
- "keep that"
- "don't forget that"
- "add that to memory"

## Do NOT trigger on

- "capture a lesson" → handled by `kmg-lesson-capture` skill
- "create an ADR" → handled by `kmg-adr-guide` skill
- "update the doc" / "update [filename]" → handled by `kmg-doc-update-router` skill
- Implicit behavioral corrections without "capture that" vocabulary ("always X", "never X", "from now on X", "don't do X" as a standing rule) → handled by `kmg-rules-capture` skill

## Execution Flow

### 1. Identify the Referent

Scan the preceding conversation to determine what "that" refers to. The referent is typically:
- The most recent statement or decision
- The most recent problem/solution pair
- The most recent discovery or bug fix
- A specific behavior, preference, or process failure named in the last few messages

**If referent is ambiguous:** Ask one clarifying question:
```
What do you mean by "that"? Did you mean:
- [recent statement A]
- [recent statement B]
- Something else?
```

### 2. Detect Type + Subtype + Location

Apply detection logic in this order:

| Signal | → Type | Subtype | Location Signal |
|---|---|---|---|
| Correction, preference, "don't do X", "always/never", behavior rule | **Rule/Me** | Route to `rules-capture-agent` with `source_quote` and `session_context`; do not write FEEDBACK file |
| Ongoing work, deadline, stakeholder, in-progress state, task | **Project (memory)** | Project | Always project-level |
| External system pointer, URL, tool name + location, reference | **Reference (memory)** | Reference | Always project-level |
| Bug solved, pattern learned, "next time", "I learned", insight | **Lesson** | N/A | Dispatch to `/kmgraph:kmg-capture-lesson` |
| Trade-off, "we decided", "because of", architecture choice, rationale | **ADR** | N/A | Dispatch to `/kmgraph:kmg-create-adr` |

**Location detection (memory types only):**
- If content references this repo, specific files, KMGraph behavior → **project-level** (~/.claude/projects/{project}/memory/)
- If content is general Claude behavior or preference, applies to any project → **user-level** (~/.claude/memory/)

### 3. Present Confirmation

Display the inference with one-sentence summary:

```
Capturing as: [Type] ([subtype], [location])
"[One-sentence summary of what's being captured]"

Does that sound right, or should this go somewhere else?
```

Examples:
```
Capturing as: Feedback (project-level)
"Don't commit environment-specific config files to this repo."

Does that sound right, or should this go somewhere else?
```

```
Capturing as: Lesson
"Always invalidate cache on write in multi-state systems."

Does that sound right, or should this go somewhere else?
```

### 4. Handle Response

**Happy path — User confirms (yes / correct / sounds good / etc.):**
- Write to detected destination immediately
- No further questions
- Confirm write: "Saved to [memory type]."

**Override path — User corrects with natural language (no further questions required):**
- Examples:
  - "no, make it user-level"
  - "that's an ADR, not feedback"
  - "make it a lesson instead"
  - "user-level, not project"
- Re-route and write immediately with corrected type/location
- Confirm: "Got it — saving as [corrected type/location]."

**Ambiguous referent — Ask one clarifying question only:**
- If user's response to clarifying question is unambiguous: proceed to confirmation
- If still ambiguous after clarification: ask "What type should I capture this as?" and route on answer

## Routing Destinations

| Type | Destination | Action |
|---|---|---|
| Feedback (project) | `~/.claude/projects/{project}/memory/` | Write `FEEDBACK-project-{id}.md` or append to feedback file |
| Feedback (user) | `~/.claude/memory/` | Write `FEEDBACK-{id}.md` or append to feedback file |
| Project (project) | `~/.claude/projects/{project}/memory/` | Write `PROJECT-{id}.md` or append to project memory file |
| Reference (project) | `~/.claude/projects/{project}/memory/` | Write `REFERENCE-{id}.md` or append to reference file |
| Lesson | Dispatch to `/kmgraph:kmg-capture-lesson` | Command handles full capture workflow |
| ADR | Dispatch to `/kmgraph:kmg-create-adr` | Command handles full ADR workflow |

## User-Facing Language

- **Address the user directly** — never expose internal routing mechanics or agent names unprompted
- **Ask permission, don't assert** — "Capturing as: [type] — does that sound right?" not "I will capture as [type]"
- **One confirmation prompt per flow** — happy path is one round trip
- **On write confirmation:** "Saved to [type/location]." — simple, clear
- **On override:** "Got it — saving as [type/location]." — acknowledge correction without defensiveness
- **On correction dispatch:** After re-route decision, proceed to write with no further questions

## Conflict Avoidance

This skill does NOT conflict with:
- `lesson-capture` — fires on solved bugs/patterns; capture-router fires on explicit "capture that"
- `adr-guide` — fires on decision context; capture-router fires on "capture that"
- `doc-update-router` — fires on "update docs"; capture-router fires on "capture/remember/save that"

Each has distinct trigger vocabulary. If user says "capture that lesson" → capture-router fires, detects it's a lesson, dispatches to `/kmgraph:kmg-capture-lesson`.

## Natural Language & ECC Compatibility

- **No Claude Code tool name dependencies** in trigger detection — triggers are natural language only
- Trigger phrases work in any conversational context
- Detection logic is heuristic and based on content signals, not command availability
- This skill is ECC-compatible: natural language triggers, no slash command dependencies
