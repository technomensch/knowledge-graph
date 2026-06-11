---
name: doc-update-router
description: Route explicit doc-update requests to the correct command, ensuring standards validation and changelog enforcement.
---

# Skill: doc-update-router

**Purpose:** Intercept explicit doc-update requests and route to the correct command. Prevents doc edits from bypassing the `/kmgraph:update-doc` wizard, standards validation, and changelog enforcement.

**Trigger Patterns (match any):**
- "update [filename or doc name]" — e.g., "update quickstart.md", "update the command guide"
- "update this doc" / "update the doc" — resolves to most recently referenced doc
- "update today's session summary" / "update the session summary" / "update the current session"
- "update the changelog"
- "update the ADR" / "update the adr"

**Do NOT trigger on:**
- "update the code" / "update the tests" / "update the function" — not doc updates
- "let's update" with no doc reference — too ambiguous
- End-of-session signals like "I'm done" / "wrapping up" — those belong to `session-wrap`

**Routing Logic (check in this order):**

1. If intent includes "session summary" / "current session" / "today's session":
   → Dispatch to `session-summary-agent` (or `/kmgraph:session-summary` on Claude Code)

2. If intent includes "changelog":
   → Dispatch to document update handler with CHANGELOG.md (or `/kmgraph:update-doc --user-facing CHANGELOG.md` on Claude Code)

3. If intent includes "adr":
   → Dispatch to ADR creation handler (or `/kmgraph:create-adr` on Claude Code)

4. If a doc filename or name can be resolved from the intent:
   → Dispatch to document update handler with {resolved_path} (or `/kmgraph:update-doc --user-facing {resolved_path}` on Claude Code)

5. If intent is ambiguous (e.g., "update the docs"):
   → Ask: "Which doc would you like to update?"
   → Then dispatch to document update handler

**ECC Compatibility Note:** The routing above describes agent and function-based dispatch in platform-agnostic terms. The parenthetical Claude Code command syntax is provided for reference but should not be hard-coded in ECC implementations. Each platform dispatches through its native agent/command system.

**Conflict with session-wrap:** These skills serve different intents and do not conflict.

| Skill | Fires on |
|---|---|
| `doc-update-router` | Explicit request: "update the session summary" |
| `session-wrap` | End-of-session signals: "stop", "I'm done", context limit |

If both could fire simultaneously (e.g., "update the session summary and stop"), `doc-update-router` takes precedence for the explicit intent; `session-wrap` adds end-of-session wrap-up on top.

**User-Facing Language:**
- Address the user directly; never expose command names or internal routing mechanics unprompted
- Confirm the resolved target before dispatching: "Got it — updating `[resolved doc]` through the update wizard..."
- Use the appropriate command naturally: "I'll use the update-doc wizard to make sure standards are applied."
