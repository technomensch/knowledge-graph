---
description: Display all configured knowledge graphs from ~/.claude/kg-config.json
---

# /kmgraph:list — List All Knowledge Graphs

Display all configured knowledge graphs with their locations, categories, git strategies, and active status.

## What This Does

Reads `~/.claude/kg-config.json` and displays:
- All configured knowledge graphs
- Which one is currently active
- Location paths
- Categories in each KG
- Git strategy per KG
- Last used timestamp

## When to Use

- View all available knowledge graphs
- Check which KG is currently active
- Review KG configurations before switching
- Verify a new KG was created successfully

## Output Format

```
Knowledge Graphs:

1. my-project (active) — /Users/name/projects/my-app/docs/
   Categories: architecture, process, patterns
   Git: selective (architecture/patterns committed, process gitignored)
   Last used: 2026-02-13 15:45

2. ai-research — ~/.claude/knowledge-graphs/ai-research/
   Categories: architecture, process, ml-patterns (custom)
   Git: all committed
   Last used: 2026-02-10 12:00

3. cowork-devops — ~/.claude/cowork-knowledge/devops/
   Categories: governance, debugging
   Git: all gitignored
   Last used: 2026-02-11 09:15

Total: 3 knowledge graphs configured
```

## Implementation

### Step 1: Check if config exists

```bash
CONFIG_PATH="$HOME/.claude/kg-config.json"

if [ ! -f "$CONFIG_PATH" ]; then
  echo "No knowledge graphs configured."
  echo ""
  echo "Get started with: /kmgraph:init"
  exit 0
fi
```

### Step 2: Read config

```bash
# Read entire config
config=$(cat "$CONFIG_PATH")

# Extract active KG name
active=$(echo "$config" | jq -r '.active // null')

# Extract all graph names
graphs=$(echo "$config" | jq -r '.graphs | keys[]')
```

### Step 3: Format and display each KG

```bash
echo "Knowledge Graphs:"
echo ""

count=1
for kg_name in $graphs; do
  # Extract KG details
  kg_data=$(echo "$config" | jq -r ".graphs[\"$kg_name\"]")

  path=$(echo "$kg_data" | jq -r '.path')
  type=$(echo "$kg_data" | jq -r '.type')
  last_used=$(echo "$kg_data" | jq -r '.lastUsed')
  categories=$(echo "$kg_data" | jq -r '.categories[].name' | tr '\n' ', ' | sed 's/,$//')

  # Mark active KG
  if [ "$kg_name" == "$active" ]; then
    marker=" (active)"
  else
    marker=""
  fi

  # Format git strategy
  git_strategy=$(determine_git_strategy "$kg_data")

  # Format last used (convert ISO to friendly format)
  last_used_friendly=$(format_date "$last_used")

  # Display
  echo "$count. $kg_name$marker — $path"
  echo "   Categories: $categories"
  echo "   Git: $git_strategy"
  echo "   Last used: $last_used_friendly"
  echo ""

  count=$((count + 1))
done

# Summary
total=$((count - 1))
echo "Total: $total knowledge graph(s) configured"
```

### Step 4: Helper function - Determine git strategy

```bash
determine_git_strategy() {
  local kg_data="$1"

  # Extract category git rules
  local commit_count=$(echo "$kg_data" | jq '[.categories[] | select(.git == "commit")] | length')
  local ignore_count=$(echo "$kg_data" | jq '[.categories[] | select(.git == "ignore")] | length')
  local total_categories=$(echo "$kg_data" | jq '.categories | length')

  if [ "$commit_count" == "$total_categories" ]; then
    echo "all committed"
  elif [ "$ignore_count" == "$total_categories" ]; then
    echo "all gitignored"
  else
    # Selective - show which are committed vs ignored
    local committed=$(echo "$kg_data" | jq -r '[.categories[] | select(.git == "commit") | .name] | join(", ")')
    local ignored=$(echo "$kg_data" | jq -r '[.categories[] | select(.git == "ignore") | .name] | join(", ")')

    echo "selective ($committed committed, $ignored gitignored)"
  fi
}
```

### Step 5: Helper function - Format date

```bash
format_date() {
  local iso_date="$1"

  # Convert ISO 8601 to friendly format
  # 2026-02-13T15:45:00Z → 2026-02-13 15:45
  echo "$iso_date" | sed 's/T/ /' | sed 's/Z$//' | cut -d'.' -f1
}
```

## Edge Cases

### No config file
```
No knowledge graphs configured.

Get started with: /kmgraph:init
```

### Empty config (no graphs)
```
No knowledge graphs configured.

Get started with: /kmgraph:init
```

### No active KG set
```
Knowledge Graphs:

1. my-project — /Users/name/projects/my-app/docs/
   Categories: architecture, process, patterns
   Git: selective (architecture/patterns committed, process gitignored)
   Last used: 2026-02-13 15:45

⚠️  No active knowledge graph set.
    Use /kmgraph:switch <name> to activate one.

Total: 1 knowledge graph(s) configured
```

### KG path no longer exists
```
Knowledge Graphs:

1. my-project (active) — /Users/name/projects/my-app/docs/ ⚠️ PATH NOT FOUND
   Categories: architecture, process, patterns
   Git: selective
   Last used: 2026-02-13 15:45
```

**Warning**:
```
⚠️  Active knowledge graph path does not exist: /Users/name/projects/my-app/docs/
    The project may have been moved or deleted.
    Use /kmgraph:switch to change to a different KG.
```

## Turbo Mode

Show only active KG:

```bash
/kmgraph:list --active-only
```

Output:
```
Active Knowledge Graph: my-project
Location: /Users/name/projects/my-app/docs/
Categories: architecture, process, patterns
Git: selective
```

Show only names (for scripting):

```bash
/kmgraph:list --names-only
```

Output:
```
my-project (active)
ai-research
cowork-devops
```

## Integration with Other Skills

- `/kmgraph:init` creates new entries shown here
- `/kmgraph:switch` changes which one is marked "active"
- `/kmgraph:status` shows detailed stats for active KG
- All other skills operate on the "active" KG shown here

## Machine-Readable Output

For scripting/automation, add `--json` flag:

```bash
/kmgraph:list --json
```

Output:
```json
{
  "active": "my-project",
  "graphs": {
    "my-project": {
      "name": "my-project",
      "path": "/Users/name/projects/my-app/docs/",
      "type": "project-local",
      "categories": [
        { "name": "architecture", "prefix": null, "git": "commit" },
        { "name": "process", "prefix": null, "git": "ignore" }
      ],
      "lastUsed": "2026-02-13T15:45:00Z"
    }
  },
  "total": 1
}
```

## See Also

- `/kmgraph:init` — Create a new knowledge graph
- `/kmgraph:switch` — Change active KG
- `/kmgraph:status` — View detailed stats for active KG
- `/kmgraph:add-category` — Add categories to existing KG
