# Test Cases & Validation

Scenarios that must pass for chat-extraction reliability to be considered solved.

**Last Updated:** 2026-07-08

---

## Success Criteria

1. Date-filtered extraction returns the messages that actually occurred on that date, regardless of session start date.
2. Multi-day session `.jsonl` files fan out across the correct per-day output files.
3. No regressions in ENH-038 subagent handling or ENH-043 rebuild behavior.

---

## Test Cases

### Test Case 1: `--today` returns the real day's messages (ENH-047)

**Scenario:**
On 2026-07-08, extract with `--source claude --project=knowledge-graph --today`.

**Steps:**
1. Run the command.
2. Count returned messages.
3. Compare to the ground-truth raw `.jsonl` count.

**Expected Result:**
~3,114 messages returned (the real day's total), not 36.

**Actual Results:**
- **Attempt 004 (pre-fix):** 36 returned — FAIL (2,916 messages misfiled under 2026-07-06).

**Status:** Fail (defect open, ENH-047 not yet fixed)

---

### Test Case 2: Multi-day session file splits across dates (ENH-047)

**Scenario:**
A single `.jsonl` fixture whose messages span 2026-07-06 → 2026-07-08.

**Expected Result:**
Each message lands in the output file for its own date; a single-date filter returns exactly that date's known count.

**Status:** Not Yet Tested (needs `tests/test-extraction-multiday.sh`)

---

### Test Case 3: Correct session selected under `--today` (Attempt 3 follow-up)

**Scenario:**
`--today` on a day with multiple sessions, one of which is the real active conversation.

**Expected Result:**
The real conversation's content is extracted, not an unrelated short session's.

**Actual Results:**
- **Attempt 003 (pre-fix):** unrelated session captured (message #1 mismatch) — FAIL.

**Status:** Fail / needs root-cause after ENH-047 re-baseline

---

## Regression Tests

### Regression 1: ENH-038 subagent handling

**What it checks:** subagent user/assistant turns still extracted per-message with uuid dedup.
**Results:** must re-run `tests/test-extraction-subagent-repro.sh` (4/4) after any ENH-047 change.

### Regression 2: ENH-043 rebuild behavior

**What it checks:** `--rebuild` still forces overwrite/flatten and clears split subfolders.
**Results:** must re-run `tests/test-extraction-rebuild.sh` after any ENH-047 change.

---

## Acceptance Checklist

- [ ] Test Case 1 passes (~3,114 on 2026-07-08)
- [ ] Test Case 2 passes (multi-day split)
- [ ] Test Case 3 investigated/resolved
- [ ] No regressions (ENH-038, ENH-043 suites green)
- [ ] Documentation updated
