# Problem Description (Living Document)

**Created:** 2026-07-08
**Last Updated:** 2026-07-08
**Current Status:** Investigating

---

## Current Understanding

**Root Cause (Current Belief):**
The Claude chat extractor loses/misfiles messages through **multiple independent defects**, not one. The newest and most impactful, found by dogfooding v0.6.17, is that `extract_claude_sessions()` derives a whole session file's date bucket from only its **first** timestamped message and files every subsequent message under that one date. Because Claude Code sessions are resumed via `/clear` or context-compaction and routinely span multiple calendar days, every later-day message is misfiled under the session's start date and becomes invisible to any single-date filter (`--today`, `--date=`). This is tracked as ENH-047 and is distinct from ENH-043 (incremental-append uuid-dedup permanence) and ENH-038 (subagent message loss).

**Confidence Level:** High (reproduced with real data; extractor's own derivation logic replicated by hand and matched)

**Evidence:**
- `--today` on 2026-07-08 returned 36 messages; direct count of raw `.jsonl` files modified today = 3,114 real extractable messages.
- The three largest files (785 + 811 + 1,320 = 2,916 messages) all first-derive `session_date = 2026-07-06`, so none of their 2026-07-08 content is reachable via `--today`.
- Offending guard: `extract_claude.py` ~lines 176–181, `if not session_date and obj.get('timestamp')` — sets the date once and never recomputes per message.

**Last Updated:** 2026-07-08 (Belief Shift #2)

---

## Problem Statement

**Symptom:**
Extraction into `knowledge/chat-history/` repeatedly produces incomplete or wrong output: missing subagent turns, permanently-stale pre-fix files, an unrelated session captured under `--today`, and (latest) only 36 of ~3,114 messages returned for the current day.

**Impact:**
- Affects anyone relying on `knowledge/chat-history/` as an accurate record for recall, session summaries, or KG extraction.
- Severity: high — date-filtered extraction silently returns a tiny fraction of real content, with no error to signal the loss.

**Scope:**
- **Included (as of 2026-07-09 umbrella consolidation):** all three chat-history extractors — Claude (`core/scripts/extract_claude.py`), Gemini (`extract_gemini.py`), Codex (`extract_codex.py`) — and their shared base (`chat_extractor_base.py`, `run_extraction.py`). This meta-issue is now the single narrative home for the whole "extract-chat-history reliability" feature area, tracked under one umbrella ENH ([ENH-038](../../enhancements/ENH-038/ENH-038-specification.md)) instead of six separate ENH numbers. See `attempts/ENH-0NN/specification.md` for each bug's full original spec.

---

## Initial Hypothesis

The extraction problems were believed to stem from **marketplace plugin version staleness** — that an out-of-date installed plugin was running old extraction code.

**Tested in:**
- Dogfooding Attempt 1 (2026-07-08)

**Result:**
Incorrect. The plugin version was not the cause; Attempt 1 instead revealed that a *wrong/unrelated session's content* was being extracted, shifting the investigation away from packaging and into the extractor's own logic.

---

## Evolution of Understanding

See [analysis/root-cause-evolution.md](analysis/root-cause-evolution.md) for full belief-shift detail.

- **Belief Shift #1** (2026-07-08): "marketplace plugin version staleness" → "wrong session content is being extracted."
- **Belief Shift #2** (2026-07-08): "wrong session captured" → "real multi-day session-bucketing defect: whole file dated by its first message" (ENH-047).

---

## Current Investigation Focus

**Active Hypotheses:**
1. Fixing per-message date derivation (ENH-047) recovers the missing multi-day content — primary.
2. Attempt-1's "wrong session captured" is a separate `--today` session-selection issue that may remain after ENH-047 lands — secondary, revisit after re-baseline.

**Unanswered Questions:**
- After ENH-047 is fixed, does `--today` still occasionally select an unrelated session (Attempt 1)?
- How many historical dates in `knowledge/chat-history/` need re-running once source data exists?

**Blocked Items:**
- Full historical repair is bounded by source-data availability (see ENH-043 Outcome: 42 dates permanently unrecoverable).

---

## Success Criteria

1. `--today` / `--date=` return the messages that actually occurred on that date, regardless of session start date.
2. Multi-day session `.jsonl` files fan out across the correct per-day output files.
3. No regressions in ENH-038 subagent handling or ENH-043 rebuild behavior.

**Validation:**
Re-run `--source claude --project=knowledge-graph --today` on 2026-07-08 and confirm ~3,114 messages surface, plus a multi-day fixture regression test.

---

**Update History:**
- 2026-07-08: Initial description; two belief shifts recorded; ENH-047 filed.
- 2026-07-09: Consolidated ENH-038/043/044/045/046/047 into single umbrella ENH-038; this meta-issue's scope widened to cover all three extractors (was Claude-only); root cause was tracking one feature area across six ENH numbers instead of one — see `knowledge/rules.md` Bug/Enhancement Triage for the new same-feature-area check added to prevent recurrence.
