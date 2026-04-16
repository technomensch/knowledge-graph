---
description: Automated knowledge sync orchestrator — replaces 4-step manual pipeline with 1 command
---

# Knowledge Sync All

**Purpose:** Automate the full knowledge synchronization pipeline that previously required 4 manual skill invocations. Scans for new lessons, extracts KG entries, links to plans/issues, and drafts GitHub comments — all with a single confirmation.

---

## Usage

```bash
/kmgraph:sync-all
/kmgraph:sync-all --auto           # Skip confirmation for GitHub posting
/kmgraph:sync-all --dry-run        # Show what would sync without making changes
```

**Parameters:**
- `--auto` (optional): Skip confirmation prompts (use for automated pipelines)
- `--dry-run` (optional): Preview sync actions without writing files

---

## What This Replaces

**Before (4 manual steps):**
```
1. /kmgraph:capture-lesson        → Capture lesson in {active_kg_path}/lessons-learned/
2. /kmgraph:update-graph           → Extract KG entries to {active_kg_path}/knowledge/
3. /kmgraph:update-issue-plan      → Sync to plan and local issue
4. Manual GitHub comment             → Post progress to GitHub issue
```

**After (1 step):**
```
/kmgraph:sync-all                  → All 4 steps automated, 1 confirmation
```

---

## Level Routing Detection (Top-Level)

`sync-all` resolves level routing ONCE at the top and passes the resolved flag to all sub-captures. Sub-captures must NOT perform their own NL detection — they use the flag passed from this orchestrator.

**Invoke `gov-capture-routing` skill** to:
1. Detect level signal from the user's invocation (NL patterns or explicit flags)
2. Resolve `$level`, `$target_kg`, `$restore_kg`
3. Handle prompts if needed (named KG not found, no project KG configured, conflict resolution)

**Pass-down contract:** Every sub-capture invoked by `sync-all` receives the resolved flag explicitly:
- `session-summary-agent` → pass `--{level}` + `$target_kg`
- `lesson-capture-agent` → pass `--{level}` + `$target_kg`
- Any other capture agents → pass `--{level}` + `$target_kg`

Sub-captures that receive an explicit flag skip their own `gov-capture-routing` invocation.

**Switch/restore:** If `--project` triggers a KG switch, the switch occurs before sub-captures begin. After all sub-captures complete, restore with `/kmgraph:switch {$restore_kg}`.

---

## Execution

### Step 1: Parse Flags

Detect which flags the user passed:

| Flag | Behavior |
|------|----------|
| (none) | Interactive mode — confirm at decision points |
| `--auto` | Skip all confirmations; execute full pipeline |
| `--dry-run` | Preview all actions; write nothing |

### Step 2: Delegate to sync-all-agent

Spawn the `sync-all-agent` subagent with parsed flags:

```
Agent: agents/sync-all-agent.md
Parameters:
  auto: [true/false based on --auto flag]
  dry_run: [true/false based on --dry-run flag]
```

The agent executes the full 8-step pipeline:
1. Scan for new/modified lessons
2. Extract knowledge graph entries
3. Check MEMORY.md sync requirements
4. Link to active plan
5. Update local issue
6. Auto-update session summary
7. Generate GitHub comment draft
8. Refresh FTS5 search index

### Step 3: Display Results

The agent returns a sync summary in this format:

```
Knowledge Sync Complete
-----------------------
Lessons scanned:  3 (2 new, 1 modified)
KG entries:       2 created, 1 updated
MEMORY.md:        Updated (1 new pattern)
Plan linked:      v2.0 (Step 2 → Prefix Naming lesson)
Local issue:      issue-42 (updated)
GitHub:           [ISSUE_ID] (comment posted)
Session:          2026-02-11 (enriched)
FTS5 index:       refreshed (47 updated, 153 skipped)
```

If `--dry-run`, the summary is prefixed with:
```
DRY RUN — No changes made
--------------------------
```

Display the summary exactly as returned by the agent. Do not reformat or add additional commentary.

---

## Multi-KG Support

When multiple knowledge graphs are configured:
- Operates on the **active** KG from `~/.claude/kg-config.json`
- Use `/kmgraph:switch` to change active KG before syncing
- Supports selective sync: `--category=architecture` to sync only architecture lessons

---

## GitHub Integration (Optional)

If GitHub CLI (`gh`) is not installed or no remote is configured:
- Steps 1-6 still execute (local sync)
- Step 7 (GitHub comment) is skipped with warning
- Workflow continues without error

**Graceful degradation:** The command works fully offline/non-GitHub projects.

---

## Integration

### Trigger Points
- After `/kmgraph:capture-lesson` completes (auto-suggest)
- After significant work sessions (via `/kmgraph:session-summary`)
- Before committing governance-related changes
- Manual invocation for catch-up sync

### Integrates With
- `/kmgraph:update-graph` — KG extraction logic (via sync-all-agent)
- `/kmgraph:update-issue-plan` — Plan/issue linking (via sync-all-agent)
- `/kmgraph:capture-lesson` — Lesson source
- `/kmgraph:session-summary` — Session enrichment
- Project-specific governance skills (if present)

---

## Idempotency

This command is idempotent — running it multiple times produces the same result:
- Existing KG entries are updated, not duplicated
- MEMORY.md checks for existing content before adding
- GitHub comments include timestamps to prevent duplicate posts
- Plan links are checked before adding

---

**Created:** 2026-02-12
**Version:** 2.0 (Refactored to thin dispatcher + sync-all-agent)
**Purpose:** Replace 4-step manual knowledge sync with automated 1-command pipeline
