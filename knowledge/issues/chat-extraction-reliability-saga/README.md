# Meta-Issue: Chat-Extraction Reliability Saga

**Domain:** data / debugging
**Scope:** v0.6.16 → v0.6.17 (ongoing); all three extractors (Claude, Gemini, Codex) as of the 2026-07-09 umbrella consolidation
**Created:** 2026-07-08
**Status:** Investigating
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
- **Attempts:** 4 investigative rounds logged (see implementation-log.md)
- **Latest Understanding:** Root cause of the newest symptom = first-timestamp-only date derivation in `extract_claude_sessions()` (ENH-047), distinct from the incremental-append/rebuild defect (ENH-043) and the subagent-loss defect (ENH-038).
- **Next Steps:** Fix ENH-047 date-bucketing; re-baseline extraction; revisit Attempt-1's "wrong session captured" symptom once bucketing is corrected.

---

## Attempts

Full detail for each: [implementation-log.md](implementation-log.md). Original per-bug specs: `attempts/ENH-0NN/specification.md`.

1. **ENH-038 (v0.6.16)** — Fixed — subagent message loss (Claude) + format-drift (Gemini) + Codex audit; per-message uuid dedup replaced buggy cross-file `last_ts` cutoff.
2. **ENH-043 (v0.6.17)** — In progress — rebuild mode for permanently-corrupted pre-fix output (Claude); real-data repair run found 68 flagged dates (9 recovered / 42 unrecoverable / rest false-positives from over-loose regex, since tightened).
3. **Dogfooding Attempt 1 (2026-07-08)** — Failed — `--today` extraction captured an unrelated short session; message #1 content was not from today's real conversation.
4. **Dogfooding Attempt 2 (2026-07-08)** — Failed, root-caused → **ENH-047** — `--today` returned 36 of 3,114 real messages; multi-day session bucketing defect confirmed with real data (Claude). Unfixed.
5. **ENH-044 (v0.6.17)** — Not started — Gemini `--project` filter silently ignored; confirmed real cross-project contamination. Unfixed.
6. **ENH-045 (v0.6.17)** — Fixed — Codex incremental mtime-skip bug, mirrored from the Claude fix in ENH-038.
7. **ENH-046 (v0.6.17)** — Fixed — Gemini `.pb` sessions dated by file mtime instead of content; `_find_epoch_hint()` heuristic added.

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
- [attempts/ENH-044/specification.md](attempts/ENH-044/specification.md) — Gemini `project_filter` contamination fix (unfixed)
- [attempts/ENH-045/specification.md](attempts/ENH-045/specification.md) — Codex incremental mtime-skip fix
- [attempts/ENH-046/specification.md](attempts/ENH-046/specification.md) — Gemini `.pb` date-derivation defect
- [attempts/ENH-047/specification.md](attempts/ENH-047/specification.md) — multi-day date-bucketing defect (unfixed)
- [ADR-061](../../decisions/ADR-061-first-run-repair-notice-platform-specific-not-unified.md) — platform-specific first-run notice design decision (same branch — see "Related Design Work" above)

---

## How to Use This Meta-Issue

1. **Add attempt:** Create new `attempts/NNN-name/` folder from attempt-template.
2. **Update understanding:** Edit `analysis/root-cause-evolution.md` when beliefs shift.
3. **Log progress:** Update `implementation-log.md` with each attempt.
4. **Extract lessons:** Record reusable insights in `analysis/lessons-learned.md`.
