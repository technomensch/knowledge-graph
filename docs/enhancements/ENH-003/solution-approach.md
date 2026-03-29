---
title: "ENH-003 Solution Approach"
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

```
if "session summary" in intent:
  → /kmgraph:session-summary

elif filename resolved:
  → /kmgraph:update-doc --user-facing {resolved_path}

elif "changelog" in intent:
  → /kmgraph:update-doc --user-facing CHANGELOG.md

else:
  → ask: "Which doc would you like to update?"
     then → /kmgraph:update-doc --user-facing
```

## Extensibility

The routing table is a simple if/elif chain in the skill. Adding a new route = adding one condition. No structural changes, no new skills, no new issues.
