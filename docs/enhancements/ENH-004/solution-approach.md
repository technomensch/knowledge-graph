---
title: "ENH-004 Solution Approach"
---

# ENH-004 Solution Approach

## Detection

At the start of `session-summary-agent`, check for context-mode's event DB:

```bash
# Context-mode stores its SQLite DB at a known path
CTXMODE_DB="$HOME/.claude/context-mode/events.db"  # verify actual path
if [ -f "$CTXMODE_DB" ]; then
  CTXMODE_AVAILABLE=true
fi
```

This check should be isolated in a single block so it's easy to update if the DB path changes.

## Enrichment Path (context-mode present)

Query the event DB for tool-level events from the current session:
- Files edited (Write/Edit tool calls)
- Git operations (commits, branch switches)
- Agents spawned
- Session start/end timestamps

Use these to supplement the git log — particularly for sessions with few commits but significant activity (planning, investigation, Q&A).

## Fallback Path (context-mode absent)

Existing behavior: read recent git commits, check open plan items, check for draft ADRs, look for lesson-worthy commit messages. No change.

## Implementation Location

Changes confined to `agents/session-summary-agent.md`:
- Add Step 0b: context-mode detection
- Modify Step 1 (session scope): if context-mode available, merge event data with git log
- All other steps unchanged
