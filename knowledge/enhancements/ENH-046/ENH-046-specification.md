# ENH-046: Gemini `.pb` extractor dated sessions by file mtime, not conversation content

**Status:** ✅ Resolved in v0.6.17
**Discovered:** 2026-07-08
**Governed by:** none (bug-fix, not a new command/skill/docstring — ADR-058's naming/scope check does not apply)
**Related:** `core/scripts/extract_gemini.py`, [ENH-044](../ENH-044/ENH-044-specification.md) (same file/subsystem, different bug — project-scoping vs. this ENH's date-derivation reliability), [ENH-043](../ENH-043/ENH-043-specification.md) (this session's sibling extraction-pipeline hardening work), branch `v0.6.17-fix-extract-chat-rebuild`, plan `knowledge/plans/v0.6.17-fix-extract-chat-rebuild.md`

---

## Problem

**Confirmed by direct read of `core/scripts/extract_gemini.py:262-268` (pre-fix):** `extract_gemini_pb_sessions()` dated every Antigravity `.pb` conversation archive using `os.path.getmtime(pb_path)` — the file's filesystem modification time — with no attempt to derive the date from anything inside the file's actual content, even on the success path where `blackboxprotobuf` fully decodes the file's structure.

This is unreliable for a concrete, realistic scenario: **if a `.pb` file is copied, moved, or restored from a backup after the conversation actually happened, its mtime updates to the copy/restore time, not the original conversation time.** A user recovering an Antigravity conversation archive from a Time Machine/Backblaze/manual backup — the same kind of backup-recovery scenario this session's ENH-043 work already built first-class tooling for on the Claude side — would have every recovered `.pb` session silently mis-dated to whenever the restore happened, potentially merging months-old real conversation content into today's chat-history output file, or scattering a single session's content across the wrong date entirely.

Found while implementing ENH-043's backup-recovery guidance (Task 11) and discussing an analogous "user copies chat history to another machine/manually" scenario — this ENH is the concrete instance of that class of bug that actually exists in the codebase today, on the Gemini `.pb` path specifically (the Claude and Gemini `.json`/`.jsonl` paths both already derive dates from an in-content timestamp field, not mtime — only the `.pb` fallback path had this gap).

---

## Proposed Behavior

Added `_find_epoch_hint(obj, now=None)` — a heuristic scanner over the schemaless-decoded protobuf structure (`blackboxprotobuf.decode_message()`'s output) that looks for any integer value plausibly representing a Unix epoch timestamp (seconds or milliseconds, within roughly a 10-year window of "now"), the same best-effort heuristic style already used by this file's existing `find_content_strings()` for message text (no `.proto` schema is available for these files, so a specific "timestamp" field can't be identified by name — only by plausible value range).

`extract_gemini_pb_sessions()` now calls this after a successful `blackboxprotobuf` decode and, when a plausible timestamp is found, uses it (converted to local date/time) as the session's `date`/`ts` instead of file mtime. When multiple plausible values are found in the same structure (e.g. a "start time" and a later "last updated" field both existing somewhere in the decoded tree), the earliest is chosen, since a session's start time is a safer proxy for "when did this conversation happen" than a later update marker also present in the same payload. File mtime remains the fallback — now explicitly documented in code as unreliable for copied/restored files — used only when no plausible in-content timestamp can be found (e.g. `blackboxprotobuf` isn't installed, decode fails, or the decoded structure genuinely contains no value in the plausible range).

---

## Explicitly Out of Scope

- Extending the same content-derived-date heuristic to the raw-byte fallback path (`extract_gemini_pb_sessions`'s non-BBP fallback, used when `blackboxprotobuf` isn't installed or decode fails) — that path only has an unstructured raw-byte regex scan (`find_content_strings`-equivalent for readable text), with no decoded structure to walk for embedded integers. Recovering a reliable timestamp from raw undifferentiated bytes without a schema is a substantially harder, separate problem; the raw-fallback path still uses mtime, unchanged.
- Building a general "detect file provenance/copy history" mechanism — this ENH only changes how one specific field (the session date) is derived, using a signal (embedded plausible epoch) already present in most decoded payloads; it does not attempt to detect *that* a file was copied/restored, only to prefer a more reliable date source regardless of why mtime might be wrong.
- Any change to `.json`/`.jsonl` Gemini session date-derivation — both already derive dates from an in-content `startTime`/timestamp field, not mtime; this ENH only closes the gap on the `.pb` path.

---

## Affected Files

| File | Role |
|---|---|
| `core/scripts/extract_gemini.py` | Modify — add `_find_epoch_hint()` heuristic; `extract_gemini_pb_sessions()` prefers its result over file mtime on the successful-decode path |
| `tests/test-extraction-gemini-pb-timestamp-hint.sh` | New — unit-tests `_find_epoch_hint()` directly against synthetic decoded-structure shapes (nested epoch-seconds, epoch-milliseconds, implausible small ints, bools, no-match, multiple-candidates-picks-earliest). `blackboxprotobuf` is an optional dependency not installed in every environment (confirmed absent on this machine), so this cannot round-trip a real `.pb` file through the actual BBP decoder — it tests the heuristic function in isolation instead. |

---

## Acceptance Criteria

- [x] `_find_epoch_hint()` correctly identifies a plausible epoch-seconds value nested inside a dict/list tree. Verified via `tests/test-extraction-gemini-pb-timestamp-hint.sh`.
- [x] `_find_epoch_hint()` correctly identifies a plausible epoch-milliseconds value (dividing by 1000 lands in the plausible window). Verified via the same test.
- [x] Implausible small integers (counters, ids, enum-like values) are not mistaken for timestamps. Verified.
- [x] Booleans are never mistaken for timestamps (Python's `bool` is an `int` subclass — a naive `isinstance(o, int)` check without an explicit `bool` guard would misfire on `True`/`False`). Verified.
- [x] A structure with no plausible timestamp returns `None`, signaling callers to fall back to mtime. Verified.
- [x] When multiple plausible values exist, the earliest is chosen. Verified.
- [x] `extract_gemini_pb_sessions()` uses the content-derived date when `_find_epoch_hint()` finds one, falling back to mtime only otherwise — verified by direct code read (full end-to-end `.pb`-file round-trip through the real `blackboxprotobuf` decoder is not verified in this environment, since the optional dependency isn't installed here; a follow-up on a machine with `blackboxprotobuf` available would strengthen this, not currently blocking since the heuristic function itself and its call-site wiring are both directly verified).
- [x] No regression to existing Gemini extraction — all other test suites (`test-extraction.sh`, `test-extraction-gemini-project-filter.sh`, etc.) still pass.
