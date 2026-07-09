# ENH-038: Extract-chat-history reliability (umbrella)

**Status:** 🟡 In Progress — see per-bug status table below
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
| `--project` filter silently ignored, cross-project contamination | Gemini | 🟡 Proposed | [attempts/ENH-044/specification.md](../../issues/chat-extraction-reliability-saga/attempts/ENH-044/specification.md) |
| Incremental mtime-skip bug (never ported from Claude's fix) | Codex | ✅ Fixed (v0.6.17) | [attempts/ENH-045/specification.md](../../issues/chat-extraction-reliability-saga/attempts/ENH-045/specification.md) |
| `.pb` sessions dated by file mtime, not content | Gemini | ✅ Fixed (v0.6.17) | [attempts/ENH-046/specification.md](../../issues/chat-extraction-reliability-saga/attempts/ENH-046/specification.md) |
| Whole session file dated by first message; multi-day sessions misfile | Claude | 🟡 Proposed, unfixed | [attempts/ENH-047/specification.md](../../issues/chat-extraction-reliability-saga/attempts/ENH-047/specification.md) |

---

## Outstanding Work

- ENH-044 (Gemini project-scoping) and ENH-047 (Claude multi-day bucketing) remain unfixed — see their linked specs for full Proposed Behavior / Acceptance Criteria.
- Once both ship, re-baseline extraction and revisit the still-unresolved "wrong session captured" symptom noted in the meta-issue's Attempt 003.

---

## Related

- Meta-issue (full saga, root-cause evolution, lessons): [`knowledge/issues/chat-extraction-reliability-saga/`](../../issues/chat-extraction-reliability-saga/README.md)
- `core/scripts/extract_claude.py`, `core/scripts/extract_gemini.py`, `core/scripts/extract_codex.py`, `core/scripts/chat_extractor_base.py`, `commands/kmg-extract-chat.md`
