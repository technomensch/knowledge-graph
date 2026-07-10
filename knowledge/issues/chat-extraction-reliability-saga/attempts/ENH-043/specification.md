# ENH-043: Claude extractor has no rebuild mode — pre-fix output files stay permanently corrupted

**Status:** 🟡 Proposed
**Discovered:** 2026-07-06
**Governed by:** none (bug-fix, not a new command/skill/docstring — ADR-058's naming/scope check does not apply)
**Related:** `core/scripts/extract_claude.py`, `core/scripts/chat_extractor_base.py`, [ENH-038](../ENH-038/specification.md) (the original message-loss finding this ENH's fix built on), branch `v0.6.16-update-claude-extract-chat-for-sub-agents` (merged, PR #160), plan `knowledge/plans/v0.6.16-fix-extract-chat-subagents.md`

---

## Problem

The v0.6.16 fix (plan Tasks 1–3, commits `1fbfda7d`/`ddeb1016`/`22c7559d`/`d13f8fd4`) replaced the buggy cross-file `last_ts` cutoff with per-message uuid dedup, and made the fresh-write path flatten+sort all of a date's messages chronologically instead of writing one `## Session N` block per source file. This was validated only against synthetic test fixtures (`tests/test-extraction-subagent-repro.sh`) — never against the repo's own real historical output. It does not self-heal files that were already written by the pre-fix code, and a full-history forensic audit (this session, via a dedicated research pass) confirms the resulting gap is real and non-trivial:

**Quantified scope (2026-05-30 → 2026-07-06, full project history):**
- 2,801 extractable subagent messages exist across the history; **2,315 (83%) are present** as `<!-- uuid: ... -->` markers in `knowledge/chat-history/`; **486 (17%) are missing**.
- The loss is **not uniform across roles**: subagent **user** (task-dispatch prompt) turns are missing 482 of 502 (96% loss); subagent **assistant** (reply) turns are missing only 7 of 2,302 (99.7% present). So what's lost is disproportionately *"what each subagent was asked to do,"* not what it answered.
- Every date since 2026-05-30 that has subagent files shows some loss (2026-06-13 worst, 145 missing — driven by 108 deeply-nested `subagents/workflows/wf_*/agent-*.jsonl` files that day). No date is 0% present and no date is fully clean; the gap is systemic across the whole history, not confined to a cutoff date.

**Root cause — confirmed by direct inspection, not inference:**
1. **Discovery was never broken.** `extract_claude.py:146`'s glob (`os.path.join(project_dir, "**", "*.jsonl")`, recursive) has matched all subagent files, including deeply-nested ones, since the script's first commit (`48b232b2`, 2026-02-16). This ENH is not a discovery/glob bug.
2. **The missing messages are structurally parseable by the current (post-fix) code.** Spot-checked a missing record directly (`…/subagents/agent-a720a3e624b57326e.jsonl` line 0): `type=user`, valid `uuid`, valid `timestamp`, plain-string content — exactly the shape `extract_claude_sessions`'s `isinstance(c, str)` branch already handles. It is missing only because the *output file* for that date was written by the pre-fix code and has never been regenerated since.
3. **The dedup mechanism the fix introduced is, by design, permanent-memory: once a uuid is written to a date's output file (even inside a malformed/legacy block), it is forever "seen."** `extract_claude.py:245` branches on `parse_metadata_from_file()` returning a non-`None` `last_ts` — true for any file the old code already wrote successfully. That routes every subsequent run down the **incremental-append branch** (`extract_claude.py:245-292`), which:
   - Only ever *appends* new (previously-unseen-uuid) messages under a `## [Incremental Update: HH:MM:SS]` separator (`extract_claude.py:274`) — it never re-flattens or reorders content already in the file.
   - Never rewrites the file's header (`**Total Messages:** N`, written once at creation by `write_markdown_header`) — so the header count silently drifts from the true message-block count as incremental appends accumulate.
   - Never removes legacy `## Session N (Started: ...)` blocks (the pre-Task-3 per-source-file format) already present in the file.
   
   The **overwrite/flatten branch** (`extract_claude.py:293-345`) — the one that actually produces correctly interleaved, correctly-counted, session-block-free output — only runs when `parse_metadata_from_file()` returns `last_ts is None`, i.e. only for a file that doesn't exist yet or whose metadata the regex can't parse. There is no flag or code path that forces this branch for an *existing, parseable* file.

**Confirmed concretely on real output** (`knowledge/chat-history/2026-07/2026-07-03-claude.md`, checked directly this session): header says `**Total Messages:** 76`; actual `### Message` block count is **181**; file still contains **21 leftover `## Session N (Started: ...)` blocks** — the exact pre-fix format Task 3 was supposed to eliminate. Two more July files (`2026-07-04-claude.md`, `2026-07-06-claude.md`) show the same residue (2 and 4 leftover `## Session N` blocks respectively) from mixed old-format + new-format content in the same file.

**Why the v0.6.16 plan missed this:** Tasks 1–3's own repro script (`tests/test-extraction-subagent-repro.sh`) only ever exercises fresh temp directories built from scratch inside a `mktemp -d` sandbox (see plan Task 1 Step 3) — every assertion in that script runs against files the *test itself* creates, so `parse_metadata_from_file()` always returns `last_ts is None` for the test's first pass, and the fix's own overwrite/flatten path is the only one ever exercised end-to-end by the test suite. The incremental-append path in the tests only ever appends onto output the *same, already-fixed* code wrote moments earlier — it never appends onto output written by the *pre-fix* code, which is the actual real-world condition for every date extracted before 2026-07-05. Nothing in the plan's Acceptance Criteria (ENH-038, checked in `afe30f34`) calls for validating the fix against pre-existing real output, only against fresh fixtures.

---

## Proposed Behavior

Add an explicit rebuild/overwrite mode to `extract_claude_sessions`, then run it once to repair every date the audit flagged.

1. **Code fix:** add a `rebuild: bool = False` parameter to `extract_claude_sessions()`. When `True`, force every date through the overwrite/flatten branch (`extract_claude.py:293-345`) regardless of what `parse_metadata_from_file()` returns — i.e. treat every date as if no prior output exists, re-deriving `last_ts`/`seen_uuids` as irrelevant for that run. This must also delete (or otherwise not merely append past) any existing split subfolder (`{OUTPUT_DIR}/{date}/`) for that date before writing, since `get_output_path()` (`chat_extractor_base.py:34-43`) will otherwise keep routing to a stale split part file.
2. **CLI wiring:** add `--rebuild` to `run_extraction.py`'s argparse and thread it through to `extract_claude_sessions(rebuild=args.rebuild)`, mutually distinct from `--incremental` (rebuild implies "ignore existing state," incremental implies "trust existing state").
3. **One-time repair run:** after the code ships, run a `--rebuild` pass scoped to exactly the dates the audit flagged as having any missing subagent messages or any leftover `## Session N` block, recovering the 486 missing messages and eliminating the malformed residue in the same pass. Do not run `--rebuild` repo-wide by default — it is a deliberate, occasional maintenance operation, not the normal extraction mode (default behavior stays incremental).

---

## Explicitly Out of Scope

- Fixing the main-thread "available vs present" ratio noise the audit also surfaced (e.g. 2026-06-28 showing 730/1172) — the audit determined this is a counting artifact of resumed sessions producing multiple root `.jsonl` files that replay the same messages (uuid dedup already collapses these correctly in the output; the inflated denominator is in the audit's own counting method, not a real extractor defect). Not this ENH's concern.
- A general "detect and auto-repair malformed output" watchdog that runs on every extraction — YAGNI; a manual, occasional `--rebuild` flag is sufficient for the actual failure mode (a one-time fix landing, not a recurring class of corruption).
- Extending `--rebuild` to the Gemini or Codex extractors — neither was implicated by this audit; scope this to `extract_claude.py` only unless a parallel investigation finds the same gap there.

---

## Affected Files

| File | Role |
|---|---|
| `core/scripts/extract_claude.py` | Modify — add `rebuild` param to `extract_claude_sessions()`, force overwrite/flatten branch when set |
| `core/scripts/chat_extractor_base.py` | Modify (maybe) — `get_output_path()`/a new helper may need to clear an existing split subfolder when `rebuild=True` so stale parts don't linger alongside freshly rebuilt content |
| `core/scripts/run_extraction.py` | Modify — add `--rebuild` CLI flag, thread through to `extract_claude_sessions` |
| `tests/test-extraction-subagent-repro.sh` or a new `tests/test-extraction-rebuild.sh` | New/extend — assert `--rebuild` against a pre-seeded *pre-fix-shaped* fixture (a file with a stale header count, a leftover `## Session N` block, and a uuid the source `.jsonl` still has) correctly overwrites to a clean, flattened, correctly-counted file |
| `knowledge/chat-history/**` | Data repair only, not code — the affected dates get regenerated via the one-time `--rebuild` run once the code ships |

---

## Outcome (2026-07-08) — real-data repair run result

Running the one-time repair against real `knowledge/chat-history/` data (v0.6.17 implementation) found **68 dates flagged**, not the small handful this ENH's Problem section anticipated when only spot-checking 3 July dates. Breakdown:

- **9 dates recovered** (2026-05-12, 05-13, 05-17, 05-21, 05-22, 05-25, 05-27, 05-28, 05-30) — the live `~/.claude/projects/` on this machine only had source logs back to 2026-05-30; the user separately located and provided a Backblaze cloud backup covering 2026-05-12 through 2026-06-07, which supplied the missing source `.jsonl` data for these 9.
- **42 dates permanently unrecoverable** (2026-02-13 through 2026-05-06) — no raw `.jsonl` source exists anywhere for these: not in the live Claude Code session directory (which itself doesn't predate 2026-05-30 — Claude Code appears to periodically rotate/prune old session logs on its own), and not in the Backblaze backup either (that backup's own earliest coverage is 2026-05-12). No older backup was found.
- **This is a data-availability limitation, not a code defect.** `--rebuild` and the discovery/health-check script (`check_extraction_health.py`) both behave correctly given zero source data to work with — `--rebuild` leaves the existing (still-imperfect) output file untouched rather than corrupting it further when it finds nothing to rebuild from, and (per Task 10, added after this outcome was found) now prints an explicit warning naming the date instead of silently doing nothing.
- A separate, real bug was found and fixed *during* this repair run: the discovery script's own regexes were initially too loose and flagged 15 already-correctly-rebuilt dates as if they were still corrupted, because real conversation content in this repo's own chat-history literally quotes its doc-template examples (e.g. `"## Session 1: Project Name (HH:MM - HH:MM)"`). Tightened to the exact structural signatures the extractor emits; re-verified 0 false positives against the full real dataset afterward.

---

## Acceptance Criteria

- [x] `extract_claude_sessions(rebuild=True)` forces the overwrite/flatten branch for every date in scope, regardless of `parse_metadata_from_file()`'s return value. Verified via `tests/test-extraction-rebuild.sh`.
- [x] `--rebuild` correctly clears/bypasses an existing `YYYY-MM-DD/` split subfolder so `get_output_path()` doesn't route to a stale part file after a rebuild. Verified via `tests/test-extraction-rebuild.sh`'s Gap 1 assertions (pre-seeds a real split subfolder, confirms it's cleared and `get_output_path()` falls back to the flat path).
- [x] A test fixture reproducing the real 2026-07-03 shape (stale header count, leftover `## Session N` block, at least one uuid present in the source `.jsonl` but absent from the pre-seeded output) passes: after `--rebuild`, the header count matches the true message-block count, zero `## Session N` blocks remain, and the previously-missing uuid is present. Verified via `tests/test-extraction-rebuild.sh` (19/19 assertions pass, including malformed-file, `--rebuild`/`--incremental` precedence, and zero-match `--project` edge cases added after real-data execution surfaced them).
- [x] The one-time repair run is executed against every date the audit flagged and re-verified afterward — **with the achievable scope adjusted per the Outcome section above**: 9 of 68 dates recovered to 0 missing messages / 0 leftover blocks / header == actual; the remaining 42 dates have no source data anywhere and are documented as permanently unrecoverable, not silently left in an unexplained state. `check_extraction_health.py` (renamed from `find_corrupted_chat_files.py` for clearer, less alarming naming) now correctly reports exactly 42 flagged files — the true permanently-unrecoverable set — with 0 false positives.
- [x] Default (non-`--rebuild`) incremental behavior is unchanged — verified by re-running `tests/test-extraction.sh` (8/8) and `tests/test-extraction-subagent-repro.sh` (4/4) with no regressions.
