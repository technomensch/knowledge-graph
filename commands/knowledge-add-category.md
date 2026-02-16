---
description: Add a new category to an existing knowledge graph with optional custom prefix
---

# /knowledge:add-category — Add Category to Knowledge Graph

Add a new category to the active knowledge graph with optional custom prefix and git strategy.

## Syntax

```bash
/knowledge:add-category
/knowledge:add-category security
/knowledge:add-category ml-ops --prefix ml- --git ignore
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
# Get active KG path from config
kg_path=$(jq -r '.graphs[.active].path' ~/.claude/kg-config.json)
mkdir -p "$kg_path/lessons-learned/$category"
```

### Create KG Entry File

```bash
if [ ! -f "$kg_path/knowledge/${category}.md" ]; then
  cp "${CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/entry-template.md" \
     "$kg_path/knowledge/${category}.md"
fi
```

### Update Config

```bash
jq ".graphs[.active].categories += [{\"name\": \"$category\", \"prefix\": \"$prefix\", \"git\": \"$git_strategy\"}]" \
   ~/.claude/kg-config.json > ~/.claude/kg-config.json.tmp
mv ~/.claude/kg-config.json.tmp ~/.claude/kg-config.json
```

### Update .gitignore

```bash
if [ "$git_strategy" == "ignore" ] && [ -f .gitignore ]; then
  echo "docs/lessons-learned/$category/" >> .gitignore
  echo "docs/knowledge/${category}.md" >> .gitignore
fi
```

## See Also

- `/knowledge:init` — Initialize new KG
- `/knowledge:list` — View all KGs and their categories
