---
title: "ENH-004 Solution Approach"
---

# ENH-004 Solution Approach

## Context-mode DB Architecture (verified 2026-03-29)

Context-mode stores events in per-project SQLite databases at:
```
~/.claude/context-mode/sessions/{hex-hash}.db
```

Each DB file can contain multiple sessions. Schema:

```sql
session_meta (session_id TEXT, project_dir TEXT, started_at TEXT,
              last_event_at TEXT, event_count INTEGER, compact_count INTEGER)

session_events (id INTEGER, session_id TEXT, type TEXT, category TEXT,
                priority INTEGER, data TEXT, source_hook TEXT,
                created_at TEXT, data_hash TEXT)
```

**Key finding:** `session_id` values are standard UUIDs — the same UUID format Claude Code uses for session identifiers. The session `f636bb2e-42dd-4efa-923c-1ee60385f47f` visible in both the Claude Code session history and context-mode's `session_meta` table confirms this is the same identity.

## Detection

At the start of `session-summary-agent`, scan for context-mode session DBs for the current project:

```python
import sqlite3, os, glob

cwd = os.getcwd()
db_files = glob.glob(os.path.expanduser('~/.claude/context-mode/sessions/*.db'))

current_session_id = None
current_db = None

for db_path in db_files:
    conn = sqlite3.connect(db_path)
    row = conn.execute(
        "SELECT session_id FROM session_meta WHERE project_dir = ? ORDER BY last_event_at DESC LIMIT 1",
        (cwd,)
    ).fetchone()
    if row:
        current_session_id = row[0]
        current_db = db_path
        conn.close()
        break
    conn.close()

ctxmode_available = current_session_id is not None
```

**Open design question:** Whether `$CLAUDE_SESSION_ID` is an available environment variable inside an agent. If it is, it provides a cleaner lookup than `project_dir + last_event_at`. Verify before implementation.

## Enrichment Path (context-mode present)

Query `session_events` for the current session:

```python
conn = sqlite3.connect(current_db)
events = conn.execute(
    "SELECT type, category, data, created_at FROM session_events WHERE session_id = ? ORDER BY created_at",
    (current_session_id,)
).fetchall()
```

Use events to supplement git log — particularly valuable for:
- Sessions with few commits but significant activity (planning, investigation, Q&A)
- Identifying files edited that weren't committed
- Capturing agent invocations and their outcomes

## Fallback Path (context-mode absent)

Existing behavior unchanged: read recent git commits, check open plan items, check for draft ADRs, look for lesson-worthy commit messages.

## Implementation Location

Changes confined to `agents/session-summary-agent.md`:
- Add Step 0b: context-mode detection (isolated block for easy updates)
- Modify Step 1 (session scope): if context-mode available, merge event data with git log
- All other steps unchanged
