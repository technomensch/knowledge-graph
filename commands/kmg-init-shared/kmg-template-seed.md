
## Module: template-seed

### Parameters

| Parameter | Description |
|---|---|
| `{KG_PATH}` | Absolute path to the knowledge graph root directory |
| `{CLAUDE_PLUGIN_ROOT}` | Absolute path to the plugin root (source of core/default-templates/) |

---

### Copy templates

```bash
# Copy KG content templates into templates/ subdirectory
mkdir -p "{KG_PATH}/templates"
cp "{CLAUDE_PLUGIN_ROOT}/core/default-templates/concepts/templates/patterns.md" "{KG_PATH}/templates/"
cp "{CLAUDE_PLUGIN_ROOT}/core/default-templates/concepts/templates/gotchas.md" "{KG_PATH}/templates/"
cp "{CLAUDE_PLUGIN_ROOT}/core/default-templates/concepts/templates/concepts.md" "{KG_PATH}/templates/"
cp "{CLAUDE_PLUGIN_ROOT}/core/default-templates/concepts/templates/architecture.md" "{KG_PATH}/templates/"
cp "{CLAUDE_PLUGIN_ROOT}/core/default-templates/concepts/templates/workflows.md" "{KG_PATH}/templates/"
cp "{CLAUDE_PLUGIN_ROOT}/core/default-templates/concepts/kg-category-index.md" "{KG_PATH}/concepts/"

# Copy root-level profile files from project profile starters (skip if exists to preserve teammate copies)
[ -f "{KG_PATH}/rules.md" ] && echo "rules.md already exists — skipping scaffold (teammate copy preserved)." || \
  cp "{CLAUDE_PLUGIN_ROOT}/core/default-templates/concepts/templates/project/rules.md" "{KG_PATH}/rules.md"
[ -f "{KG_PATH}/triggers.md" ] && echo "triggers.md already exists — skipping scaffold." || \
  cp "{CLAUDE_PLUGIN_ROOT}/core/default-templates/concepts/templates/project/triggers.md" "{KG_PATH}/triggers.md"
[ -f "{KG_PATH}/index.md" ] && echo "index.md already exists — skipping scaffold." || \
  cp "{CLAUDE_PLUGIN_ROOT}/core/default-templates/concepts/kg-index.md" "{KG_PATH}/index.md"
[ -f "{KG_PATH}/README.md" ] && echo "README.md already exists — skipping scaffold." || \
  cp "{CLAUDE_PLUGIN_ROOT}/core/default-templates/README-root.md" "{KG_PATH}/README.md"
# me.md is always gitignored — safe to scaffold fresh
cp "{CLAUDE_PLUGIN_ROOT}/core/default-templates/concepts/templates/project/me.md" "{KG_PATH}/me.md"

# READMEs stay in their live dirs (orientation files, not starters)
cp "{CLAUDE_PLUGIN_ROOT}/core/default-templates/lessons-learned/README.md" "{KG_PATH}/lessons-learned/"
cp "{CLAUDE_PLUGIN_ROOT}/core/default-templates/decisions/README.md" "{KG_PATH}/decisions/"

# Starter templates deploy to templates/ (ADR-040), never into live dirs
cp "{CLAUDE_PLUGIN_ROOT}/core/default-templates/lessons-learned/lesson-template.md" "{KG_PATH}/templates/"
cp "{CLAUDE_PLUGIN_ROOT}/core/default-templates/decisions/ADR-template.md" "{KG_PATH}/templates/"
cp "{CLAUDE_PLUGIN_ROOT}/core/default-templates/sessions/session-template.md" "{KG_PATH}/templates/"
cp "{CLAUDE_PLUGIN_ROOT}/core/default-templates/concepts/entry-template.md" "{KG_PATH}/templates/"

# Copy MEMORY template if not exists
if [ ! -f "~/.claude/projects/$(basename $(pwd))/memory/MEMORY.md" ]; then
  echo "Note: MEMORY.md template available at {CLAUDE_PLUGIN_ROOT}/core/default-templates/MEMORY-template.md"
  echo "Copy manually if needed for new projects."
fi
```

#### Template update check

Compare installed templates against the plugin's current templates. If newer versions exist, offer to update:

```bash
template_dirs=("templates" "lessons-learned" "decisions" "sessions")
updates_available=()

for tdir in "${template_dirs[@]}"; do
  # knowledge/templates deploy dir maps to concepts/templates/ in plugin source (renamed in v0.5.10.7)
  _src_tdir="${tdir}"
  [ "${tdir}" = "templates" ] && _src_tdir="concepts/templates"
  for template in "{CLAUDE_PLUGIN_ROOT}/core/default-templates/${_src_tdir}/"*; do
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
