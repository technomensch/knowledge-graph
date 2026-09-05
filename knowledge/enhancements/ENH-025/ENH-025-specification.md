---
title: "ENH-025: Cross-Platform Knowledge Extractor (Backfill from Chat History)"
number: 025
status: implemented
version_target: null
github_issue: null
created: 2026-06-12
related_adrs: []
related_enhs: ["ENH-024"]
---

# ENH-025: Cross-Platform Knowledge Extractor (Backfill from Chat History)

## Problem

`knowledge-extractor` (defined in `agents/knowledge-extractor.md`) is a Claude Code subagent — it can only be spawned via Claude Code's `Agent` tool. Other platforms (Codex, Gemini) cannot invoke it.

When a user installs KMGraph on a new repo in Codex and wants to backfill the knowledge graph from existing chat history (e.g., output of `/kmgraph:extract-chat`), the only available write path is `kg_capture` — which requires pre-extracted, structured content. There is no tool to read raw chat history files and extract lesson candidates on those platforms.

**Observed instance (2026-06-12):** Fresh Codex install, chat history in `knowledge/chat-history/`. Backfill attempted via init flow. Codex reported: "I don't have a standalone knowledge-extractor tool in this session."

## Root Cause

The extraction logic lives entirely inside a Claude Code agent definition. No equivalent MCP tool exists. Platforms without subagent spawning from `.md` definitions cannot reach the extractor.

## Proposed Fix

Two non-mutually-exclusive options:

### Option A: MCP Tool — `kg_extract`

Add a new MCP tool to `mcp-server/` that:
1. Accepts a list of file paths or a directory (e.g., `knowledge/chat-history/`)
2. Reads and parses the files server-side
3. Returns structured lesson candidates (category, title, problem, solution, source ref)
4. Does NOT write — returns candidates for user review
5. Paired with `kg_capture` for the approval-gated write step

Callable from any platform that has the MCP server connected.

### Option B: Platform Skill — `codex-backfill`

Add a Codex-compatible skill/command (`commands/backfill.md` or a Codex-specific variant) that:
1. Instructs the model to read chat history files directly (using Codex file read tools)
2. Provides structured extraction prompts inline (no subagent needed)
3. Uses `kg_capture` for each approved entry

Lighter-weight than Option A but model-dependent (quality varies by platform).

## Recommended Approach

**Option A** — exposes extraction as a proper MCP primitive, platform-agnostic, consistent quality. Option B is a viable interim workaround if MCP implementation is deferred.

## Scope (Option A)

- `mcp-server/src/` — add `kg_extract` tool implementation
- `mcp-server/src/index.ts` — register new tool
- `agents/knowledge-extractor.md` — note MCP equivalent for cross-platform use
- `commands/init.md` — update backfill section to reference `kg_extract` when subagent unavailable
- Docs: add `kg_extract` to MCP tool reference

## Out of Scope

- Modifying extraction quality heuristics (separate concern)
- Auto-approval of extracted items (approval gate remains mandatory)

## Open Questions

1. Should `kg_extract` stream candidates one at a time or batch-return all at end?
2. Should it support date-range filtering to limit which chat history files are parsed?
3. Does Option B (inline skill) need to ship alongside Option A, or is Option A sufficient?

## Update (2026-09-04) — coordinated with ENH-035

Found via an open-ticket overlap check while finalizing [ENH-034](../ENH-034/ENH-034-specification.md)/[ENH-035](../ENH-035/ENH-035-specification.md) (`kmg-update-graph` removal + new consolidated `kmg-backfill` command). This ENH's `kg_extract` design is adopted as ENH-035's answer to its own cross-platform-parity question — implement together, not as two separate passes on the same files.

**Scope update:** `kg_extract` should read `knowledge/lessons-learned/` and `knowledge/decisions/` in addition to chat-history, matching `kmg-backfill`'s broadened 3-source scope (ENH-035 absorbed `kmg-update-graph`'s job of indexing already-existing lessons/decisions into KG entries). Step-2 "Reads and parses the files server-side" and step-3 "Returns structured lesson candidates" apply the same way to all three source types.

**File-path note:** `commands/init.md` in this spec's original 2026-06-12 text refers to the command now named `commands/kmg-init.md` (post `kmg-` prefix rename) — its Step 1.10 is exactly the section ENH-035 is refactoring.

## Related

- ENH-024: Codex CLI chat history extraction (source format context)
- ENH-035: consolidated `kmg-backfill` command — `kg_extract` is its MCP-tool equivalent, scope now includes lessons-learned/decisions per the update above
- ENH-034: `kmg-update-graph` removal — the reason `kg_extract`'s scope grew beyond chat-history
- `agents/knowledge-extractor.md`: Claude Code-only equivalent
- `commands/kmg-init.md` Step 1.10: backfill offer that calls the extractor (renamed from `commands/init.md`)
