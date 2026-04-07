# Root Cause Evolution

## Belief Shift #1: Environment Variable Confusion (Attempts 001-003)

**Prior Belief:**
- Attempts 001-003 treated this as a "variable name" problem
- Oscillated between `${CLAUDE_PROJECT_DIR}` and `${CLAUDE_PLUGIN_ROOT}`
- Assumed path resolution was the issue

**Evidence:**
- Commit 133724d3: Changed to `${CLAUDE_PROJECT_DIR}`
- Commit e727b226: Reverted to `${CLAUDE_PLUGIN_ROOT}`
- Hook errors persisted despite variable changes

**Why this belief was incomplete:**
- Focused on *which* variable to use, not whether the *scripts exist*
- Never verified that hook commands pointed to existing files

---

## Belief Shift #2: Path Resolution Works, Scripts Don't (Attempt 004)

**New Understanding:**
- `hooks.json` references 7 hook scripts
- **6 of 7 scripts do not exist** in the plugin's scripts directory:
  - ✗ `post-tool-lesson-check.sh`
  - ✗ `platform-file-change-check.sh`
  - ✗ `plan-mirror.sh`
  - ✗ `pre-commit-knowledge-gate.sh`
  - ✗ `session-end-prompt.sh`
  - ✗ `notification-dispatch.sh`
  - ✓ `hooks-master.sh` (ONLY ONE THAT EXISTS)

**Evidence:**
```bash
$ ls /Users/mkaplan/.claude/plugins/marketplaces/stayinginsync-knowledge-graph/scripts/
hooks-master.sh  ← Only this one is defined in hooks.json
```

**Why this is the root cause:**
- Claude Code's hook system tries to validate/register all 7 hooks
- 6 hooks fail to resolve
- SessionStart hook error appears when system encounters missing script references
- Error repeats because system retries unresolved hooks

**Impact:**
- Path variables are correct (`../scripts/` resolves properly)
- Problem is hooks.json references non-existent scripts
- Removing undefined hooks should fix the SessionStart error

---

## Timeline

| Attempt | Date | Belief | Result |
|---------|------|--------|--------|
| 001 | 2026-03-28 | Revert env var to CLAUDE_PLUGIN_ROOT | ✗ Error persisted |
| 002 | 2026-03-28 | Debug script path resolution | ✗ Paths looked correct; mystery remained |
| 003 | 2026-03-28 | Change to `../scripts/` | ✗ Error persisted |
| 004 | 2026-03-28 | Verify scripts exist; found mismatch | ✓ ROOT CAUSE FOUND |
| 005 | 2026-03-28 | Uninstall marketplace + fix path to `scripts/` | ✗ Error persists — deeper issue |
| 006 | 2026-03-28 | Full uninstall + ghost registry + auto-detection | ✓ TWO ROOT CAUSES CONFIRMED |

---

## Belief Shift #3: Scripts Exist in Repo, Not in Plugin Install (Attempt 004, continued)

**Previous Understanding (earlier in Attempt 004):**
Scripts were never created — hooks.json had placeholder entries.

**Corrected Understanding:**
All 7 scripts exist in the **repo** (`/Users/mkaplan/GitHub/knowledge-graph/scripts/`). They were created in commit `680d2dd0`. The problem is a **three-layer deployment gap:**

1. **Plugin is a copy, not a symlink** — plugin install at `.claude/plugins/marketplaces/stayinginsync-knowledge-graph/` is a separate directory, not linked to the repo
2. **`../scripts/` path resolves to nowhere** — `${CLAUDE_PLUGIN_ROOT}/../scripts/` = `.../marketplaces/scripts/` which doesn't exist
3. **Plugin's scripts/ is stale** — only has original scripts, missing 6 newer ones

**Evidence:**
```
Repo scripts/:     11 files (all 7 hook scripts present)
Plugin scripts/:    8 files (missing 6 hook scripts)
../scripts/:        Does not exist
```

---

## Belief Shift #4: Marketplace Uninstall + Path Fix Still Fails (Attempt 005)

**Previous Understanding:**
Fix the `../scripts/` path and sync/symlink scripts in the marketplace install.

**What Was Done:**
- Completely uninstalled the marketplace plugin (deleted dirs, removed enabledPlugins entry, cleaned permissions)
- Fixed hooks.json paths back to `${CLAUDE_PLUGIN_ROOT}/scripts/` (matching pre-v0.2.x working pattern)
- Project's `.claude-plugin/plugin.json` still exists, so Claude Code loads plugin from project root

**Result:** Still failing. SessionStart hook error persists in fresh terminal.

**What This Means:**
The problem is NOT just about the marketplace install being stale. Even with:
- No marketplace install
- Correct `scripts/` path (no `../`)
- Plugin loaded from project root where scripts actually exist

...the error still occurs. This points to a deeper issue:
- `CLAUDE_PLUGIN_ROOT` may not resolve to the project root when loaded from `.claude-plugin/`
- There may be cached plugin state we haven't found
- The error may not be path-related at all (permissions? script content? missing dependency?)
- Need to capture the **actual error output** to diagnose further

---

## Key Insight

The bug has survived 5 fix attempts across two different deployment models (marketplace install and project-root loading). We have been fixing paths without verifying what `CLAUDE_PLUGIN_ROOT` actually resolves to at runtime. Next step must be empirical: instrument the hook to log the resolved path and capture the exact error.

**Lessons:**
1. Always verify where `${CLAUDE_PLUGIN_ROOT}` actually resolves to before writing hook paths
2. Plugin installs that are directory copies (not symlinks) will drift from the repo
3. Check both "does the script exist?" AND "does the path resolve to where the script is?"
4. When a fix "should work" but doesn't, get the actual error output — don't assume the failure mode
