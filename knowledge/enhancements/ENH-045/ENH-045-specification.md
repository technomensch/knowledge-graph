# ENH-045: Codex extractor still has the incremental mtime-skip bug already removed from Claude

**Status:** ✅ Resolved in v0.6.17
**Discovered:** 2026-07-08
**Governed by:** none (bug-fix, not a new command/skill/docstring — ADR-058's naming/scope check does not apply)
**Related:** `core/scripts/extract_codex.py`, `core/scripts/extract_claude.py` (the sibling fix this mirrors, commit `22c7559d`), [ENH-038](../ENH-038/ENH-038-specification.md) (its Task 14 Codex audit — scope note below), [ENH-043](../ENH-043/ENH-043-specification.md) (the Claude rebuild-mode work this is being folded alongside), branch `v0.6.17-fix-extract-chat-rebuild`, plan `knowledge/plans/v0.6.17-fix-extract-chat-rebuild.md`

---

## Problem

**Confirmed by direct read of `core/scripts/extract_codex.py:195-201`:**

```python
if incremental and os.path.exists(output_path):
    age = datetime.now().timestamp() - os.path.getmtime(output_path)
    if age <= 3600:
        results.append(
            f"Skipped {filename} (already current, modified {int(age / 60)} min ago)"
        )
        continue
```

This is the exact anti-pattern already identified and removed from `extract_claude.py` in commit `22c7559d` (2026-07-05, v0.6.16): skipping a date's incremental extraction entirely if the existing output file's mtime is under an hour old, on the false assumption that a recent mtime means the file is already fully synced. That commit's own message states the real-world consequence directly: *"running --incremental twice inside an hour silently did nothing on the second run, even with genuinely new content available."* The identical logic was never ported to the Codex extractor, which still carries the bug today.

**Scope note — why this isn't already covered by ENH-038:** ENH-038's Task 14 (`afe30f34`) audited the Codex extractor and found it clean, but that audit was scoped narrowly to *message-count accuracy for a single historical date* (comparing extracted output against an independent manual count of raw `response_item` events). It never exercised the `--incremental` code path or evaluated the mtime-skip's staleness assumption — a different class of defect entirely. This is a new finding, not a gap in that audit's own stated scope.

**Why the fix is simpler for Codex than it was for Claude:** `extract_claude.py`'s equivalent bug required a real replacement mechanism (per-message `uuid` dedup, since that extractor *appends* incrementally and needed a correct way to know what was already written). Codex's writer (`extract_codex.py:205`, `open(output_path, "w", ...)`) always fully overwrites the target file from scratch on every non-skipped run — there is no append path and therefore no dedup-correctness problem to solve. Removing the mtime-skip here does not require inventing a replacement; the full-overwrite behavior is already always safe to run.

---

## Proposed Behavior

Remove the mtime-skip block from `extract_codex_sessions`, mirroring `22c7559d`'s change to `extract_claude.py`: when `incremental=True` and the output file already exists, no longer skip based on file age. Since Codex always fully overwrites rather than appending, no replacement dedup logic is needed — the removal alone is the complete fix.

---

## Explicitly Out of Scope

- Adding a `--rebuild` flag to the Codex extractor — ENH-043's rebuild mode exists specifically to force past Claude's uuid-dedup "permanent memory" problem (a corrupted file's uuids look permanently synced). Codex has no equivalent problem: it fully overwrites every non-skipped run, so there is nothing for a corrupted file to get permanently stuck as. A plain incremental (or even non-incremental) re-run already fully repairs any Codex output file.
- Changing Codex's `## Session N (cwd: ..., branch: ...)` multi-session labeling to match Claude's fully-flattened chronological interleaving — this is Codex's original, intentional design (distinguishing separate CLI invocations with their working-directory/branch context), not a copy of Claude's old per-file-block bug. No defect has been found in this behavior; changing it is not in scope here.
- Any change to the Claude or Gemini extractors — those are ENH-043 and ENH-044 respectively.

---

## Affected Files

| File | Role |
|---|---|
| `core/scripts/extract_codex.py` | Modify — remove the `incremental`-gated mtime-skip block (lines 195-201) |
| `tests/test-extraction.sh` or a new Codex-specific test | Extend/add — assert an `--incremental` re-run inside the same hour still picks up new content instead of silently skipping |

---

## Acceptance Criteria

- [x] The mtime-skip block is removed from `extract_codex_sessions`. Verified via direct read of `extract_codex.py:195` (commit `27a49f26`).
- [x] A test proves an `--incremental` run against a Codex output file modified less than an hour ago still re-extracts (does not silently skip) when new source content exists for that date. Verified via `tests/test-extraction-codex-incremental.sh` (3/3 pass, commit `97059c99`).
- [x] Existing Codex extraction tests (if any) still pass — no regression to non-incremental behavior. `tests/test-extraction.sh` (8/8) confirmed no regression.
