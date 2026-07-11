# Meta-Issue: Chat-Extraction Reliability Saga

**Domain:** data / debugging
**Scope:** v0.6.16 → v0.6.18 (ongoing); all three extractors (Claude, Gemini, Codex) as of the 2026-07-09 umbrella consolidation. v0.6.17 merged 2026-07-10 (PR #162); post-merge review findings pushed the saga's active scope to v0.6.18.
**Created:** 2026-07-08
**Status:** Investigating — v0.6.17 merged (PR #162, `8c56070a`, 2026-07-10), but a post-merge Fable review the same day found real correctness bugs in the shipped code (see "Post-Merge Regression Findings" below). Targeted for `v0.6.18`. **Note:** the unrelated `kg-config-silent-overwrite` fix (`ac70b490`) was merged onto this same branch (`v0.6.18-fix-extraction-regressions`) per an explicit user decision on 2026-07-10 to ship both as one combined release rather than two — different root cause/subsystem, same branch and version number now. See `knowledge/issues/kg-config-silent-overwrite/`.
**Tracked under:** single umbrella [ENH-038](../../enhancements/ENH-038/ENH-038-specification.md) — this saga was previously split across six ENH numbers (038/043/044/045/046/047); consolidated 2026-07-09 because one feature area ("extract chat history reliably") should not be scattered across six disconnected files. Each bug's full original spec is preserved under `attempts/ENH-0NN/specification.md`.
**Current Understanding:** Messages go missing/misfiled through several independent defects across all three extractors; the latest and most impactful is that a whole Claude session file is date-bucketed by its first message, so multi-day sessions misfile all later-day content under their start date.

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

---

## Post-Merge Regression Findings (2026-07-10, Fable review — targeted for v0.6.18)

After PR #162 merged v0.6.17 to `main` (`8c56070a`), an independent Fable-model review of the full merged diff (`git diff 3f36f8ca...8c56070a`) — done specifically because no reviewer had looked at the diff itself before merge (only a plan-level Opus/Fable review had happened, earlier in this saga, on the multi-day-bucketing plan) — found real correctness bugs already live in the shipped code. None of these are regressions in what shipped as *fixed*; they're either pre-existing gaps the shipped fixes didn't fully close, or new code paths (`--rebuild`) that carry their own risk. Most severe first:

1. **`--rebuild` + `--project` (or an interrupt) on a split date can permanently destroy content, no backup.** `core/scripts/chat_extractor_base.py:26-29` (`clear_split_subfolder` → `shutil.rmtree`) runs before the fresh write, with no backup — unlike the flat-file overwrite path, which does create a `.backup` (`extract_claude.py:~347`). Two concrete scenarios: (a) `--rebuild --project X` on a date whose split parts contain project Y's messages — the split dir is `rmtree`'d, the fresh file is rebuilt from project X's sources only, and Y's content for that date is gone with no backup; (b) interrupted between the `rmtree` and the write — split parts gone, nothing written, recoverable only if the source `.jsonl` still exists (ENH-043 exists precisely because sources rotate and often don't). **Same shape as the kg-config-silent-overwrite incident** (`../kg-config-silent-overwrite/`) — clobber-before-write with no atomic guard, on a repo that has now hit this pattern twice in one day.
2. **Single `.backup` slot gets clobbered on a second interrupted run.** `extract_claude.py:~344-352`: run 1 backs up the good pre-fix file, gets interrupted mid-write leaving a truncated file; run 2's `copy2` overwrites the *good* backup with the truncated one. No atomic temp-file+rename anywhere in the write path.
3. **Gemini fail-closed scoping (ADR-062) fails open for hex-named `--project` values.** `extract_gemini.py:~442` (`_filter_project_dirs`): fragment/substring match runs *before* hash-dir detection, so a `--project` value made of hex chars (e.g. `ace`, `cafe`, `dead`) substring-matches a hash-named directory and includes its unattributable content — the exact leak ADR-062 exists to prevent. Also: hash dirs in uppercase hex or other formats miss `_HASH_DIR_RE` and are excluded *silently*, contradicting ADR-062's "never silent" design claim.
4. **ENH-046 (`.pb` content-dating) is inert without `blackboxprotobuf` installed.** The epoch hint is only applied inside the `HAS_BBP` decode branch (`extract_gemini.py:~586`); the raw-bytes fallback branch still dates by mtime — silently, on any machine without the optional dependency (confirmed: this session's own test environment lacks it). Also, `_find_epoch_hint`'s `min()` over all plausible ints in a 10-year window means one spurious in-range integer mis-dates the whole session, preferred over a correct mtime.
5. **Test gap: ENH-047's leading-untimestamped edge case is never exercised.** `tests/fixtures/sample-claude-multiday-session.jsonl`'s only untimestamped record comes *after* timestamped ones, so the `pending_untimestamped` backfill path (`extract_claude.py:~271-273`) is dead code in the test suite. Logic looks correct by inspection (backfills to the first *following* date; an all-untimestamped file emits nothing, matching prior behavior) but is unverified.
6. **`--rebuild` is silently ignored for `--source gemini`/`codex`.** `run_extraction.py:633-651` threads `rebuild` only to the Claude path; no warning surfaces for other sources.

**Verified correct in the same review** (no action needed): ENH-045 (Codex mtime-skip fix) is equivalent-and-complete to the Claude fix it mirrors; ENH-047's core date-boundary math is UTC-consistent throughout; rebuild-precedence over incremental mode is real and correct; the new test suite is notably better than happy-path-only (vacuous-pass guards, timezone-safe date derivation, a pinned-limitation tripwire for the 42 unrecoverable dates).

**Next steps:** open dedicated attempts (likely ENH-048 through ENH-05x, or append to this saga per the same-feature-area convention) for findings 1–6, prioritized by severity. Findings 1–2 (rebuild data-loss) are the most urgent — same failure class as `kg-config-silent-overwrite`, meaning this repo now has two independent confirmed instances of "clobber real data before ensuring the write succeeds" in one day, which itself may be worth a standalone lesson/pattern entry once both are fixed.

---

## Requirements

The umbrella requirement: `kmg-extract-chat` must extract every real message, under its correct date, for every source (Claude/Gemini/Codex), with no silent loss. Per-bug requirements (full acceptance criteria) live in each spec under `attempts/ENH-0NN/specification.md`:

| Bug | Requirement |
|---|---|
| ENH-038 | No subagent message loss; correct chronological interleaving; Gemini parses its streaming format; Codex verified clean |
| ENH-043 | A rebuild mode must exist and successfully repair pre-fix-corrupted output |
| ENH-044 | `--project` must actually scope Gemini output — no cross-project contamination — ✅ met |
| ENH-045 | Codex incremental mode must not silently skip runs based on file age |
| ENH-046 | Gemini `.pb` sessions must date from content, not file mtime (backup/restore safe) |
| ENH-047 | Every message must file under its **own** date, even in sessions spanning multiple days — ✅ met |

## What Has Worked

- ENH-038, ENH-044, ENH-045, ENH-046, ENH-047 — all shipped, tested, verified against real data. No known regressions.
- ENH-043 — the rebuild mechanism itself works correctly; real-data run recovered 9 of 68 flagged dates.

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
- **Dogfooding Attempt 1's "wrong session captured" symptom** — noted, not yet root-caused; revisit once the post-merge regression findings below are closed.
- ENH-043's spec status line was never flipped from 🟡 Proposed to ✅ Resolved despite its code/tests being done — belongs to the *original* v0.6.17 plan's still-outstanding Task 8, not this saga's current closeout scope.
- **Post-merge regression findings (new, 2026-07-10)** — 6 findings from the post-merge Fable review (see section above), targeted for `v0.6.18`. Most urgent: findings 1–2 (`--rebuild` data-loss, no backup before `rmtree`/no atomic write) and finding 3 (Gemini fail-open hex-substring leak in ADR-062's own fail-closed control).

## Revert or Continue?

**Continue — no revert warranted.** Every shipped fix in this saga (ENH-038, 044, 045, 046, 047) is additive, independently tested, and verified against real data with no known regression in the *scenarios each fix targeted*. The post-merge review found separate, real bugs (see above) — not regressions caused by the fixes, but pre-existing/adjacent gaps (rebuild's missing backup, the fail-closed control's incomplete hex-dir handling) that a plan-only review (no diff review) missed before merge. Next: fix the v0.6.18 findings above, then re-baseline extraction and root-cause the one remaining loose end — Attempt 1's "wrong session captured" symptom.

---

## Key Insights

- Different symptoms ("messages missing," "wrong session," "only 36 of 3,114") map to **different root causes** in the same subsystem — do not assume one fix covers all.
- Validating a fix only against synthetic fixtures (ENH-043) hid a real-world defect that only manifests against actual multi-day session logs.
- Dogfooding (using the newly-built v0.6.17 tooling on the very session that built it) surfaced the ENH-047 defect that unit tests never would have.

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
- [ADR-062](../../decisions/ADR-062-gemini-pb-project-scoping-fail-closed.md) — **new (2026-07-10).** Records the fail-closed decision for ENH-044's remaining `.pb`/hash-dir contamination vector.
- [ADR-061](../../decisions/ADR-061-first-run-repair-notice-platform-specific-not-unified.md) — platform-specific first-run notice design decision (same branch — see "Related Design Work" above)

---

## How to Use This Meta-Issue

1. **Add attempt:** Create new `attempts/NNN-name/` folder from attempt-template.
2. **Update understanding:** Edit `analysis/root-cause-evolution.md` when beliefs shift.
3. **Log progress:** Update `implementation-log.md` with each attempt.
4. **Extract lessons:** Record reusable insights in `analysis/lessons-learned.md`.
