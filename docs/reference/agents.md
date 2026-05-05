---
id: agents
title: Agents Catalog
sidebar_label: Agents
description: Every subagent in KMGraph — what it does, when it runs, and how to invoke it
---

# Agents Catalog

Agents are heavy-lift task handlers that run in isolation from the main conversation. Complex or resource-intensive work — parsing large files, searching the knowledge graph, assembling session summaries — happens in a separate context so it does not crowd out working memory. Skills and commands trigger agents automatically when the work warrants it; direct invocation is rarely needed.

## Agent Reference

| Agent | What it does | Invocation |
|---|---|---|
| **lesson-capture-agent** | Real-time lesson capture from active sessions | Auto-triggered by `lesson-capture` skill |
| **session-summary-agent** | Session summaries with open plans and ADRs tracked | Auto-triggered by `session-wrap` skill or `/kmgraph:session-summary` |
| **recall-agent** | Natural-language search across the knowledge graph | Auto-triggered by `kg-recall` skill or `/kmgraph:recall` |
| **rules-capture-agent** | Dedup check against target file, draft new rule in house style (Always/Never + Why/Source), approve/edit/discard loop, write to one of 4 targets, MEMORY.md pointer stub | Auto-triggered by `rules-capture` skill (implicit corrections) and `capture-router` skill (explicit behavioral corrections) |
| **knowledge-extractor** | Large-file parsing for KG extraction (approval-gated writes) | `--delegate knowledge-extractor` flag or auto for large operations |
| **create-adr-agent** | Runs the interactive ADR wizard, collects decision fields, and automatically captures the implementation commit and subject line | Auto-triggered by `/kmgraph:create-adr` |
| **knowledge-reviewer** | Quality review for lessons and ADRs before saving | Auto-triggered on capture in review mode |
| **session-documenter** | Git archaeology for complex multi-branch sessions (approval-gated commits/pushes) | `--delegate session-documenter` flag |
| **platform-sync-agent** | Cross-platform config file management | Triggered when platform config files change |
| **mcp-setup-agent** | IDE detection and MCP server registration | `/kmgraph:setup-platform` |

## Approval-Gated Agents

The following agents never write files or push commits without user approval:

- **knowledge-extractor** — Read-only parsing. Presents extracted content for review before writing to the knowledge graph.
- **session-documenter** — Assembles session summaries. Never auto-commits or auto-pushes.

## Invoking Agents Explicitly

Most agents are invoked automatically. To delegate a heavy operation explicitly:

```bash
/kmgraph:update-graph --delegate knowledge-extractor
/kmgraph:session-summary --delegate session-documenter
/kmgraph:extract-chat --delegate knowledge-extractor
```

## Related

- [Skills Catalog](skills) — Auto-triggered context providers that invoke agents
- [Command Guide](/knowledge-graph/reference/command-guide) — Full command reference
- [Concepts — How KMGraph Is Organized](/knowledge-graph/concepts/how-kmgraph-is-organized) — How agents fit the architecture
