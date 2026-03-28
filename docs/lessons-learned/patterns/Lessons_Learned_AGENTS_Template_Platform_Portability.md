---
title: "AGENTS-template.md Enables Full KMGraph Workflow on Non-Claude Platforms Without MCP"
date: 2026-03-27
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: v0.2.0-beta-layered-architecture
  commit: a09611b50725a5c2141c178f0de7067dd9b41b1b
  commit_short: a09611b5
tags: [platform-portability, agents-template, gemini, antigravity, mcp-optional, graceful-degradation]
category: patterns
---

## Problem

It was unclear whether `core/templates/AGENTS-template.md` alone — without `/kmgraph:` slash commands, Claude Code extension, or MCP tools — was sufficient to guide a capable LLM through the full KMGraph workflow. If the template was insufficient, non-Claude platforms would need MCP tool registration just to adopt basic KMGraph behaviors, creating an integration barrier.

## Root Cause

KMGraph was originally designed around Claude Code's slash command infrastructure. The AGENTS-template was added as a portability layer, but its adequacy for platforms lacking both slash commands and MCP tools had not been empirically validated. Uncertainty remained about whether a plain-text template could substitute for the command-and-tool infrastructure.

## Solution

During v0.2.0-beta Phase 7b validation, Gemini Flash (running in Antigravity) was given only `core/templates/AGENTS-template.md` as a system prompt. All 7 platform portability tests passed:

1. KMGraph awareness explained in plain language (no slash command leakage)
2. Lesson-worthy moment recognized unprompted (JWT timestamp units bug)
3. Lesson written to `docs/lessons-learned/` with correct YAML frontmatter
4. Recall via file-reading when `kg_search` MCP is unavailable (conversational format)
5. Session wrap-up offered proactively at session-end signal
6. Session summary written to `docs/sessions/` with date-stamped filename
7. No `/kmgraph:` syntax or "Claude Code" mentioned in any response

This confirms the template is self-sufficient for a capable LLM to adopt all KMGraph behaviors without slash commands or MCP tools.

## Pattern

**The template is the minimum viable KMGraph integration; MCP tools are an enhancement, not a requirement.**

- `kg_search` (FTS5) improves recall precision but is not required — a capable LLM can read lesson files directly and search conversationally.
- `kg_capture` MCP tool (v0.2.1 Item A) is needed only for platforms without file system write access. The template already handles this gracefully by noting MCP availability.
- Platforms that have file system read/write access get full KMGraph functionality from the template alone.
- Platforms without file system tools need `kg_capture` MCP tool for writes — this is the portability boundary, not a fundamental limitation of the template approach.

**Validation equivalence:** Gemini Flash in Antigravity is a valid substitute for Gemini CLI terminal testing. Both environments test whether AGENTS-template.md guides a non-Claude-Code model without internal command leakage. The key variable is whether the model receives only the template (no plugin infrastructure), not which specific runtime hosts it.

**Generalization:** Any sufficiently capable LLM given a well-structured behavioral template with clear workflow descriptions, example formats, and graceful fallback instructions will adopt those workflows — even without native tooling. Template quality is the primary portability lever.

## References

- `core/templates/AGENTS-template.md` — the template validated in this test
- Phase 7b validation: branch `v0.2.0-beta-layered-architecture`
- v0.2.1 backlog Item A: `kg_capture` MCP tool for write-only platforms (issue-1)
