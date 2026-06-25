---
title: "ENH-025: Cross-Platform Knowledge Extractor (Backfill from Chat History)"
number: 025
status: proposed
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

## Related

- ENH-024: Codex CLI chat history extraction (source format context)
- `agents/knowledge-extractor.md`: Claude Code-only equivalent
- `commands/init.md` Step 1.10: backfill offer that calls the extractor
