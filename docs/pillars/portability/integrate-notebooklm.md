---
id: integrate-notebooklm
title: Integrate with NotebookLM
sidebar_label: Integrate with NotebookLM
description: Export the knowledge graph into a NotebookLM notebook for AI-powered Q&A over captured lessons
---

# Integrate with NotebookLM

## Goal

Export the local knowledge graph into a NotebookLM notebook so the captured lessons, ADRs, and patterns can be queried with NotebookLM's AI research surface — including cross-document synthesis and audio overview generation.

## Prerequisites

- KMGraph initialized with a populated knowledge graph
- NotebookLM MCP server configured (`mcp__notebooklm__*` tools available)
- Authenticated: run `nlm login` in the terminal if not already authenticated

:::note
This guide covers **exporting** the local KG as sources into NotebookLM. NotebookLM becomes a secondary query interface. KMGraph continues to write to local markdown. A NotebookLM-as-primary-store mode is deferred to a future release.
:::

## Steps

### 1. Create a NotebookLM notebook

```
Use mcp__notebooklm__notebook_create to create a notebook named "KMGraph — [Project Name]".
```

Note the notebook ID.

### 2. Add lessons as sources

For each lesson category you want to query, add the files as text sources:

```
Use mcp__notebooklm__source_add with source_type=file and file_path pointing to
docs/lessons-learned/debugging/my-lesson.md to add it to notebook [ID].
```

For bulk import, ask the AI assistant to iterate:

```
Read all .md files in docs/lessons-learned/ and add each as a source to
NotebookLM notebook [ID] using mcp__notebooklm__source_add with source_type=text.
Use the file content as the text field.
```

### 3. Add ADRs and patterns

```
Read all .md files in docs/decisions/ and add each as a source to notebook [ID].
```

### 4. Query the knowledge graph via NotebookLM

```
Use mcp__notebooklm__notebook_query with notebook_id=[ID] and query=
"What did we learn about Redis connection issues?"
```

NotebookLM synthesizes across all sources and cites the specific lessons it used.

### 5. Generate an audio overview (optional)

```
Use mcp__notebooklm__studio_create with artifact_type=audio and notebook_id=[ID].
```

Then poll for completion:

```
Use mcp__notebooklm__studio_status to check if the audio overview is ready.
```

## Keeping the notebook current

After each capture session, add new lessons to the notebook:

```
Use mcp__notebooklm__source_add to add the new lesson file to notebook [ID].
```

Or periodically refresh the entire notebook by deleting and re-importing (for large graphs).

## Verify

```
Use mcp__notebooklm__notebook_query with query="test" to confirm sources are indexed.
```

The response should cite specific lessons from the knowledge graph.

## Next steps

- [Integrate with Obsidian](/knowledge-graph/pillars/portability/integrate-obsidian) — graph view browsing
- [Integrate with Notion](/knowledge-graph/pillars/portability/integrate-notion) — team database mirror
- [Sanitize before sharing](/knowledge-graph/pillars/organizing/sanitize-before-sharing) — review before uploading to any cloud service
