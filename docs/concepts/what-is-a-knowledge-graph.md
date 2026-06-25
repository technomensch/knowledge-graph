---
title: What Is a Knowledge Graph
---

# What Is a Knowledge Graph

A knowledge graph is a structured collection of interconnected facts — entities and the relationships between them. In KMGraph, the "entities" are your lessons, decisions, and patterns; the "relationships" are the links between them.

## Why graph, not document?

A flat document (like a wiki page) captures information but doesn't capture connections. A knowledge graph captures both. When you link an ADR to the lesson that motivated it, the graph knows that context — and so does your AI.

## How KMGraph implements it

KMGraph's knowledge graph is a directory of Markdown files with structured frontmatter. Each file is a node. Links between files are edges. The FTS5 search index and MEMORY.md index make the graph traversable without a graph database.

This means:
- Entries are plain text — readable without KMGraph
- The graph lives in git — versionable, portable, team-shareable
- No server or database required

## Related

- [Four Content Types](./four-content-types.md) — the four node types: lessons, decisions, patterns, meta-issues
- [How KMGraph Is Organized](./how-kmgraph-is-organized.md) — the layered architecture around the graph
