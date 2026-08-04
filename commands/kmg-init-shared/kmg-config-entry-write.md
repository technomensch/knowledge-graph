
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

---

```bash
CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"
mkdir -p "$(dirname "$CONFIG_PATH")" 2>/dev/null
# one-time migration: seed from the legacy ~/.claude location if the new path is absent
if [ ! -f "$CONFIG_PATH" ] && [ -f "$HOME/.claude/kg-config.json" ]; then
  cp "$HOME/.claude/kg-config.json" "$CONFIG_PATH.tmp.$$" 2>/dev/null && mv -f "$CONFIG_PATH.tmp.$$" "$CONFIG_PATH" 2>/dev/null
fi

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
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)

# Update config with jq (or manual JSON manipulation)
jq ".graphs[\"{kg_name}\"] = $config_entry" \
  "$CONFIG_PATH" > "${CONFIG_PATH}.tmp"

mv "${CONFIG_PATH}.tmp" "$CONFIG_PATH"
```

#### Config field check

Check for config fields introduced in newer versions. Add defaults for any missing fields without overwriting existing values:

```bash
CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"
mkdir -p "$(dirname "$CONFIG_PATH")" 2>/dev/null
# one-time migration: seed from the legacy ~/.claude location if the new path is absent
if [ ! -f "$CONFIG_PATH" ] && [ -f "$HOME/.claude/kg-config.json" ]; then
  cp "$HOME/.claude/kg-config.json" "$CONFIG_PATH.tmp.$$" 2>/dev/null && mv -f "$CONFIG_PATH.tmp.$$" "$CONFIG_PATH" 2>/dev/null
fi

# Fields that may be missing from older installs:
# - platforms: [] (added in v0.2.0)
# - notification: { webhookUrl: "" } (added in v0.2.0)
# - type: "project-local" (added in v0.2.2 — required for multi-KG support)
# Note: autoSwitch is retired (issue-41 / ADR-067 Phase 9) — resolution is
# cwd-derived now, there is nothing to "switch." Do not write this field to
# new or upgraded config entries.

jq '
  .graphs["'"$kg_name"'"] |=
    if .platforms == null then .platforms = [] else . end |
    if .notification == null then .notification = { "webhookUrl": "" } else . end |
    if .type == null then .type = "project-local" else . end
' "$CONFIG_PATH" > "${CONFIG_PATH}.tmp"
mv "${CONFIG_PATH}.tmp" "$CONFIG_PATH"
```

**After the migration, check for graphs still missing `type`** (e.g., if the user has multiple registered KGs from v0.2.1):

```bash
CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"
mkdir -p "$(dirname "$CONFIG_PATH")" 2>/dev/null
# one-time migration: seed from the legacy ~/.claude location if the new path is absent
if [ ! -f "$CONFIG_PATH" ] && [ -f "$HOME/.claude/kg-config.json" ]; then
  cp "$HOME/.claude/kg-config.json" "$CONFIG_PATH.tmp.$$" 2>/dev/null && mv -f "$CONFIG_PATH.tmp.$$" "$CONFIG_PATH" 2>/dev/null
fi

GRAPHS_WITHOUT_TYPE=$(jq -r '.graphs | to_entries[] | select(.value.type == null) | .key' "$CONFIG_PATH")
if [ -n "$GRAPHS_WITHOUT_TYPE" ]; then
  echo "⚠️  Some registered KGs are missing a type field (defaulted to project-local):"
  echo "$GRAPHS_WITHOUT_TYPE"
  echo "   If any of these should be a personal KG, run /kmgraph:kmg-init-personal-kg to re-register correctly."
fi
```

