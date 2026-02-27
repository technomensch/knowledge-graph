---
description: Restore archived MEMORY.md entries from MEMORY-archive.md to restore previously archived context
---

# /kmgraph:restore-memory — MEMORY.md Restoration

Restore archived entries from MEMORY-archive.md back to MEMORY.md, bringing historical context back into active memory.

---

## What This Does

Restores previously archived entries to MEMORY.md:
- Lists all available archived entries with IDs
- Fuzzy search by entry title for quick restoration
- Previews entry content before restoring
- Checks token limits before restoration
- Updates archive log with restoration timestamp
- Commits both files with descriptive message

---

## When to Use

- Need to reference archived knowledge for current work
- Working on a problem related to archived solution
- Rebuilding context from previous project phase
- Token budget freed up (< 1,500 tokens) and need historical context

---

## Usage

```bash
/kmgraph:restore-memory                     # Interactive mode (show list, select)
/kmgraph:restore-memory "Git Pre-Commit"   # Fuzzy search by title
/kmgraph:restore-memory --id=5             # Restore by archive ID
/kmgraph:restore-memory --list             # Show all archived entries
/kmgraph:restore-memory --section="Patterns" # Restore to specific section
/kmgraph:restore-memory --dry-run          # Preview without writing
```

**Parameters:**
- `query` (optional): Entry title or search query for fuzzy matching
- `--id` (optional): Archive entry ID/index from list
- `--list` (optional): List all archived entries with IDs and exit
- `--section` (optional): Target section in MEMORY.md (default: appropriate section based on content)
- `--dry-run` (optional): Preview restoration without writing files

---

## Workflow

### Step 1: Check Archive Location

```bash
# Find project memory directory
MEMORY_PATH="$HOME/.claude/projects/$(basename $(pwd))/memory/MEMORY.md"
ARCHIVE_PATH="$HOME/.claude/projects/$(basename $(pwd))/memory/MEMORY-archive.md"

if [ ! -f "$ARCHIVE_PATH" ]; then
    echo "❌ No archive found at: $ARCHIVE_PATH"
    echo "Nothing to restore."
    exit 0
fi

if [ ! -f "$MEMORY_PATH" ]; then
    echo "⚠️  MEMORY.md doesn't exist. Creating it..."
    # Create with basic template
fi
```

### Step 2: Parse Archived Entries

Read MEMORY-archive.md and extract all archived entries with metadata:

**Entry extraction pattern:**
```bash
# Extract entries from archive
# Each entry is a markdown section (### Heading)
# Extract: ID (sequence number), title, date archived, content

# Example parsed entry:
# ID: 5
# Title: "Git Pre-Commit Hooks"
# Archived: 2026-02-16
# Tokens: ~45
# Content: [full section]
```

**Implementation:**
```bash
# Parse archive file
entry_count=0
while IFS= read -r line; do
    if [[ "$line" =~ ^###[[:space:]](.+)$ ]]; then
        # New entry found
        entry_count=$((entry_count + 1))
        entry_titles[$entry_count]="${BASH_REMATCH[1]}"
        # Extract content until next ### or end
    fi
done < "$ARCHIVE_PATH"
```

### Step 3: List Mode (if --list flag)

```
📚 Archived Entries (15 total)

Archive Log:
  2026-02-16: 5 entries archived (~340 tokens freed)
  2026-01-10: 3 entries archived (~180 tokens freed)
  2025-12-05: 7 entries archived (~420 tokens freed)

Available Entries:
  [1] Git Pre-Commit Hooks (archived: 2026-02-16, ~45 tokens)
  [2] Old Docker Pattern (archived: 2026-02-16, ~62 tokens)
  [3] Deprecated API Approach (archived: 2026-02-16, ~78 tokens)
  [4] Legacy Build Process (archived: 2026-02-16, ~51 tokens)
  [5] Old Testing Strategy (archived: 2026-02-16, ~104 tokens)
  [6] JWT Authentication Setup (archived: 2026-01-10, ~67 tokens)
  [7] Old Error Handling (archived: 2026-01-10, ~48 tokens)
  [8] Webpack Configuration (archived: 2026-01-10, ~65 tokens)
  ... (showing first 8 of 15)

Usage:
  /kmgraph:restore-memory "Git Pre-Commit"  # Fuzzy search
  /kmgraph:restore-memory --id=1            # Restore by ID
```

Exit after listing.

### Step 4: Fuzzy Search (if query provided)

Use fuzzy matching to find entries:

**Search strategy:**
```bash
# 1. Exact title match (case-insensitive)
# 2. Contains substring (case-insensitive)
# 3. Word-based fuzzy match (any words in any order)

# Example searches:
# Query: "git hooks" → Matches: "Git Pre-Commit Hooks" (contains both words)
# Query: "docker" → Matches: "Old Docker Pattern" (contains word)
# Query: "auth" → Matches: "JWT Authentication Setup" (partial word match)
```

**Multiple matches:**
```
🔍 Found 3 matches for "auth":

  [1] JWT Authentication Setup (archived: 2026-01-10, ~67 tokens)
  [2] OAuth2 Integration (archived: 2025-12-05, ~52 tokens)
  [3] Authentication Middleware (archived: 2025-12-05, ~73 tokens)

Which entry to restore? (1-3, or 0 to cancel): _
```

**No matches:**
```
❌ No matches found for "auth patterns"

Try:
  • Broader search: /kmgraph:restore-memory "auth"
  • List all: /kmgraph:restore-memory --list
  • Search archive directly: grep -i "auth" memory/MEMORY-archive.md
```

### Step 5: Select Entry (Interactive Mode)

If no query or --id provided, show interactive selection:

```
📚 Select entry to restore:

  [1] Git Pre-Commit Hooks (2026-02-16, ~45 tokens)
  [2] Old Docker Pattern (2026-02-16, ~62 tokens)
  [3] Deprecated API Approach (2026-02-16, ~78 tokens)
  [4] Legacy Build Process (2026-02-16, ~51 tokens)
  [5] Old Testing Strategy (2026-02-16, ~104 tokens)

  ... (showing first 5 of 15)

  [m] Show more
  [s] Search by title
  [0] Cancel

Enter selection: _
```

### Step 6: Preview Entry

Show entry content before restoring:

```markdown
📄 **Preview: Git Pre-Commit Hooks**

**Archived:** 2026-02-16 (235 days ago)
**Size:** ~45 tokens
**Current MEMORY.md:** ~1,180/2,000 tokens
**After restoration:** ~1,225/2,000 tokens

---

### Git Pre-Commit Hooks

**Last updated:** 2025-08-01

Pre-commit hooks validate commits before they're created. Common pattern:

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Run linter
npm run lint || exit 1

# Run tests
npm test || exit 1
```

**Key gotcha:** Make executable with `chmod +x .git/hooks/pre-commit`

**Related:** See lessons-learned/process/Lessons_Learned_Git_Hooks.md

---

**Restore this entry?** (y/n/e)
  y = Restore to MEMORY.md
  n = Cancel
  e = Edit before restoring
```

**If --dry-run flag:**
```
[DRY RUN] Preview complete. No files modified.
```
Exit without writing.

### Step 7: Check Token Limits

Before restoring, verify MEMORY.md can accommodate entry:

```bash
# Calculate current MEMORY.md size
memory_words=$(wc -w < "$MEMORY_PATH")
memory_tokens=$((memory_words * 13 / 10))

# Calculate entry size
entry_words=$(echo "$entry_content" | wc -w)
entry_tokens=$((entry_words * 13 / 10))

# Calculate new size
new_tokens=$((memory_tokens + entry_tokens))

if [ "$new_tokens" -gt 2000 ]; then
    echo "🛑 Cannot restore: Would exceed hard limit"
    echo "   Current: ~${memory_tokens}/2,000 tokens"
    echo "   Entry: ~${entry_tokens} tokens"
    echo "   After restoration: ~${new_tokens}/2,000 tokens"
    echo ""
    echo "Free up space first:"
    echo "   /kmgraph:archive-memory"
    exit 1
elif [ "$new_tokens" -gt 1500 ]; then
    echo "⚠️  Warning: Restoration will approach soft limit"
    echo "   Current: ~${memory_tokens}/2,000 tokens"
    echo "   After restoration: ~${new_tokens}/2,000 tokens"
    echo ""
    echo "Proceed anyway? (y/n): _"
fi
```

### Step 8: Determine Target Section

**Option 1: User specifies --section flag**
```bash
/kmgraph:restore-memory "Git Hooks" --section="Best Practices"
# Insert into "## Best Practices" section
```

**Option 2: Auto-detect from entry content**
```bash
# Look for section indicators in entry:
# - Heading level (### suggests top-level, #### suggests subsection)
# - Keywords ("pattern", "gotcha", "tip", "workflow")
# - Related links (might indicate category)

# Default sections:
# - "## Patterns" (for reusable patterns)
# - "## Common Pitfalls" (for gotchas/anti-patterns)
# - "## Best Practices" (for tips/workflows)
# - "## Context" (for general knowledge)
```

**Option 3: Prompt user**
```
Where should this entry be restored?

Current MEMORY.md sections:
  [1] ## Common Failure Patterns & Fixes
  [2] ## Best Practices
  [3] ## Architecture Decisions
  [4] ## Technical Context
  [5] Create new section

Select section (1-5): _
```

### Step 9: Insert Entry into MEMORY.md

**Insertion strategy:**
```bash
# 1. Find target section in MEMORY.md
# 2. Insert entry at end of section (before next ## heading)
# 3. Add restored timestamp to entry
# 4. Preserve all existing content
```

**Updated entry format:**
```markdown
### Git Pre-Commit Hooks

**Restored:** 2026-02-16 (originally archived: 2026-02-16)
**Last updated:** 2025-08-01

Pre-commit hooks validate commits before they're created. Common pattern:

[... original content ...]
```

### Step 10: Update Archive Log

Mark entry as restored in MEMORY-archive.md:

**Before:**
```markdown
## Archive Log

**2026-02-16:** Archived 5 entries (~340 tokens freed)
- Git Pre-Commit Hooks (235 days old)
- Old Docker Pattern (187 days old)
- Deprecated API Approach (156 days old)
- Legacy Build Process (142 days old)
- Old Testing Strategy (98 days old)
```

**After:**
```markdown
## Archive Log

**2026-02-16:** Archived 5 entries (~340 tokens freed)
- Git Pre-Commit Hooks (235 days old) **[Restored: 2026-02-16]**
- Old Docker Pattern (187 days old)
- Deprecated API Approach (156 days old)
- Legacy Build Process (142 days old)
- Old Testing Strategy (98 days old)
```

**Implementation:**
```bash
# Find archive log entry for this entry
# Append " [Restored: YYYY-MM-DD]" to the line
# Use sed or awk for in-place edit
```

**Keep entry content in archive** (don't remove). Rationale:
- Preserves complete history
- Allows future re-restoration if needed
- Archive remains as audit trail

### Step 11: Show Summary

```
✅ Entry Restored

Restored: Git Pre-Commit Hooks
From: memory/MEMORY-archive.md (archived: 2026-02-16)
To: memory/MEMORY.md → ## Best Practices
Size: ~45 tokens

Memory Status:
  Before: ~1,180/2,000 tokens
  After: ~1,225/2,000 tokens
  Available: ~775 tokens

Files updated:
  • memory/MEMORY.md (entry added)
  • memory/MEMORY-archive.md (log updated)

Next steps:
  • Review restored entry: grep -A 20 "Git Pre-Commit Hooks" memory/MEMORY.md
  • Commit changes: (ready to commit)
```

### Step 12: Commit (if user approves)

```bash
git add ~/.claude/projects/$(basename $(pwd))/memory/MEMORY*.md

git commit -m "$(cat <<'EOF'
docs(memory): restore "Git Pre-Commit Hooks" from archive

Restored entry from MEMORY-archive.md (archived: 2026-02-16)
Added to: ## Best Practices
Size: ~45 tokens

Memory status:
- Before: ~1,180/2,000 tokens
- After: ~1,225/2,000 tokens

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Fuzzy Search Implementation

### Search Script

Create helper script for fuzzy matching:

**Location:** `scripts/fuzzy-search-archive.sh`

**Usage:**
```bash
./scripts/fuzzy-search-archive.sh "query" "path/to/MEMORY-archive.md"
# Returns: Matched entry IDs (space-separated)
```

**Search algorithm:**
```bash
#!/bin/bash
# fuzzy-search-archive.sh

query="$1"
archive_file="$2"

# Extract all entry titles with IDs
entries=$(grep -n "^### " "$archive_file" | awk '{print NR, substr($0, index($0, $2))}')

# Fuzzy match strategies (in order of priority):

# 1. Exact match (case-insensitive)
exact=$(echo "$entries" | grep -i "^[0-9]* $query$")

# 2. Contains substring (case-insensitive)
substring=$(echo "$entries" | grep -i "$query")

# 3. Word-based fuzzy (all words present, any order)
words=$(echo "$query" | tr ' ' '|')
fuzzy=$(echo "$entries" | grep -iE "$words")

# Return results (deduplicated)
echo "$exact"
echo "$substring"
echo "$fuzzy"
# (Implementation would deduplicate and rank)
```

### Ranking Strategy

**Priority order:**
1. **Exact match** (highest priority)
2. **Starts with query** (high priority)
3. **Contains all query words** (medium priority)
4. **Contains any query word** (low priority)

**Display:**
```
🔍 Search results for "git hook" (ranked by relevance):

Exact matches:
  [none]

Strong matches (contains all words):
  [1] Git Pre-Commit Hooks (2026-02-16, ~45 tokens) ★★★
  [8] Git Hook Configuration (2025-12-05, ~38 tokens) ★★★

Partial matches (contains some words):
  [12] Pre-Push Hook Script (2025-11-20, ~29 tokens) ★★
  [15] Git Workflow Best Practices (2025-11-10, ~56 tokens) ★
```

---

## Edge Cases

### No Archive File Exists

```
❌ No archive found

Archive location: memory/MEMORY-archive.md

Nothing has been archived yet. To archive entries:
  /kmgraph:archive-memory
```

### Archive File Empty

```
📚 Archive is empty

Archive exists but contains no entries.

Archive location: memory/MEMORY-archive.md
Created: 2026-02-16
Entries: 0
```

### Entry Already in MEMORY.md

```
⚠️  Entry may already exist in MEMORY.md

Searching for: "Git Pre-Commit Hooks"
Found similar entry in MEMORY.md (line 45):
  ### Git Pre-Commit Hooks Best Practices

Proceed with restoration? This will create a duplicate. (y/n)
  y = Restore anyway (may duplicate)
  n = Cancel
  m = Merge with existing entry (manual edit required)
```

### MEMORY.md at Hard Limit

```
🛑 Cannot restore: MEMORY.md at capacity

Current size: ~2,050/2,000 tokens (exceeds hard limit)
Entry size: ~45 tokens
After restoration: ~2,095/2,000 tokens

Archive entries first to free space:
  /kmgraph:archive-memory

Or manually remove entries from MEMORY.md
```

### Multiple Restoration Sessions

```
📚 Recently restored entries detected

These entries were restored in the last 7 days:
  • JWT Authentication Setup (restored: 2026-02-14)
  • OAuth2 Integration (restored: 2026-02-15)

Consider consolidating with update-graph if building on this context.
```

### Archive Entry Has Multiple Versions

If entry was archived, restored, modified, and archived again:

```
⚠️  Multiple versions found

"Git Pre-Commit Hooks" appears in archive 2 times:
  [1] Version from 2026-02-16 (most recent, ~45 tokens)
  [2] Version from 2025-12-05 (older, ~38 tokens)

Which version to restore?
  1 = Most recent (recommended)
  2 = Older version
  b = Show both for comparison
```

---

## Integration with Other Commands

**Mentioned by:**
- `/kmgraph:archive-memory` (suggests restore command in documentation)
- `/kmgraph:sync-all` (could suggest restoration if query related to archived content)

**Complementary commands:**
- `/kmgraph:archive-memory` — Archive stale entries
- `/kmgraph:status` — Show MEMORY.md size and capacity
- `/kmgraph:recall` — Search (could search archive too)

---

## Future Enhancements (v0.0.5+)

**Smart suggestions:**
- Auto-suggest restoration when user asks about archived topics
- Recommend restoration when recall finds matches in archive
- Batch restoration (multiple entries at once)

**Advanced search:**
- Full-text search within entry content (not just titles)
- Date range filtering ("entries archived in last month")
- Tag-based filtering (if entries have tags)

**Merge capabilities:**
- Merge archived entry with existing similar entry
- Consolidate multiple archived versions
- Smart deduplication

---

## Related Commands

- `/kmgraph:archive-memory` — Archive stale entries to free space
- `/kmgraph:status` — View MEMORY.md token count and capacity
- `/kmgraph:recall` — Search across project memory (future: include archive)
- `/kmgraph:sync-all` — Full knowledge sync pipeline

---

**Created:** 2026-02-16
**Version:** 0.0.4-alpha
**Purpose:** Restore archived MEMORY.md entries to bring historical context back
**Command:** `/kmgraph:restore-memory [query] [--id=N] [--list] [--section=Name] [--dry-run]`
