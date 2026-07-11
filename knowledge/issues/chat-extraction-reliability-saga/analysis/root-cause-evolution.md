# Root Cause Evolution

How our understanding of the root cause changed over time.

**Created:** 2026-07-08
**Last Updated:** 2026-07-11
**Total Belief Shifts:** 3

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

## Belief Shift #3 (2026-07-11)

**Previous Understanding:**
"Reliability" meant getting every message filed under its correct date, from the correct project — the ENH-038/043/044/045/046/047 wave of fixes (message loss, dedup permanence, scoping, mtime skip, content-dating, date bucketing) covered the full defect surface once all six shipped and were verified against real data.

**New Understanding:**
Reliability also has a **write-path-safety** dimension and a **scoping-direction** dimension that no prior fix in this saga had touched, because none of the prior fixes were reviewed against the actual merged diff — only against their own plans. A post-merge Fable review of the full v0.6.17 diff found: (1) the rebuild/overwrite write path could destroy old good content before a new write was confirmed (`shutil.rmtree` before write, single clobberable `.backup` slot, no atomic write) — a data-loss class distinct from anything "date derivation" or "scoping" describes; (2) ADR-062's fail-closed Gemini scoping control could fail **open** under a specific input shape (a hex `--project` value substring-matching a hash dir) purely because of check *ordering*, not any flaw in the control's stated design.

**Evidence:**
- Post-merge Fable review, `git diff 3f36f8ca...8c56070a`, 2026-07-10 (see [implementation-log.md Attempt 009](../implementation-log.md#attempt-009-post-merge-regression-fixes-v0618-this-branch-2026-07-11) and the meta-issue README's "Post-Merge Regression Findings" section).
- Live behavioral proof: seeding a stale split dir and running `--rebuild` twice showed the pre-fix code's `rmtree` would have destroyed it outright; the post-fix code backed it up instead, with a second distinct backup on the second run.
- Unit proof: a hex `--project` filter substring-matching a hash dir was included (fail-open) pre-fix, excluded (fail-closed, with notice) post-fix.

**Impact:**
"Extraction is reliable" now explicitly includes: correct date/project attribution (v0.6.17's scope) **and** never destroying existing good output as a side effect of fixing or rebuilding it (v0.6.18's scope). The latter is not specific to this subsystem — it's the same principle independently found the same day in the sibling `kg-config-silent-overwrite` issue, now promoted to its own cross-cutting ADR rather than left as a per-subsystem pattern.

**Confidence:** High (reproduced live; both findings unit- and behaviorally-verified; zero regressions across the full 79-assertion suite).

---

## Pattern Analysis

**How Understanding Evolved:**
1. **Packaging phase:** blamed marketplace plugin version staleness.
2. **Attribution phase:** found the wrong session's content was being extracted.
3. **Mechanism phase:** pinned the concrete first-timestamp-only date-bucketing defect (ENH-047).
4. **Write-safety phase (v0.6.18):** found that "reliable extraction" also requires never destroying existing good output before a replacement is confirmed written, and that a fail-closed control's stated intent doesn't guarantee its actual behavior — check ordering matters. Surfaced only once the *shipped diff*, not just the plan, was independently reviewed.

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
