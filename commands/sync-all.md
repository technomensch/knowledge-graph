---
description: Automated knowledge sync orchestrator — replaces 4-step manual pipeline with 1 command
---

# Knowledge Sync All

**Purpose:** Automate the full knowledge synchronization pipeline that previously required 4 manual skill invocations. Scans for new lessons, extracts KG entries, links to plans/issues, and drafts GitHub comments — all with a single confirmation.

---

## Usage

```bash
/kg-sis:sync-all
/kg-sis:sync-all --auto           # Skip confirmation for GitHub posting
/kg-sis:sync-all --dry-run        # Show what would sync without making changes
```

**Parameters:**
- `--auto` (optional): Skip confirmation prompts (use for automated pipelines)
- `--dry-run` (optional): Preview sync actions without writing files

---

## What This Replaces

**Before (4 manual steps):**
```
1. /kg-sis:capture-lesson        → Capture lesson in {active_kg_path}/lessons-learned/
2. /kg-sis:update-graph           → Extract KG entries to {active_kg_path}/knowledge/
3. /kg-sis:update-issue-plan      → Sync to plan and local issue
4. Manual GitHub comment             → Post progress to GitHub issue
```

**After (1 step):**
```
/kg-sis:sync-all                  → All 4 steps automated, 1 confirmation
```

---

## Workflow Steps

### Step 1: Scan for New/Modified Lessons

Get active KG path from `~/.claude/kg-config.json`:
```bash
# Read config to find active KG
active_kg=$(jq -r '.active' ~/.claude/kg-config.json)
kg_path=$(jq -r ".graphs[\"$active_kg\"].path" ~/.claude/kg-config.json)
```

```bash
# Find lessons updated since last sync
find ${kg_path}/lessons-learned -name "*.md" -newer .claude/last-sync-timestamp 2>/dev/null
# Fallback: find lessons modified in last 24 hours
find ${kg_path}/lessons-learned -name "*.md" -mtime -1
```

If no new lessons found, check for:
- Recent session summaries with patterns
- Knowledge graph entries without lesson links
- Report: "No new lessons to sync" and exit

### Step 2: Extract Knowledge Graph Entries

For each new/modified lesson:
1. Read the lesson file
2. Extract: title, problem, solution, when-to-use triggers, category
3. Check if entry already exists in `{active_kg_path}/knowledge/patterns.md` (or appropriate KG file)
4. Create or update entry with bidirectional links

**Logic:** Delegates to `/kg-sis:update-graph` extraction logic

### Step 2.5: MEMORY.md Size Check <!-- v0.0.3 Change -->

**Before syncing to MEMORY.md, check size limits:**

```bash
# Calculate MEMORY.md token count
memory_path=~/.claude/projects/$(basename $(pwd))/memory/MEMORY.md

if [ -f "$memory_path" ]; then
  memory_words=$(wc -w < "$memory_path")
  memory_tokens=$((memory_words * 13 / 10))  # word_count × 1.3

  if [ "$memory_tokens" -gt 2000 ]; then
    echo "🛑 MEMORY.md exceeds hard limit: ~${memory_tokens}/2,000 tokens"
    echo "   Run /kg-sis:archive-memory before adding new entries"
    echo ""
    echo "   Sync will continue but MEMORY.md updates will be skipped."
    SKIP_MEMORY_SYNC=true
  elif [ "$memory_tokens" -gt 1500 ]; then
    echo "⚠️  MEMORY.md approaching limit: ~${memory_tokens}/2,000 tokens"
    echo "   Consider: /kg-sis:archive-memory"
    echo ""
    echo "   Continuing with sync..."
    SKIP_MEMORY_SYNC=false
  else
    SKIP_MEMORY_SYNC=false
  fi
else
  SKIP_MEMORY_SYNC=false
fi
```

**Token limits:**
- **Soft limit: 1,500 tokens** (~1,100 words) — warning, sync continues
- **Hard limit: 2,000 tokens** (~1,500 words) — block MEMORY.md updates, suggest archive

**Rationale:** Token-based limits are more accurate than line-based limits because:
- Short lines (5-10 words) vs long lines (30+ words) have very different context costs
- Token count directly impacts system prompt size
- Allows accurate headroom calculation

### Step 3: Check MEMORY.md Sync (ADR-011 Protocol)

If new patterns, gotchas, or best practices were discovered:
1. **Check size limits** (Step 2.5) — skip if hard limit exceeded
2. Check if MEMORY.md already has the information
3. If not and within limits, append to appropriate section
4. **Verify token count after update** — warn if approaching 2,000 tokens

### Step 4: Link to Active Plan

1. Find current active plan in `{active_kg_path}/plans/` (status: Active or In Progress)
2. If plan exists and insight is relevant:
   - Append "Lessons Learned Integration" section
   - Link KG entry to specific plan task

### Step 5: Update Local Issue

1. Find local issue linked to current branch/plan
2. If found: append progress note with KG references
3. **Decision Gate:** If insight represents separate scope:
   - Auto-detect: "New discovery outside current issue scope"
   - Suggest: "Create new issue or update current?"

### Step 6: Auto-Update Session Summary

1. Check for today's session: `{active_kg_path}/sessions/$(date +%Y-%m)/$(date +%Y-%m-%d)_*.md`
2. If exists: append KG insights to "Lessons Learned" section
3. If not exists: create minimal session entry with KG context

### Step 7: Generate GitHub Comment Draft

1. Map local issue to GitHub issue number
2. Compile sync summary (lessons captured, KG entries created, plan updated)
3. **Single confirmation:** "Post sync summary to GitHub #[N]? (y/n)"
4. If yes: `gh issue comment [N] --body "[summary]"`

---

## Output: Sync Summary

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
```

---

## Integration

### Trigger Points
- After `/kg-sis:capture-lesson` completes (auto-suggest)
- After significant work sessions (via `/kg-sis:session-summary`)
- Before committing governance-related changes
- Manual invocation for catch-up sync

### Integrates With
- `/kg-sis:update-graph` — KG extraction logic
- `/kg-sis:update-issue-plan` — Plan/issue linking
- `/kg-sis:capture-lesson` — Lesson source
- `/kg-sis:session-summary` — Session enrichment
- Project-specific governance skills (if present)

---

## Idempotency

This skill is idempotent — running it multiple times produces the same result:
- Existing KG entries are updated, not duplicated
- MEMORY.md checks for existing content before adding
- GitHub comments include timestamps to prevent duplicate posts
- Plan links are checked before adding

---

## Multi-KG Support

When multiple knowledge graphs are configured:
- Operates on the **active** KG from `~/.claude/kg-config.json`
- Use `/kg-sis:switch` to change active KG before syncing
- Supports selective sync: `--category=architecture` to sync only architecture lessons

---

## GitHub Integration (Optional)

If GitHub CLI (`gh`) is not installed or no remote is configured:
- Steps 1-6 still execute (local sync)
- Step 7 (GitHub comment) is skipped with warning
- Workflow continues without error

**Graceful degradation:** The skill works fully offline/non-GitHub projects.

---

**Created:** 2026-02-12
**Version:** 1.0 (Plugin version)
**Purpose:** Replace 4-step manual knowledge sync with automated 1-command pipeline
