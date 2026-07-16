---
title: Integrate with Notion
---

# Integrate with Notion

> "How do I share my knowledge graph with teammates who use Notion?"

Mirror captured lessons and ADRs into a Notion database so teammates can browse the knowledge graph without installing KMGraph. You need KMGraph initialized with a populated knowledge graph, the Notion MCP server configured, and a Notion workspace with permission to create databases.

> 📘 **Note**
>
> This guide covers **mirroring** local KG entries into Notion as a read-friendly browsing surface. It does not make Notion the primary store — KMGraph still writes to local markdown files. A pluggable Notion backend is deferred to a future release.

## Create a lessons database

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

## Mirror lessons

For each lesson file in `knowledge/lessons-learned/`, create a Notion page:

```
Use notion-create-pages to add a page to database [ID] with:
- Title: [lesson title from frontmatter]
- Category: [category from frontmatter]
- Tags: [tags from frontmatter]
- Summary: [first paragraph of the lesson body]
```

For bulk mirroring, ask the AI assistant to iterate over all lessons in a category:

```
Read all .md files in knowledge/lessons-learned/debugging/ and create a Notion page
for each one in database [ID].
```

Confirm by opening the Notion database in a browser — each lesson should appear as a page with properties populated.

## Mirror ADRs

Create a separate "KMGraph ADRs" database with properties: Title, Status, Decision, Date. Mirror `knowledge/decisions/*.md` the same way.

## Search the mirror

```
Use notion-search to find "Redis timeout" across the KMGraph Lessons database.
```

## Keeping the mirror current

After each `/kmgraph:kmg-capture-lesson`, run the mirror step for the new file. Or add a `PostToolUse` hook that auto-mirrors captures to Notion (see [Customize hooks](../tailoring/customize-hooks.md)).

## Related

- [Integrate with Obsidian](./integrate-obsidian.md) — browse the KG in Obsidian vault view
- [Sanitize before sharing](../organizing/sanitize-before-sharing.md) — ensure no sensitive data is mirrored
