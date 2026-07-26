
# /kmgraph:kmg-switch — Change Active Knowledge Graph

Switch between configured knowledge graphs. All subsequent skill operations (`/kmgraph:kmg-capture-lesson`, `/kmgraph:kmg-recall`, etc.) will use the selected KG.

## What This Does

Updates the `active` field in `~/.kmgraph/kg-config.json` to the specified knowledge graph name.

## Syntax

```bash
/kmgraph:kmg-switch my-project
/kmgraph:kmg-switch ai-research
```

## When to Use

- Switch between different project knowledge graphs
- Change to a topic-based KG for cross-project patterns
- Return to a previously used KG

## Implementation

### Step 1: Validate inputs

```bash
CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"
mkdir -p "$(dirname "$CONFIG_PATH")" 2>/dev/null
# one-time migration: seed from the legacy ~/.claude location if the new path is absent
if [ ! -f "$CONFIG_PATH" ] && [ -f "$HOME/.claude/kg-config.json" ]; then
  cp "$HOME/.claude/kg-config.json" "$CONFIG_PATH.tmp.$$" 2>/dev/null && mv -f "$CONFIG_PATH.tmp.$$" "$CONFIG_PATH" 2>/dev/null
fi

# Check if config exists
if [ ! -f "$CONFIG_PATH" ]; then
  echo "Error: No knowledge graphs configured."
  echo "Run /kmgraph:kmg-init to create your first knowledge graph."
  exit 1
fi

# Get target KG name from argument
target_kg="$1"

if [ -z "$target_kg" ]; then
  echo "Error: Missing knowledge graph name."
  echo ""
  echo "Usage: /kmgraph:kmg-switch <kg-name>"
  echo ""
  echo "Available knowledge graphs:"
  /kmgraph:kmg-list --names-only
  exit 1
fi
```

### Step 2: Verify KG exists in config

```bash
CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"
mkdir -p "$(dirname "$CONFIG_PATH")" 2>/dev/null
# one-time migration: seed from the legacy ~/.claude location if the new path is absent
if [ ! -f "$CONFIG_PATH" ] && [ -f "$HOME/.claude/kg-config.json" ]; then
  cp "$HOME/.claude/kg-config.json" "$CONFIG_PATH.tmp.$$" 2>/dev/null && mv -f "$CONFIG_PATH.tmp.$$" "$CONFIG_PATH" 2>/dev/null
fi

# Check if target KG exists
kg_exists=$(jq -r ".graphs | has(\"$target_kg\")" "$CONFIG_PATH")

if [ "$kg_exists" != "true" ]; then
  echo "Error: Knowledge graph '$target_kg' not found."
  echo ""
  echo "Available knowledge graphs:"
  /kmgraph:kmg-list --names-only
  echo ""
  echo "Create a new one with: /kmgraph:kmg-init"
  exit 1
fi
```

### Step 3: Verify KG path exists

```bash
CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"
mkdir -p "$(dirname "$CONFIG_PATH")" 2>/dev/null
# one-time migration: seed from the legacy ~/.claude location if the new path is absent
if [ ! -f "$CONFIG_PATH" ] && [ -f "$HOME/.claude/kg-config.json" ]; then
  cp "$HOME/.claude/kg-config.json" "$CONFIG_PATH.tmp.$$" 2>/dev/null && mv -f "$CONFIG_PATH.tmp.$$" "$CONFIG_PATH" 2>/dev/null
fi

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
CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"
mkdir -p "$(dirname "$CONFIG_PATH")" 2>/dev/null
# one-time migration: seed from the legacy ~/.claude location if the new path is absent
if [ ! -f "$CONFIG_PATH" ] && [ -f "$HOME/.claude/kg-config.json" ]; then
  cp "$HOME/.claude/kg-config.json" "$CONFIG_PATH.tmp.$$" 2>/dev/null && mv -f "$CONFIG_PATH.tmp.$$" "$CONFIG_PATH" 2>/dev/null
fi

# Get current active KG (for reporting)
current_active=$(jq -r '.active' "$CONFIG_PATH")

# Update active field and lastUsed timestamp
if jq ".active = \"$target_kg\" | .graphs[\"$target_kg\"].lastUsed = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" \
  "$CONFIG_PATH" > "$CONFIG_PATH.tmp" && [ -s "$CONFIG_PATH.tmp" ] && jq empty "$CONFIG_PATH.tmp" 2>/dev/null; then
  mv "$CONFIG_PATH.tmp" "$CONFIG_PATH"
else
  rm -f "$CONFIG_PATH.tmp"
  echo "⚠️  kg-config.json update failed (jq error or invalid output) — active KG left unchanged."
fi
```

### Step 5: Report success

```bash
CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"
mkdir -p "$(dirname "$CONFIG_PATH")" 2>/dev/null
# one-time migration: seed from the legacy ~/.claude location if the new path is absent
if [ ! -f "$CONFIG_PATH" ] && [ -f "$HOME/.claude/kg-config.json" ]; then
  cp "$HOME/.claude/kg-config.json" "$CONFIG_PATH.tmp.$$" 2>/dev/null && mv -f "$CONFIG_PATH.tmp.$$" "$CONFIG_PATH" 2>/dev/null
fi

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
echo "  /kmgraph:kmg-status          — View KG stats"
echo "  /kmgraph:kmg-capture-lesson  — Document a lesson"
echo "  /kmgraph:kmg-recall \"query\"   — Search this KG"
```

## Edge Cases

### No config file
```
Error: No knowledge graphs configured.
Run /kmgraph:kmg-init to create your first knowledge graph.
```

### Missing argument
```
Error: Missing knowledge graph name.

Usage: /kmgraph:kmg-switch <kg-name>

Available knowledge graphs:
  my-project (active)
  ai-research
```

### KG doesn't exist
```
Error: Knowledge graph 'nonexistent' not found.

Available knowledge graphs:
  my-project (active)
  ai-research

Create a new one with: /kmgraph:kmg-init
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
/kmgraph:kmg-switch my-project --force
```

This will switch even if the path doesn't exist, useful for:
- CI/CD environments where paths vary
- Cross-machine syncing (different absolute paths)
- Temporary unavailability of network drives

## Integration with Other Skills

After switching:
- `/kmgraph:kmg-capture-lesson` writes to the newly active KG
- `/kmgraph:kmg-recall` searches the newly active KG
- `/kmgraph:kmg-update-graph` extracts to the newly active KG
- `/kmgraph:kmg-status` shows stats for the newly active KG
- All other knowledge operations target the newly active KG

## Multi-KG Workflow Example

```bash
# Morning: Work on project documentation
/kmgraph:kmg-switch my-project
/kmgraph:kmg-capture-lesson   # Documents project-specific lesson

# Afternoon: Research AI patterns across projects
/kmgraph:kmg-switch ai-research
/kmgraph:kmg-recall "transformer architecture"  # Searches global AI KG
/kmgraph:kmg-capture-lesson   # Documents reusable AI pattern

# Evening: Return to project
/kmgraph:kmg-switch my-project
/kmgraph:kmg-sync-all   # Syncs project KG
```

## See Also

- `/kmgraph:kmg-list` — View all configured KGs
- `/kmgraph:kmg-init` — Create a new KG
- `/kmgraph:kmg-status` — View active KG stats
- `/kmgraph:kmg-add-category` — Add categories to active KG
