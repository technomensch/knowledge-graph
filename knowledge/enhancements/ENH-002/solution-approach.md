---
title: Solution Approach — ENH-002 Session Snapshot on Capture
enhancement_id: ENH-002
github_issue: 41
status: Draft
created: 2026-03-28
---

# Solution Approach: ENH-002 Session Snapshot on Capture

**Local ID:** ENH-002 | **GitHub Issue:** #41

## Core Design

Add a "snapshot gate" to all capture entry points. The gate is a single two-question prompt that runs the session-summary-agent in lightweight mode before handing off to the capture workflow.

### Snapshot Gate (reusable across commands)

```
Before capturing — want to snapshot the session first?
This preserves the current context and "why" behind this capture.

  [y] Snapshot first   [n] Skip snapshot   [?] What does this do?
```

If `y`:
```
Include git history in the snapshot? (adds ~5-15 sec)

  [y] Yes — include commits   [n] No — conversation + files only
```

Then: session-summary-agent runs in append/snapshot mode → capture proceeds.

## session-summary-agent Changes

Add a `--snapshot` mode distinct from `--full`:

| Mode | What it captures | Git? | Duration |
|---|---|---|---|
| `--full` (existing) | Everything — git, plans, ADRs, commits | Yes | 30-60 sec |
| `--snapshot` (new) | Conversation context, file changes, open items | Optional | 5-10 sec |
| `--append` (existing) | Appends new work to today's existing summary | Varies | Varies |

In `--snapshot` mode:
- Reads current file changes (unstaged + staged)
- Reads open plan items from `docs/plans/*.md`
- Records the conversational thread that triggered the capture
- Skips git log unless user said yes to git inclusion
- Appends to today's session summary if one exists; creates new if not
- Does NOT ask the user to review/confirm — writes immediately and returns

## Per-Command Changes

### capture-lesson.md
Add to Step 0 (before discourse capture):
```
→ Snapshot gate
→ If yes: session-summary --snapshot [--git]
→ Continue to Step 0 discourse capture (now has session summary as context)
```

### create-adr.md
Add before Step 1 (context gathering):
```
→ Snapshot gate
→ If yes: session-summary --snapshot [--git]
→ Continue to ADR creation (context section can reference session summary)
```

### start-issue-tracking.md
Add to Step 0 (pre-flight), after behavior lock:
```
→ Snapshot gate
→ If yes: session-summary --snapshot [--git]
→ Continue to Step 1 versioning gate
```

## Hook Changes

### post-tool-lesson-check.sh
Current: "Lesson-worthy commit detected — capture now?"
New: "Lesson-worthy commit detected — snapshot session and capture?"
→ If yes: invoke session-summary --snapshot, then capture-lesson

### session-end-prompt.sh
Current: Checks for session summary, prompts if missing
New: Checks if snapshot was taken today (flag file: `/tmp/.kg-snapshot-{PPID}-{date}`)
→ If snapshot exists: "You have a session snapshot from today — want to complete the wrap-up?"
→ If no snapshot: existing full wrap-up prompt

**⚠️ PPID concern:** `$PPID` may not be stable or available in all agent execution contexts. Before implementation, verify whether `$PPID` is reliably set when hooks run. If not, fall back to `$CLAUDE_SESSION_ID` (if available) or a UUID written at first snapshot and cached in `/tmp/.kg-snapshot-id-{date}`. Do not assume PPID without verification.

## Append-Mode Deduplication

When session-summary-agent appends to an existing summary, it checks:
- Commit hashes already listed → skip
- File paths already in "Files Touched" → skip
- Plan items already in "Plan Status" → skip

New content is added under a timestamped separator:
```markdown
---
### Update: HH:MM (triggered by: capture-lesson)

[new content since last snapshot]
```

## Implementation Sequence

1. **session-summary-agent**: Add `--snapshot` mode, opt-in git flag, append deduplication
2. **capture-lesson.md**: Add snapshot gate to Step 0
3. **create-adr.md**: Add snapshot gate before Step 1
4. **start-issue-tracking.md**: Add snapshot gate to Step 0 (after behavior lock)
5. **post-tool-lesson-check.sh**: Update prompt to offer snapshot-first path
6. **session-end-prompt.sh**: Add snapshot flag file check
7. **session-wrap SKILL.md**: Update to reflect snapshot awareness

## Notes

- The snapshot gate is always user-confirmed (never automatic)
- Declining the snapshot has no penalty — capture proceeds normally
- The git opt-out is the key overhead control: most mid-session snapshots won't need git history (that's for wrap-up)
- Session summary append mode already exists in the command — this formalizes and exposes it via `--snapshot`
