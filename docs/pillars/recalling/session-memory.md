---
id: session-memory
title: Session Memory
sidebar_label: Session Memory
description: How KMGraph automatically surfaces relevant knowledge at the start of each session.
---

# Session Memory

> "How does KMGraph know what to surface?"

KMGraph doesn't wait for you to search. At the start of every Claude session, it injects the context most likely to be relevant — automatically.

## How it works

Four sources inject at session start (via the SessionStart hook):

1. **MEMORY.md** — a lightweight index of pointers to your KG entries. Claude Code reads this at the start of every session. The full entries stay in your knowledge graph; MEMORY.md is the scannable table of contents the AI reads first.

2. **me.md** — your AI profile. Describes your role, working style, expertise, and preferences so the AI calibrates its responses without you re-explaining every session. See [Your AI Profile](../portability/your-ai-profile.mdx) for setup and full details.

3. **rules.md** — behavioral instructions for the AI. "Always run tests before pushing." "Never auto-merge." Rules are loaded via the platform shim (CLAUDE.md, .cursorrules) so every tool on the project reads the same rules.

4. **triggers.md** — declares *when* specific rules apply. Example: "Before pushing, always run X." The trigger fires the rule at the right moment rather than loading every rule into every message.

## What MEMORY.md contains

MEMORY.md is a **lightweight index** — it holds one-line pointers to your KG entries, not the entries themselves. This keeps it under the token budget. The full content lives in your knowledge graph files; MEMORY.md is what the AI skims at session start to know what knowledge is available.

## What gets injected

At session start, the SessionStart hook reads `MEMORY.md` and loads it into context. The AI sees your recent lessons, decisions, and rules as background context before you type a single message.

## How to keep it fresh

Run `/kmgraph:update-graph` after capturing new lessons. This extracts entries from your session notes and updates the MEMORY.md index so future sessions benefit.

## Related

- [Search the Graph](./search-the-graph.md) — active search when passive injection misses something
- [Linking Entries](./linking-entries.md) — connecting related entries so recall pulls the right cluster

---

## Reference

### Archiving and restoring

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
