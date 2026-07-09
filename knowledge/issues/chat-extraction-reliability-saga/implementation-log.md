# Implementation Log

Chronological record of all attempts to solve chat-extraction reliability.

**Total Attempts:** 7
**Last Updated:** 2026-07-09

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

**Status:** Completed (shipped) — mislabeled "Not started" here until 2026-07-09, when drafting the ENH-047 fix plan found it was already implemented and committed; corrected.
**ENH:** [ENH-038 umbrella](../../enhancements/ENH-038/ENH-038-specification.md) / [full spec](attempts/ENH-044/specification.md)
**Discovered:** 2026-07-06, while manually validating ENH-038's Gemini `.jsonl` fix
**Related:** commit `bf1cb51c` (fix), `1b2269cf` (test)

**Approach:**
Added a `project_filter` param to all three Gemini per-format extraction functions and threaded it through `extract_all_gemini`/`run_extraction.py`, mirroring the Claude extractor's existing fragment-match pattern.

**Outcome:**
Confirmed real contamination pre-fix: a `career-prism` session merged into `knowledge-graph`'s `2026-05-13-gemini.md` output despite `--project=knowledge-graph` being passed; four foreign date-files created with no knowledge-graph content at all. Fixed and tested (`tests/test-extraction-gemini-project-filter.sh`); only the spec's own status line/acceptance criteria were never flipped to match — closeout folded into the ENH-047 fix plan.

**Key Learning:**
Gemini's extractor had no project-scoping step at all — unlike Claude, which already filtered project directories by fragment match before globbing. Separately: a shipped fix's own spec can silently go stale (status left at "Proposed" after the code landed) — worth a status-line check whenever revisiting an ENH during later work, not just trusting the doc.

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

## Statistics

**By Outcome:**
- Completed & Successful: 4 (ENH-038, ENH-044, ENH-045, ENH-046)
- In Progress: 1 (ENH-043)
- Not Started: 0
- Completed & Failed (root-caused, led to further work): 2 (dogfooding Attempts 3 & 4)
- Abandoned: 0
- **Unfixed, open:** ENH-047 (ENH-044 is shipped; only its spec closeout is open)

---

## Pattern Analysis

**What's been tried:**
- Per-message uuid dedup (ENH-038)
- Forced overwrite/rebuild mode + real-data repair (ENH-043)

**What hasn't been tried:**
- Per-message (rather than per-session) date derivation (ENH-047 — the fix for the newest defect)
- Root-causing the `--today` "wrong session" selection (Attempt 3)

**Recurring failures:**
- Each fix addressed one symptom while a different root cause in the same subsystem remained — the pipeline had multiple independent defects.
- Synthetic-fixture-only validation repeatedly hid real-world-only failure modes.
