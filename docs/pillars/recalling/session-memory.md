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
