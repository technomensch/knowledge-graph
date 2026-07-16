
# /kmgraph:kmg-add-category — Add Category to Knowledge Graph

Add a new category to the active knowledge graph with optional custom prefix and git strategy.

## Syntax

```bash
/kmgraph:kmg-add-category
/kmgraph:kmg-add-category security
/kmgraph:kmg-add-category ml-ops --prefix ml- --git ignore
```

## What This Does

1. Prompts for category name (if not provided)
2. Asks for optional prefix
3. Asks for git strategy (commit or ignore)
4. Creates `lessons-learned/[category]/` directory
5. Creates `knowledge/[category].md` if needed
6. Updates config with new category
7. Updates `.gitignore` if strategy is ignore

## Implementation

### Wizard Prompts

```
Category name: security
Prefix (optional, e.g., "sec-"): sec-
Git strategy (commit/ignore): ignore
```

### Create Directories

```bash
CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"
mkdir -p "$(dirname "$CONFIG_PATH")" 2>/dev/null
# one-time migration: seed from the legacy ~/.claude location if the new path is absent
if [ ! -f "$CONFIG_PATH" ] && [ -f "$HOME/.claude/kg-config.json" ]; then
  cp "$HOME/.claude/kg-config.json" "$CONFIG_PATH.tmp.$$" 2>/dev/null && mv -f "$CONFIG_PATH.tmp.$$" "$CONFIG_PATH" 2>/dev/null
fi
# Get active KG path from config
kg_path=$(jq -r '.graphs[.active].path' "$CONFIG_PATH")
mkdir -p "$kg_path/lessons-learned/$category"
```

### Create KG Entry File

```bash
if [ ! -f "$kg_path/knowledge/${category}.md" ]; then
  cp "${CLAUDE_PLUGIN_ROOT}/core/default-templates/concepts/entry-template.md" \
     "$kg_path/knowledge/${category}.md"
fi
```

### Update Config

```bash
CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"
mkdir -p "$(dirname "$CONFIG_PATH")" 2>/dev/null
# one-time migration: seed from the legacy ~/.claude location if the new path is absent
if [ ! -f "$CONFIG_PATH" ] && [ -f "$HOME/.claude/kg-config.json" ]; then
  cp "$HOME/.claude/kg-config.json" "$CONFIG_PATH.tmp.$$" 2>/dev/null && mv -f "$CONFIG_PATH.tmp.$$" "$CONFIG_PATH" 2>/dev/null
fi
jq ".graphs[.active].categories += [{\"name\": \"$category\", \"prefix\": \"$prefix\", \"git\": \"$git_strategy\"}]" \
   "$CONFIG_PATH" > "${CONFIG_PATH}.tmp"
mv "${CONFIG_PATH}.tmp" "$CONFIG_PATH"
```

### Update .gitignore

```bash
if [ "$git_strategy" == "ignore" ] && [ -f .gitignore ]; then
  echo "knowledge/lessons-learned/$category/" >> .gitignore
  echo "knowledge/${category}.md" >> .gitignore
fi
```

## See Also

- `/kmgraph:kmg-init` — Initialize new KG
- `/kmgraph:kmg-list` — View all KGs and their categories
