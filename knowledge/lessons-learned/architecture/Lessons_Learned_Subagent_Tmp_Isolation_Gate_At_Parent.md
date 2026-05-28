# Lesson: Gate inter-agent state at parent dispatch — subagent /tmp isolation is uncharted

**Date:** 2026-05-25  
**Source:** Opus hardening review, v0.5.9 plan session  
**Category:** Architecture, State Management, Subagent Coordination  
**Applies to:** Claude Code plugins, subagent-driven development patterns, inter-step coordination

## Problem Statement

During v0.5.9 Opus hardening review, a cascade gate was designed using `/tmp/kmgraph-adr-captured-$(date +%Y-%m-%d).flag`. Opus flagged that subagents dispatched via `superpowers:subagent-driven-development` (Task tool) may not share `/tmp/` with the parent — this is **undocumented behavior in Claude Code**.

Additionally, subagents (Task tool) **cannot interactively prompt the user**, so any gate that fires inside a subagent either:
- Hangs (waiting for user input that never comes)
- Gets bypassed silently (no way to ask for confirmation)

## Solution

**Gate checks must happen at dispatch time in the parent process**, not inside the subagent.

- The parent context has interactive user prompts available
- The parent can inspect state before calling the subagent skill
- Subagents should never need to see or check state flags

**Pattern:**

```
Parent process (interactive):
  1. Check /tmp flag → user interaction if needed
  2. Invoke subagent skill via superpowers:subagent-driven-development
  3. Subagent runs deterministically (no flag logic)
  4. Parent resumes after subagent completes
```

**Anti-pattern:**

```
Subagent (non-interactive):
  1. Check /tmp flag inside skill
  2. If flag missing → try to prompt user (HANGS or SILENT BYPASS)
  3. No way to gate deterministically
```

## Secondary Finding

No prior documentation exists in the knowledge-graph KG on whether Claude Code Task tool subagents share `/tmp/` with the parent process. **Assume they might not** — design state coordination accordingly.

## Why It Matters

- Gates placed inside subagent skills are **unreliable** (silent bypass or hang)
- Gates placed in the parent hook are **deterministic and user-interactive**
- Avoids both the /tmp isolation uncertainty AND the subagent-cannot-prompt-user problem

## Recommended Practice

1. Use `/tmp` flags for recording state that persists across entire workflows (e.g., "ADR was captured today")
2. Check flags **in parent hooks only**, before dispatching subagents
3. Let subagents run unconditionally once dispatched
4. If a subagent needs to know whether to run, pass it as an explicit parameter from the parent, not as a side effect (flag file)

## Example

**Good:**
```
Hook (parent, interactive):
  - Check /tmp/kmgraph-adr-captured-2026-05-25.flag
  - If exists, show user confirmation before invoking skill
  - Only invoke subagent if user approves
```

**Bad:**
```
Skill (subagent, non-interactive):
  - Try to check /tmp flag
  - If flag missing, prompt user for confirmation
  - PROBLEM: Subagent can't prompt → hangs or skips silently
```

## References

- v0.5.9 plan: cascade gate design for ADR capture workflow
- Claude Code Task tool limitations: non-interactive execution, possible /tmp isolation
