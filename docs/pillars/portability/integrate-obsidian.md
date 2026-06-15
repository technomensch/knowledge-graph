---
title: Integrate with Obsidian
category:
  uri: portability
position: 7
slug: pillars-portability-integrate-obsidian
parent:
  uri: pillars-portability-index
---

# Integrate with Obsidian

> "How do I browse my knowledge graph in Obsidian?"

:::note
KMGraph stores all entries as plain markdown. Obsidian reads markdown natively. No conversion, no plugin, and no sync step is needed for read access. This guide covers three levels: instant vault (zero install), improved vault (community plugin), and future primary-store mode (deferred). You need KMGraph initialized with a populated knowledge graph and Obsidian installed.
:::

## Option A — Instant vault (zero install)

Point an Obsidian vault at the KG directory. In Obsidian:

1. **File → Open vault**
2. Select `~/.kmgraph/` (personal KG) or `./knowledge/` (project KG)
3. Open the vault

All lessons, ADRs, patterns, and session summaries are immediately browsable. Obsidian's graph view shows links between entries. Tag filtering works on the YAML frontmatter `tags:` field.

This is read-only in the sense that Obsidian will not corrupt KMGraph structure — you can edit files in Obsidian and they remain valid KMGraph markdown.

:::tip[Wiki links are automatic]
Starting in v0.3.3, `kmgraph init` converts all cross-references to Obsidian `[[wiki link]]` format automatically. `ADR-028`, `ENH-010`, `Lessons_Learned_X`, and GitHub issue references are all converted on first init or upgrade. This means Obsidian's graph view shows real connections between lessons, decisions, and enhancements without any manual linking.
:::

## Option B — Bidirectional sync with an MCP bridge

Community Obsidian MCP servers (e.g., `mcp-obsidian`, `obsidian-mcp`) allow reading and writing Obsidian notes from an AI assistant. With an Obsidian MCP server configured:

```
Use obsidian_get_note to read the lesson at lessons-learned/debugging/my-lesson.md
Use obsidian_create_note to add a new entry to lessons-learned/patterns/
```

This enables the AI assistant to query the KG via Obsidian's API, which supports Dataview queries and Obsidian-specific metadata. Setup varies by MCP server — see the documentation for your chosen server.

## Recommended Obsidian plugins for KMGraph browsing

| Plugin | Benefit |
|---|---|
| **Dataview** | Query lessons by tag, date, category — `TABLE file.name WHERE category = "debugging"` |
| **Templater** | Use KMGraph templates directly inside Obsidian |
| **Graph Analysis** | Visualize connections between lessons, ADRs, and patterns |

## Related

- [Integrate with NotebookLM](./integrate-notebooklm.md) — AI-powered Q&A over the knowledge graph
- [Integrate with Notion](./integrate-notion.md) — team-browsable mirror with database filtering
