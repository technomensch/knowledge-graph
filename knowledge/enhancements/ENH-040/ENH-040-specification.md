---
id: ENH-040
type: Hardening
status: proposed
---

# ENH-040: Remove chat-history/*.md from kg_search / kg_fts5_rebuild indexing scope

**Status:** 🟡 Proposed
**Discovered:** 2026-07-05
**Governed by:** ADR-060 (Narrow kg_search scope away from raw chat-history — let context-mode own session recall)
**Related:** `mcp-server/src/tools/search.ts`, `mcp-server/src/tools/fts5.ts`, `mcp-server/src/tools/config.ts`, `mcp-server/src/cli.ts`, `mcp-server/src/tools/upgrade.ts`, `skills/kmg-auto-recall`, context-mode plugin (v1.0.169) `ctx_search`

---

## Problem

`kg_search`/`kg_fts5_rebuild` currently index `chat-history/*.md` transcripts alongside curated knowledge artifacts (ADRs, lessons-learned, enhancements). This duplicates what the `context-mode` plugin now does for session/conversation recall, and does it worse — `context-mode`'s `ctx_search` merges Porter-stemming and trigram matching via Reciprocal Rank Fusion with proximity reranking and fuzzy correction; `kg_search`'s chat-history matches are plain FTS5 MATCH with no such ranking sophistication. Confirmed live this session: a `kg_search(searchScope: "all")` query returned dozens of near-duplicate chat-history heading matches ranked no better than a raw grep, while context-mode's `ctx_search` on the same question surfaced targeted, ranked snippets.

Per ADR-060, kmgraph's differentiator is curated, durable, human-authored knowledge (ADRs/lessons/enhancements) — not transcription of raw session history, which context-mode already owns with a purpose-built ranking pipeline and its own (intentionally ephemeral, 14-day-cleanup) storage lifecycle.

---

## Proposed Behavior

1. `mcp-server/src/tools/fts5.ts` (`kg_fts5_rebuild`): stop walking `chat-history/` when building the FTS5 index; index only `decisions/`, `enhancements/`, `lessons-learned/`, `sessions/`, and rules/me/triggers files.
2. `mcp-server/src/tools/search.ts` (`kg_search`): remove `chat-history/` from the default search directory set (all `searchScope` values: active, all, personal-only) — searches only curated artifact directories.
3. `mcp-server/src/tools/config.ts` / `mcp-server/src/cli.ts`: audit for any config default or CLI flag that assumes chat-history is part of the searchable index; update accordingly.
4. `mcp-server/src/tools/upgrade.ts`: if the upgrade path re-triggers a full FTS5 rebuild, confirm it picks up the new (narrower) directory set without a manual re-index step.
5. `skills/kmg-auto-recall`: update guidance so it no longer implies `kg_search` covers raw session/chat-history recall — point that class of question at `ctx_search` instead (or note both tools when a question spans curated decisions *and* recent session history).
6. Leave `chat-history/*.md` files themselves untouched on disk — this only removes them from FTS5 indexing, not from storage.

---

## Explicitly Out of Scope

- Any change to context-mode itself (external plugin, not owned by this repo).
- Any change to kmgraph's multi-KG active-pointer/config model (ADR-001 unaffected).
- Deleting or migrating existing chat-history files.
- Building a bridge/sync between `kg_search` and `ctx_search` (two separate tools remain two separate tools; no unification attempted here).

---

## Affected Files

| File | Role |
|---|---|
| `mcp-server/src/tools/fts5.ts` | `kg_fts5_rebuild` — remove chat-history from indexed directory walk |
| `mcp-server/src/tools/search.ts` | `kg_search` — remove chat-history from default search dirs across all searchScope values |
| `mcp-server/src/tools/config.ts` | Audit for chat-history-related search-scope defaults |
| `mcp-server/src/cli.ts` | Audit for chat-history-related CLI flags/defaults |
| `mcp-server/src/tools/upgrade.ts` | Confirm rebuild-on-upgrade uses the narrowed directory set |
| `skills/kmg-auto-recall` | Update guidance to route session/history recall questions to `ctx_search` |

---

## Acceptance Criteria

- [ ] `kg_fts5_rebuild` no longer indexes any file under `chat-history/`
- [ ] `kg_search` (all `searchScope` values) returns zero chat-history matches after rebuild
- [ ] Existing chat-history files remain on disk, readable directly, just not FTS5-indexed
- [ ] `kmg-auto-recall` skill guidance updated to route raw session-history questions to `ctx_search`
- [ ] `kg_fts5_status` reflects the reduced indexed-file count post-rebuild
