# Root Cause Evolution

How our understanding of the root cause changed over time.

**Created:** 2026-07-08
**Last Updated:** 2026-07-08
**Total Belief Shifts:** 2

---

## Belief Shift #1 (2026-07-08)

**Previous Understanding:**
The extraction problems were caused by **marketplace plugin version staleness** — an out-of-date installed kmgraph plugin running old extraction code, so the "right" fix was a packaging/version concern.

**New Understanding:**
The plugin version was not the cause. Dogfooding Attempt 1 ran `--today` and got a file whose message #1 ("I've read the full file. Let me trace the security-relevant surface...") clearly was not from today's actual conversation. The extractor was **capturing the wrong/unrelated session's content**, moving the investigation out of packaging and into the extractor's own logic.

**Evidence:**
- [Dogfooding Attempt 1](../implementation-log.md#attempt-003-dogfooding---today-extraction-first-run-2026-07-08)
- Extracted message #1 content did not match the real v0.6.17 conversation.

**Impact:**
Stopped chasing plugin/version packaging; started inspecting how the extractor selects and attributes session content.

**Confidence:** Medium (symptom clear; the "wrong session" mechanism itself not yet fully root-caused)

---

## Belief Shift #2 (2026-07-08)

**Previous Understanding:**
The extractor was simply "capturing the wrong session" — an opaque selection/attribution glitch.

**New Understanding:**
There is a concrete, reproducible **multi-day date-bucketing defect**: `extract_claude_sessions()` derives a whole session file's date from only its **first** timestamped message and files every later message under that same date. Since sessions span multiple calendar days (resumed via `/clear`/compaction), later-day content is misfiled under the start date and is invisible to `--today`/`--date=` filters. This is upstream of, and distinct from, ENH-043's incremental-append dedup permanence.

**Evidence:**
- [Dogfooding Attempt 2](../implementation-log.md#attempt-004-dogfooding---today-extraction-second-run--enh-047-2026-07-08)
- `--today` returned 36 of 3,114 real messages.
- Three largest files (2,916 messages) all first-derive `session_date = 2026-07-06`.
- Offending code: `extract_claude.py` ~lines 176–181, `if not session_date and obj.get('timestamp')`.
- Filed as [ENH-047](../../../enhancements/ENH-047/ENH-047-specification.md).

**Impact:**
Reframed the saga from "one extraction bug" to "a cluster of independent defects in one subsystem" (ENH-038 subagent loss → ENH-043 rebuild/dedup permanence → ENH-047 date derivation). The fix path is now per-message date derivation, separate from all prior fixes.

**Confidence:** High (reproduced with real data; derivation logic replicated by hand and matched).

---

## Pattern Analysis

**How Understanding Evolved:**
1. **Packaging phase:** blamed marketplace plugin version staleness.
2. **Attribution phase:** found the wrong session's content was being extracted.
3. **Mechanism phase:** pinned the concrete first-timestamp-only date-bucketing defect (ENH-047).

**Key Turning Points:**
- Dogfooding Attempt 1's mismatched message #1 → Belief Shift #1.
- Dogfooding Attempt 2's 36-of-3,114 count + hand-replicated derivation → Belief Shift #2.

**What We Got Right:**
- Persisting on the assumption that messages were genuinely missing (not merely mis-counted).

**What We Got Wrong:**
- Initially attributing it to packaging/version staleness rather than extractor logic.
- Assuming a single root cause; it is several.

---

## Lessons for Future Investigations

**Signals We Missed:**
- A returned count wildly below the known real count (36 vs 3,114) is a bucketing/selection signal, not a "quiet day" — check date derivation early.

**What Helped:**
- Replicating the extractor's own derivation logic by hand against real files, rather than trusting its output.
- Dogfooding on a real, long, multi-day session.

**What Didn't Help:**
- Reasoning about plugin packaging/version before confirming the extractor's own logic.
