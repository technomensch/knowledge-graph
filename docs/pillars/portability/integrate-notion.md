---
id: integrate-notion
title: Integrate with Notion
sidebar_label: Integrate with Notion
description: Mirror the local knowledge graph into a Notion database for team browsing
---

# Integrate with Notion

## Goal

Mirror captured lessons and ADRs into a Notion database so the knowledge graph is browsable by teammates who use Notion, without requiring them to install KMGraph.

## Prerequisites

- KMGraph initialized with a populated knowledge graph
- Notion MCP server configured in Claude Code (`mcp__claude_ai_Notion__*` tools available)
- A Notion workspace with permission to create databases

:::note
This guide covers **mirroring** local KG entries into Notion as a read-friendly browsing surface. It does not make Notion the primary store — KMGraph still writes to local markdown files. A pluggable Notion backend is deferred to a future release.
:::

## Steps

### 1. Create a Notion database for lessons

In Claude Code with Notion MCP available:

```
Use notion-create-database to create a "KMGraph Lessons" database with these properties:
- Title (title)
- Category (select: architecture, process, patterns, debugging)
- Tags (multi_select)
- Date (date)
- Git Branch (rich_text)
- Summary (rich_text)
```

Note the database ID from the response.

### 2. Mirror lessons to Notion

For each lesson file in `docs/lessons-learned/`, create a Notion page:

```
Use notion-create-pages to add a page to database [ID] with:
- Title: [lesson title from frontmatter]
- Category: [category from frontmatter]
- Tags: [tags from frontmatter]
- Summary: [first paragraph of the lesson body]
```

For bulk mirroring, ask the AI assistant to iterate over all lessons in a category:

```
Read all .md files in docs/lessons-learned/debugging/ and create a Notion page
for each one in database [ID].
```

### 3. Mirror ADRs to Notion

Create a separate "KMGraph ADRs" database with properties: Title, Status, Decision, Date. Mirror `docs/decisions/*.md` the same way.

### 4. Search the Notion mirror

```
Use notion-search to find "Redis timeout" across the KMGraph Lessons database.
```

## Keeping the mirror current

After each `/kmgraph:capture-lesson`, run the mirror step for the new file. Or add a `PostToolUse` hook that auto-mirrors captures to Notion (see [Customize hooks](../tailoring/customize-hooks.md)).

## Verify

Open the Notion database in a browser. Each lesson should appear as a page with the correct properties populated.

## Next steps

- [Integrate with Obsidian](./integrate-obsidian.md) — browse the KG in Obsidian vault view
- [Sanitize before sharing](../organizing/sanitize-before-sharing.md) — ensure no sensitive data is mirrored
