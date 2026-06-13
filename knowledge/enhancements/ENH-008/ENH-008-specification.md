---
title: "ENH-008: capture-router — Context-Aware Capture with Single Confirmation"
number: 008
status: proposed
version_target: "v0.2.3"
github_issue: null
created: 2026-03-30
related_adrs: []
related_enhs: []
---

# ENH-008: capture-router Skill

## Problem

"Capture that" / "remember that" have no defined routing. The model infers
type and location from context with no consistency guarantee and no user
visibility into where content lands. Users have no way to correct a wrong
inference before it's written.

Three capture destinations exist (memory, lesson, ADR), two locations
(user-level, project-level), and three memory subtypes (feedback, project,
reference) — but no skill surfaces this decision or confirms it.

## Solution

A `capture-router` skill that:

1. Auto-detects type, subtype, and location from content signals
2. Presents a single confirmation line showing the inference
3. Asks "Does that sound right, or should this go somewhere else?"
4. Routes on confirm; re-routes on correction; asks a clarifying question
   only when genuinely ambiguous

## Detection Logic

### Type signals

| Signal | → Type |
|---|---|
| Correction, preference, "don't do X", "always/never" | Feedback (memory) |
| Ongoing work, deadline, stakeholder, in-progress state | Project (memory) |
| External system pointer, URL, tool name + location | Reference (memory) |
| Bug solved, pattern learned, "next time", "I learned" | Lesson |
| Trade-off, "we decided", "because of", architecture choice | ADR |

### Location signals (memory type only)

| Signal | → Location |
|---|---|
| References this repo, specific files, KMGraph behavior | Project-level |
| General Claude behavior, applies to any project | User-level |

### Ambiguity handling

If content has no clear type signal: surface what the model *thinks* it
refers to and ask for confirmation before routing:

```
I think you mean [inferred referent] — capture that as [type]? Or did
you mean something else from this conversation?
```

## Confirmation Format

```
Capturing as: [Type] ([subtype if memory], [location if memory])
"[One-sentence summary of what's being captured]"

Does that sound right, or should this go somewhere else?
```

**Happy path:** User says yes/confirm → write immediately, one round trip.

**Override path:** User says "no, make it a lesson" / "user-level" / "ADR"
→ re-route and write with no further questions.

## Trigger Phrases

- "capture that"
- "remember that"
- "save that"
- "note that"
- "log that"
- "keep that"
- "don't forget that"
- "add that to memory"

## Non-Triggers

- "capture a lesson" → already routed by lesson-capture skill
- "create an ADR" → already routed by adr-guide skill
- "update the doc" → already routed by doc-update-router skill

## Routing Destinations

| Type | Destination |
|---|---|
| Feedback (project) | `~/.claude/projects/{project}/memory/` via Write |
| Feedback (user) | `~/.claude/memory/` via Write |
| Project memory | `~/.claude/projects/{project}/memory/` via Write |
| Reference memory | `~/.claude/projects/{project}/memory/` via Write |
| Lesson | Dispatch to `/kmgraph:capture-lesson` |
| ADR | Dispatch to `/kmgraph:create-adr` |

## Acceptance Criteria

- [ ] "capture that" triggers capture-router, not silence
- [ ] Model presents inference + one-sentence summary before writing
- [ ] User can correct with natural language ("no, user-level", "make it a lesson")
- [ ] Happy path is one round trip (confirm → write)
- [ ] Ambiguous referent asks clarifying question before routing
- [ ] Does not conflict with lesson-capture or adr-guide trigger vocabularies
