---
description: Archive stale MEMORY.md entries to prevent bloat while preserving historical context
---

# /kmgraph:archive-memory — MEMORY.md Archive Management

Archive stale entries from MEMORY.md to MEMORY-archive.md, freeing token budget while preserving historical context for future reference.

---

## What This Does

Manages MEMORY.md size by archiving stale entries:
- Calculates current MEMORY.md token count
- Identifies stale entries (not recently referenced, old dates)
- Moves stale entries to MEMORY-archive.md
- Reports tokens freed and current size
- Commits both files with descriptive message

---

## When to Use

- MEMORY.md approaching 1,500 token soft limit (warning from `/kmgraph:sync-all`)
- MEMORY.md exceeds 2,000 token hard limit (blocked from adding new entries)
- Periodic cleanup (recommended quarterly)
- Before major project phase changes (archive old context)

---

## Usage

```bash
/kmgraph:archive-memory
/kmgraph:archive-memory --auto           # Skip confirmation
/kmgraph:archive-memory --dry-run        # Preview without writing
/kmgraph:archive-memory --threshold=180  # Custom staleness (days)
```

**Parameters:**
- `--auto` (optional): Skip confirmation prompt
- `--dry-run` (optional): Preview archives without writing files
- `--threshold` (optional): Staleness threshold in days (default: 90)

---

## Workflow

### Step 1: Check MEMORY.md Location

```bash
# Find project memory directory
MEMORY_PATH="$HOME/.claude/projects/$(basename $(pwd))/memory/MEMORY.md"

if [ ! -f "$MEMORY_PATH" ]; then
    echo "No MEMORY.md found at: $MEMORY_PATH"
    echo "Nothing to archive."
    exit 0
fi
```

### Step 2: Calculate Current Token Size

```bash
# Calculate token count (word_count × 1.3)
memory_words=$(wc -w < "$MEMORY_PATH")
memory_tokens=$((memory_words * 13 / 10))

echo "📊 Current MEMORY.md size: ~${memory_tokens}/2,000 tokens"

if [ "$memory_tokens" -lt 1500 ]; then
    echo "✅ Size is healthy. Archive not needed."
    echo "   (Archive recommended when > 1,500 tokens)"
    exit 0
fi
```

### Step 3: Identify Stale Entries

**Staleness criteria** (default: 90 days):
- Entry has explicit date (e.g., "Last updated: 2025-10-15")
- Date is > 90 days old
- Entry not modified in last 90 days
- Entry not referenced in recent lessons/sessions

**Detection patterns:**
```markdown
### Example Stale Entry (dated > 90 days ago)

**Last updated:** 2025-08-01  ← Extract date, compare to current

Content here...
```

**Implementation:**
```bash
# Extract dated sections
current_date=$(date +%s)
stale_threshold=90  # days

# For each section with "Last updated:" or "Created:" date:
#   1. Extract date string
#   2. Convert to timestamp
#   3. Calculate age in days
#   4. If age > threshold, mark for archival
```

**Example output:**
```
🔍 Scanning for stale entries (threshold: 90 days)...

Stale entries found (5 total):
  • Git Pre-Commit Hooks (235 days old) — ~45 tokens
  • Old Docker Pattern (187 days old) — ~62 tokens
  • Deprecated API Approach (156 days old) — ~78 tokens
  • Legacy Build Process (142 days old) — ~51 tokens
  • Old Testing Strategy (98 days old) — ~104 tokens

Total tokens to archive: ~340 tokens
New size estimate: ~1,180/2,000 tokens
```

### Step 4: Preview Archives

Show user what will be archived:

```markdown
📦 **Proposed Archives:**

**Stale Entries (5):**
1. Git Pre-Commit Hooks (235 days old)
2. Old Docker Pattern (187 days old)
3. Deprecated API Approach (156 days old)
4. Legacy Build Process (142 days old)
5. Old Testing Strategy (98 days old)

**Current:** ~1,520 tokens
**After archive:** ~1,180 tokens (340 tokens freed)

**Archive location:** memory/MEMORY-archive.md

**Proceed with archive?** (y/n)
```

**If --dry-run flag:**
```
[DRY RUN] Archive preview complete. No files modified.
```
Exit without writing.

### Step 5: Create Archive File

**If MEMORY-archive.md doesn't exist:**
```markdown
# MEMORY.md Archive

Historical entries archived from MEMORY.md to free token budget.

**Purpose:** Preserve context while keeping active memory lean
**Original:** `MEMORY.md` (project cross-session memory)

---

## Archive Log

**2026-02-16:** Archived 5 entries (~340 tokens freed)
- Git Pre-Commit Hooks (235 days old) [Restored: 2026-02-20]
- Old Docker Pattern (187 days old)
- Deprecated API Approach (156 days old)

---

[Archived entries follow, with original sections preserved]

### Git Pre-Commit Hooks

**Last updated:** 2025-08-01

[Original content...]

---

### Old Docker Pattern

**Created:** 2025-07-15

[Original content...]

[... more archived entries ...]
```

**If MEMORY-archive.md already exists:**
- Append new archive log entry
- Append archived entries below existing archives
- Maintain chronological order (newest archives first in log)

### Step 6: Update MEMORY.md

Remove archived entries from MEMORY.md:
```bash
# For each stale entry:
#   1. Extract section (from heading to next heading or end)
#   2. Remove from MEMORY.md
#   3. Append to MEMORY-archive.md
```

**Add archive notice at top of MEMORY.md** (if not present):
```markdown
> **Note:** Stale entries are periodically archived to `MEMORY-archive.md` to keep this file lean.
> Last archive: 2026-02-16 (5 entries, ~340 tokens freed)
```

### Step 7: Show Summary

```
📦 MEMORY.md Archived

Moved: 5 entries (~340 tokens freed)
Remaining: 47 entries (~1,180 tokens)
Archive: memory/MEMORY-archive.md

Files updated:
  • memory/MEMORY.md (entries removed)
  • memory/MEMORY-archive.md (entries appended)

Next steps:
  • Review archive: cat memory/MEMORY-archive.md
  • Commit changes: git add memory/ && git commit -m "docs(memory): archive stale entries"
```

### Step 8: Commit (if user approves)

```bash
git add ~/.claude/projects/$(basename $(pwd))/memory/MEMORY*.md

git commit -m "$(cat <<'EOF'
docs(memory): archive stale entries

Archived 5 entries (~340 tokens freed):
- Git Pre-Commit Hooks (235 days old)
- Old Docker Pattern (187 days old)
- Deprecated API Approach (156 days old)
- Legacy Build Process (142 days old)
- Old Testing Strategy (98 days old)

Current size: ~1,180/2,000 tokens
Archive: memory/MEMORY-archive.md

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Staleness Detection Logic

### Date Extraction Patterns

**Pattern 1: Explicit date fields**
```markdown
**Last updated:** 2025-08-01
**Created:** 2025-07-15
```

**Pattern 2: Inline dates**
```markdown
### Entry Title (Updated: 2025-08-01)
```

**Pattern 3: Git commit dates** (if git metadata available)
```bash
# Check when section was last modified
git log --all --format=%aI --grep="Entry Title" -- memory/MEMORY.md | head -1
```

### Age Calculation

```bash
# Convert date string to timestamp
entry_date=$(date -d "2025-08-01" +%s 2>/dev/null || date -j -f "%Y-%m-%d" "2025-08-01" +%s)

# Calculate age in days
current_date=$(date +%s)
age_days=$(( (current_date - entry_date) / 86400 ))

# Check against threshold
if [ $age_days -gt $threshold ]; then
    # Mark for archival
fi
```

### Reference Check (optional enhancement)

**Check if entry is referenced in recent content:**
```bash
# Search lessons created in last 90 days for references
recent_lessons=$(find ~/.claude/knowledge-graphs/*/lessons-learned -name "*.md" -mtime -90)

# For each stale entry title:
#   grep -q "entry_title" $recent_lessons
#   If found: skip archival (still relevant)
```

---

## Edge Cases

### No Stale Entries Found

```
✅ No stale entries found (threshold: 90 days)

Current size: ~1,180/2,000 tokens
All entries appear to be actively referenced or recently updated.

Tip: To archive manually, edit MEMORY.md directly or adjust threshold:
  /kmgraph:archive-memory --threshold=60
```

### MEMORY.md Below Soft Limit

```
✅ MEMORY.md size is healthy (~980/2,000 tokens)

Archive not needed. Consider archiving when:
  • Approaching 1,500 tokens (soft limit)
  • Exceeding 2,000 tokens (hard limit)
  • Quarterly maintenance

Current status: No action required
```

### All Entries Recently Updated

```
🔍 Scanned 52 entries, none meet staleness criteria

All entries have been updated within the last 90 days.

Options:
  1. Adjust threshold: /kmgraph:archive-memory --threshold=60
  2. Manual review: Edit MEMORY.md directly to archive specific entries
  3. Wait: Archive recommended when size > 1,500 tokens
```

### Archive File Large (>5,000 tokens)

```
⚠️  Archive file is large (~5,200 tokens)

Consider:
  • Creating dated archive files: MEMORY-archive-2025.md, MEMORY-archive-2026.md
  • Pruning very old archives (> 2 years)
  • Moving to project documentation directory

Current archives:
  • memory/MEMORY-archive.md (5,200 tokens)
```

---

## Restoring Archived Entries

**Use the restore-memory command** (v0.0.4-alpha):
```bash
/kmgraph:restore-memory "Git Pre-Commit Hooks"   # Fuzzy search by title
/kmgraph:restore-memory --id=5                   # Restore by ID
/kmgraph:restore-memory --list                   # Show all archived entries
```

**Restoration tracking:**
When entries are restored, the archive log is updated to track restorations:

```markdown
## Archive Log

**2026-02-16:** Archived 5 entries (~340 tokens freed)
- Git Pre-Commit Hooks (235 days old) **[Restored: 2026-02-20]**
- Old Docker Pattern (187 days old)
- Deprecated API Approach (156 days old)
```

Restored entries remain in the archive for historical record. The log tracks which entries have been restored and when, allowing you to:
- See restoration history at a glance
- Avoid duplicate restorations
- Track knowledge lifecycle (archived → restored → potentially re-archived)

**Manual restoration** (if preferred):
1. Open `memory/MEMORY-archive.md`
2. Copy desired section
3. Paste into `MEMORY.md` at appropriate location
4. Add "Restored: YYYY-MM-DD" timestamp
5. Update archive log to mark entry as restored
6. Commit: `git commit -m "docs(memory): restore [entry] from archive"`

---

## Integration with Other Commands

**Triggered by:**
- `/kmgraph:sync-all` (suggests archive when approaching limits)
- `/kmgraph:update-graph` Step 7 (warns when MEMORY.md > 1,500 tokens)

**Complementary commands:**
- `/kmgraph:status` — Shows current MEMORY.md size
- `/kmgraph:recall` — Search archived entries (future: include archive in search)

---

## Related Commands

- `/kmgraph:sync-all` — Full knowledge sync (warns of MEMORY.md size)
- `/kmgraph:update-graph` — KG extraction (checks MEMORY.md size in Step 7)
- `/kmgraph:status` — Display KG stats (includes MEMORY.md token count)

---

**Created:** 2026-02-16
**Version:** 0.0.3-alpha
**Purpose:** Prevent MEMORY.md bloat with token-based archival
**Token Limits:** Soft: 1,500 tokens (warning) | Hard: 2,000 tokens (block)
