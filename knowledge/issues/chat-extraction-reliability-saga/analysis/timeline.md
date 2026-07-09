# Timeline

Chronological history of the chat-extraction reliability investigation.

**Problem Identified:** 2026-07-06 (subagent loss surfaced earlier; saga formalized 2026-07-08)
**Last Updated:** 2026-07-08

---

## Chronological History

**v0.6.16 (branch `v0.6.16-update-claude-extract-chat-for-sub-agents`, PR #160): Subagent message loss fixed**
- ENH-038 filed for subagent message loss.
- Replaced cross-file `last_ts` cutoff with per-message uuid dedup; fresh-write path flattens+sorts chronologically.
- Validated against synthetic fixtures only.
- See [ENH-038](../../../enhancements/ENH-038/ENH-038-specification.md).

**2026-07-06: ENH-043 filed — no rebuild mode; pre-fix files stay corrupted**
- Full-history forensic audit found 486 of 2,801 subagent messages (17%) missing; leftover `## Session N` blocks and stale header counts in real July output.
- Root cause: uuid dedup is permanent-memory, routing existing files down the incremental-append branch that never re-flattens.
- See [ENH-043](../../../enhancements/ENH-043/ENH-043-specification.md).

**2026-07-08: ENH-043 real-data repair run**
- `--rebuild` executed against real `knowledge/chat-history/`: 68 dates flagged → 9 recovered (via Backblaze backup), 42 permanently unrecoverable (no source), rest false positives from over-loose regex (tightened).
- Health-check renamed `find_corrupted_chat_files.py` → `check_extraction_health.py`.

**2026-07-08: Dogfooding Attempt 1 (`--today`, first run) — FAILED**
- Extracted file's message #1 not from today's real conversation; unrelated short session captured.
- Belief Shift #1: "marketplace plugin staleness" → "wrong session content extracted."

**2026-07-08: Dogfooding Attempt 2 (`--today`, second run) — FAILED, root-caused → ENH-047**
- `--today` returned 36 of 3,114 real messages.
- Direct investigation: 3,114 extractable messages across today's `.jsonl` files; three largest (2,916 messages) all first-derive `session_date = 2026-07-06`.
- Root cause: first-timestamp-only date derivation (`extract_claude.py` ~lines 176–181).
- Belief Shift #2: "wrong session captured" → "multi-day date-bucketing defect."
- Filed [ENH-047](../../../enhancements/ENH-047/ENH-047-specification.md); meta-issue formalized.

---

## Milestones

- [x] **Problem Identified:** 2026-07-06 (subagent loss) / 2026-07-08 (multi-day bucketing)
- [x] **Root Cause Understood (ENH-047):** 2026-07-08
- [ ] **Solution Validated:** pending ENH-047 fix
- [ ] **Deployed:** pending
- [ ] **Monitoring Confirmed:** pending
