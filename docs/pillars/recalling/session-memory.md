---
id: session-memory
title: Session Memory
sidebar_label: Session Memory
description: How KMGraph automatically surfaces relevant knowledge at the start of each session.
---

# Session Memory

KMGraph doesn't wait for you to search. At the start of every Claude session, it injects the context most likely to be relevant — automatically.

## How it works

Three sources inject at session start (via the SessionStart hook):

1. **MEMORY.md** — your auto-memory index. Claude Code reads this file at the start of every session. KMGraph writes a pointer to each KG entry here so they're surfaced passively.

2. **me.md** — your identity file. Describes your working style, expertise, and preferences so the AI calibrates its responses without you explaining it each session.

3. **triggers.md** — declares when specific rules apply. Example: "Before pushing, always run X." The trigger fires the rule at the right moment.

## What MEMORY.md contains

MEMORY.md is an index — it holds one-line pointers to KG entries, not the entries themselves. This keeps it scannable. The full entry is in your knowledge graph; MEMORY.md is the table of contents the AI reads first.

## What gets injected

At session start, the SessionStart hook reads `MEMORY.md` and loads it into context. The AI sees your recent lessons, decisions, and rules as background context before you type a single message.

## How to keep it fresh

Run `/kmgraph:update-graph` after capturing new lessons. This extracts entries from your session notes and updates the MEMORY.md index so future sessions benefit.

## Archiving and restoring session memory

**When:** MEMORY.md is approaching the token budget limit (~1,500 tokens / ~200 lines) or archived knowledge needs to be retrieved.

**Claude Code equivalent:** `/kmgraph:archive-memory` and `/kmgraph:restore-memory`

### Part A: Archive Stale Entries

**1. Check current size:**

```bash
MEMORY_PATH="$HOME/.claude/projects/$(basename $(pwd))/memory/MEMORY.md"
words=$(wc -w < "$MEMORY_PATH")
echo "Current size: ~$((words * 13 / 10)) tokens (target: <1,500)"
```

**2. Identify entries to archive** — look for:
- Entries last referenced more than 90 days ago
- Historical context no longer relevant to active work

**3. Move stale entries:**
- Copy the full section (heading + content) from MEMORY.md to `MEMORY-archive.md`
- Remove the section from MEMORY.md
- Add an archive log entry noting what was archived and when

**4. Commit both files:**

```bash
git add memory/MEMORY*.md
git commit -m "docs(memory): archive stale entries (~X tokens freed)"
```

### Part B: Restore Archived Entries

**1. View archived entries:**

```bash
grep "^### " memory/MEMORY-archive.md
```

**2. Copy the needed entry** back to the appropriate section of MEMORY.md.

**3. Mark the restoration** in the archive log and commit both files.

### Decision Guide

| Situation | Action |
|---|---|
| MEMORY.md > 1,500 tokens | Archive oldest entries |
| Working on a related problem | Restore relevant archived entry |
| Entry > 90 days old, not needed | Leave archived |

## Related

- [Search the Graph](./search-the-graph.md) — active search when passive injection misses something
- [Linking Entries](./linking-entries.md) — connecting related entries so recall pulls the right cluster
