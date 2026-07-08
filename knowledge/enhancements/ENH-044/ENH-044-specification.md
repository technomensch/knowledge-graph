# ENH-044: Gemini extractor has no project-scoping — `--project` filter is silently ignored, causing cross-project contamination in output

**Status:** 🟡 Proposed
**Discovered:** 2026-07-06
**Governed by:** none (bug-fix, not a new command/skill/docstring — ADR-058's naming/scope check does not apply)
**Related:** `core/scripts/extract_gemini.py`, `core/scripts/run_extraction.py`, [ENH-038](../ENH-038/ENH-038-specification.md) (the Gemini `.jsonl` streaming-format fix this bug was found while validating — that fix does work correctly, this is a separate, distinct defect), branch `v0.6.16-update-claude-extract-chat-for-sub-agents` (already merged), plan `knowledge/plans/v0.6.17-fix-extract-chat-rebuild.md` (this ENH's fix is being folded into that in-progress plan as an additional task, per explicit user instruction, rather than its own branch)

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
4. **Known limitation, explicitly out of scope for this ENH:** directory names that are opaque hashes (not human-readable project names) will not fragment-match a human-readable `--project=X` string. This fix resolves contamination for named-directory projects (the common case, including the confirmed `knowledge-graph`/`career-prism` contamination above) but does not resolve hashed-directory projects. Mapping a hash back to a project via some other signal is not currently available and is YAGNI beyond noting the gap here.
5. Per user instruction, this fix is folded into the existing in-progress `knowledge/plans/v0.6.17-fix-extract-chat-rebuild.md` plan as an additional task rather than spawning its own branch — that plan's whole purpose is fixing `kmg-extract-chat`, and this defect is squarely in that scope.

---

## Explicitly Out of Scope

- Resolving hashed (non-human-readable) Gemini/Antigravity project directory names to a real project via any external signal — no such signal is currently available; flagged as a known limitation only.
- Any change to the Claude or Codex extractors — this ENH is Gemini-only; Claude already scopes correctly (`extract_claude.py:137-139`) and Codex was separately audited clean under ENH-038.
- Re-deriving or re-validating the ENH-038 `.jsonl` streaming-format fix itself — that fix is confirmed working; this ENH addresses a different, unrelated defect found while validating it.
- Opening a new branch for this fix — it is being folded into the existing `v0.6.17-fix-extract-chat-rebuild.md` plan per explicit user instruction.

---

## Affected Files

| File | Role |
|---|---|
| `core/scripts/extract_gemini.py` | Modify — add `project_filter` param to `extract_gemini_json_sessions`, `extract_gemini_stream_sessions`, `extract_gemini_pb_sessions`, and `extract_all_gemini`; filter project directories by fragment match before globbing for session files |
| `core/scripts/run_extraction.py` | Modify — thread `project_filter=args.project` into the Gemini call at lines 100-108, matching the existing Claude call's pattern |
| `tests/` | New or extended test proving that with `--project=X` set, sessions from a differently-named project directory are excluded from Gemini output |
| `knowledge/plans/v0.6.17-fix-extract-chat-rebuild.md` | Reference only — this ENH's fix is folded into that plan as an additional task, not a separate branch |

---

## Acceptance Criteria

- [ ] `project_filter` parameter added to `extract_gemini_json_sessions`, `extract_gemini_stream_sessions`, and `extract_gemini_pb_sessions`, filtering by project-directory-name fragment match (mirroring `extract_claude.py:138-139`'s `project_filter.lower() in os.path.basename(d).lower()` pattern).
- [ ] `extract_all_gemini` accepts `project_filter` and passes it through to all three per-format calls.
- [ ] `run_extraction.py`'s Gemini call passes `project_filter=args.project`, matching the existing Claude call's pattern.
- [ ] A test (new or extended in `tests/`) proves that with `--project=X` set, sessions from a differently-named project directory (e.g. a `career-prism`-style fixture alongside a `knowledge-graph`-style fixture) are excluded from the output — reproducing the confirmed 2026-05-13 cross-project merge in a controlled fixture.
- [ ] The hashed-directory-name limitation is documented (in code comment and/or `commands/kmg-extract-chat.md` if it documents `--project` behavior) rather than left silently unhandled.
