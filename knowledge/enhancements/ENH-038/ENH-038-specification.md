# ENH-038: Extract-chat-history reliability (umbrella)

**Status:** ✅ Resolved (v0.6.17) — all 6 tracked bugs fixed; see per-bug status table below. (ENH-043's own spec status line still reads 🟡 Proposed despite its code/tests being complete — a leftover flip-the-status task from the *original* v0.6.17 plan, not this umbrella's own outstanding work.)
**Discovered:** 2026-07-03 (first finding); umbrella consolidation 2026-07-09
**Governed by:** none (bug-fix/extractor-parity work, not a new command/skill/docstring — ADR-058's naming/scope check does not apply)
**Full narrative, root-cause evolution, test cases, and per-bug detail:** [`knowledge/issues/chat-extraction-reliability-saga/`](../../issues/chat-extraction-reliability-saga/README.md)

---

## Why this is one ENH, not six

`kmg-extract-chat`'s reliability was tracked as six separate ENH numbers (038, 043, 044, 045, 046, 047) as bugs surfaced one at a time across v0.6.16–v0.6.17. In hindsight that fragmented one feature area — "extraction of chat history across Claude/Gemini/Codex is trustworthy" — across six disconnected files, working against this repo's own purpose of keeping related content findable in one place. Consolidated 2026-07-09: this is now the single ENH for that feature area. Each bug's full original spec (problem, proposed behavior, affected files, acceptance criteria) is preserved verbatim under the linked meta-issue's `attempts/ENH-0NN/specification.md`, not deleted — only the top-level ENH number is retired in favor of this umbrella.

Going forward, any new defect found in chat-history extraction (Claude, Gemini, or Codex extractors, or their shared base) gets appended here as a new row + a new `attempts/` entry in the linked meta-issue — it does **not** get a new ENH number. See `knowledge/rules.md`'s Bug/Enhancement Triage section for the check that now enforces this.

---

## Per-Bug Status

| Bug | Subsystem | Status | Detail |
|---|---|---|---|
| Subagent message loss + Gemini format-drift + Codex audit | Claude / Gemini / Codex | ✅ Fixed (v0.6.16) | [attempts/ENH-038/specification.md](../../issues/chat-extraction-reliability-saga/attempts/ENH-038/specification.md) |
| No rebuild mode; pre-fix output stays permanently corrupted | Claude | ✅ Fixed (v0.6.17); 9/68 flagged dates recovered, 42 permanently unrecoverable (no source data) | [attempts/ENH-043/specification.md](../../issues/chat-extraction-reliability-saga/attempts/ENH-043/specification.md) |
| `--project` filter silently ignored, cross-project contamination | Gemini | ✅ Fixed (v0.6.17) — `.json`/`.jsonl` scoping shipped (`bf1cb51c`/`1b2269cf`), then `.pb`/hash-dir contamination fail-closed (ADR-062, `126d98ce`/`faa393d6`), both verified against real data | [attempts/ENH-044/specification.md](../../issues/chat-extraction-reliability-saga/attempts/ENH-044/specification.md) |
| Incremental mtime-skip bug (never ported from Claude's fix) | Codex | ✅ Fixed (v0.6.17) | [attempts/ENH-045/specification.md](../../issues/chat-extraction-reliability-saga/attempts/ENH-045/specification.md) |
| `.pb` sessions dated by file mtime, not content | Gemini | ✅ Fixed (v0.6.17) | [attempts/ENH-046/specification.md](../../issues/chat-extraction-reliability-saga/attempts/ENH-046/specification.md) |
| Whole session file dated by first message; multi-day sessions misfile | Claude | ✅ Fixed (v0.6.17) | [attempts/ENH-047/specification.md](../../issues/chat-extraction-reliability-saga/attempts/ENH-047/specification.md) |

---

## Outstanding Work

All 6 tracked bugs are fixed as of 2026-07-10. Two loose ends remain, neither of them code:

- **ENH-043's spec status line** was never flipped from 🟡 Proposed to ✅ Resolved despite its rebuild-mode code and tests being complete — that's the *original* v0.6.17 plan's still-outstanding Task 8, a different plan than the one that closed out ENH-047/044.
- **Re-baseline extraction and revisit the "wrong session captured" symptom** noted in the meta-issue's Attempt 003 — the one genuinely unresolved investigative thread left in this saga.

---

## Related

- Meta-issue (full saga, root-cause evolution, lessons): [`knowledge/issues/chat-extraction-reliability-saga/`](../../issues/chat-extraction-reliability-saga/README.md)
- `core/scripts/extract_claude.py`, `core/scripts/extract_gemini.py`, `core/scripts/extract_codex.py`, `core/scripts/chat_extractor_base.py`, `commands/kmg-extract-chat.md`
