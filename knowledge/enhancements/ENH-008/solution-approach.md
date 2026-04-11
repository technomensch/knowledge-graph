---
title: "ENH-008 Solution Approach"
---

# ENH-008 Solution Approach

## Implementation

Create `skills/capture-router/SKILL.md`.

This is a pure Markdown skill — no TypeScript changes, no MCP server
changes. One new file.

### Skill structure

```
skills/capture-router/SKILL.md
```

**Trigger conditions:** Natural language phrases only — "capture that",
"remember that", "save that", "note that", "log that", "keep that",
"don't forget that", "add that to memory".

**Execution logic:**

1. Scan preceding conversation for the referent (what "that" points to)
2. Apply detection logic (type → subtype → location)
3. Summarize the content in one sentence
4. Present confirmation line
5. On confirm: write to destination
6. On correction: re-route, no further questions
7. On ambiguous referent: ask one clarifying question, then route

### Detection priority

Type detection takes precedence over location detection. If type is
Lesson or ADR, location is always project (no location question needed).
Location question only arises for memory types.

### ECC compatibility

Trigger phrases are natural language only — no slash commands, no
Claude Code tool names. MCP tools (`kg_capture`) used for write path
where available. Fully portable across ECC-supported platforms.

## Files

- **Create:** `skills/capture-router/SKILL.md`
- **Update:** `docs/COMMAND-GUIDE.md` — add capture-router to auto-triggered skills table
- **Update:** `docs/CHEAT-SHEET.md` — add capture-router to auto-triggered skills table
