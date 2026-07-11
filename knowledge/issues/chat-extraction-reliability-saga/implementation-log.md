# Implementation Log

Chronological record of all attempts to solve chat-extraction reliability.

**Total Attempts:** 9
**Last Updated:** 2026-07-11

---

## Attempt 001: Subagent message-loss fix (v0.6.16, ENH-038)

**Status:** Completed (shipped)
**ENH:** [ENH-038 umbrella](../../enhancements/ENH-038/ENH-038-specification.md) / [full spec](attempts/ENH-038/specification.md)
**Related:** branch `v0.6.16-update-claude-extract-chat-for-sub-agents`, PR #160, commits `1fbfda7d` / `ddeb1016` / `22c7559d` / `d13f8fd4`

**Approach:**
Replaced the buggy cross-file `last_ts` cutoff with per-message uuid dedup, and made the fresh-write path flatten+sort a date's messages chronologically instead of writing one `## Session N` block per source file.

**Outcome:**
Fixed subagent message loss going forward, but validated only against synthetic test fixtures — never against the repo's own real historical output. Did not self-heal already-written pre-fix files.

**Key Learning:**
Synthetic-only validation left a real-world gap that later surfaced as ENH-043.

---

## Attempt 002: Rebuild mode for permanently-corrupted output (v0.6.17, ENH-043)

**Status:** In progress / partially shipped
**ENH:** [ENH-038 umbrella](../../enhancements/ENH-038/ENH-038-specification.md) / [full spec](attempts/ENH-043/specification.md)
**Related:** branch `v0.6.17-fix-extract-chat-rebuild`, plan `knowledge/plans/v0.6.17-fix-extract-chat-rebuild.md`

**Approach:**
Added a `--rebuild` mode forcing the overwrite/flatten branch regardless of existing state, to repair files the pre-fix code left with stale header counts and leftover `## Session N` blocks (uuid dedup treats any already-written uuid as permanently "seen," so incremental runs never re-flatten).

**Outcome:**
Real-data repair run flagged **68 dates** (not the handful anticipated): **9 recovered** (2026-05-12…05-30, using a Backblaze backup the user located), **42 permanently unrecoverable** (2026-02-13…05-06, no source `.jsonl` exists anywhere), rest were false positives from an over-loose discovery regex (since tightened to 0 false positives). Health-check script renamed `find_corrupted_chat_files.py` → `check_extraction_health.py`.

**Key Learning:**
Historical repair is bounded by source-data availability; Claude Code rotates/prunes old session logs. The dedup mechanism's permanent-memory design was the root cause of stale output.

---

## Attempt 003: Dogfooding `--today` extraction, first run (2026-07-08)

**Status:** Failed
**Related:** dogfooding the v0.6.17 tooling on the very session building it.

**Approach:**
Ran `--today` extraction expecting today's real v0.6.17 conversation.

**Outcome:**
Produced a file whose message #1 content ("I've read the full file. Let me trace the security-relevant surface...") was clearly **not** from today's actual conversation — an unrelated short session was picked up instead of the real one.

**Key Learning:**
Shifted belief from "marketplace plugin staleness" to "the extractor is selecting/attributing the wrong session content" (Belief Shift #1). This "wrong session" symptom is noted for follow-up but its own root cause is not yet established.

---

## Attempt 004: Dogfooding `--today` extraction, second run → ENH-047 (2026-07-08)

**Status:** Failed, root-caused
**ENH:** [ENH-038 umbrella](../../enhancements/ENH-038/ENH-038-specification.md) / [full spec](attempts/ENH-047/specification.md)

**Approach:**
Re-ran `--source claude --project=knowledge-graph --today`, expecting ~3,100+ real messages.

**Outcome:**
Got only **36** of **3,114** real messages. Direct investigation counted 3,114 extractable messages across all `.jsonl` files modified today; replicating the extractor's own first-timestamp derivation showed the three largest files (2,916 messages) all bucket under **2026-07-06** — their 2026-07-08 content is unreachable by `--today`. Root cause: `extract_claude_sessions()` dates the whole file by its first message (`extract_claude.py` ~lines 176–181).

**Key Learning:**
Belief Shift #2 — the newest symptom is a distinct multi-day date-bucketing defect, upstream of ENH-043's append logic. Filed as ENH-047.

**Next Steps:**
Fix ENH-047 (per-message date derivation); re-baseline extraction; revisit Attempt-3's "wrong session" symptom afterward.

---

## Attempt 005: Gemini `--project` filter silently ignored (v0.6.17, ENH-044)

**Status:** Completed (shipped) — `.json`/`.jsonl` scoping (`bf1cb51c`), then fail-closed `.pb`/hash-dir scoping (`126d98ce`) after real-data testing found the first fix incomplete
**ENH:** [ENH-038 umbrella](../../enhancements/ENH-038/ENH-038-specification.md) / [full spec](attempts/ENH-044/specification.md)
**Discovered:** 2026-07-06, while manually validating ENH-038's Gemini `.jsonl` fix
**Related:** commits `bf1cb51c`/`1b2269cf` (`.json`/`.jsonl` fix+test), `ADR-062` (fail-closed decision), `126d98ce`/`faa393d6` (`.pb`/hash-dir fix+test); plan `knowledge/plans/v0.6.17-fix-extract-chat-multiday-bucketing.md`

**Approach:**
Added a `project_filter` param to `.json` and `.jsonl` per-format extraction functions and threaded it through `extract_all_gemini`/`run_extraction.py`, mirroring the Claude extractor's existing fragment-match pattern. The `.pb` path (`extract_gemini_pb_sessions`) initially accepted but ignored `project_filter`. Real-data testing (2026-07-09/10) found this incomplete — `.pb` files carry no per-project path signal at all — so a second fix (ADR-062, fail-closed exclusion) was recorded and shipped: when `project_filter` is set, all `.pb` sessions and hash-named `~/.gemini/tmp/` directories that can't be positively attributed to the project are excluded, with a visible skip notice.

**Outcome:**
`.json`/`.jsonl` contamination confirmed pre-fix and verified fixed: a `career-prism` session merged into `knowledge-graph`'s `2026-05-13-gemini.md` output despite `--project=knowledge-graph` being passed; four foreign date-files created with no knowledge-graph content at all. Fixed and tested (`tests/test-extraction-gemini-project-filter.sh`). Real-data testing on 2026-07-09 then found the `.pb` path applied no project filtering at all — masked only because `blackboxprotobuf` was absent on this machine. Fixed fail-closed (`126d98ce`) and re-verified against real data (2026-07-10): all 9 real hash-named directories and all 93 real `.pb` files correctly skipped with a visible notice, and the previously-confirmed `career-prism` contamination no longer appears. **ENH-044 is now fully resolved.**

**Key Learning:**
Partial fixes that scope one format but miss others create a false sense of completion and are easy to forget about, especially when one format is optional-dependency-gated (the `.pb` gap was masked by an absent optional dependency, not by correct behavior). Worth validating a fix against **all** supported input formats, not just the one that was easiest to reproduce contamination for.

---

## Attempt 006: Codex incremental mtime-skip bug (v0.6.17, ENH-045)

**Status:** Completed (shipped)
**Full spec:** [ENH-045/specification.md](attempts/ENH-045/specification.md)
**Discovered:** 2026-07-08
**Related:** commit `27a49f26` (fix), `97059c99` (test)

**Approach:**
Removed the mtime-skip block from `extract_codex_sessions`, mirroring the same fix already applied to Claude in commit `22c7559d`. No replacement dedup needed since Codex always fully overwrites rather than appending.

**Outcome:**
Fixed; `tests/test-extraction-codex-incremental.sh` (3/3) and full suite regression-free.

**Key Learning:**
The same anti-pattern removed from one extractor doesn't automatically get ported to its siblings — worth an explicit sweep across Claude/Gemini/Codex whenever one extractor's bug class is fixed.

---

## Attempt 007: Gemini `.pb` sessions dated by file mtime, not content (v0.6.17, ENH-046)

**Status:** Completed (shipped)
**Full spec:** [ENH-046/specification.md](attempts/ENH-046/specification.md)
**Discovered:** 2026-07-08, while implementing ENH-043's backup-recovery guidance

**Approach:**
Added `_find_epoch_hint()`, a heuristic scanner over the decoded protobuf structure that looks for plausible embedded Unix-epoch values, and prefers it over file mtime on the successful-decode path.

**Outcome:**
Fixed; verified via `tests/test-extraction-gemini-pb-timestamp-hint.sh`. Full `.pb`-file round-trip through the real `blackboxprotobuf` decoder not verified (optional dependency not installed in this environment) — heuristic function and call-site wiring both directly verified instead.

**Key Learning:**
Backup/restore scenarios (mtime changes on copy) are a recurring class of date-derivation bug across extractors — worth checking for on any future extractor touching mtime.

---

## Attempt 008: Per-message date bucketing fix (v0.6.17, ENH-047)

**Status:** Completed (shipped)
**Full spec:** [ENH-047/specification.md](attempts/ENH-047/specification.md)
**Discovered:** 2026-07-08 (Attempt 004); fixed 2026-07-10
**Related:** commits `665c6fed` (fix), `1f7c6112`/`fa78aba2` (tests); plan `~/.claude/plans/v0.6.17-fix-extract-chat-multiday-bucketing.md`

**Approach:**
Rewrote `extract_claude_sessions()`'s collection loop to derive each message's own UTC date from its own `timestamp`, bucketing messages per `(file, date)` instead of once per file. Untimestamped messages carry forward the nearest preceding timestamped record's date; leading untimestamped records are buffered until the first real date is known, then backfilled — a naive single-pass carry-forward can't resolve those correctly. Downstream grouping/date-filter/rebuild/incremental/split logic consumes the same entry shape unchanged.

**Outcome:**
`tests/test-extraction-multiday.sh` (16/16) covers fan-out, single-date-filter correctness, the no-timestamp fallback, and the mandatory ADR-044 split-day interaction (pre-seeded split subfolder, cross-part uuid-dedup union verified — the exact ENH-038 regression class, confirmed non-vacuous by tracing what the pre-fix code would have done against the same fixture). No regressions: `test-extraction.sh` (8/8), `test-extraction-subagent-repro.sh` (4/4), `test-extraction-rebuild.sh` (19/19). Real-data verification against live `~/.claude/projects/` logs found exact parity on all 4 dates checked (2026-07-06: 310, 2026-07-07: 234, 2026-07-08: 294, 2026-07-09: 149; total 987/987), including 25 real multi-day session files in that window now correctly bucketed.

**Key Learning:**
The task reviewer caught a hardcoded literal (`"3"` instead of the already-computed `$DAY3_COUNT`) in the new test that would have violated ADR-059's no-hardcoded-derivable-counts rule if left in — fixed same-task. Confirms this saga's task-review loop catches exactly the failure class (silent hardcoding creeping into otherwise-derived tests) the lessons-learned doc already flags as a recurring risk.

---

## Attempt 009: Post-merge regression fixes (v0.6.18, this branch, 2026-07-11)

**Status:** Completed (shipped, this branch)
**Related:** branch `v0.6.18-fix-extraction-regressions`, plan `knowledge/plans/v0.6.18-fix-extraction-regressions.md` (Opus-drafted, Fable-reviewed 3 rounds)
**Discovered:** 2026-07-10, via a post-merge Fable review of the full merged v0.6.17 diff (`git diff 3f36f8ca...8c56070a`) — the first time this saga's shipped code, not just its plan, was independently reviewed

**Approach:**
Six independent findings, fixed in one pass since all touch the same two files (`extract_claude.py`, `extract_gemini.py`) and their shared base (`chat_extractor_base.py`):
1. New `write_atomic()` (temp-file + `os.replace`) and `backup_aside()` (rename to timestamped, dot-hidden sibling, retention-capped at 3) helpers in `chat_extractor_base.py`, replacing `clear_split_subfolder`'s pre-write `shutil.rmtree` entirely.
2. Rebuild/overwrite branches in `extract_claude.py` rerouted through both helpers — backup-before-write for the primary target (so consecutive reruns each get a distinct backup, not one shared slot), backup-after-write for stale split dirs/duplicate flat copies elsewhere (since those aren't touched by the primary write and can safely wait).
3. `extract_gemini.py`'s `_filter_project_dirs` reordered to detect hash dirs before substring matching, closing the fail-open leak; `_HASH_DIR_RE` made case-insensitive.
4. `_find_epoch_hint` bounded (`MAX_SESSION_SPAN_DAYS=7`, anchored on `max(candidates)`), and three previously-silent mtime-fallback paths now emit loud, counted warnings.
5. New fixture + test step for the leading-untimestamped backfill path.
6. `run_extraction.py` warns explicitly when `--rebuild` is requested for a source that doesn't support it.

**A genuine design ambiguity surfaced mid-implementation** (not resolved by silently picking one option): the plan's numbered fix-shape steps said to `backup_aside` the split dir and duplicate flat copies *after* the write succeeds, but didn't explicitly address the *primary* output path's own pre-existing content — yet the plan's own Verification section required "a second distinct backup" on a second consecutive rebuild run, which only works if the primary path is backed up *before* being overwritten. Flagged to the user as a HALT; resolved as backup-before-write for the primary path specifically, backup-after-write for everything else — this is what actually shipped, and it's what made the plan's own verification pass.

**A second ambiguity surfaced during verification itself**, not before: fixing Finding 4's `min()`-outlier bug (bounding candidate timestamps to `MAX_SESSION_SPAN_DAYS=7`) broke a pre-existing test (`test-extraction-gemini-pb-timestamp-hint.sh` case 6) that assumed a 150-day gap between two legitimate timestamp candidates was normal. Rather than guessing, checked real evidence on this machine: the max internal timestamp span across all real `~/.gemini/tmp/` session files was ~29 minutes, zero files over 1 day. The 7-day bound was generous relative to observed reality, not overly strict — updated the old test's expectation to a realistic 3-day gap and added a new case explicitly proving the outlier-rejection behavior, rather than loosening the fix to accommodate an untested hypothetical.

**Outcome:**
All 6 findings fixed and verified: static grep checks (rmtree removed from the live rebuild path, `os.replace` present), a live behavioral run (seeded a stale split dir, ran `--rebuild` twice — first run backed up the split dir, second run produced a **second, distinct** backup of the first run's flat file, neither destroying the other), unit tests for the Gemini fail-open fix and the epoch-hint outlier bound, the new Step 5 backfill test, and warning-string checks for Finding 6. Full extraction suite: 9 files, 79 assertions, **0 failures** — including the pre-existing 16 multiday assertions (no regression from the write-path refactor) and 6 gemini-pb-timestamp-hint assertions (1 updated, 1 added) plus the 3 new multiday Step 5 assertions.

**Key Learning:**
Two lessons, both about not silently resolving ambiguity: (1) a plan's prose fix-shape and its own Verification section can quietly disagree — when they do, the verification section is often the more reliable disambiguator, since it encodes the actual required *outcome* rather than a step-by-step description that may have skipped a case. (2) When a code fix breaks a pre-existing test, check real evidence before deciding whether the fix or the test is wrong — in this case real machine data supported the fix's assumption, but the reverse could just as easily have been true, and guessing either way would have been the wrong process even if it landed on the right answer by luck.

**Post-verification real-data dogfooding (2026-07-11) found and fixed one more bug.** After the synthetic-fixture verification above, real production `--rebuild`/incremental runs were executed against this repo's actual `knowledge/chat-history/` (Claude and Gemini both) to prove Finding 1+2's fix against real content, not just fixtures. This surfaced a genuinely new, previously-unknown bug: 6 real chat-history dates already have split subfolders on disk (from an older extractor version) using a `-part-01.md` naming (hyphenated, zero-padded) that neither `split_file_if_oversized` (`chat_extractor_base.py`) nor `parse_seen_uuids` (`extract_claude.py`) recognized — both assumed a `-part1.md` format. Fixed by aligning current code to the real format (also fixing a latent >9-part sort-order bug the old scheme had). Fixing the first occurrence alone caused two test regressions (`test-extraction-multiday.sh`, `test-extraction-subagent-repro.sh`) from the second, missed occurrence in `extract_claude.py` — caught by re-running the full suite, not assumed fixed after one file. Full detail and the flagged future-validation checkpoint (Finding 1's real-data proof is still structurally incomplete — no real split date has surviving source logs to rebuild from): see meta-issue README's Outstanding section.

---

## Statistics

**By Outcome:**
- Completed & Successful (fully fixed): 6 (ENH-038, ENH-044, ENH-045, ENH-046, ENH-047, post-merge regression fixes v0.6.18)
- In Progress: 1 (ENH-043 — code/tests done; spec status line itself not yet flipped, see note below)
- Partially Fixed, Open: 0
- Not Started: 0
- Completed & Failed (root-caused, led to further work): 2 (dogfooding Attempts 3 & 4)
- Abandoned: 0
- **Unfixed, open (code):** none — ENH-038/044/045/046/047 and the 6 v0.6.18 post-merge findings are all fully resolved. ENH-043's code work is also done (rebuild mode shipped, tested, real-data repair run completed with its 42/68-unrecoverable data-availability ceiling documented) but its spec's own status line was never flipped from 🟡 Proposed to Resolved — that's the *original* v0.6.17 plan's still-outstanding Task 8 (a different plan than the one that closed out ENH-047/044), out of scope for this saga's current closeout pass.

---

## Pattern Analysis

**What's been tried:**
- Per-message uuid dedup (ENH-038)
- Forced overwrite/rebuild mode + real-data repair (ENH-043)
- Atomic writes + rename-aside backups, replacing destructive pre-write deletes (post-merge fixes, v0.6.18)

**What hasn't been tried:**
- Root-causing the `--today` "wrong session" selection (Attempt 3) — still outstanding, revisit now that ENH-047 and the v0.6.18 post-merge findings are both fixed

**Recurring failures:**
- Each fix addressed one symptom while a different root cause in the same subsystem remained — the pipeline had multiple independent defects.
- Synthetic-fixture-only validation repeatedly hid real-world-only failure modes.
