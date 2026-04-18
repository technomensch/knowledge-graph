---
description: Shared template seed module — non-destructive copy of core/templates/ into a KG directory
---

## Module: template-seed

### Parameters

| Parameter | Description |
|---|---|
| `{KG_PATH}` | Absolute path to the knowledge graph root directory |
| `{CLAUDE_PLUGIN_ROOT}` | Absolute path to the plugin root (source of core/templates/) |

---

### Copy templates

```bash
# Copy KG templates
cp "{CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/patterns.md" "{KG_PATH}/knowledge/"
cp "{CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/gotchas.md" "{KG_PATH}/knowledge/"
cp "{CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/concepts.md" "{KG_PATH}/knowledge/"
cp "{CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/architecture.md" "{KG_PATH}/knowledge/"
cp "{CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/workflows.md" "{KG_PATH}/knowledge/"
cp "{CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/kg-category-index.md" "{KG_PATH}/knowledge/"

# Copy root-level files (skip if already exists to preserve teammate copies)
[ -f "{KG_PATH}/rules.md" ] && echo "rules.md already exists — skipping scaffold (teammate copy preserved)." || \
  cp "{CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/rules.md" "{KG_PATH}/rules.md"
[ -f "{KG_PATH}/triggers.md" ] && echo "triggers.md already exists — skipping scaffold." || \
  cp "{CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/triggers.md" "{KG_PATH}/triggers.md"
[ -f "{KG_PATH}/index.md" ] && echo "index.md already exists — skipping scaffold." || \
  cp "{CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/kg-index.md" "{KG_PATH}/index.md"
# me.md is always gitignored — safe to scaffold fresh
cp "{CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/me.md" "{KG_PATH}/me.md"

# Copy lesson/ADR templates
cp "{CLAUDE_PLUGIN_ROOT}/core/templates/lessons-learned/README.md" "{KG_PATH}/lessons-learned/"
cp "{CLAUDE_PLUGIN_ROOT}/core/templates/lessons-learned/lesson-template.md" "{KG_PATH}/lessons-learned/"
cp "{CLAUDE_PLUGIN_ROOT}/core/templates/decisions/README.md" "{KG_PATH}/decisions/"
cp "{CLAUDE_PLUGIN_ROOT}/core/templates/decisions/ADR-template.md" "{KG_PATH}/decisions/"

# Copy session template
cp "{CLAUDE_PLUGIN_ROOT}/core/templates/sessions/session-template.md" "{KG_PATH}/sessions/"

# Copy MEMORY template if not exists
if [ ! -f "~/.claude/projects/$(basename $(pwd))/memory/MEMORY.md" ]; then
  echo "Note: MEMORY.md template available at {CLAUDE_PLUGIN_ROOT}/core/templates/MEMORY-template.md"
  echo "Copy manually if needed for new projects."
fi
```

#### Template update check

Compare installed templates against the plugin's current templates. If newer versions exist, offer to update:

```bash
template_dirs=("knowledge" "lessons-learned" "decisions" "sessions")
updates_available=()

for tdir in "${template_dirs[@]}"; do
  for template in "{CLAUDE_PLUGIN_ROOT}/core/templates/$tdir/"*; do
    dest="{KG_PATH}/$tdir/$(basename $template)"
    if [ -f "$dest" ]; then
      if ! diff -q "$template" "$dest" > /dev/null 2>&1; then
        updates_available+=("$tdir/$(basename $template)")
      fi
    else
      updates_available+=("$tdir/$(basename $template) (new)")
    fi
  done
done
```

If updates are available, present them:

```
Template updates available:
  • knowledge/index.md (updated)
  • sessions/session-template.md (new)

Update templates? This will NOT overwrite your existing lessons or decisions.
  1. Update all templates
  2. Review each one
  3. Skip template updates
```

**Important:** Never overwrite user-created files (lessons, ADRs, KG entries). Only update template/scaffold files.
