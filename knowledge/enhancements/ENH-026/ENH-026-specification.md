# ENH-026: KG Write Guard — Unguarded Command Class

**Status:** Proposed
**Version:** TBD (post-v0.5.10.8)
**Parent:** ADR-019 (write guard design), v0.5.10.8 (extract-chat patch)

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

1. **Add Step 0 guard to `sync-all` and `update-graph`** — same pattern as extract-chat v0.5.10.8.
2. **Move CWD check into `run_extraction.py`** — read `kg-config.json`, compare `projectRoot`
   vs `os.getcwd()`, raise `SystemExit` with a clear message if mismatch and no explicit
   `--output-dir` override. Model-independent, cross-platform, bypass-proof.
3. **Audit remaining unguarded write paths** — grep `kg-config.json` reads in commands/ and
   skills/ to find any other paths that write to KG directories without calling `kg_capture`.
4. **Supersede ADR-019** — write a new ADR documenting the full enforcement picture after this
   ENH ships: `kg_capture` for lessons/sessions, Python-layer for extraction, Step 0 guards
   for remaining commands.

## Success Criteria

- `sync-all` and `update-graph` block on active-KG/CWD mismatch with the same three-option prompt
- `run_extraction.py` refuses to write on mismatch unless an explicit `--output-dir` override is passed
- ADR-019 is marked Superseded with a link to the new ADR

## Deferred From

v0.5.10.8 (this release): extract-chat Step 0 guard only.
