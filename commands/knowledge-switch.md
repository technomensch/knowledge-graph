---
description: Change the active knowledge graph. Subsequent skills will operate on the selected KG.
---

# /knowledge:switch — Change Active Knowledge Graph

Switch between configured knowledge graphs. All subsequent skill operations (`/knowledge:capture-lesson`, `/knowledge:recall`, etc.) will use the selected KG.

## What This Does

Updates the `active` field in `~/.claude/kg-config.json` to the specified knowledge graph name.

## Syntax

```bash
/knowledge:switch my-project
/knowledge:switch ai-research
/knowledge:switch cowork-devops
```

## When to Use

- Switch between different project knowledge graphs
- Change to a topic-based KG for cross-project patterns
- Activate a Claude Cowork KG for collaboration
- Return to a previously used KG

## Implementation

### Step 1: Validate inputs

```bash
CONFIG_PATH="$HOME/.claude/kg-config.json"

# Check if config exists
if [ ! -f "$CONFIG_PATH" ]; then
  echo "Error: No knowledge graphs configured."
  echo "Run /knowledge:init to create your first knowledge graph."
  exit 1
fi

# Get target KG name from argument
target_kg="$1"

if [ -z "$target_kg" ]; then
  echo "Error: Missing knowledge graph name."
  echo ""
  echo "Usage: /knowledge:switch <kg-name>"
  echo ""
  echo "Available knowledge graphs:"
  /knowledge:list --names-only
  exit 1
fi
```

### Step 2: Verify KG exists in config

```bash
# Check if target KG exists
kg_exists=$(jq -r ".graphs | has(\"$target_kg\")" "$CONFIG_PATH")

if [ "$kg_exists" != "true" ]; then
  echo "Error: Knowledge graph '$target_kg' not found."
  echo ""
  echo "Available knowledge graphs:"
  /knowledge:list --names-only
  echo ""
  echo "Create a new one with: /knowledge:init"
  exit 1
fi
```

### Step 3: Verify KG path exists

```bash
# Get KG path
kg_path=$(jq -r ".graphs[\"$target_kg\"].path" "$CONFIG_PATH")

# Expand tilde
kg_path="${kg_path/#\~/$HOME}"

# Check if path exists
if [ ! -d "$kg_path" ]; then
  echo "⚠️  Warning: Knowledge graph path does not exist:"
  echo "   $kg_path"
  echo ""
  echo "The project may have been moved or deleted."
  # Use AskUserQuestion tool to confirm (Claude Code cannot handle interactive read -p)
  # Ask: "KG path does not exist. Switch anyway?" with options Yes / No
  # If No: exit 0
fi
```

### Step 4: Update active KG in config

```bash
# Get current active KG (for reporting)
current_active=$(jq -r '.active' "$CONFIG_PATH")

# Update active field and lastUsed timestamp
jq ".active = \"$target_kg\" | .graphs[\"$target_kg\"].lastUsed = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" \
  "$CONFIG_PATH" > "$CONFIG_PATH.tmp"
mv "$CONFIG_PATH.tmp" "$CONFIG_PATH"
```

### Step 5: Report success

```bash
# Get KG details for confirmation
kg_data=$(jq -r ".graphs[\"$target_kg\"]" "$CONFIG_PATH")
kg_path=$(echo "$kg_data" | jq -r '.path')
categories=$(echo "$kg_data" | jq -r '.categories[].name' | tr '\n' ', ' | sed 's/,$//')

if [ "$current_active" != "null" ] && [ "$current_active" != "$target_kg" ]; then
  echo "Switched from '$current_active' to '$target_kg'"
else
  echo "Activated knowledge graph: $target_kg"
fi

echo ""
echo "📚 Active Knowledge Graph: $target_kg"
echo "   Location: $kg_path"
echo "   Categories: $categories"
echo ""
echo "All subsequent knowledge operations will use this graph."
echo ""
echo "Quick commands:"
echo "  /knowledge:status          — View KG stats"
echo "  /knowledge:capture-lesson  — Document a lesson"
echo "  /knowledge:recall \"query\"   — Search this KG"
```

## Edge Cases

### No config file
```
Error: No knowledge graphs configured.
Run /knowledge:init to create your first knowledge graph.
```

### Missing argument
```
Error: Missing knowledge graph name.

Usage: /knowledge:switch <kg-name>

Available knowledge graphs:
  my-project (active)
  ai-research
  cowork-devops
```

### KG doesn't exist
```
Error: Knowledge graph 'nonexistent' not found.

Available knowledge graphs:
  my-project (active)
  ai-research
  cowork-devops

Create a new one with: /knowledge:init
```

### KG path doesn't exist
```
⚠️  Warning: Knowledge graph path does not exist:
   /Users/name/old-project/docs/

The project may have been moved or deleted.

Switch anyway? [y/N]:
```

**If yes**: Switches anyway (path may be created later or on different machine)
**If no**: Cancels switch operation

### Switching to already-active KG
```
Already using knowledge graph: my-project

📚 Active Knowledge Graph: my-project
   Location: /Users/name/projects/my-app/docs/
   Categories: architecture, process, patterns

(No change)
```

## Turbo Mode

Skip confirmation for missing paths:

```bash
/knowledge:switch my-project --force
```

This will switch even if the path doesn't exist, useful for:
- CI/CD environments where paths vary
- Cross-machine syncing (different absolute paths)
- Temporary unavailability of network drives

## Integration with Other Skills

After switching:
- `/knowledge:capture-lesson` writes to the newly active KG
- `/knowledge:recall` searches the newly active KG
- `/knowledge:update-graph` extracts to the newly active KG
- `/knowledge:status` shows stats for the newly active KG
- All other knowledge operations target the newly active KG

## Multi-KG Workflow Example

```bash
# Morning: Work on project documentation
/knowledge:switch my-project
/knowledge:capture-lesson   # Documents project-specific lesson

# Afternoon: Research AI patterns across projects
/knowledge:switch ai-research
/knowledge:recall "transformer architecture"  # Searches global AI KG
/knowledge:capture-lesson   # Documents reusable AI pattern

# Evening: Return to project
/knowledge:switch my-project
/knowledge:sync-all   # Syncs project KG
```

## See Also

- `/knowledge:list` — View all configured KGs
- `/knowledge:init` — Create a new KG
- `/knowledge:status` — View active KG stats
- `/knowledge:add-category` — Add categories to active KG
