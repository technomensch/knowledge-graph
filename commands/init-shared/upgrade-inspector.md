---
description: Shared upgrade inspector module — detects missing dirs, templates, and config fields for an existing KG
---

## Module: upgrade-inspector

### Parameters

| Parameter | Description |
|---|---|
| `{KG_PATH}` | Absolute path to the knowledge graph root directory |
| `{kg_name}` | Name key used in kg-config.json |
| `{KG_TYPE}` | Type string: "project-local" or "personal" |
| `{categories}` | Array of category names configured for this KG |

---

## Pre-Wizard: Existing KG Detection

Before running any checks or making any changes, check if a knowledge graph already exists for this project in `~/.claude/kg-config.json`. If the current working directory matches an existing KG's path (or is a parent/child of one), present this menu instead of jumping straight to setup:

```
A knowledge graph named "[name]" already exists in the config and is set as active.
It's [type] at [path] with categories: [list].

What would you like to do?

1. See what's new — review improvements in this version, then decide what to apply
2. Create a new, separate knowledge graph (different name/location)
3. Re-initialize "[name]" (reset categories, git strategy, etc.)
4. Cancel — the existing KG is already set up
```

### Option 1: See What's New

When the user selects option 1, **before running any checks or making any changes**, inspect the KG's actual state and report only what is missing or upgradeable for this specific install:

```bash
# Inspect what's actually missing or upgradeable
upgrades=()

# Missing directories
for dir in knowledge lessons-learned decisions sessions chat-history tmp; do
  [ ! -d "{KG_PATH}/$dir" ] && upgrades+=("Missing directory: $dir/")
done

# Index reorganization — knowledge/index.md renamed to kg-category-index.md; new root kg-index.md created
if [ -f "{KG_PATH}/knowledge/index.md" ] && [ ! -f "{KG_PATH}/knowledge/kg-category-index.md" ]; then
  upgrades+=("Index update: renames {KG_PATH}/knowledge/index.md to kg-category-index.md and adds a new kg-index.md at the knowledge graph root as the primary entry point")
elif [ ! -f "{KG_PATH}/index.md" ]; then
  upgrades+=("New: kg-index.md — the primary entry point for this knowledge graph")
fi

# Missing root-level scaffold files
[ ! -f "{KG_PATH}/me.md" ]      && upgrades+=("New: me.md — your identity and working style in this project")
[ ! -f "{KG_PATH}/rules.md" ]   && upgrades+=("New: rules.md — project conventions and behavioral rules")

# Path migration available
CONFIGURED_PATH=$(jq -r '.graphs["{kg_name}"].path' ~/.claude/kg-config.json)
echo "$CONFIGURED_PATH" | grep -qE '/docs/?$' && \
  [ -d "$CONFIGURED_PATH/lessons-learned" ] && \
  upgrades+=("Migration available: move KMGraph content from docs/ to knowledge/")

# New templates (files in plugin core/templates not yet in KG)
# Skip templates that are already covered by the scaffold file checks above:
#   kg-index.md deploys as {KG_PATH}/index.md — already checked
#   me.md and rules.md deploy to {KG_PATH} root — already checked
scaffold_covered=("kg-index.md" "me.md" "rules.md" "index-personal.md")
for tdir in knowledge lessons-learned decisions sessions; do
  for template in "${CLAUDE_PLUGIN_ROOT}/core/templates/$tdir/"*; do
    tname=$(basename "$template")
    # Skip if this template is covered by a scaffold check
    skip=false
    for covered in "${scaffold_covered[@]}"; do
      [ "$tname" = "$covered" ] && skip=true && break
    done
    $skip && continue
    dest="{KG_PATH}/$tdir/$tname"
    [ ! -f "$dest" ] && upgrades+=("New template: $tdir/$tname")
  done
done
```

If nothing is upgradeable, say:
```
✅ Your setup is already up to date. Nothing to apply.
```
And exit.

If upgrades exist, present them:
```
Here's what's available for your install:
  • [item 1]
  • [item 2]
  ...

Apply all, pick individually, or skip?
  1. Apply all
  2. Let me choose which ones to apply
  3. Skip — my setup is already how I want it
```

If the user picks option 2 (choose individually), present each item as a separate yes/no prompt before running it.

If the user picks option 3 (skip), exit with no changes.

Then perform these checks in order:

#### a. Directory structure check

Verify all expected directories exist. Create any that are missing:

```bash
expected_dirs=(knowledge lessons-learned decisions sessions chat-history)
for dir in "${expected_dirs[@]}"; do
  if [ ! -d "{KG_PATH}/$dir" ]; then
    mkdir -p "{KG_PATH}/$dir"
    echo "✅ Created missing directory: $dir/"
  fi
done

# Check category subdirectories
for category in "{categories[@]}"; do
  if [ ! -d "{KG_PATH}/lessons-learned/$category" ]; then
    mkdir -p "{KG_PATH}/lessons-learned/$category"
    echo "✅ Created missing category directory: lessons-learned/$category/"
  fi
done
```

#### b. Config field check

Check for config fields introduced in newer versions. Add defaults for any missing fields without overwriting existing values:

```bash
# Fields that may be missing from older installs:
# - platforms: [] (added in v0.2.0)
# - autoSwitch: false (added in v0.2.0)
# - notification: { webhookUrl: "" } (added in v0.2.0)
# - type: "project-local" (added in v0.2.2 — required for multi-KG support)

jq '
  .graphs["{kg_name}"] |=
    if .platforms == null then .platforms = [] else . end |
    if .autoSwitch == null then .autoSwitch = false else . end |
    if .notification == null then .notification = { "webhookUrl": "" } else . end |
    if .type == null then .type = "{KG_TYPE}" else . end
' ~/.claude/kg-config.json > ~/.claude/kg-config.json.tmp
mv ~/.claude/kg-config.json.tmp ~/.claude/kg-config.json
```

**After the migration, check for graphs still missing `type`** (e.g., if the user has multiple registered KGs from v0.2.1):

```bash
GRAPHS_WITHOUT_TYPE=$(jq -r '.graphs | to_entries[] | select(.value.type == null) | .key' ~/.claude/kg-config.json)
if [ -n "$GRAPHS_WITHOUT_TYPE" ]; then
  echo "⚠️  Some registered KGs are missing a type field (defaulted to project-local):"
  echo "$GRAPHS_WITHOUT_TYPE"
  echo "   If any of these should be a personal KG, run /kmgraph:init-personal-kg to re-register correctly."
fi
```


#### c. Template update check

Compare installed templates against the plugin's current templates. If newer versions exist, offer to update:

```bash
template_dirs=("knowledge" "lessons-learned" "decisions" "sessions")
updates_available=()

for tdir in "${template_dirs[@]}"; do
  for template in "${CLAUDE_PLUGIN_ROOT}/core/templates/$tdir/"*; do
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
