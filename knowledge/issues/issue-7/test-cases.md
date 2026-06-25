---
id: issue-7
file: test-cases
status: defined
---

# Issue-7 Test Cases

## TC-1: Allow-listed command — no prompt

**Setup:** `.claude/settings.json` contains `Bash(git diff*)` in allow list.
**Action:** Dispatch reviewer agent that runs `git diff BASE..HEAD`.
**Expected:** No permission prompt appears. Agent receives output directly.
**Pass criteria:** Review completes without any "Do you want to proceed?" interruption.

## TC-2: Non-allow-listed command — prompt appears with context

**Setup:** Agent attempts a command not on the allow list.
**Expected:** Permission prompt appears. Prompt includes agent name or stated purpose (if Option C implemented).
**Pass criteria:** User can determine what is being asked without guessing.

## TC-3: Pre-embed diff pattern — reviewer needs no Bash

**Setup:** Main session pre-runs `git diff --stat` + targeted `git diff -- <files>`, embeds in prompt.
**Action:** Dispatch reviewer agent.
**Expected:** Agent reads diff from context, does not execute any Bash commands.
**Pass criteria:** No permission prompts during entire review.

## TC-4: Review HALT visually distinct from permission prompt

**Setup:** Reviewer reaches end of review pass, presents audit trail.
**Expected:** HALT block includes finding description, severity, recommended action.
**Pass criteria:** HALT block is clearly distinguishable from Bash permission prompt by content and structure.

## TC-5: Regression — git commit still suppressed in lesson check

**Setup:** Bash tool executes `git commit -m "..."` with "bug resolved" in message.
**Expected:** `post-tool-lesson-check.sh` suppresses prompt (git commit suppression rule).
**Pass criteria:** No lesson-capture prompt on commit.
