
# /kmgraph:kmg-status — Knowledge Graph Status Dashboard

Display the resolved knowledge graph's information, statistics, and quick command reference.

## What This Does

Shows:
- Resolved KG name and location
- Categories and git strategy
- File counts (lessons, KG entries, ADRs, sessions)
- Warnings (stale profile files, missing config, path not found)
- Quick command reference

## Output Format

```
Knowledge Graph Status
━━━━━━━━━━━━━━━━━━━━━

Knowledge Graph: my-project
Location:  /Users/name/projects/my-app/docs/
Categories: architecture, process, patterns, debugging
Git: selective (architecture/patterns committed, process/debugging gitignored)

Stats:
  Lessons: 12 (3 new since last sync)
  KG Entries: 28 patterns, 6 concepts, 4 gotchas
  ADRs: 5
  Sessions: 8

Quick Commands:
  /kmgraph:kmg-capture-lesson    — Document a lesson
  /kmgraph:kmg-recall "query"    — Search across all KG
  /kmgraph:kmg-sync-all          — Run full sync pipeline
  /kmgraph:kmg-update-graph      — Extract KG entries from lessons
  /kmgraph:kmg-session-summary   — Summarize this session
```

## Implementation

### Step 1: Check Config

```bash
CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"

if [ ! -f "$CONFIG_PATH" ]; then
  echo "No knowledge graphs configured."
  echo ""
  echo "Get started with: /kmgraph:kmg-init"
  exit 0
fi
```

### Step 2: Resolve Target KG

Call `kg_resolve` (issue-41: this step previously read `.active` directly — a
pre-ADR-067 pattern; `kg_resolve` derives the graph from the current working directory
instead). If it errors (no graph registered for this directory):

```bash
echo "No knowledge graph resolved from your current directory."
echo ""
echo "Available graphs:"
/kmgraph:kmg-list --names-only
echo ""
echo "cd into one of these projects' directories to resolve against it."
exit 0
```

Otherwise, take the returned `name` as `$active` and `path` as `$kg_path` below.

### Step 3: Load KG Details

```bash
CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"

kg_data=$(jq -r ".graphs[\"$active\"]" "$CONFIG_PATH")
categories=$(echo "$kg_data" | jq -r '.categories[].name' | tr '\n' ', ' | sed 's/,$//')
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

### Step 5: Check Profile File Staleness

Profile files (`~/.kmgraph/rules.md` and `~/.kmgraph/me.md`) are the authoritative
behavioral stores. MEMORY.md is an index/pointer file only — its age is not a
meaningful signal. Warn if either profile file hasn't been touched in >30 days.

```bash
profile_warnings=""
current_time=$(date +%s)

for profile_path in "$HOME/.kmgraph/rules.md" "$HOME/.kmgraph/me.md"; do
  [ -f "$profile_path" ] || continue

  if [[ "$OSTYPE" == "darwin"* ]]; then
    file_time=$(stat -f %m "$profile_path")
  else
    file_time=$(stat -c %Y "$profile_path")
  fi

  days_old=$(( (current_time - file_time) / 86400 ))

  if [ "$days_old" -gt 30 ]; then
    label=$(basename "$profile_path")
    profile_warnings="${profile_warnings}⚠️  ~/.kmgraph/${label} is stale (last updated ${days_old} days ago)
"
  fi
done
```

### Step 6: Display

```bash
echo "Knowledge Graph Status"
echo "━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Knowledge Graph: $active"
echo "Location:  $kg_path"
echo "Categories: $categories"
echo "Git: $(determine_git_strategy "$kg_data")"
echo ""

if [ ! -d "$kg_path" ]; then
  echo "⚠️  Warning: KG path does not exist"
  echo "   The project may have been moved or deleted."
  echo ""
fi

if [ -n "$profile_warnings" ]; then
  printf '%s' "$profile_warnings"
  echo "   Profile files are the authoritative behavioral store. Review and refresh as needed."
  echo ""
fi

echo "Stats:"
echo "  Lessons: $lesson_count"
echo "  KG Entries: $pattern_count patterns, $concept_count concepts, $gotcha_count gotchas"
echo "  ADRs: $adr_count"
echo "  Sessions: $session_count"
echo ""

echo "Quick Commands:"
echo "  /kmgraph:kmg-capture-lesson    — Document a lesson"
echo "  /kmgraph:kmg-recall \"query\"    — Search across all KG"
echo "  /kmgraph:kmg-sync-all          — Run full sync pipeline"
echo "  /kmgraph:kmg-update-graph      — Extract KG entries from lessons"
echo "  /kmgraph:kmg-session-summary   — Summarize this session"
```

## Turbo Mode

Minimal output:

```bash
/kmgraph:kmg-status --minimal
```

Output:
```
my-project: 12 lessons, 28 KG entries, 5 ADRs
```

JSON output:

```bash
/kmgraph:kmg-status --json
```

Output:
```json
{
  "name": "my-project",
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
    "profileFilesStale": false,
    "pathMissing": false
  }
}
```

## See Also

- `/kmgraph:kmg-list` — View all configured KGs
- `/kmgraph:kmg-sync-all` — Sync KG and review governance signals
