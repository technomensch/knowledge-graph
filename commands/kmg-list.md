
# /kmgraph:kmg-list — List All Knowledge Graphs

Display all configured knowledge graphs with their locations, categories, and git strategies.

## What This Does

Reads `~/.kmgraph/kg-config.json` and displays:
- All configured knowledge graphs
- Which one (if any) resolves from the current working directory
- Location paths
- Categories in each KG
- Git strategy per KG

## When to Use

- View all available knowledge graphs
- Check which KG resolves from the current directory
- Review KG configurations
- Verify a new KG was created successfully

## Output Format

```
Knowledge Graphs:

1. my-project (this directory) — /Users/name/projects/my-app/docs/
   Categories: architecture, process, patterns
   Git: selective (architecture/patterns committed, process gitignored)

2. ai-research — ~/.kmgraph/knowledge-graphs/ai-research/
   Categories: architecture, process, ml-patterns (custom)
   Git: all committed

Total: 2 knowledge graphs configured
```

## Implementation

### Step 1: Check if config exists

```bash
CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"

if [ ! -f "$CONFIG_PATH" ]; then
  echo "No knowledge graphs configured."
  echo ""
  echo "Get started with: /kmgraph:kmg-init"
  exit 0
fi
```

### Step 2: Read config, resolve current-directory KG

```bash
CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"

# Read entire config
config=$(cat "$CONFIG_PATH")

# Extract all graph names
graphs=$(echo "$config" | jq -r '.graphs | keys[]')
```

Call `kg_resolve` (issue-41: this step previously read `.active` directly — a
pre-ADR-067 pattern; `kg_resolve` derives the graph from the current working directory
instead). If it resolves, take the returned `name` as `$current`; if it errors (no graph
registered for this directory), leave `$current` empty — no graph gets the "(this
directory)" marker in Step 3, matching the existing "No KG resolves from the current
directory" edge case below.

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
  categories=$(echo "$kg_data" | jq -r '.categories[].name' | tr '\n' ', ' | sed 's/,$//')

  # Mark the KG resolved from the current directory, if any
  if [ "$kg_name" == "$current" ]; then
    marker=" (this directory)"
  else
    marker=""
  fi

  # Format git strategy
  git_strategy=$(determine_git_strategy "$kg_data")

  # Display
  echo "$count. $kg_name$marker — $path"
  echo "   Categories: $categories"
  echo "   Git: $git_strategy"
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

## Edge Cases

### No config file
```
No knowledge graphs configured.

Get started with: /kmgraph:kmg-init
```

### Empty config (no graphs)
```
No knowledge graphs configured.

Get started with: /kmgraph:kmg-init
```

### No KG resolves from the current directory
```
Knowledge Graphs:

1. my-project — /Users/name/projects/my-app/docs/
   Categories: architecture, process, patterns
   Git: selective (architecture/patterns committed, process gitignored)

⚠️  No knowledge graph resolves from your current directory.
    cd into a registered project's directory, or pass targetKg explicitly to kg_capture/kg_search.

Total: 1 knowledge graph(s) configured
```

### KG path no longer exists
```
Knowledge Graphs:

1. my-project (this directory) — /Users/name/projects/my-app/docs/ ⚠️ PATH NOT FOUND
   Categories: architecture, process, patterns
   Git: selective
```

**Warning**:
```
⚠️  Registered knowledge graph path does not exist: /Users/name/projects/my-app/docs/
    The project may have been moved or deleted. Update its path via /kmgraph:kmg-init,
    or cd into a different registered project's directory to resolve against it instead.
```

## Turbo Mode

Show only the KG resolved from the current directory:

```bash
/kmgraph:kmg-list --active-only
```

Output:
```
Knowledge Graph (this directory): my-project
Location: /Users/name/projects/my-app/docs/
Categories: architecture, process, patterns
Git: selective
```

Show only names (for scripting):

```bash
/kmgraph:kmg-list --names-only
```

Output:
```
my-project (this directory)
ai-research
```

## Integration with Other Skills

- `/kmgraph:kmg-init` creates new entries shown here
- `/kmgraph:kmg-status` shows detailed stats for the KG resolved from your current directory
- All other skills operate on the KG resolved from cwd (or an explicit named target) shown here

## Machine-Readable Output

For scripting/automation, add `--json` flag:

```bash
/kmgraph:kmg-list --json
```

Output:
```json
{
  "currentDirectoryKg": "my-project",
  "graphs": {
    "my-project": {
      "name": "my-project",
      "path": "/Users/name/projects/my-app/docs/",
      "type": "project-local",
      "categories": [
        { "name": "architecture", "prefix": null, "git": "commit" },
        { "name": "process", "prefix": null, "git": "ignore" }
      ]
    }
  },
  "total": 1
}
```

## See Also

- `/kmgraph:kmg-init` — Create a new knowledge graph
- `/kmgraph:kmg-status` — View detailed stats for the KG resolved from your current directory
- `/kmgraph:kmg-add-category` — Add categories to existing KG
