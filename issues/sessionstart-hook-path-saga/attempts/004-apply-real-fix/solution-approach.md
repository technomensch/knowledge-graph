# Attempt 004: Apply Real Fix — Path Correction to Parent Directory

**Date:** 2026-03-28 (4th restart attempt)
**Status:** In Progress
**Root Cause Identified:** Scripts are at project root `/scripts/` but hooks.json was pointing to relative `.claude-plugin/scripts/` which doesn't exist.

## Approach

Previous attempts (001-003) changed environment variables but never fixed the actual script path.

**Real fix:** Update all 7 hook commands in `hooks/hooks.json`:

```diff
- "command": "${CLAUDE_PLUGIN_ROOT}/scripts/hooks-master.sh"
+ "command": "${CLAUDE_PLUGIN_ROOT}/../scripts/hooks-master.sh"
```

Apply to all 7 occurrences:
1. `hooks-master.sh` (SessionStart)
2. `post-tool-lesson-check.sh` (PostToolUse)
3. `platform-file-change-check.sh` (PostToolUse)
4. `plan-mirror.sh` (PostToolUse)
5. `pre-commit-knowledge-gate.sh` (PreToolUse)
6. `session-end-prompt.sh` (Stop)
7. `notification-dispatch.sh` (Notification)

## Rationale

- `${CLAUDE_PLUGIN_ROOT}` → `/Users/mkaplan/.claude/plugins/marketplaces/stayinginsync-knowledge-graph`
- Scripts are at → `/Users/mkaplan/.claude/plugins/marketplaces/stayinginsync-knowledge-graph/../scripts`
- Which resolves to → `/Users/mkaplan/.claude/plugins/marketplaces/stayinginsync-knowledge-graph/scripts` ✓
- Scripts confirmed to exist: `ls /Users/mkaplan/.claude/plugins/marketplaces/stayinginsync-knowledge-graph/scripts/`

## Expected Outcome

- SessionStart hook runs without error
- `✅ Knowledge Graph: knowledge-graph (memory synced 0 days ago)` displays cleanly
- No repeated `SessionStart:startup hook error` messages

## Test Plan

1. Edit `hooks/hooks.json` with `../scripts/` path
2. Start new Claude session: `claude` in knowledge-graph directory
3. Verify no error messages on startup
4. Verify hook output displays correctly
