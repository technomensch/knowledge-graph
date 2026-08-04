
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

### Resolve the Target Graph

```
kg_resolve
```

Take the returned `path` as `$kg_path` for the remaining steps below (issue-41: this
command previously resolved its own path via `jq -r '.graphs[.active].path'` and wrote
categories via `jq ".graphs[.active].categories += [...]"` — both pre-ADR-067 patterns
that no longer reflect how any graph is actually selected or written).

### Add the Category

```
kg_config_add_category name="$category" prefix="$prefix" git="$git_strategy"
```

This resolves the graph the same way `kg_resolve` above did, checks for a duplicate
category name, creates `$kg_path/lessons-learned/$category/`, and writes the category
entry into the config — the config-write step no longer happens in this command's own
bash at all.

### Create KG Entry File

```bash
if [ ! -f "$kg_path/knowledge/${category}.md" ]; then
  cp "${CLAUDE_PLUGIN_ROOT}/core/default-templates/concepts/entry-template.md" \
     "$kg_path/knowledge/${category}.md"
fi
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
