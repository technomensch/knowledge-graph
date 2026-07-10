# ENH-044: Gemini extractor has no project-scoping — `--project` filter is silently ignored, causing cross-project contamination in output

**Status:** 🟡 Proposed — `.json`/`.jsonl` scoping shipped (`bf1cb51c`/`1b2269cf`); `.pb`/hash-dir scoping in progress (see Proposed Behavior item 6, governed by [ADR-062](../../../decisions/ADR-062-gemini-pb-project-scoping-fail-closed.md))
**Discovered:** 2026-07-06
**Governed by:** [ADR-062](../../../decisions/ADR-062-gemini-pb-project-scoping-fail-closed.md) (fail-closed `.pb`/hash-dir scoping decision, 2026-07-10) for the remaining contamination vector; the original `.json`/`.jsonl` fix itself needed no naming/scope check (bug-fix, not a new command/skill/docstring — ADR-058 does not apply to it)
**Related:** `core/scripts/extract_gemini.py`, `core/scripts/run_extraction.py`, [ENH-038](../ENH-038/specification.md) (the Gemini `.jsonl` streaming-format fix this bug was found while validating — that fix does work correctly, this is a separate, distinct defect), branch `v0.6.16-update-claude-extract-chat-for-sub-agents` (already merged), plan `knowledge/plans/v0.6.17-fix-extract-chat-rebuild.md` (`.json`/`.jsonl` fix folded in as a task there), plan `knowledge/plans/v0.6.17-fix-extract-chat-multiday-bucketing.md` (`.pb`/hash-dir fix, this plan's Tasks 5-8)

---

## Problem

While manually test-running `/kmgraph:kmg-extract-chat --source gemini --project=knowledge-graph` to validate whether ENH-038's Gemini `.jsonl` streaming-format fix (shipped, PR #160, v0.6.16) works end-to-end, the `--project` filter was found to have no effect at all on Gemini output — sessions from unrelated projects are merged into the same output files as `knowledge-graph` sessions.

**Root cause — no `project_filter` parameter exists anywhere in Gemini's extraction path.**

1. None of the three Gemini per-format extraction functions accept a project filter: `extract_gemini_json_sessions(limit=None)` (`core/scripts/extract_gemini.py:25`), `extract_gemini_stream_sessions(limit=None)` (`extract_gemini.py:85`), `extract_gemini_pb_sessions(limit=None)` (`extract_gemini.py:190`). Their globs are unscoped across every Gemini/Antigravity project on the machine: `glob.glob(os.path.join(GEMINI_TMP_DIR, "**", "session-*.json"), recursive=True)` (`extract_gemini.py:29`) and `glob.glob(os.path.join(GEMINI_TMP_DIR, "**", "session-*.jsonl"), recursive=True)` (`extract_gemini.py:95`), where `GEMINI_TMP_DIR = os.path.expanduser("~/.gemini/tmp")` (`extract_gemini.py:22`) is the top-level tmp directory containing every Gemini/Antigravity project's sessions as subdirectories — the recursive glob descends into all of them with no per-project filter at any stage.

2. **Contrast with the Claude extractor, which scopes correctly.** `core/scripts/extract_claude.py:137-139` filters project directories by path-fragment match *before* globbing for jsonl files: `if project_filter: project_dirs = [d for d in project_dirs if project_filter.lower() in os.path.basename(d).lower()]`. Gemini has no equivalent step anywhere in its extraction path.

3. **The combining function also has no filter parameter, and the CLI doesn't even try to pass one through.** `extract_all_gemini(limit=None, date_filter=None, after_date=None, before_date=None)` (`extract_gemini.py:285`) takes no `project_filter` argument and calls all three per-format functions unfiltered (`extract_gemini.py:289-291`). `core/scripts/run_extraction.py:100-108`'s Gemini call passes `limit`, `date_filter`, `after_date`, `before_date` but never `project_filter=args.project` — unlike the Claude call immediately above it (`run_extraction.py:91-97`), which does pass `project_filter=args.project`.

**Confirmed real-world contamination from an actual test run** (`python3 core/scripts/run_extraction.py --source gemini --project=knowledge-graph`, run this session with `KG_OUTPUT_DIR=/Users/mkaplan/GitHub/knowledge-graph/knowledge/chat-history`; output files were gitignored temp artifacts, confirmed via `git check-ignore -v`, and have since been deleted as local cleanup — no git history impact, described here as reproduction evidence only):

- `knowledge/chat-history/2026-05/2026-05-13-gemini.md` was generated merging 6 sessions into one file. Session 5 (`## Session 5 [Gemini (Stream)] (Started: 190752)`, topic "Investigating npm install failure") legitimately came from `~/.gemini/tmp/knowledge-graph/chats/session-2026-05-13T19-07-75c92202.jsonl`. Session 6 (`## Session 6 [Gemini (Stream)] (Started: 210336)`, topic "Installing Superpowers Extension", content about `src/lib/dedup.mjs`, `buildCompanyRoleDedupSet`, `DedupTracker` — a job-search/company-dedup tool structurally unrelated to this repo) came from `~/.gemini/tmp/career-prism/chats/session-2026-05-13T21-03-005ef4fe.jsonl` — a different project (`career-prism`) merged into the same output file despite `--project=knowledge-graph` being passed.
- Four entirely foreign date-files were also created with no knowledge-graph content at all: `knowledge/chat-history/2025-12/2025-12-02-gemini.md`, `knowledge/chat-history/2026-01/2026-01-07-gemini.md`, `knowledge/chat-history/2026-01/2026-01-08-gemini.md`, `knowledge/chat-history/2026-01/2026-01-20-gemini.md` — all predate this repo's own first commit (`48b232b2`, 2026-02-16, per `git log`), and the 2025-12-02 file's first message ("I want to pull the latest main from github") is generic, not knowledge-graph-specific.

**Directory-name matching heuristic.** Gemini/Antigravity project directories under `~/.gemini/tmp/` are named things like `knowledge-graph`, `career-prism`, `career-ops`, `project`, and some are opaque SHA-256-looking hashes (e.g. `3a8d6b11865d5e5e5851d6c990cf168fa5e6e67498e078c199b364338e17ddc9`, confirmed via `find ~/.gemini/tmp -name "session-*.json" | sed 's|.*/tmp/||;s|/chats/.*||' | sort | uniq -c`). A fix should filter by fragment match against these directory names, the same pattern Claude's `project_filter` uses (`extract_claude.py:138-139`).

---

## Proposed Behavior

1. Add a `project_filter=None` parameter to all three Gemini per-format extraction functions — `extract_gemini_json_sessions`, `extract_gemini_stream_sessions`, `extract_gemini_pb_sessions` — mirroring `extract_claude_sessions`'s existing pattern: derive the set of project directories under `GEMINI_TMP_DIR` (and `GEMINI_CONV_DIR` for the `.pb` path), filter by `project_filter.lower() in os.path.basename(d).lower()` when `project_filter` is set, and only glob for session files within the surviving directories (instead of the current unscoped `**` recursive glob straight from the tmp root).
2. Add `project_filter=None` to `extract_all_gemini`'s signature (`extract_gemini.py:285`) and thread it through to all three calls it makes (`extract_gemini.py:289-291`).
3. Wire `project_filter=args.project` into `run_extraction.py`'s Gemini call (`run_extraction.py:102-108`), matching the existing Claude call's pattern (`run_extraction.py:91-97`).
4. Per user instruction, this fix (items 1-3, `.json`/`.jsonl` scoping) is folded into the existing in-progress `knowledge/plans/v0.6.17-fix-extract-chat-rebuild.md` plan as an additional task rather than spawning its own branch — that plan's whole purpose is fixing `kmg-extract-chat`, and this defect is squarely in that scope. **Shipped:** `bf1cb51c` (fix), `1b2269cf` (test).
5. **Real-data verification (2026-07-09/10) found the `.json`/`.jsonl` fix does not close the full contamination vector.** `extract_gemini_pb_sessions()` accepts `project_filter` "for signature parity" but never applies it (`extract_gemini.py:245-254`) — confirmed 93 real `.pb` files flat under `~/.gemini/antigravity/conversations/` with no per-project path structure to filter on; the leak is masked on this machine only because `blackboxprotobuf` is not installed. 9 opaque hash-named `~/.gemini/tmp/` directories also cannot fragment-match a human-readable `--project` string. **This is no longer out of scope** — see item 6.
6. **`.pb` and hash-named-directory scoping — fail-closed exclusion (governed by [ADR-062](../../../decisions/ADR-062-gemini-pb-project-scoping-fail-closed.md)).** When `project_filter` is set, `.pb` sessions and hash-named-directory sessions that cannot be positively attributed to the requested project are excluded from output, with a visible skip notice (never silent). Since `.pb` currently carries no reliable per-project signal at all, this means all `.pb` sessions are excluded whenever `--project` is set, until a future payload-decoded-signal layer (explicitly deferred, not built here) can recover attributable ones on top of this floor. Tracked in `knowledge/plans/v0.6.17-fix-extract-chat-multiday-bucketing.md` Tasks 5-8.

---

## Explicitly Out of Scope

- A payload-decoded `.pb` project-attribution signal (would need `blackboxprotobuf` schema investigation) that could *recover* excluded own-project `.pb` sessions — explicitly deferred per ADR-062, not built in this ENH; could only ever sit on top of the fail-closed floor, never replace it.
- Any change to the Claude or Codex extractors — this ENH is Gemini-only; Claude already scopes correctly (`extract_claude.py:137-139`) and Codex was separately audited clean under ENH-038.
- Re-deriving or re-validating the ENH-038 `.jsonl` streaming-format fix itself — that fix is confirmed working; this ENH addresses a different, unrelated defect found while validating it.
- Opening a new branch for this fix — folded into existing plans per explicit user instruction (`.json`/`.jsonl` into the old v0.6.17 plan, `.pb`/hash-dir into this plan, both on the same branch).

---

## Affected Files

| File | Role |
|---|---|
| `core/scripts/extract_gemini.py` | **Shipped:** `project_filter` param added to `extract_gemini_json_sessions`, `extract_gemini_stream_sessions`, `extract_gemini_pb_sessions` (signature parity only for `.pb`), and `extract_all_gemini`; `.json`/`.jsonl` filter project directories by fragment match before globbing (`bf1cb51c`). **In progress:** implement fail-closed exclusion inside `extract_gemini_pb_sessions` and for hash-named dirs (ADR-062, Task 6). |
| `core/scripts/run_extraction.py` | **Shipped** — threads `project_filter=args.project` into the Gemini call, matching the existing Claude call's pattern (`bf1cb51c`) |
| `tests/test-extraction-gemini-project-filter.sh` | **Shipped:** proves `.json`/`.jsonl` cross-project exclusion (`1b2269cf`). **In progress:** add foreign-`.pb` exclusion, hash-dir exclusion, and a visible SKIP (not silent pass) when `blackboxprotobuf` is absent (Task 7). |
| `commands/kmg-extract-chat.md` | **In progress** — document the fail-closed `--project` behavior for `.pb` and hash-named directories (Task 7) |
| `knowledge/decisions/ADR-062-gemini-pb-project-scoping-fail-closed.md` | **New** — records the fail-closed decision and its rationale (Task 5) |
| `knowledge/plans/v0.6.17-fix-extract-chat-rebuild.md` | Reference — `.json`/`.jsonl` fix was folded into that plan as an additional task |
| `knowledge/plans/v0.6.17-fix-extract-chat-multiday-bucketing.md` | Reference — `.pb`/hash-dir fix is this plan's Tasks 5-8 |

---

## Acceptance Criteria

- [x] `project_filter` parameter added to `extract_gemini_json_sessions`, `extract_gemini_stream_sessions`, and `extract_gemini_pb_sessions`, filtering `.json`/`.jsonl` by project-directory-name fragment match (mirroring `extract_claude.py:138-139`'s `project_filter.lower() in os.path.basename(d).lower()` pattern). Verified: `bf1cb51c`.
- [x] `extract_all_gemini` accepts `project_filter` and passes it through to all three per-format calls. Verified: `bf1cb51c`.
- [x] `run_extraction.py`'s Gemini call passes `project_filter=args.project`, matching the existing Claude call's pattern. Verified: `bf1cb51c`.
- [x] A test proves that with `--project=X` set, sessions from a differently-named `.json`/`.jsonl` project directory are excluded from the output — reproducing the confirmed 2026-05-13 cross-project merge in a controlled fixture. Verified: `1b2269cf`.
- [ ] `extract_gemini_pb_sessions` actually applies `project_filter` under the fail-closed rule (ADR-062) — un-attributable `.pb` sessions excluded, with a visible skip notice (Task 6, verified Task 7).
- [ ] Hash-named `~/.gemini/tmp/` directories are excluded under `--project` by an explicit, commented fail-closed rule, not incidentally (Task 6, verified Task 7).
- [ ] The Gemini project-filter test asserts foreign-`.pb` and hash-dir exclusion, and SKIPs visibly rather than passing vacuously when `blackboxprotobuf` is absent (Task 7).
- [ ] `--project` behavior for `.pb`/hash-dirs documented in `commands/kmg-extract-chat.md` (Task 7).
