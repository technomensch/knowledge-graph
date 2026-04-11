---
description: Shared migration module — archives rules.md and relocates Claude-specific lines to the platform's native config file
---

## Module: knowledge-file-migrator

**Purpose:** Archive `rules.md`, then relocate flagged Claude-specific lines to the platform's native config file (`CLAUDE.md § Platform Preferences`). Called by `upgrade-inspector.md` section d when the user selects option (a) — auto-relocate.

### Parameters

| Parameter | Description |
|---|---|
| `{KG_PATH}` | Absolute path to the knowledge graph root directory |
| `{KG_TYPE}` | Type: "project-local" or "personal" |
| `{PROJECT_ROOT}` | Absolute path to the project root (used for project-local KGs; unused for personal KGs) |
| `{CONTAMINATION}` | grep -n output of flagged lines from rules.md (format: `NNN:content`) |

---

### Step 0: Bind parameters to shell variables

```bash
CONTAMINATION="{CONTAMINATION}"
KG_PATH="{KG_PATH}"
KG_TYPE="{KG_TYPE}"
PROJECT_ROOT="{PROJECT_ROOT}"
```

---

### Step 0.5: Schema version check (idempotency gate)

Read the `kmgraph_schema` field from `{KG_PATH}/rules.md` YAML frontmatter:

```bash
SCHEMA_VERSION=$(awk '/^---$/{if(in_front){in_front=0;exit}else{in_front=1;next}} in_front && /^kmgraph_schema:/{gsub(/[^0-9]/,"",$2);print $2;exit}' "{KG_PATH}/rules.md" 2>/dev/null)
```

If `$SCHEMA_VERSION` is a valid integer and `$SCHEMA_VERSION -ge 2`:
- Print: `rules.md already at schema v2 — skipping platform-split migration.`
- Exit this module without making any changes.

If `$SCHEMA_VERSION` is absent, empty, or non-numeric (e.g., `kmgraph_schema: not-a-number`): treat as absent — proceed with migration normally.

---

### Step 1: Resolve platform config target

```bash
if [ "$KG_TYPE" = "personal" ]; then
  PLATFORM_CONFIG="$HOME/.claude/CLAUDE.md"
else
  PLATFORM_CONFIG="$PROJECT_ROOT/CLAUDE.md"
fi
```

---

### Step 2: Archive before any write

Create a timestamped archive of `rules.md` before modifying it:

```bash
ARCHIVE_TS=$(date +%Y%m%d-%H%M%S)
ARCHIVE_DIR="$KG_PATH/.kg-archive-${ARCHIVE_TS}"
mkdir -p "$ARCHIVE_DIR"
cp "$KG_PATH/rules.md" "$ARCHIVE_DIR/rules.md"
```

Write a `manifest.json` to the archive:

```json
{
  "archived_at": "<ARCHIVE_TS>",
  "reason": "platform-split-relocation",
  "files": ["rules.md"]
}
```

Print: `📦 Archive saved: $ARCHIVE_DIR`

---

### Step 3: Ensure Platform Preferences section exists in platform config

Match the full heading to avoid false-positive on future platform sections (e.g., `## Platform Preferences (Gemini)`):

```bash
grep -qF "## Platform Preferences (Claude Code)" "$PLATFORM_CONFIG" 2>/dev/null || \
  printf '\n## Platform Preferences (Claude Code)\n\n' >> "$PLATFORM_CONFIG"
```

---

### Step 4: Append flagged lines to platform config

Strip line numbers from grep -n output and append. Skip any line already present in the target to avoid duplicates if migration is run more than once:

```bash
while IFS= read -r line; do
  content=$(echo "$line" | sed 's/^[0-9]*://')
  grep -qxF "$content" "$PLATFORM_CONFIG" 2>/dev/null || echo "$content" >> "$PLATFORM_CONFIG"
done <<< "$CONTAMINATION"
```

Print: `✅ Flagged lines appended to $PLATFORM_CONFIG`

---

### Step 5: Remove flagged lines from rules.md

Extract line numbers from `$CONTAMINATION` (format: `NNN:content`) and delete them in reverse order to preserve line numbering during deletion:

```bash
LINE_NUMS=$(echo "$CONTAMINATION" | grep -oE '^[0-9]+' | sort -rn)
for ln in $LINE_NUMS; do
  sed -i.bak "${ln}d" "$KG_PATH/rules.md" && rm -f "$KG_PATH/rules.md.bak"
done
```

Print: `✅ Flagged lines removed from rules.md`

---

### Step 6: Add guidance comment to rules.md Tool Preferences section

If `rules.md` does not already contain a platform-directives guidance comment, insert one after the `## Tool Preferences` heading. If no `## Tool Preferences` heading exists, append the comment at the end of the file:

```bash
COMMENT='<!-- Platform-specific directives belong in the platform'"'"'s native config file (CLAUDE.md, GEMINI.md, etc.) — see ADR-032 -->'

if grep -qxF "$COMMENT" "$KG_PATH/rules.md" 2>/dev/null; then
  : # already present, skip
elif grep -q "^## Tool Preferences" "$KG_PATH/rules.md"; then
  # Insert after the ## Tool Preferences heading using awk (portable, handles special chars)
  awk -v comment="$COMMENT" \
    '/^## Tool Preferences/ { print; print comment; next } 1' \
    "$KG_PATH/rules.md" > "$KG_PATH/rules.md.tmp" && mv "$KG_PATH/rules.md.tmp" "$KG_PATH/rules.md"
else
  # No Tool Preferences heading — append to EOF
  printf '\n%s\n' "$COMMENT" >> "$KG_PATH/rules.md"
fi
```

---

### Step 6.5: Write schema version marker to rules.md

Write `kmgraph_schema: 2` to `{KG_PATH}/rules.md` YAML frontmatter. This must run AFTER Step 5 (line deletion) and Step 6 (guidance comment).

```bash
# Check if frontmatter block already exists (starts with ---)
if head -1 "{KG_PATH}/rules.md" | grep -qx '---'; then
  # Frontmatter exists — update or insert the kmgraph_schema field using awk
  awk '
    /^---$/ && !in_front { in_front=1; print; next }
    in_front && /^---$/ {
      if (!wrote_schema) print "kmgraph_schema: 2"
      in_front=0; wrote_schema=0; print; next
    }
    in_front && /^kmgraph_schema:/ { print "kmgraph_schema: 2"; wrote_schema=1; next }
    { print }
  ' "{KG_PATH}/rules.md" > "{KG_PATH}/rules.md.tmp" && mv "{KG_PATH}/rules.md.tmp" "{KG_PATH}/rules.md"
else
  # No frontmatter — prepend it
  printf -- '---\nkmgraph_schema: 2\n---\n\n' | cat - "{KG_PATH}/rules.md" > "{KG_PATH}/rules.md.tmp" && mv "{KG_PATH}/rules.md.tmp" "{KG_PATH}/rules.md"
fi
```

Print: `✅ Schema version marker written: kmgraph_schema: 2`

---

### On completion

Print summary:

```
✅ Migration complete.
   Archive: $ARCHIVE_DIR
   Relocated to: $PLATFORM_CONFIG
   Delete archive when satisfied: rm -rf $ARCHIVE_DIR
```
