
# Issue-7 Solution Approach

## Design Constraint

Fix must be implemented ONCE in a way that works correctly for v0.6.0 architecture — not patched now and revisited later. Any solution chosen here becomes the canonical pattern for all reviewer agent dispatch going forward.

## Option A: Pre-embed Diff (current workaround — promote to canonical pattern)

**What:** Before dispatching any reviewer agent, run `git diff BASE..HEAD` in the main session (which has Bash access) and embed the full diff as inline context in the agent prompt. The agent reads code via Read/Grep/Glob tools and never needs Bash for the diff.

**Status:** Already working in v0.5.9.1 session.

**Pros:**
- Zero permission prompts
- Works today, no config changes needed
- Agent gets full diff in context without any tool calls

**Cons:**
- Large diffs exceed prompt limits
- Reviewer cannot run targeted follow-up queries (grep, file read)
- Doesn't address non-diff Bash needs

**v0.6.0 fit:** Viable as the primary pattern. Diff size can be managed by splitting stat + focused file diffs.

---

## Option B: Project Bash Allow-list for Read-only Git Commands

**What:** Add `.claude/settings.json` (or `settings.local.json`) with an `allowedTools` or `permissions` entry that pre-authorizes specific read-only Bash patterns for reviewer agents.

**What to allow:**
```json
{
  "permissions": {
    "allow": [
      "Bash(git diff*)",
      "Bash(git log*)",
      "Bash(git show*)",
      "Bash(git status*)",
      "Bash(git rev-parse*)"
    ]
  }
}
```

**Pros:**
- Eliminates permission prompts for safe read operations permanently
- Reviewer agents can execute follow-up queries freely
- Aligns with how other tools (Read, Grep) already work without prompts

**Cons:**
- Requires Claude Code settings file change
- Allow-list must be maintained as review patterns evolve
- Still does not add context to prompts when non-listed commands are attempted

**v0.6.0 fit:** Best long-term fix. Should be part of the v0.6.0 plugin setup/installer.

---

## Option C: Describe Bash Commands (context injection)

**What:** When dispatching agents that will need Bash, use the `description` parameter on Bash calls (if Claude Code exposes it) to provide user-visible context. Requires testing whether the permission prompt surfaces the description field.

**Status:** Unverified — needs investigation into whether Claude Code's permission prompt uses the tool call description.

**Pros:** Addresses root UX cause (no context in prompt)
**Cons:** May not be supported; requires per-command annotation

**v0.6.0 fit:** If verifiable, combine with Option B.

---

## Option D: Anthropic Feedback

**What:** Document as UX feedback — the Bash permission prompt should display:
1. Which agent is requesting it
2. The stated purpose of the command
3. Visual distinction from protocol HALTs (different color, header, framing)

This is not implementable in the plugin but should be submitted as product feedback.

**v0.6.0 fit:** File as external feedback item; do not block on it.

---

## Recommended Approach for v0.6.0

1. **Implement Option B** — add `.claude/settings.json` allow-list for read-only git commands as part of the v0.6.0 plugin setup/default config
2. **Document Option A** as the canonical pattern for reviewer agent dispatch when diff size is manageable
3. **Investigate Option C** to determine if description field is surfaced in permission prompts
4. **File Option D** as Anthropic product feedback

Implementation should land in a single v0.6.0 task — not patched incrementally across point releases.
