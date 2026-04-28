---
id: issue-4
type: Bug
status: deferred
github-issue: "#106"
branch: none
created: 2026-04-28
---

# Issue-4: Stop Hook /tmp Flag Accumulates Per-Subprocess Instead of Per-Session

## Summary

The Stop hook writes `/tmp/.kg-session-summarized-{PPID}-{date}` to prevent `session-wrap` from double-prompting if the Stop hook has already fired. However, `$PPID` resolves to the spawning subprocess's PID rather than a stable session-level identifier. Each subagent invocation, tool call, or shell child gets a distinct PPID, so 100+ flags accumulate in a single session. The deduplication check never matches because the reading process has a different PPID than the writing process.

## Observed Behavior

On 2026-04-28, at the end of the v0.5.4 implementation session, `/tmp` contained ~150 flags of the form `.kg-session-summarized-{N}-20260428`, all with different PIDs. The `session-wrap` block condition reads for a flag matching the *current* process's PPID — which never matches any previously written flag.

## Expected Behavior

One flag per session per day. The block condition fires correctly when `session-wrap` is invoked after the Stop hook has already triggered a summary prompt.

## Root Cause

`$PPID` in bash resolves to the *parent* of the current shell process. In Claude Code's subagent/tool execution model, each spawned process has a unique PPID. Using `$PPID` as the session key is not stable across the session lifecycle.

## Proposed Fix

Key the flag on a stable session-level identifier. Candidates:
1. `$CLAUDE_SESSION_ID` — if this env var is exported by Claude Code (needs verification)
2. The terminal session PID (`ps -o ppid= -p $PPID` to walk up the process tree to the terminal)
3. A fixed per-day key with no PID component: `/tmp/.kg-session-summarized-{date}` — simpler but loses per-session granularity (one user running two sessions on the same day would share the flag)
4. A fixed key written by the hook and deleted at session close

**Recommended:** Investigate whether `$CLAUDE_SESSION_ID` or equivalent is available in the hook environment before implementing. If not available, option 3 (date-only key) is the safest fallback — the double-prompting problem it prevents is rare enough that per-day granularity is acceptable.

## Files Affected

- `scripts/hooks-master.sh` — Stop hook section that writes the flag
- `skills/session-wrap.md` — block condition check that reads the flag

## Context

Discovered during v0.5.4 session wrap-up (2026-04-28). Branch `v0.5.4-profile-autoload` had just been merged to main via PR #104.

## Related

- `session-wrap` skill — the double-prompt prevention mechanism this flag supports
- ADR-020 — lifecycle hooks suite
