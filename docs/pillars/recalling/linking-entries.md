---
id: linking-entries
title: Linking Entries
sidebar_label: Linking Entries
description: How to connect related KG entries so recall surfaces the right cluster.
---

# Linking Entries

> "How do I connect related entries so they surface together?"

Knowledge graph entries are more useful when connected. A lesson about a bug is more findable if it links to the ADR that caused the design decision behind the bug.

## How to add links

In any KG entry (lesson, ADR, pattern), add a `## Related` section at the bottom:

```markdown
## Related

- [ADR-012: Chose SQLite for local storage](../decisions/adr-012.md) — context for why this constraint exists
- [Lesson: Hook variable regression](../lessons-learned/hook-variable-regression.md) — similar failure mode
```

Use relative paths within the knowledge graph directory so links work across machines.

## What to link

Link entries when:
- A lesson is a downstream consequence of an architectural decision
- Two bugs share a root cause (link both to the meta-issue)
- A pattern came from generalizing a specific lesson

Don't over-link. One or two meaningful connections beats five weak ones.

## Cross-KG references

If you have multiple knowledge graphs (project + personal), cross-KG references use absolute paths or a convention you define in `me.md`. Keep cross-KG links in comments or `## See Also` sections — they won't be clickable across graphs but serve as recall prompts.

## Using links in recall

When you run `/kmgraph:recall`, results include the entry content. If you see a related link, follow it manually — the recall command doesn't traverse links automatically. The value is in knowing the connections exist.

## Related

- [Search the Graph](./search-the-graph.md) — full-text search with FTS5 indexing for active recall
- [Session Memory](./session-memory.md) — how KMGraph automatically surfaces relevant knowledge at session start
