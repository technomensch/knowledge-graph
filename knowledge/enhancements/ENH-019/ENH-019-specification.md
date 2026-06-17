---
title: 'ENH-019: kmgraph Usage Analytics & Stats Dashboard'
---

# ENH-019: kmgraph Usage Analytics & Stats Dashboard

## Summary

Add a `/kmgraph:stats` command (and companion `kg_stats` MCP tool) that produces a usage analytics report similar to context-mode's `/ctx-stats` output — surfacing knowledge graph activity, capture patterns, session history, and growth metrics directly in the AI conversation.

## Motivation

The ctx-mode `/ctx-stats` report (seen during the 2026-05-27 session) demonstrated the value of surfacing session-level and cross-session metrics inline. kmgraph has equivalent raw material — capture counts, lesson history, ADR creation dates, plan activity, session summaries — but no way to surface it as a digestible report. A stats command would close that gap and make the knowledge graph's value tangible to users.

## Scope Boundary

**This ENH is intentionally under-specified.** A brainstorming session is required before any implementation begins. Do not design or build until that session is complete.

## What Needs to Be Decided (Brainstorming Session Agenda)

### 1. Data Capture & Storage

**Strong prior constraint:** The current tool stack already includes 3 SQLite DBs — context-mode content DB, context-mode session DB, and the kmgraph FTS5 DB. Adding a 4th for stats would compound maintenance burden and installation complexity. **Derived-only (scan existing markdown files + frontmatter) is the strongly preferred default** — only move to a dedicated DB if derived-only proves too slow or insufficient.

Questions for brainstorm:
- What data does kmgraph already log implicitly? (capture timestamps, lesson counts, ADR dates, session summary metadata)
- Is frontmatter + file timestamps sufficient to answer common stat queries without a DB?
- What would need to be added explicitly? (e.g., per-session capture counts, tool call frequency)
- If a DB is truly needed: can it reuse the existing FTS5 DB rather than adding a new file?
- SQLite vs. flat file vs. derived-only? Trade-offs for portability and cross-platform support.

### 2. What Stats Would Users Want to See?
Potential candidates (to be validated against real usage — see Research Guidance below):
- Total captures (all-time, last 30 days, this session)
- Captures by type (lessons, ADRs, plans, session summaries, rules)
- Active projects count and per-project breakdown
- Session frequency / average session duration
- Most-used commands
- Knowledge graph growth over time (entries added per week/month)
- "Last seen" for each capture type (when was the last lesson captured?)
- Cross-platform capture breakdown (Claude Code vs. Gemini CLI vs. MCP direct)

### 3. Display Format
- Inline text report (like ctx-stats) vs. browser dashboard vs. both?
- What's the right level of verbosity — one-liner summary vs. full breakdown?
- Should it support a `--since` flag for time-bounded queries?

## Research Guidance for Brainstorm Session

**Before the brainstorm session, run `/kmgraph:kmg-auto-recall` to search prior chat history for:**
- Sessions where users asked "what have I captured", "how much have I used this", or similar introspective questions
- Any feedback about visibility into kmgraph activity
- Real examples of what information users wanted but couldn't get

Search queries to use:
- `"how many lessons"`, `"capture history"`, `"what did I capture"`
- `"kmgraph activity"`, `"session count"`, `"knowledge graph stats"`
- `"ctx-stats"`, `"usage report"`, `"analytics"`

These real-world examples should drive which stats fields are prioritized.

## Relation to v0.7.0

This ENH was identified during v0.5.9 work. v0.6.0 is reserved for `kmg-` prefix normalization. Before committing to include it in v0.7.0:

1. Review `docs/plans/v0.7.0-multi-platform-expansion.md` — the primary 0.7.0 plan — to assess fit.
2. The multi-platform focus of 0.7.0 (8 platforms, npm publish, marketplace submissions) means this feature would need to work cross-platform from day one if shipped in that release.
3. Cross-platform stats require the storage/capture questions above to be answered first.

**Recommendation:** Hold this ENH until after the 0.7.0 brainstorm session. If the brainstorm concludes the implementation is lightweight and platform-agnostic, it can be folded in. If not, target 0.7.1 or later.

## Files

- `ENH-019-specification.md` — this file
- `solution-approach.md` — to be written after brainstorm session
- `test-cases.md` — to be written after brainstorm session
- `progress-log.md` — to be written at implementation start
