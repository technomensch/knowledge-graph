---
name: knowledge:status
description: Display active knowledge graph status, stats, and quick command reference
---

# /knowledge:status — Knowledge Graph Status Dashboard

Display active knowledge graph information, statistics, and quick command reference.

## What This Does

Shows:
- Active KG name and location
- Categories and git strategy
- Last sync timestamp
- File counts (lessons, KG entries, ADRs, sessions)
- Warnings (stale MEMORY.md, missing config, path not found)
- Quick command reference

## Output Format

```
Knowledge Graph Status
━━━━━━━━━━━━━━━━━━━━━

Active KG: my-project
Location:  /Users/name/projects/my-app/docs/
Categories: architecture, process, patterns, debugging
Git: selective (architecture/patterns committed, process/debugging gitignored)
Last sync: 2026-02-12 15:45

Stats:
  Lessons: 12 (3 new since last sync)
  KG Entries: 28 patterns, 6 concepts, 4 gotchas
  ADRs: 5
  Sessions: 8

Quick Commands:
  /knowledge:capture-lesson    — Document a lesson
  /knowledge:recall "query"    — Search across all KG
  /knowledge:sync-all          — Run full sync pipeline
  /knowledge:update-graph      — Extract KG entries from lessons
  /knowledge:session-summary   — Summarize this session
```

## Implementation

### Step 1: Check Config

```bash
CONFIG_PATH="$HOME/.claude/kg-config.json"

if [ ! -f "$CONFIG_PATH" ]; then
  echo "No knowledge graphs configured."
  echo ""
  echo "Get started with: /knowledge:init"
  exit 0
fi
```

### Step 2: Get Active KG

```bash
active=$(jq -r '.active' "$CONFIG_PATH")

if [ "$active" == "null" ]; then
  echo "No active knowledge graph."
  echo ""
  echo "Available graphs:"
  /knowledge:list --names-only
  echo ""
  echo "Activate one with: /knowledge:switch <name>"
  exit 0
fi
```

### Step 3: Load KG Details

```bash
kg_data=$(jq -r ".graphs[\"$active\"]" "$CONFIG_PATH")
kg_path=$(echo "$kg_data" | jq -r '.path')
kg_path="${kg_path/#\~/$HOME}"  # Expand tilde
categories=$(echo "$kg_data" | jq -r '.categories[].name' | tr '\n' ', ' | sed 's/,$//')
last_used=$(echo "$kg_data" | jq -r '.lastUsed')
```

### Step 4: Count Files

```bash
if [ -d "$kg_path" ]; then
  lesson_count=$(find "$kg_path/lessons-learned" -name "*.md" ! -name "README.md" ! -name "*template*" 2>/dev/null | wc -l | tr -d ' ')
  pattern_count=$(grep -c "^## " "$kg_path/knowledge/patterns.md" 2>/dev/null || echo "0")
  concept_count=$(grep -c "^## " "$kg_path/knowledge/concepts.md" 2>/dev/null || echo "0")
  gotcha_count=$(grep -c "^## " "$kg_path/knowledge/gotchas.md" 2>/dev/null || echo "0")
  adr_count=$(find "$kg_path/decisions" -name "ADR-*.md" 2>/dev/null | wc -l | tr -d ' ')
  session_count=$(find "$kg_path/sessions" -name "*.md" ! -name "*template*" 2>/dev/null | wc -l | tr -d ' ')
else
  lesson_count=0
  pattern_count=0
  concept_count=0
  gotcha_count=0
  adr_count=0
  session_count=0
fi
```

### Step 5: Check MEMORY.md Staleness

```bash
# Try to find MEMORY.md
memory_path=$(find "$HOME/.claude/projects" -name "MEMORY.md" 2>/dev/null | head -1)

if [ -f "$memory_path" ]; then
  # Check last modified time
  if [[ "$OSTYPE" == "darwin"* ]]; then
    file_time=$(stat -f %m "$memory_path")
  else
    file_time=$(stat -c %Y "$memory_path")
  fi

  current_time=$(date +%s)
  days_old=$(( (current_time - file_time) / 86400 ))

  if [ $days_old -gt 7 ]; then
    memory_warning="⚠️  MEMORY.md is stale (last updated $days_old days ago)"
  else
    memory_warning=""
  fi
else
  memory_warning=""
fi
```

### Step 6: Display

```bash
echo "Knowledge Graph Status"
echo "━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Active KG: $active"
echo "Location:  $kg_path"
echo "Categories: $categories"
echo "Git: $(determine_git_strategy "$kg_data")"
echo "Last sync: $(format_date "$last_used")"
echo ""

if [ ! -d "$kg_path" ]; then
  echo "⚠️  Warning: KG path does not exist"
  echo "   The project may have been moved or deleted."
  echo ""
fi

if [ -n "$memory_warning" ]; then
  echo "$memory_warning"
  echo "   Consider running /knowledge:sync-all"
  echo ""
fi

echo "Stats:"
echo "  Lessons: $lesson_count"
echo "  KG Entries: $pattern_count patterns, $concept_count concepts, $gotcha_count gotchas"
echo "  ADRs: $adr_count"
echo "  Sessions: $session_count"
echo ""

echo "Quick Commands:"
echo "  /knowledge:capture-lesson    — Document a lesson"
echo "  /knowledge:recall \"query\"    — Search across all KG"
echo "  /knowledge:sync-all          — Run full sync pipeline"
echo "  /knowledge:update-graph      — Extract KG entries from lessons"
echo "  /knowledge:session-summary   — Summarize this session"
```

## Turbo Mode

Minimal output:

```bash
/knowledge:status --minimal
```

Output:
```
my-project: 12 lessons, 28 KG entries, 5 ADRs
```

JSON output:

```bash
/knowledge:status --json
```

Output:
```json
{
  "active": "my-project",
  "path": "/Users/name/projects/my-app/docs/",
  "stats": {
    "lessons": 12,
    "patterns": 28,
    "concepts": 6,
    "gotchas": 4,
    "adrs": 5,
    "sessions": 8
  },
  "warnings": {
    "memoryStale": true,
    "pathMissing": false
  }
}
```

## See Also

- `/knowledge:list` — View all configured KGs
- `/knowledge:switch` — Change active KG
- `/knowledge:sync-all` — Sync KG with MEMORY.md
