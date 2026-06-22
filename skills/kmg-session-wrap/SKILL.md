---
name: kmg-session-wrap
description: Prompt for session summary when user indicates they are stopping work or approaching context limits
---

# Skill: kmg-session-wrap

**Purpose:** Prompt for session summary when user indicates they're stopping work, approaching context limits, reaching milestones, or when open plan items, draft decisions, or uncaptured lessons are detected.

**Trigger Indicators:**

**User Intent Signals:**
- User says "stopping", "done for today", "that's it for now", "wrapping up", "I'm done"
- Context approaching 180K tokens (~90% of limit)
- PR just pushed
- Milestone completed

**Active Work Signals:**
- `docs/plans/*.md` contains unchecked `- [ ]` items (mid-plan indicator)
- `knowledge/decisions/*.md` has ADRs with `Status: Proposed` or `Status: Draft` (open decisions)
- Recent commits have lesson-worthy keywords (`fix`, `solved`, `implement`, `pattern`, `debug`, `refactor`) but no corresponding lesson file in `knowledge/lessons-learned/`
- Rules were captured to `knowledge/rules.md` or `knowledge/me.md` this session: surface "You established N guideline(s) this session. Worth checking whether any of them only apply in specific situations."
- Governance signals were flagged by update-graph this session (lesson output contained governance flag) but no rules were captured: surface "Some lessons this session might be worth saving as guidelines. Want to capture them before wrapping up?"

**Block Conditions:**
- Stop hook coordination flag exists: `/tmp/.kg-session-summarized-{kg-name}-{date}` — if present, do NOT prompt (Stop hook already fired; avoid double-prompting)

**ECC Compatibility Note:** This skill is coordinated with the Stop hook to prevent duplicate prompting. On Claude Code, the /tmp flag mechanism is used for inter-process coordination. On other ECC platforms, equivalent synchronization mechanisms (environment variables, shared state, or hook phase detection) should be used to prevent re-prompting if the Stop hook has already triggered this workflow.

**Snapshot Awareness:**
- Check for snapshot flag: `/tmp/.kg-snapshot-{YYYY-MM-DD}` (today's date)
- If snapshot flag exists: session summary already has partial content. Adjust prompt:
  > "You took a session snapshot earlier — want to complete the wrap-up and save the final summary?"
- If no snapshot flag: use standard wrap-up prompt.

**Behavior:**
When triggered, directly dispatch to `session-summary-agent` with conversational language that addresses the user, never exposing internal mechanics.

**Example Triggers:**

```
User: "Alright, I've pushed this to the branch. Wrapping up for today."
→ "Before you go — want a quick note on what we worked on today?"
```

```
[Skill detects unchecked plan steps]
→ "You're mid-plan — want to mark off what we finished before wrapping up?"
```

```
[Skill detects lesson-worthy commits without corresponding lesson]
→ "Looks like some meaningful work wasn't captured — want to save a note before finishing?"
```

**User-Facing Language Rules:**
- Address the user directly (never expose internal tool names or agent names)
- Conversational, inviting language
- No technical jargon about "dispatching", "agents", or internal file paths
- Single, clear question per prompt
- Treat the session summary as optional but valuable

---

### Open Items Scan

After writing the session summary, scan all ADRs and ENHs created or modified this session:

```bash
git diff --name-only HEAD~20 -- knowledge/decisions/ knowledge/enhancements/ 2>/dev/null \
  | head -20
```

For each file found, extract the `## Open Questions` section (if present).

Deduplicate across all files (same question text = one entry).

Emit a final `## Open Items` section in the session summary with all extracted questions.

**Single write path enforced:** Do NOT write open items directly to the session summary during the session. Only the session-wrap skill reads and aggregates them at wrap time.
