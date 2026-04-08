---
id: migrate-claude-gemini
title: Migrate Between Claude and Gemini
sidebar_label: Migrate Claude ↔ Gemini
description: How to carry knowledge graph context when switching between Claude Code and Gemini CLI
---

# Migrate Between Claude and Gemini

## Goal

Continue working with the same knowledge graph after switching from Claude Code to Gemini CLI (or vice versa), without losing captured lessons, ADRs, or MEMORY.md context.

## Prerequisites

- A knowledge graph already populated on the source platform
- KMGraph installed on the target platform (see [Installation](/INSTALL))

## Steps

### 1. Sync MEMORY.md on the source platform

Before switching, update the MEMORY.md with the latest session context:

```bash
/kmgraph:session-summary
```

This writes a summary to `docs/sessions/` and updates MEMORY.md pointers. Commit and push.

### 2. Export chat history (optional but recommended)

```bash
/kmgraph:extract-chat
```

Extracts any lessons from the departing session that haven't been formally captured yet.

### 3. On the target platform, point to the same knowledge graph

The knowledge graph is platform-agnostic markdown. If it is in the project directory, `git pull` is all that is needed. If it is a personal KG at `~/.claude/knowledge-graph/`, pull that repo too.

### 4. Register the KG on the target platform

**For Claude Code (target):**
```bash
/kmgraph:init
# Select "Use existing KG"
```

**For Gemini CLI (target):**

Copy the contents of `core/templates/AGENTS-template.md` into your project's `AGENTS.md` or `GEMINI.md`. The template loads the KMGraph workflow instructions for non-Claude-Code platforms.

### 5. Verify recall works

```bash
/kmgraph:recall "a lesson from the previous platform"
# On Gemini: paste the kg_search tool call format from AGENTS.md
```

## Notes

- The knowledge graph files are identical across platforms — no conversion needed
- MCP tools (`kg_*`) work the same on any MCP-enabled IDE
- MEMORY.md is human-readable markdown — the target platform can load it directly
- Full automation (slash commands, hooks) is Claude Code-exclusive; other platforms use the MCP tools or manual workflow

## Next steps

- [Use in Cursor/Windsurf/VS Code](/guides/use-in-cursor) — IDE-specific setup
- [Platform Adaptation reference](/reference/PLATFORM-ADAPTATION) — full compatibility matrix
