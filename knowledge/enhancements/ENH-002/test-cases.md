---
title: Test Cases — ENH-002 Session Snapshot on Capture
enhancement_id: ENH-002
github_issue: 41
status: Draft
created: 2026-03-28
---

# Test Cases: ENH-002 Session Snapshot on Capture

**Local ID:** ENH-002 | **GitHub Issue:** #41

---

## TC-001: Snapshot gate appears before capture-lesson

**Setup:** No session summary exists for today
**Action:** Run `/kmgraph:capture-lesson`
**Expected:**
- Snapshot gate prompt appears before discourse capture
- User can choose yes/no/skip
- If skip: capture-lesson proceeds normally without snapshot

---

## TC-002: Snapshot gate appears before create-adr

**Setup:** Active session, no summary for today
**Action:** Run `/kmgraph:create-adr`
**Expected:** Snapshot gate prompt appears before ADR context gathering

---

## TC-003: Snapshot gate appears before start-issue-tracking

**Setup:** Active session
**Action:** Run `/kmgraph:start-issue-tracking Some enhancement`
**Expected:** Snapshot gate appears in Step 0, after behavior lock, before Step 1 versioning gate

---

## TC-004: Git inclusion is opt-in

**Setup:** User says yes to snapshot
**Action:** At "Include git history?" prompt, say no
**Expected:**
- session-summary-agent runs without any git log calls
- Snapshot completes in under 10 seconds
- Snapshot contains conversation context and file changes only

---

## TC-005: Git included when requested

**Setup:** User says yes to snapshot, yes to git
**Action:** Snapshot runs
**Expected:**
- Snapshot includes recent commits from git log
- Snapshot completes in under 30 seconds

---

## TC-006: Append mode on second snapshot same day

**Setup:** Session summary for today already exists from an earlier snapshot
**Action:** Trigger capture → say yes to snapshot
**Expected:**
- session-summary-agent appends to existing file rather than creating new
- New content appears under a timestamped separator
- Commits already listed in the summary are not duplicated
- Files already listed are not duplicated

---

## TC-007: Snapshot creates new file when none exists today

**Setup:** No session summary exists for today
**Action:** Trigger capture → say yes to snapshot
**Expected:**
- New session summary file created in correct directory
- File named with today's date and auto-generated slug
- Capture command proceeds after snapshot completes

---

## TC-008: session-end-prompt detects existing snapshot

**Setup:** Snapshot was taken earlier in session (flag file exists)
**Action:** Session ends (Stop hook fires)
**Expected:**
- Stop hook detects flag file for today's session
- Prompt changes to: "You have a session snapshot from today — want to complete the wrap-up?"
- NOT the default "before you go, want a quick note?" prompt

---

## TC-009: Declining snapshot does not block capture

**Setup:** Active session
**Action:** Run `/kmgraph:capture-lesson` → say no to snapshot
**Expected:**
- Capture-lesson proceeds immediately to discourse capture
- No session summary created or modified
- Full capture workflow completes normally

---

## TC-010: post-tool-lesson-check hook offers snapshot path

**Setup:** Lesson-worthy commit detected by PostToolUse hook
**Action:** Hook fires
**Expected:**
- Prompt: "Lesson-worthy commit — snapshot session and capture?" (not just "capture now?")
- Yes path: snapshot runs, then capture-lesson
- No path: no capture, no snapshot

---

## TC-011: Snapshot context referenced in captured lesson

**Setup:** Snapshot taken before capture-lesson
**Action:** Capture-lesson completes
**Expected:**
- Lesson file's context/background section references or is informed by the session snapshot
- The "why this was discovered" is preserved in the lesson content

---

## TC-012: Snapshot mode does not affect full session-summary behavior

**Setup:** User runs `/kmgraph:session-summary` directly (not via snapshot gate)
**Action:** Full session summary runs
**Expected:**
- Full mode behavior unchanged
- Git included by default in full mode (existing behavior)
- Snapshot mode only triggered via snapshot gate, not by default

---

## Acceptance Criteria Summary

| Criteria | TC |
|---|---|
| Snapshot gate on all 3 capture commands | TC-001, TC-002, TC-003 |
| Git opt-in reduces overhead | TC-004, TC-005 |
| Append mode deduplicates | TC-006 |
| New file created when needed | TC-007 |
| Stop hook detects prior snapshot | TC-008 |
| Declining snapshot is safe | TC-009 |
| Hooks updated | TC-010 |
| Context preserved in captured artifact | TC-011 |
| Full session-summary unaffected | TC-012 |
