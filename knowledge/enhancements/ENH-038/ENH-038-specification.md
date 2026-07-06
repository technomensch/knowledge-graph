# ENH-038: kmg-extract-chat message loss and format-drift across Claude, Gemini, and Codex sources

**Status:** 🟡 Proposed
**Discovered:** 2026-07-03 (Claude finding), 2026-07-04 (Gemini finding)
**Governed by:** none (bug-fix/extractor-parity work, not a new command/skill/docstring — ADR-058's naming/scope check does not apply)
**Related:** `core/scripts/extract_claude.py`, `core/scripts/extract_gemini.py`, `core/scripts/chat_extractor_base.py`, `commands/kmg-extract-chat.md`, `knowledge/decisions/ADR-044-split-oversized-chat-history-files.md`, branch `v0.6.16-update-claude-extract-chat-for-sub-agents`, plan `knowledge/plans/v0.6.16-fix-extract-chat-subagents.md`

---

## Problem

`/kmgraph:kmg-extract-chat` silently loses or drops entire classes of chat history across two independent source extractors. Both were found by direct code + on-disk data inspection, not assumption.

**1. Claude extractor — incremental cross-file message loss (found 2026-07-03):**
`extract_claude.py`'s incremental mode compares every source `.jsonl` file for a date (main thread **and** subagent transcripts under `**/subagents/*.jsonl`) against one global `last_ts` read from the existing output file's tail. Subagent runs happen *during* the parent session, so subagent timestamps interleave with (not follow) the main thread's — one confirmed case dropped 76 of 635 extractable messages (11 subagent messages timestamped earlier than a `last_ts` computed only from main-thread content were treated as already-synced). Separately, same-day multi-file sessions are written as separate `## Session N` blocks ordered by file-encounter order, not true chronological interleaving.

*Compatibility gap with ADR-044 (found while planning the fix):* the fix replaces the single `last_ts` cutoff with per-message `uuid` membership as the **sole** inclusion filter (v0.6.16 plan Task 2). That is only correct if the dedup scan can see every uuid already written for a date. But `chat_extractor_base.py`'s `split_file_if_oversized()` (ADR-044) splits a high-volume date's file into `{stem}-part1.md`, `{stem}-part2.md`, … inside a `YYYY-MM-DD/` subfolder once it crosses 900 KB / 30 000 lines, deletes the flat original, and `get_output_path()` thereafter returns the **last part only** (its glob-and-`part_files[-1]` branch). As originally scoped, `parse_seen_uuids` scanned just that returned path — so any uuid living in an earlier part was invisible to the dedup set, and because the `last_ts` gate had been removed, that message would look "unseen" and be **re-appended into the current last part as a real duplicate** on the next incremental run. The bug only manifests *after* a day has split (exactly the high-volume day the split mechanism serves), which is why direct inspection of ADR-044's rerouting, not the flat-file happy path, was needed to catch it. The Claude uuid-dedup mechanism must therefore union uuids across all part files, not trust a single `get_output_path()` return value.

**2. Gemini extractor — has never successfully extracted real conversation content (found 2026-07-04):**
Confirmed by checking the actual repo output, not just the code:
- Only 5 `*-gemini.md` files exist anywhere in `knowledge/chat-history/` (vs 97 for Claude), spanning nominal dates 2025-12-02 through 2026-02-17 — but all 5 share **one identical filesystem mtime** (Apr 10 12:38), i.e. one manual batch drop, not incremental script output.
- Their content format (`### User Input` / `### Planner Response`, inline `*Listed directory [...]*` citation links) matches Antigravity IDE's own native "export conversation" feature — it does **not** match what `chat_extractor_base.py`'s `write_markdown_header`/`write_message_block` actually produce (`# Complete Chat Session Export`, `### Message N: Role`, `**Timestamp:**`/`**Content:**`). These 5 files were manually exported and hand-placed; `extract_gemini.py` did not generate them.
- Root cause: Gemini/Antigravity **changed its on-disk session storage format** partway through the observed history. Confirmed via file mtimes and an embedded update-checker message:
  - 2025-12-02 → 2026-05-13: sessions are single-JSON-object files (`~/.gemini/tmp/**/chats/session-*.json`, `{"messages":[...]}`, `msg.type` of `user`/`gemini`/`error`) — this is the format `extract_gemini.py`'s JSON-branch code was written for, and it **does** correctly parse this shape (verified against a live file).
  - 2026-05-13 onward: every new session is an append-only, line-delimited event log (`~/.gemini/tmp/**/chats/session-*.jsonl`) — header line (`sessionId`/`projectHash`/`kind`) followed by per-turn event lines (`id`/`timestamp`/`type`/`content`) interleaved with `{"$set": {...}}` checkpoint-patch lines. The very session that starts this new format contains, inline, `"Gemini CLI update available! 0.41.2 → 0.42.0 ... Attempting to automatically update now..."` — the CLI auto-updated mid-session on 2026-05-13, and the post-update client writes sessions in this new streaming shape.
  - `extract_gemini.py`'s glob (`session-*.json`) does not match `.jsonl` at all, so **every real session since 2026-05-13 — roughly two months of history at time of discovery — is invisible to the extractor.** Even if the glob were widened, the current single-`json.load()`-per-file parser cannot read a multi-line streaming log, and several `type:"gemini"` (assistant) turns carry `content:""` with the real reply text arriving only in a *later* duplicate of the same `id` (dedup-by-`id`, last-write-wins is required, with fallback to `toolCalls`/`resultDisplay` when `content` stays empty).

**3. Codex — not yet audited for the equivalent failure mode.** `extract_codex.py` globs `rollout-*.jsonl` recursively under `~/.codex/sessions/`; no subagent-style child transcript files were found on disk for Codex (subagent/tool-call activity appears inline as `function_call`/`mcp_tool_call_end` events in the same file), so the Claude-style cross-file bug does not apply structurally — but the Codex extractor has not been independently verified against a real multi-day incremental run the way Claude and Gemini have been in this investigation. Flagged for audit, not assumed clean.

---

## Proposed Behavior

One enhancement, three source-specific fixes, sharing the same root complaint (silent, undetected extraction loss) and the same branch/plan:

1. **Claude:** per-message dedup keyed on each message's own `uuid` (already present in every JSONL line, currently discarded) instead of a single cross-file `last_ts` cutoff; flatten-and-sort all of a date's messages by true timestamp before writing, instead of one `## Session N` block per source file. The uuid-membership scan (`parse_seen_uuids`) must span **all** of a date's split part files (`{stem}-part*.md` in a `YYYY-MM-DD/` subfolder), not just the current/last part that `get_output_path()` returns, so it stays correct under ADR-044's file-splitting; falling back to the single flat file when no split subfolder exists. (Already scoped as Tasks 1–3 of the v0.6.16 plan.)
2. **Gemini:** add a new parser path for the post-2026-05-13 streaming `.jsonl` format alongside the existing (working) single-object `.json` path — do not remove the `.json` path, since pre-2026-05-13 archives may still exist on some machines. The new path must: widen the glob to catch `session-*.jsonl`; parse line-by-line; dedup by `id` keeping the last (most complete) occurrence; when the winning record's `content` is empty, fall back to extracting readable text from `toolCalls[].resultDisplay` or `resultDisplay` at the top level rather than emitting a blank message block; skip `{"$set": ...}` lines (metadata patches, not turns) and the header line (session metadata, not a turn).
3. **Codex:** audit task — run the same kind of real-data verification done here for Claude/Gemini (confirm glob matches real files, confirm parsed message count against a known-good manual count for at least one real multi-session day) before assuming it's unaffected. If no defect is found, close this part of the ENH with that evidence recorded, not by assumption.

---

## Explicitly Out of Scope

- Rewriting the output `.md` format itself (message-block structure, headers) — only the *input*-side parsing/dedup logic changes.
- Recovering/backfilling the ~2 months of Gemini history that were never captured (2026-05-13 → discovery date) from any other source — if the raw `.jsonl` files still exist on disk (confirmed they do, as of this writing), a normal (non-incremental) extraction run after the fix ships will pick them up naturally; no separate backfill mechanism is being built.
- Protobuf (`.pb`) Gemini/Antigravity conversation extraction — unrelated to this format-drift finding, already has its own optional-dependency handling in `extract_gemini.py`.
- Building general schema-version detection/migration tooling for future format changes — this ENH adds a second parser path for the one drift found; a more general "detect vendor format version" abstraction is YAGNI unless a third format shows up.

---

## Affected Files

| File | Role |
|---|---|
| `core/scripts/extract_claude.py` | Modify — per-uuid dedup, chronological flatten-and-sort (v0.6.16 plan Tasks 1–3) |
| `core/scripts/chat_extractor_base.py` | Modify — `write_message_block` gains `uuid` param; loud failure on missing `KG_OUTPUT_DIR` (v0.6.16 plan Task 4) |
| `core/scripts/extract_gemini.py` | Modify — new `.jsonl` streaming-format parser path, widened glob, id-based dedup, `toolCalls`/`resultDisplay` fallback for empty `content` |
| `commands/kmg-extract-chat.md` | Modify if needed — currently documents Gemini as `.json/.pb` only; add `.jsonl` once the new path ships |
| `tests/fixtures/` | New fixtures for the Gemini `.jsonl` streaming format (mirroring the existing Claude subagent fixtures added for the v0.6.16 plan) |
| `tests/test-extraction.sh` / new Gemini-specific test script | Extend/add assertions proving the new format is parsed and old `.json` archives still work |

---

## Acceptance Criteria

- [ ] `extract_claude.py` incremental runs no longer drop subagent messages regardless of cross-file timestamp interleaving (v0.6.16 plan Task 1–2's repro script passes).
- [ ] Same-day multi-file Claude sessions interleave chronologically in one stream, not per-file blocks (v0.6.16 plan Task 3's repro passes).
- [ ] `parse_seen_uuids` correctly unions uuids across all split part files for a date (not just the last part `get_output_path()` returns), verified against a fixture that pre-splits a day into 2+ parts before running an incremental extraction — the message whose uuid lives only in an earlier part is not re-appended to the last part (ADR-044 compatibility, v0.6.16 plan Task 2 Step 4).
- [x] `extract_gemini.py` correctly parses at least one real, on-disk post-2026-05-13 `.jsonl` session end-to-end (verified message count against manual inspection of that file, not assumed). Verified against `~/.gemini/tmp/career-prism/chats/session-2026-05-13T21-03-005ef4fe.jsonl` (32 unique turn ids, including `error`/`info` types not otherwise handled): an independent manual recomputation of the same dedup+fallback logic yielded `expected_messages=21, expected_skipped_empty=2`; `extract_gemini_stream_sessions()` run directly against the same file produced `count=21` with a logged warning for exactly 2 skipped-empty gemini turns — exact match.
- [ ] `extract_gemini.py` still correctly parses at least one real pre-2026-05-13 single-object `.json` session (no regression). Verified only against a synthetic fixture (`tests/fixtures/sample-gemini-session.json`) in Task 12 — no real pre-0.42.0 `.json` archive was found on this machine to verify against directly (worth a follow-up if one turns up).
- [x] A `type:"gemini"` turn whose first-written `content` is empty resolves to non-blank output (via later-duplicate-`id` win or `toolCalls`/`resultDisplay` fallback), verified against a real fixture derived from actual on-disk data. The Task 12 fixture (`tests/fixtures/sample-gemini-stream-session.jsonl`) mirrors the exact empty→toolCalls→final-text progressive-completion pattern found in the real file above (turn ids `acfbf6d1`/`1ebbaba3` there resolve via `toolCalls[].resultDisplay`, matching the fixture's `turn-002` case); `test-extraction-gemini-stream.sh` asserts the final resolved text, not just a message count.
- [x] Codex extractor is either verified clean against a real multi-day dataset, or a defect is found and separately scoped — not left unaudited. Verified clean: `extract_codex.py`'s glob (`~/.codex/sessions/**/rollout-*.jsonl`) matched all 85 real on-disk files exactly (`find` cross-check). For 2026-07-02 (24 session files, the busiest real day on this machine), an independent manual count of `response_item` events with `role` in `(user, assistant)` and non-empty extracted text found 884 raw messages; of those, 25 matched the intentional system-injection-prefix filter (`# AGENTS.md instructions`, `<environment_context>`, etc.); 884 − 25 = 859, exactly matching `extract_codex_sessions`' real output (`2026-07-02-codex.md`, 859 messages). No defect found.
- [ ] `commands/kmg-extract-chat.md`'s Gemini format description updated to reflect the `.jsonl` streaming path once shipped.
