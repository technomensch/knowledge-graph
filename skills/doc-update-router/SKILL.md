# Skill: doc-update-router

**Purpose:** Intercept explicit doc-update requests and route to the correct command. Prevents doc edits from bypassing the `/kmgraph:update-doc` wizard, standards validation, and changelog enforcement.

**Trigger Patterns (match any):**
- "update [filename or doc name]" — e.g., "update GETTING-STARTED.md", "update the command guide"
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
   → Dispatch to `/kmgraph:session-summary`

2. If intent includes "changelog":
   → Dispatch to `/kmgraph:update-doc --user-facing CHANGELOG.md`

3. If intent includes "adr":
   → Dispatch to `/kmgraph:create-adr`

4. If a doc filename or name can be resolved from the intent:
   → Dispatch to `/kmgraph:update-doc --user-facing {resolved_path}`

5. If intent is ambiguous (e.g., "update the docs"):
   → Ask: "Which doc would you like to update?"
   → Then dispatch to `/kmgraph:update-doc --user-facing`

**Conflict with session-wrap:** These skills serve different intents and do not conflict.

| Skill | Fires on |
|---|---|
| `doc-update-router` | Explicit request: "update the session summary" |
| `session-wrap` | End-of-session signals: "stop", "I'm done", context limit |

If both could fire simultaneously (e.g., "update the session summary and stop"), `doc-update-router` takes precedence for the explicit intent; `session-wrap` adds end-of-session wrap-up on top.

**User-Facing Language:**
- Address the user directly; never expose command names or internal routing mechanics unprompted
- Confirm the resolved target before dispatching: "Got it — updating `GETTING-STARTED.md` through the update wizard..."
- Use the appropriate command naturally: "I'll use the update-doc wizard to make sure standards are applied."
