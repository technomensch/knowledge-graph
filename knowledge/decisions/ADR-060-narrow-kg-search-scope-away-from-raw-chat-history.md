---
title: "ADR-060: Narrow kg_search scope away from raw chat-history — let context-mode own session recall"
number: 060
status: Proposed
date: 2026-07-05
author: technomensch
email: mkitact@gmail.com
git:
  branch: v0.6.16-update-claude-extract-chat-for-sub-agents
  commit: null
  pr: null
  issue: null
implements: null
related:
  adrs:
    - ADR-001-centralized-multi-kg-configuration.md
  lessons: []
  kg_entries:
    - knowledge/enhancements/ENH-040/ENH-040-specification.md
tags: [architecture, search, context-mode, fts5, scope]
category: architecture
---

# ADR-060: Narrow kg_search scope away from raw chat-history — let context-mode own session recall

**Date:** 2026-07-05
**Status:** Proposed
**Implements:** null (design decision; ENH-040 tracks the implementation)
**Related:** ADR-001 (multi-KG config — establishes why kmgraph's active-KG model is manual/git-like, not auto-detected like context-mode's project scoping); ENH-040 (removes chat-history from `kg_search`/`kg_fts5_rebuild` indexing scope)

---

## Context

Prompted by a user question ("recall why we switch KGs manually and context-mode doesn't") that led to re-evaluating the current `context-mode` plugin (v1.0.169) against kmgraph's design, now that context-mode has grown substantially since kmgraph's KG-config decisions were made (ADR-001, 2026-02-15).

Current state of both systems:

- **context-mode v1.0.169** now ships full session-continuity: PreToolUse/PostToolUse/UserPromptSubmit/Stop/PreCompact/SessionStart hooks capture tool events, user decisions, errors, blockers into a per-project SQLite DB; `ctx_search` runs Porter-stemming + trigram matching merged via Reciprocal Rank Fusion, with proximity reranking and fuzzy correction. Scope is auto-resolved per-project (no manual switch) and content has a 14-day cleanup window — it is not meant to be a durable, curated store.
- **kmgraph** `kg_search` indexes both curated knowledge artifacts (ADRs, lessons-learned, enhancements) *and* raw `chat-history/*.md` transcripts, across manually-selected active KG (or `searchScope: all`/`personal-only`). This is durable (git-committed) and multi-KG (project/global/shared) by design (ADR-001).

The overlap: both systems now answer "what did we discuss/decide in a past session" by searching indexed conversation history. `kg_search` doing this via raw chat-history transcripts duplicates work context-mode already does better (stemming+trigram+RRF+proximity+fuzzy vs kmgraph's plain FTS5), while kmgraph's real differentiator — curated, authored knowledge (ADRs/lessons/enhancements) — has no context-mode equivalent (context-mode auto-captures events; it does not author artifacts).

---

## Decision

Narrow `kg_search`'s indexing/search scope to curated knowledge artifacts only (ADRs, lessons-learned, enhancements, rules/me/triggers files, session summaries/handoffs). Stop indexing raw `chat-history/*.md` transcripts for recall purposes in `kg_fts5_rebuild`/`kg_search`.

Division of responsibility going forward:
- **context-mode** owns "what happened in past sessions" — raw event/decision/error recall, ephemeral, auto-captured, no authoring required.
- **kmgraph** owns "what did we decide and why" — durable, human-curated artifacts meant to be committed, cross-project, and outlive any single session's SQLite store.

---

## Rationale

- **Redundant search surfaces cost more than they save.** Two tools (`ctx_search`, `kg_search`) both claiming to answer "recall past discussion" forces the user/agent to guess which one has the better-ranked result — context-mode's RRF+proximity+fuzzy pipeline is strictly better for that job than kmgraph's plain FTS5 MATCH.
- **kmgraph's actual value is curation, not transcription.** ADR-001 already establishes kmgraph's manual multi-KG model exists to serve intentional, durable knowledge management (git-like active pointer, multi-KG for different tasks) — indexing raw transcripts doesn't fit that model, it's scope creep from before context-mode had session continuity.
- **Ownership follows lifecycle, not habit.** context-mode's 14-day cleanup marks its data as intentionally ephemeral; kmgraph's git-committed docs are intentionally durable. Recall tooling should route to the store whose lifecycle matches the question ("recent session" → context-mode; "why did we decide X" → kmgraph).

---

## Consequences

- `kg_fts5_rebuild` stops walking `chat-history/` for indexing; `kg_search` scope shrinks to `decisions/`, `enhancements/`, `lessons-learned/`, `sessions/`, and rules/me/triggers files.
- Any skill or agent currently relying on `kg_search` hitting chat-history (e.g. `kmg-auto-recall`) needs to be pointed at `ctx_search` instead, or dual-search both tools explicitly when the question spans both curated decisions and raw session history.
- No change to kmgraph's multi-KG active-pointer model (ADR-001 stands) — this ADR only narrows *what* gets indexed within a KG, not how KGs are selected.
- Existing chat-history files are untouched (still readable as raw artifacts); only their FTS5 indexing for `kg_search` recall is removed.

---

## Alternatives Considered

- **Do nothing, keep both indexing chat-history.** Rejected: confirmed redundancy discovered this session; kmgraph's plain-FTS5 index is strictly inferior for this job to context-mode's ranking pipeline, so keeping it only adds maintenance surface (kg_fts5_rebuild cost, stale index risk) with no retrieval-quality benefit.
- **Have context-mode read kmgraph's curated docs instead (reverse direction).** Rejected: context-mode's cleanup/ephemeral lifecycle is wrong for durable, git-committed knowledge artifacts; consolidating the wrong direction would risk losing ADRs/lessons to a 14-day TTL.

---

## Prior Discussion / Evidence Sources

- Live investigation, 2026-07-05 session: read ADR-001 in full, ran `ctx_doctor` (context-mode v1.0.169, all checks OK), read context-mode's README `## Tools`, `## How the Knowledge Base Works`, `## Session Continuity` sections in full.
- `kg_search` (searchScope: all) confirmed chat-history/*.md is currently indexed and returned as top matches for a conceptual query, alongside genuine ADR/heading matches.

---

## Related Decisions

- **[ADR-001: Centralized Multi-KG Configuration](ADR-001-centralized-multi-kg-configuration.md)** — establishes the manual active-KG model this ADR does not change; only the per-KG indexing scope narrows.
