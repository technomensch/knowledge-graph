# Open Issues & PRs — 2026-06-10

## Open GitHub Issues (4)

| # | Title | Labels |
|---|---|---|
| 130 | ENH-023: Extend pre-skill-rules-inject.sh to cover official marketplace skills (code-review bypass) | (none) |
| 47 | ENH-006: Sequential prompts + decoupled decisions in start-issue-tracking | enhancement |
| 46 | ENH-005: FTS5 database relocation to user-level cache (~/.claude/kg-fts5/) | enhancement |
| 39 | [Meta] v0.2.1 backlog — kg_capture MCP tool, sync-all/update-graph refactor, skill modernization | enhancement |

## Open GitHub PRs

None. The `v0.5.10.2-codex-marketplace` branch is pushed but no PR has been opened yet (blocked on validation).

## Active Plan: v0.5.10.2-codex-marketplace

**Plan file:** `knowledge/plans/v0.5.10.2-codex-marketplace.md`

### All Tasks Completed

- [x] Task 1: Create branch `v0.5.10.2-codex-marketplace` from main
- [x] Task 2: Create `.codex-plugin/plugin.json`
- [x] Task 3: Create `.codex-plugin/mcp.json`
- [x] Task 4: Create `marketplace.json` at repo root
- [x] Task 5: Version bump to 0.5.10.2 (package.json, .claude-plugin/plugin.json, .claude-plugin/marketplace.json)
- [x] Task 6: Validate Codex Install — RESOLVED (plugin now discoverable)
- [x] Task 6b: Security Fix — mcp.json cwd — RESOLVED
- [x] Task 7: Commit, push, and prepare for PR — COMPLETE

**No open items blocking PR.**

## Branches With PRs Not Yet Opened

| Branch | Status | Notes |
|---|---|---|
| `v0.5.10.2-codex-marketplace` | Pushed, ready for PR | All tasks complete; awaiting PR creation |
| `v0.5.11-kg-recall-rename` | Pushed, no PR | ENH-013: kg-recall → recall-gate rename; awaiting PR creation |
