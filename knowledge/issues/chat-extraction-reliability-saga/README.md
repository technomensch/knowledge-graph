# Meta-Issue: Chat-Extraction Reliability Saga

**Domain:** data / debugging
**Scope:** v0.6.16 → v0.6.18 (ongoing); all three extractors (Claude, Gemini, Codex) as of the 2026-07-09 umbrella consolidation. v0.6.17 merged 2026-07-10 (PR #162); post-merge review findings pushed the saga's active scope to v0.6.18.
**Created:** 2026-07-08
**Status:** ✅ Resolved and merged to `main`. All 6 post-merge regression findings fixed, PR #164 merged `c968c1d5` (2026-07-11) — full extraction suite green (9 files, 79 assertions, 0 failures). v0.6.17 merged (PR #162, `8c56070a`, 2026-07-10); a post-merge Fable review the same day found these 6 correctness bugs in the shipped code (see "Post-Merge Regression Findings" below), all closed and now live on `main`. **Note:** the unrelated `kg-config-silent-overwrite` fix (`ac70b490`) was merged onto this same branch (`v0.6.18-fix-extraction-regressions`) per an explicit user decision on 2026-07-10 to ship both as one combined release rather than two — different root cause/subsystem, same branch and version number now. See `knowledge/issues/kg-config-silent-overwrite/`. No GitHub tracking issue exists for this saga (tracked purely in the KG via [ENH-038](../../enhancements/ENH-038/ENH-038-specification.md)); the `kg-config-silent-overwrite` sibling's GitHub issue [#163](https://github.com/technomensch/knowledge-graph/issues/163) auto-closed on this same merge.
**Tracked under:** single umbrella [ENH-038](../../enhancements/ENH-038/ENH-038-specification.md) — this saga was previously split across six ENH numbers (038/043/044/045/046/047); consolidated 2026-07-09 because one feature area ("extract chat history reliably") should not be scattered across six disconnected files. Each bug's full original spec is preserved under `attempts/ENH-0NN/specification.md`.
**Current Understanding:** Messages go missing/misfiled through several independent defects across all three extractors. Two waves of defects have now been found and fixed: (1) v0.6.17's date-derivation/scoping bugs (a whole session file dated by its first message; Gemini `--project` silently ignored), and (2) v0.6.18's write-path-safety and scoping-direction bugs found by a post-merge diff review (destroying old content before a new write is confirmed; a fail-closed scoping control that failed open under a specific input shape). The recurring lesson: reliability bugs in this subsystem cluster into distinct *classes* (date derivation, scoping direction, write safety) — fixing one class doesn't imply the others are covered.

---

## Navigation

- [Problem Description](description.md) — Living document (updated as understanding evolves)
- [Implementation Log](implementation-log.md) — All attempts chronologically
- [Test Cases](test-cases.md) — Validation scenarios
- [Attempts](attempts/) — Numbered folders with detailed results
- [Analysis](analysis/) — Root cause evolution, timeline, lessons
- [Related Issues](related-issues/github-links.md) — ENH / PR / GitHub references

---

## Quick Summary

**Problem:**
Extraction of Claude Code chat history into `knowledge/chat-history/` keeps losing or misfiling messages. What began (in v0.6.16) as a subagent message-loss bug has, across several sessions, turned out to be a cluster of independent defects in the extraction pipeline rather than a single fault — culminating (v0.6.17, dogfooding) in the discovery that a whole session `.jsonl` is date-bucketed by its first message's timestamp, so any session spanning multiple calendar days misfiles its later-day content under the start date.

**Current Status:**
- **Attempts:** 7 rounds logged (see implementation-log.md)
- **Latest Understanding:** ENH-047 (first-timestamp-only date derivation in `extract_claude_sessions()`) is **✅ Fixed (v0.6.17)** — per-message UTC-date bucketing implemented, tested (16/16, including the mandatory ADR-044 split-day interaction), and verified against real data (exact parity 987/987 across 4 dates, 25 real multi-day files correctly handled). Distinct from the incremental-append/rebuild defect (ENH-043) and the subagent-loss defect (ENH-038). ENH-044 (Gemini project-scoping) is **✅ Fixed (v0.6.17)** — `.json`/`.jsonl` scoping shipped first (`bf1cb51c`/`1b2269cf`), then a real-data test found the `.pb`/hash-dir contamination vector was still open; fixed fail-closed (ADR-062, `126d98ce`/`faa393d6`) and re-verified against real data.
- **Next Steps:** Re-baseline extraction now that both ENH-047 and ENH-044 are resolved; revisit Attempt-1's "wrong session captured" symptom, still not root-caused.

---

## Attempts

Full detail for each: [implementation-log.md](implementation-log.md). Original per-bug specs: `attempts/ENH-0NN/specification.md`.

1. **ENH-038 (v0.6.16)** — Fixed — subagent message loss (Claude) + format-drift (Gemini) + Codex audit; per-message uuid dedup replaced buggy cross-file `last_ts` cutoff.
2. **ENH-043 (v0.6.17)** — In progress — rebuild mode for permanently-corrupted pre-fix output (Claude); real-data repair run found 68 flagged dates (9 recovered / 42 unrecoverable / rest false-positives from over-loose regex, since tightened).
3. **Dogfooding Attempt 1 (2026-07-08)** — Failed — `--today` extraction captured an unrelated short session; message #1 content was not from today's real conversation.
4. **Dogfooding Attempt 2 (2026-07-08)** — Failed, root-caused → **ENH-047** — `--today` returned 36 of 3,114 real messages; multi-day session bucketing defect confirmed with real data (Claude). **Fixed (v0.6.17)** — see Attempt 8 in implementation-log.md.
5. **ENH-044 (v0.6.17)** — Fixed — Gemini `--project` filter. `.json`/`.jsonl` scoping shipped first (`bf1cb51c` fix, `1b2269cf` test), then real-data testing found `.pb`/hash-named-directory contamination was still possible; fixed fail-closed (ADR-062, `126d98ce` fix, `faa393d6` test) and re-verified against real `~/.gemini/` data — the previously-confirmed `career-prism` contamination no longer appears.
6. **ENH-045 (v0.6.17)** — Fixed — Codex incremental mtime-skip bug, mirrored from the Claude fix in ENH-038.
7. **ENH-046 (v0.6.17)** — Fixed — Gemini `.pb` sessions dated by file mtime instead of content; `_find_epoch_hint()` heuristic added.
8. **Post-merge regression fixes (v0.6.18, this branch, 2026-07-11)** — Fixed — all 6 findings from the post-merge Fable review (see section above): rebuild/overwrite write-path safety (`write_atomic`/`backup_aside`), Gemini fail-open scoping closed, `.pb` dating degradation made loud + outlier-bounded, leading-untimestamped test coverage added, `--rebuild` unsupported-source warning added. Full detail: [implementation-log.md](implementation-log.md).

---

## Post-Merge Regression Findings (2026-07-10, Fable review — fixed v0.6.18)

After PR #162 merged v0.6.17 to `main` (`8c56070a`), an independent Fable-model review of the full merged diff (`git diff 3f36f8ca...8c56070a`) — done specifically because no reviewer had looked at the diff itself before merge (only a plan-level Opus/Fable review had happened, earlier in this saga, on the multi-day-bucketing plan) — found real correctness bugs already live in the shipped code. None of these were regressions in what shipped as *fixed*; they were either pre-existing gaps the shipped fixes didn't fully close, or new code paths (`--rebuild`) that carried their own risk. All 6 fixed on this branch (`v0.6.18-fix-extraction-regressions`), most severe first:

1. **✅ Fixed — `--rebuild` + `--project` (or an interrupt) on a split date could permanently destroy content, no backup.** Was: `core/scripts/chat_extractor_base.py:26-29` (`clear_split_subfolder` → `shutil.rmtree`) ran before the fresh write, with no backup. **Fix:** `clear_split_subfolder` deleted entirely; new `write_atomic()` (temp-file + `os.replace`) and `backup_aside()` (rename to a timestamped, dot-hidden sibling — never delete) helpers added to `chat_extractor_base.py`. The rebuild path now resolves its flat output path directly (no longer routes through the stale split dir), writes atomically, and only *after* the write is confirmed does it back aside any stale split subfolder or duplicate flat copies found elsewhere — never destroying old content before the replacement exists. **Same shape as the kg-config-silent-overwrite incident** (`../kg-config-silent-overwrite/`), fixed the same way on the same day — see the new cross-cutting ADR below.
2. **✅ Fixed — single `.backup` slot could be clobbered on a second interrupted run.** Was: `extract_claude.py:~344-352`'s `shutil.copy2(... ".backup")` used one fixed slot; a second interrupted run destroyed the first good backup. **Fix:** `backup_aside()` gives every backup a pid + collision-counter-suffixed timestamp, so consecutive reruns each get their own distinct backup (retention-capped at 3). Verified live: two consecutive `--rebuild` runs against a seeded stale split dir produced two separate, distinct backups, neither destroying the other.
3. **✅ Fixed — Gemini fail-closed scoping (ADR-062) failed open for hex-named `--project` values.** Was: `extract_gemini.py`'s `_filter_project_dirs` ran substring match *before* hash-dir detection, so a hex `--project` value could substring-match a hash-named directory and leak its content. **Fix:** hash-dir detection now runs first and unconditionally excludes matches before substring matching ever sees them; `_HASH_DIR_RE` broadened to case-insensitive so uppercase-hex dirs are caught (and reported) too, closing the silent-exclusion gap. Unit-verified: a hex filter that substring-matches both a lowercase- and uppercase-hex hash dir now excludes both, with a skip notice.
4. **✅ Fixed — ENH-046 (`.pb` content-dating) was inert without `blackboxprotobuf`, silently.** Was: the epoch hint only applied inside the `HAS_BBP` decode branch; the raw-bytes fallback (reached when the dependency is absent, decode raises, or decoded content is empty) dated by mtime with no signal. **Fix:** a loud, counted warning now fires for all three silent paths (dependency absent: upfront actionable message; decode-raised/empty-segments: aggregate post-loop warning; decoded-but-no-hint: light per-file note). Also, `_find_epoch_hint`'s `min()` (spoofable by one stray in-range integer) is now bounded: anchors on `max(candidates)`, discards anything more than `MAX_SESSION_SPAN_DAYS=7` before it. **Real-data check** (this machine's own `~/.gemini/tmp/` session files) found the max internal timestamp span across all real sessions was ~29 minutes, zero files over 1 day — the 7-day bound is generous relative to observed reality, not overly strict. A pre-existing test (`test-extraction-gemini-pb-timestamp-hint.sh` case 6) assumed a 150-day gap between two legitimate candidates; updated to a realistic 3-day gap plus a new case explicitly proving the outlier-rejection behavior.
5. **✅ Fixed — test gap: ENH-047's leading-untimestamped edge case was never exercised.** New fixture `tests/fixtures/sample-claude-leading-untimestamped.jsonl` (starts with 2 untimestamped records, then timestamped ones) plus a new Step 5 in `test-extraction-multiday.sh`, confirming the `pending_untimestamped` backfill path (previously logic-correct-by-inspection only) actually works: all records land under the first derived date, none dropped.
6. **✅ Fixed — `--rebuild` was silently ignored for `--source gemini`/`codex`.** `run_extraction.py` now warns explicitly for `--source gemini`/`codex` + `--rebuild`, and notes for `--source all` that only the Claude portion rebuilds (Gemini's extractor already fully overwrites every date on every normal run, so this matters less than it sounds). Verified: warning strings confirmed present for all three cases.

**Verified correct in the same review** (no action needed, confirmed unaffected by this branch's fixes): ENH-045 (Codex mtime-skip fix) is equivalent-and-complete to the Claude fix it mirrors; ENH-047's core date-boundary math is UTC-consistent throughout; rebuild-precedence over incremental mode is real and correct; the test suite is notably better than happy-path-only (vacuous-pass guards, timezone-safe date derivation, a pinned-limitation tripwire for the 42 unrecoverable dates).

**Verification:** all 6 findings proven via a mix of static grep checks, live behavioral runs (real `--rebuild` invocations against seeded fixtures), and unit tests — no timing-dependent checks. Full extraction suite: 9 files, 79 assertions, 0 failures, including the pre-existing 16 multiday assertions (no regressions from the write-path refactor) plus 1 pre-existing test updated (see finding 4) and 1 new case added.

---

## Requirements

The umbrella requirement: `kmg-extract-chat` must extract every real message, under its correct date, for every source (Claude/Gemini/Codex), with no silent loss. Per-bug requirements (full acceptance criteria) live in each spec under `attempts/ENH-0NN/specification.md`:

| Bug | Requirement |
|---|---|
| ENH-038 | No subagent message loss; correct chronological interleaving; Gemini parses its streaming format; Codex verified clean |
| ENH-043 | A rebuild mode must exist and successfully repair pre-fix-corrupted output |
| ENH-044 | `--project` must actually scope Gemini output — no cross-project contamination — ✅ met |
| ENH-045 | Codex incremental mode must not silently skip runs based on file age |
| ENH-046 | Gemini `.pb` sessions must date from content, not file mtime (backup/restore safe) — ✅ met |
| Post-merge Finding 1+2 | Rebuild/overwrite must never destroy old content before the new write is confirmed — ✅ met |
| Post-merge Finding 3 | Fail-closed Gemini scoping must not fail open under any `--project` input, including hex values — ✅ met |
| Post-merge Finding 4 | `.pb` dating degradation to mtime must never be silent; outlier candidates must not mis-date the session — ✅ met |
| Post-merge Finding 5 | Leading-untimestamped backfill path must have test coverage — ✅ met |
| Post-merge Finding 6 | `--rebuild` must never silently no-op for an unsupported source — ✅ met |
| ENH-047 | Every message must file under its **own** date, even in sessions spanning multiple days — ✅ met |

## What Has Worked

- ENH-038, ENH-044, ENH-045, ENH-046, ENH-047 — all shipped, tested, verified against real data. No known regressions.
- ENH-043 — the rebuild mechanism itself works correctly; real-data run recovered 9 of 68 flagged dates.
- The 6 post-merge regression findings (v0.6.18) — all fixed, verified via static checks, live behavioral runs, and unit tests. Full suite: 9 files, 79 assertions, 0 failures.

## What Has Failed

- Two dogfooding extraction runs on real 2026-07-08 data both failed to return expected message counts (Attempts 3 & 4 in implementation-log.md) — these failures are what surfaced ENH-047, since fixed.
- ENH-043's repair could not recover 42 of 68 flagged historical dates — not a code failure, a data-availability limit (source logs no longer exist anywhere, including the located backup).
- ENH-044's first fix (`.json`/`.jsonl` scoping) was incomplete — real-data testing later found the `.pb`/hash-dir vector still leaked. This file previously (incorrectly, twice) claimed ENH-044 was fully fixed before it actually was; now genuinely resolved.

## Why the Second Fix Attempt (ENH-043) Didn't Fully Solve Reliability

ENH-043 (the rebuild mode) was the second fix in this saga, built directly on ENH-038. It did what it set out to do — force a clean re-flatten of corrupted output — and worked as designed. It did **not**, however, fully solve "extraction is reliable," for two reasons discovered only after it shipped:
1. **A different, upstream bug (ENH-047, since fixed) was still live.** ENH-043 fixes how already-written output gets repaired; it does nothing for the date a message is filed under in the first place. Dogfooding after ENH-043 shipped still returned only 36 of 3,114 real messages, because ENH-047's bucketing bug determined the date before ENH-043's logic ever ran.
2. **Historical repair has a hard ceiling.** 42 of 68 corrupted dates have no source data left on any machine or backup — no fix, however correct, can recover data that no longer exists anywhere.

So: ENH-043 succeeded at its own, narrower scope; the saga's *overall* reliability goal remained unmet because a second, independent defect (ENH-047) sat upstream of it, undiscovered until real-world dogfooding.

## Outstanding

- ~~**ENH-047** (Claude multi-day date-bucketing)~~ — **✅ Fixed (v0.6.17).** Was the highest-impact open item; per-message UTC-date bucketing shipped, tested, and verified against real data.
- ~~**ENH-044** (Gemini `.pb`/hash-dir cross-project contamination)~~ — **✅ Fixed (v0.6.17).** Fail-closed exclusion shipped and verified against real data.
- ~~**Post-merge regression findings (v0.6.18)**~~ — **✅ Fixed (this branch, 2026-07-11).** All 6 findings from the post-merge Fable review closed — see section above.
- ~~**Split-part filename naming mismatch (found + fixed, 2026-07-11)**~~ — **✅ Fixed.** Discovered while dogfooding Finding 1 against real data: 6 real chat-history dates (2026-02-13, 02-20, 02-21, 03-19, 03-25, 04-07) already have split subfolders on disk from an older extractor version, using a hyphenated, zero-padded naming (`-part-01.md`). Current code assumed a different format (`-part1.md`, no hyphen, no padding) in two places — `split_file_if_oversized`'s stem/part-number regex (`chat_extractor_base.py`) and `parse_seen_uuids`'s glob-family regex (`extract_claude.py`) — neither of which recognized the real on-disk format. `get_output_path`'s routing glob (wildcard-based) was unaffected and still worked. Fixed by aligning current code to the real, pre-existing format rather than migrating the real files: zero-padding also fixes a latent sort-order bug the old scheme had past 9 parts (`part10` would have sorted before `part2` alphabetically). Verified: regex tested directly against all 6 real filenames; full extraction suite re-verified at 79/79 after the fix (this change itself caused two test regressions during implementation — a duplicate-uuid bug from the same missed regex in `extract_claude.py` — caught and fixed before landing). Test fixtures (`test-extraction-multiday.sh`, `test-extraction-subagent-repro.sh`, `test-extraction-rebuild.sh`) and `commands/kmg-extract-chat.md`'s example paths updated to the aligned naming for consistency.
- **Dogfooding Attempt 1's "wrong session captured" symptom** — noted, not yet root-caused; now the sole remaining open item in this saga, since the post-merge findings are closed. Revisit and re-baseline extraction now that both waves of defects (v0.6.17 date/scoping, v0.6.18 write-safety/scoping-direction) are fixed.
- ENH-043's spec status line was never flipped from 🟡 Proposed to ✅ Resolved despite its code/tests being done — belongs to the *original* v0.6.17 plan's still-outstanding Task 8, not this saga's current closeout scope.
- **🚩 Flagged checkpoint — Finding 1's real-data validation is still incomplete, by structural necessity, not oversight.** Real-data dogfooding (2026-07-11) confirmed 6 real split dates exist, but none has surviving source `.jsonl` data (this machine's source logs only go back to 2026-06-10 — the same rotation limit ENH-043 already documented), so `--rebuild` against any of them finds zero sessions and never exercises the destroy-vs-backup write path. **Trigger condition: the next time any real chat-history date's flat `.md` file approaches or crosses the split threshold (900 KB / 30,000 lines) while its source `.jsonl` logs still exist** (i.e., a real split happens organically, not from historical data), that is the first opportunity to validate Finding 1's `backup_aside`/`write_atomic` behavior end-to-end against real content **and** a real rebuild. No automated hook exists in this repo to detect that condition (would require new file-size-monitoring infrastructure, out of this branch's scope) — this is a manually-checked flag, not an automatic one. Whoever next touches `--rebuild` or this saga should check `find knowledge/chat-history -maxdepth 2 -type d -regex '.*/[0-9]{4}-[0-9]{2}-[0-9]{2}$'` for any split date newer than 2026-06-10 and, if found, run the live behavioral validation (seed/observe a real `--rebuild` on that date, confirm old content backs up rather than destroys) before considering Finding 1 fully closed.

## Revert or Continue?

**Continue — no revert warranted.** Every shipped fix in this saga (ENH-038, 043, 044, 045, 046, 047, and the 6 post-merge findings) is additive, independently tested, and verified against real data or live behavioral runs, with no known regression in the *scenarios each fix targeted*. The post-merge review found separate, real bugs (now fixed) — not regressions caused by the v0.6.17 fixes, but pre-existing/adjacent gaps (rebuild's missing backup, the fail-closed control's incomplete hex-dir handling) that a plan-only review (no diff review) missed before merge. Next: re-baseline extraction now that both waves are closed, and root-cause the one remaining loose end — Attempt 1's "wrong session captured" symptom.

---

## Key Insights

- Different symptoms ("messages missing," "wrong session," "only 36 of 3,114") map to **different root causes** in the same subsystem — do not assume one fix covers all.
- Validating a fix only against synthetic fixtures (ENH-043) hid a real-world defect that only manifests against actual multi-day session logs.
- Dogfooding (using the newly-built v0.6.17 tooling on the very session that built it) surfaced the ENH-047 defect that unit tests never would have.
- **Reviewing only the plan, never the merged diff, missed 6 real bugs** (v0.6.18's post-merge findings) — a plan-level review checks intent; a diff review checks what actually shipped. Both are needed before merge, not just one.
- **"Never destroy known-good state before the replacement is confirmed written"** is now a cross-cutting principle, independently discovered twice in one day (this saga's rebuild/backup fix, and the sibling `kg-config-silent-overwrite` fix) — promoted to its own ADR (see below) rather than left as a one-off pattern per subsystem. Full detail: `analysis/lessons-learned.md`.
- **Fail-open vs. fail-closed is a matter of check *ordering*, not just intent** — ADR-062's scoping control intended fail-closed but failed open because substring-matching ran before hash-dir detection. A control's stated design and its actual behavior can diverge purely from statement order.
- **Optional-dependency fallbacks must fail loud, not silent** — `.pb` dating silently degraded to mtime in three different code paths when `blackboxprotobuf` wasn't usable; none of them had signal until this pass added one.

---

## Related Design Work in v0.6.17 (Same Branch, Not Its Own Attempt)

The `v0.6.17-fix-extract-chat-rebuild` branch also produced a design decision and two code-review passes touching this saga's fixes, worth knowing when reading the history:

- **ADR-061 (first-run repair notice must be platform-specific):** design decision that Claude/Gemini/Codex needed three different first-run user-facing notices, not one unified mechanism — because their failure modes are genuinely different (Claude = data loss, Gemini = contamination, Codex = staleness). Two Opus design consults were run for this; the first (a single uniform y/N prompt) was explicitly rejected by the user as too thin before the accepted platform-specific design was built.
- **Two rounds of Opus code review** during v0.6.17 implementation: round 1 (reviewing the first-run-notice implementation) found and fixed 4 real bugs — a sequencing bug in the rebuild logic (split-subfolder cleared after, not before, `output_path` was resolved), a version-comparison bug (naive string comparison instead of numeric, which would misfire for versions like `0.6.9` vs `0.6.17`), an infinite-re-prompt risk (one menu option never routed to the version-stamp write), and an undefined-variable ordering bug (`$chat_history` referenced before it was computed). Round 2 (reviewing the Codex fix + ENH-043/045 doc updates) found zero bugs — every claim checked out against re-run tests.

---

## Related Issues

See [related-issues/github-links.md](related-issues/github-links.md).

- [ENH-038 umbrella](../../enhancements/ENH-038/ENH-038-specification.md) — single tracking ENH for this whole feature area (was 6 numbers, consolidated 2026-07-09)
- [attempts/ENH-038/specification.md](attempts/ENH-038/specification.md) — original subagent message-loss + Gemini format-drift + Codex audit
- [attempts/ENH-043/specification.md](attempts/ENH-043/specification.md) — rebuild mode / incremental-append dedup permanence
- [attempts/ENH-044/specification.md](attempts/ENH-044/specification.md) — Gemini `project_filter` contamination fix (partially fixed: `.json`/`.jsonl` scoping verified working (`bf1cb51c`/`1b2269cf`); `.pb` path still leaks unfiltered sessions — OPEN)
- [attempts/ENH-045/specification.md](attempts/ENH-045/specification.md) — Codex incremental mtime-skip fix
- [attempts/ENH-046/specification.md](attempts/ENH-046/specification.md) — Gemini `.pb` date-derivation defect
- [attempts/ENH-047/specification.md](attempts/ENH-047/specification.md) — multi-day date-bucketing defect — ✅ Fixed (v0.6.17)
- [ADR-044](../../decisions/ADR-044-split-oversized-chat-history-files.md) — **pre-existing spec, predates this saga (2026-04-23).** Governs when/how a daily output file gets split into `-part1.md`/`-part2.md`/… (900 KB / 30,000-line threshold, for Obsidian compatibility). ENH-038's fix had to be made compatible with this (uuid-dedup must union across all split parts, not just the last one). ENH-047's fan-out-by-date fix stayed compatible with it too — verified against a pre-split-day fixture (`tests/test-extraction-multiday.sh` Step 4).
- [ADR-062](../../decisions/ADR-062-gemini-pb-project-scoping-fail-closed.md) — Records the fail-closed decision for ENH-044's remaining `.pb`/hash-dir contamination vector. **Amended 2026-07-11:** a check-ordering regression let this control fail open for hex-valued `--project` filters; closed (see Post-Merge Regression Findings, finding 3).
- [ADR-063](../../decisions/ADR-063-never-destroy-known-good-state-before-confirmed-write.md) — **New (2026-07-11).** Cross-cutting write-safety principle, prompted by this saga's rebuild write-path fix (findings 1+2) and the sibling `kg-config-silent-overwrite` incident hitting the identical anti-pattern the same day.
- [ADR-061](../../decisions/ADR-061-first-run-repair-notice-platform-specific-not-unified.md) — platform-specific first-run notice design decision (same branch — see "Related Design Work" above)

---

## How to Use This Meta-Issue

1. **Add attempt:** Create new `attempts/NNN-name/` folder from attempt-template.
2. **Update understanding:** Edit `analysis/root-cause-evolution.md` when beliefs shift.
3. **Log progress:** Update `implementation-log.md` with each attempt.
4. **Extract lessons:** Record reusable insights in `analysis/lessons-learned.md`.
