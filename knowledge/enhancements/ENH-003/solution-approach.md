---
title: ENH-003 Solution Approach
---

# ENH-003 Solution Approach

## Approach

Create `skills/doc-update-router/SKILL.md` as a thin routing skill. Pattern-match on user intent, resolve the target doc if mentioned, and dispatch to the correct command.

## Skill Structure

```
skills/
  doc-update-router/
    SKILL.md    ← trigger patterns + routing table + dispatch logic
```

No agent needed — this is a thin dispatcher, not heavy-lift work.

## Trigger Patterns

Match on:
- "update [filename or doc name]" — resolve file, route to update-doc
- "update this doc" / "update the doc" — use most recently referenced doc
- "update today's session summary" / "update the session summary" / "update the current session" — route to session-summary
- "update the changelog" — route to update-doc with CHANGELOG.md

Do NOT match on:
- "update the code" / "update the tests" — not doc updates
- "let's update" with no doc reference — too ambiguous

## Routing Logic

Precedence order matters — check in this exact sequence:

```
if "session summary" in intent:        ← FIRST: named commands take priority
  → /kmgraph:session-summary

elif "changelog" in intent:            ← SECOND: named docs before generic filename resolution
  → /kmgraph:update-doc --user-facing CHANGELOG.md

elif "adr" in intent:                  ← SECOND (cont): named doc types
  → /kmgraph:create-adr

elif filename resolved from intent:    ← THIRD: generic filename resolution
  → /kmgraph:update-doc --user-facing {resolved_path}

else:                                  ← LAST: fallback disambiguation
  → ask: "Which doc would you like to update?"
     then → /kmgraph:update-doc --user-facing
```

**Rationale for precedence:** Named commands and doc types are more specific than filename resolution. "Update the changelog" should never fall through to filename resolution even if `CHANGELOG.md` happens to exist nearby.

## Conflict with session-wrap

`doc-update-router` and `session-wrap` do **not** conflict — they serve different triggers:

| Skill | Fires on |
|---|---|
| `doc-update-router` | Explicit user request: "update the session summary" |
| `session-wrap` | End-of-session signals: "stop", "I'm done", context limit approaching |

If both could theoretically fire (e.g., "update the session summary and stop"), `doc-update-router` takes precedence since it was the explicit intent. `session-wrap` adds the end-of-session wrap-up on top.

## Extensibility

The routing table is a simple if/elif chain in the skill. Adding a new route = adding one condition. No structural changes, no new skills, no new issues.
