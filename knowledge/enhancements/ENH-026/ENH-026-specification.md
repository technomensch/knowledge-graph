---
id: ENH-026
type: Hardening
status: proposed
---

# ENH-026: KG Write Guard — Unguarded Command Class

**Update (2026-09-04):** ENH-034's `kmg-update-graph` decision (previously an open rename candidate, per the Related note below) was **removal**, not rename (Option C), confirmed removed in v0.7.7. Scope item 1's "Add Step 0 guard to `update-graph`" was superseded/moot — no file to guard once removed. Its `kmg-sync-all` half was moot too — ENH-034 removed `kmg-sync-all`/`sync-all-agent` as well, confirmed removed in v0.7.7. Unaffected by this update: scope item 2 (`run_extraction.py` CWD check — belongs to `kmg-extract-chat`, untouched by ENH-034/035), item 3 (audit remaining unguarded write paths — should include the new `kmg-backfill` command from ENH-035, now shipped), and item 4 (supersede ADR-019 with a new enforcement-picture ADR).

**Local ID:** ENH-026 | **GitHub Issue:** [#233](https://github.com/technomensch/knowledge-graph/issues/233) (filed 2026-08-22, retroactively; native GitHub `blockedBy` link added to ENH-034/#232 for the `kmg-update-graph` portion — see Related below)

**Status:** Proposed
**Version:** TBD (post-v0.5.10.8)
**Parent:** ADR-019 (write guard design), v0.5.10.8 (extract-chat patch)
**Related:** [ENH-034](../ENH-034/ENH-034-specification.md) — validated 2026-07-11: `kmg-update-graph` is an open (undecided) rename candidate in ENH-034 (Option B, held pending ENH-035/036 stabilizing). Do not land this ENH's guard on `commands/kmg-update-graph.md` until ENH-034's Option A/B decision is made — if Option B lands first, the guard should be added to the renamed file (`kmg-ingest-graph.md` or whatever name is chosen) instead, to avoid a second edit pass. The `commands/kmg-sync-all.md` and `core/scripts/run_extraction.py` portions of this ENH have no such conflict — `kmg-sync-all` is explicitly NOT a rename candidate in ENH-034 (kept as the pipeline orchestrator) — and can proceed independently of ENH-034's timeline. [issue-11](../../issues/issue-11/issue-11-description.md) — cites this ENH (created 2026-06-12+, part of the "ENH-024 onward" group) as an instance of Cause 2, a brainstorm-originated spec that bypassed `start-issue-tracking` entirely; backlinked 2026-08-19.

---

## Problem

v0.5.10.8 added a model-layer Step 0 guard to `extract-chat`. Two other commands share
the same root cause (they resolve the active KG path from `kg-config.json` and write
directly without a CWD alignment check):

- `commands/sync-all.md`
- `commands/update-graph.md`

Additionally, the extract-chat Step 0 guard is model-dependent — a confused LLM could
skip it. The durable fix is to move the CWD check into `core/scripts/run_extraction.py`
(Python, bypass-proof, model-independent).

## Scope

1. ~~**Add Step 0 guard to `sync-all` and `update-graph`**~~ — **moot (2026-09-04):** both
   commands were removed outright in v0.7.7 per ENH-034's decision (Option C, removal not
   rename). No file remains to guard.
2. **Move CWD check into `run_extraction.py`** — read `kg-config.json`, compare `projectRoot`
   vs `os.getcwd()`, raise `SystemExit` with a clear message if mismatch and no explicit
   `--output-dir` override. Model-independent, cross-platform, bypass-proof.
3. **Audit remaining unguarded write paths** — grep `kg-config.json` reads in commands/ and
   skills/ to find any other paths that write to KG directories without calling `kg_capture`.
4. **Supersede ADR-019** — write a new ADR documenting the full enforcement picture after this
   ENH ships: `kg_capture` for lessons/sessions, Python-layer for extraction, Step 0 guards
   for remaining commands.

## Success Criteria

- ~~`sync-all` and `update-graph` block on active-KG/CWD mismatch with the same three-option prompt~~ — moot, both commands removed in v0.7.7 (see Scope item 1)
- `run_extraction.py` refuses to write on mismatch unless an explicit `--output-dir` override is passed
- ADR-019 is marked Superseded with a link to the new ADR

## Deferred From

v0.5.10.8 (this release): extract-chat Step 0 guard only.
