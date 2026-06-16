
## Module: config-entry-write

### Parameters

| Parameter | Description |
|---|---|
| `{KG_PATH}` | Absolute path to the knowledge graph root directory |
| `{kg_name}` | Name key used in kg-config.json |
| `{KG_TYPE}` | Type string: "project-local" or "personal" |
| `{categories}` | Array of category names with prefix and git rules |
| `{git_strategy}` | Git strategy: "all-commit", "all-ignore", or "selective" |
| `{category_git_rules}` | Per-category git rule map (used when git_strategy is "selective") |
| `{preserve_active}` | Boolean — if true, do not modify the "active" field in config |

---

```bash
# Build config entry JSON
config_entry=$(cat <<EOF
{
  "name": "{kg_name}",
  "path": "{KG_PATH}",
  "type": "{KG_TYPE}",
  "categories": [
    $(for cat in "${categories[@]}"; do
      prefix="${category_prefixes[$cat]:-null}"
      git_rule="${category_git_rules[$cat]:-commit}"
      echo "{ \"name\": \"$cat\", \"prefix\": $prefix, \"git\": \"$git_rule\" },"
    done | sed '$ s/,$//')
  ],
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "lastUsed": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)

# Update config with jq (or manual JSON manipulation)
# Only include the .active assignment when {preserve_active} is false.
# Use the appropriate form below based on the value of {preserve_active}:

# If {preserve_active} is FALSE — set the active KG:
jq ".graphs[\"{kg_name}\"] = $config_entry | .active = \"{kg_name}\"" \
  ~/.claude/kg-config.json > ~/.claude/kg-config.json.tmp

# If {preserve_active} is TRUE — do NOT modify .active:
jq ".graphs[\"{kg_name}\"] = $config_entry" \
  ~/.claude/kg-config.json > ~/.claude/kg-config.json.tmp

mv ~/.claude/kg-config.json.tmp ~/.claude/kg-config.json
```

#### Config field check

Check for config fields introduced in newer versions. Add defaults for any missing fields without overwriting existing values:

```bash
# Fields that may be missing from older installs:
# - platforms: [] (added in v0.2.0)
# - autoSwitch: false (added in v0.2.0)
# - notification: { webhookUrl: "" } (added in v0.2.0)
# - type: "project-local" (added in v0.2.2 — required for multi-KG support)

jq '
  .graphs["'"$kg_name"'"] |=
    if .platforms == null then .platforms = [] else . end |
    if .autoSwitch == null then .autoSwitch = false else . end |
    if .notification == null then .notification = { "webhookUrl": "" } else . end |
    if .type == null then .type = "project-local" else . end
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

