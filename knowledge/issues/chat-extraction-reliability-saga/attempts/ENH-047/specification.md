# ENH-047: Claude extractor dates a whole session file by its first message, misfiling multi-day sessions under their start date

**Status:** 🟡 Proposed
**Discovered:** 2026-07-08
**Governed by:** none (bug-fix, not a new command/skill/docstring — ADR-058's naming/scope check does not apply)
**Related:** `core/scripts/extract_claude.py`, [ENH-046](../ENH-046/specification.md) (same failure class — date-derivation reliability — but in the Gemini extractor, dated by file mtime rather than by conversation content), [ENH-043](../ENH-043/specification.md) (same file/subsystem, this session's extraction-pipeline hardening work, but a different root cause: incremental-append uuid-dedup permanence, not date derivation), [ENH-038](../ENH-038/specification.md) (original subagent message-loss finding), branch `v0.6.17-fix-extract-chat-rebuild`

---

## Problem

`extract_claude_sessions()` in `core/scripts/extract_claude.py` derives a session's date bucket from **only the first timestamped message** in each raw `.jsonl` session file, then files **every** message in that entire file under that one date.

The offending logic (`extract_claude.py`, around lines 176–181):

```python
# Capture timestamp for filename from the first message with one
if not session_date and obj.get('timestamp'):
    try:
        dt = datetime.fromisoformat(obj['timestamp'].replace("Z", "+00:00"))
        session_date = dt.strftime("%Y-%m-%d")
        session_ts_str = dt.strftime("%H%M%S")
    except: pass
```

Once `session_date` is set from the first timestamped record, the guard `if not session_date` prevents it from ever being recomputed, and every subsequent message in the file — regardless of its own `timestamp` — is written under that single start-date bucket.

A single Claude Code session routinely spans **multiple real-world calendar days**: sessions get resumed via `/clear` or context-compaction and can stay open for days. For any such session, every message from every later day is misfiled under the session's **original start date**, not each message's own date. Later-day content therefore becomes invisible to any single-date filter (`--today`, `--date=YYYY-MM-DD`).

**Confirmed with real data (2026-07-08):**

Ran `--source claude --project=knowledge-graph --today`, expected today's ~3,100+ real messages, got only **36**. Direct investigation of every raw `.jsonl` file modified today in `~/.claude/projects/-Users-mkaplan-GitHub-knowledge-graph/` counted real extractable messages (`type` in `user`/`assistant`):

```
68907434-93b4-472d-a499-cc1118c7c854.jsonl:   14 messages
7e0cd36f-db29-41cf-8da6-ace51ad67d0a.jsonl:    3 messages
f1dca0cd-600e-4541-bc22-20543a91d07e.jsonl:   13 messages
f31a2572-9942-4a20-b80d-de3a00d5bbf4.jsonl:  785 messages
8ecf2d74-b725-4740-ba5a-4b2113034041.jsonl:    8 messages
436a0cdf-5707-40f5-a80c-3aac89941193.jsonl:    5 messages
a0851608-06de-484a-b9d6-869d7ce02fa1.jsonl:   14 messages
b0b10636-166d-4bbb-b66b-87e4c17dbf89.jsonl:  811 messages
e4e1e902-6739-4b86-aaa8-9e2951738e76.jsonl:   27 messages
a34c81cc-d1ee-4bb8-aed3-205515a9705b.jsonl:   21 messages
21a5fea7-fa5b-4188-a52c-d93254866a0c.jsonl: 1320 messages
a879c726-e5a6-4ff2-813f-7051852336bd.jsonl:    0 messages
0a3b45cf-cff2-470b-91df-b4ea51851869.jsonl:   10 messages
150ff933-e4bd-4855-9282-3d52434e63c6.jsonl:   13 messages
cdd8d421-2d13-4953-bd7c-8e8f18428632.jsonl:   70 messages
```

Total: **3,114 real messages.** Replicating the extractor's own first-timestamp-derivation logic against the largest files:

```
68907434...: first-derived session_date = 2026-07-08
7e0cd36f...: first-derived session_date = 2026-07-06
f31a2572...: first-derived session_date = 2026-07-06
b0b10636...: first-derived session_date = 2026-07-06
21a5fea7...: first-derived session_date = 2026-07-06
```

The three largest files (785 + 811 + 1,320 = **2,916 of the 3,114** real messages) all bucket under **2026-07-06** — none of their actual 2026-07-08 content is reachable via `--today`, `--date=2026-07-08`, or any single-date filter. A multi-day session's later-day content is invisible to date-filtered extraction, filed entirely under its start date.

**How this was found (dogfooding v0.6.17, two failed real-world extraction attempts today):**

- **Attempt 1:** ran `--today` extraction, got a file whose message #1 content ("I've read the full file. Let me trace the security-relevant surface...") clearly was not from today's actual v0.6.17 conversation — it picked up an unrelated short session instead of the real one.
- **Attempt 2 (this bug):** got only 36 of 3,114 real messages, root-caused to the multi-day bucketing defect above.

This is distinct from ENH-043. ENH-043's defect is that the incremental-append path never re-flattens existing output because uuid-dedup treats any previously-written uuid as permanently seen. This defect is upstream of that: the date bucket itself is wrong at the point of derivation, so even a clean rebuild would file later-day messages under the wrong date. Different code path (`session_date` derivation vs. `parse_metadata_from_file()`/append branch), different failure mode.

---

## Proposed Behavior

- Derive each message's date bucket from **that message's own `timestamp`**, not from the session file's first timestamped record. A session `.jsonl` that spans multiple calendar days must fan its messages out across multiple date-bucketed output files, one per real calendar day.
- Preserve existing per-message ordering and uuid-dedup semantics within each resulting date bucket.
- A single-date filter (`--today`, `--date=YYYY-MM-DD`) must return the messages that actually occurred on that date, irrespective of which session file (or session start date) they belong to.
- Messages that genuinely have no `timestamp` should fall back to a defined, documented rule (e.g. the nearest preceding timestamped message's date, or the file's start date) rather than being silently dropped or misfiled.

---

## Explicitly Out of Scope

- The ENH-043 incremental-append / rebuild-mode work — that is a separate root cause tracked in its own ENH; this ENH does not change the append-vs-overwrite branching logic.
- Attempt 1's "wrong/unrelated session captured" symptom — noted here as the sibling observation that led to this discovery, but its own root cause (session selection under `--today`) is not established in this document and may warrant separate investigation once the date-bucketing fix lands and re-baselines the extraction output.
- The Gemini and Codex extractors — ENH-046 already tracks the analogous Gemini date-derivation defect; this ENH is scoped to `extract_claude.py` only.
- The `--session-file` filename timestamp (`session_ts_str`), which is a presentational label for a single file and can retain the start time; the defect is about which **date bucket** messages are filed under, not the display label.

---

## Affected Files

| File | Role |
|---|---|
| `core/scripts/extract_claude.py` | Modify — derive each message's date bucket from its own `timestamp` rather than a once-set `session_date`; fan multi-day sessions across multiple date buckets |
| `core/scripts/chat_extractor_base.py` | Modify (maybe) — output-path routing may need to accept a per-message date rather than a per-session date |
| `tests/` (new, e.g. `tests/test-extraction-multiday.sh`) | New — assert a single `.jsonl` fixture whose messages span two+ calendar days is split into the correct per-date output files, and that a single-date filter returns exactly that date's messages |
| `knowledge/chat-history/**` | Data repair only — dates already extracted before this fix will need re-running (via ENH-043's `--rebuild`) once source data is available, to redistribute misfiled multi-day content |

---

## Acceptance Criteria

- [ ] A raw `.jsonl` session file whose messages span multiple calendar days is split so that each message lands in the output file for **its own** date, not the session's start date.
- [ ] Re-running the failing real-world command (`--source claude --project=knowledge-graph --today` on 2026-07-08) surfaces the ~3,114 real messages that actually occurred that day, not 36. In particular the 2,916 messages from the three large files that today bucket under 2026-07-06 appear under their correct dates.
- [ ] A single-date filter (`--today` / `--date=YYYY-MM-DD`) returns exactly the messages timestamped on that date, verified against a fixture with known per-day counts.
- [ ] Messages with no `timestamp` follow the documented fallback rule and are neither dropped nor misfiled.
- [ ] A regression test (`tests/test-extraction-multiday.sh` or equivalent) encodes the multi-day fixture and passes; existing extraction tests still pass with no regressions.
