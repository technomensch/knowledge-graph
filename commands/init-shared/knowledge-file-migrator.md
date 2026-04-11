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
| `{PROJECT_ROOT}` | Absolute path to the project root (ignored for personal KGs) |
| `{CONTAMINATION}` | grep -n output of flagged lines from rules.md |

---

### Step 1: Resolve platform config target

```bash
if [ "{KG_TYPE}" = "personal" ]; then
  PLATFORM_CONFIG="$HOME/.claude/CLAUDE.md"
else
  PLATFORM_CONFIG="{PROJECT_ROOT}/CLAUDE.md"
fi
```

---

### Step 2: Archive before any write

Create a timestamped archive of `rules.md` before modifying it:

```bash
ARCHIVE_TS=$(date +%Y%m%d-%H%M%S)
ARCHIVE_DIR="{KG_PATH}/.kg-archive-${ARCHIVE_TS}"
mkdir -p "$ARCHIVE_DIR"
cp "{KG_PATH}/rules.md" "$ARCHIVE_DIR/rules.md"
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

```bash
grep -q "## Platform Preferences" "$PLATFORM_CONFIG" 2>/dev/null || \
  printf '\n## Platform Preferences (Claude Code)\n\n' >> "$PLATFORM_CONFIG"
```

---

### Step 4: Append flagged lines to platform config

Extract matched line content (strip line numbers from grep -n output) and append under `## Platform Preferences`:

```bash
echo "$CONTAMINATION" | sed 's/^[0-9]*://' >> "$PLATFORM_CONFIG"
```

Print: `✅ Flagged lines appended to $PLATFORM_CONFIG`

---

### Step 5: Remove flagged lines from rules.md

Extract line numbers from `{CONTAMINATION}` (format: `NNN:content`) and delete them. Remove in reverse order to preserve line numbering during deletion:

```bash
LINE_NUMS=$(echo "$CONTAMINATION" | grep -oE '^[0-9]+' | sort -rn)
for ln in $LINE_NUMS; do
  # Delete line $ln from {KG_PATH}/rules.md
done
```

Print: `✅ Flagged lines removed from rules.md`

---

### Step 6: Add guidance comment to rules.md Tool Preferences section

If `rules.md` does not already contain a platform-directives guidance comment, insert one after the Tool Preferences heading:

```
<!-- Platform-specific directives belong in the platform's native config file (CLAUDE.md, GEMINI.md, etc.) -->
```

---

### On completion

Print summary:

```
✅ Migration complete.
   Archive: $ARCHIVE_DIR
   Relocated to: $PLATFORM_CONFIG
   Delete archive when satisfied: rm -rf $ARCHIVE_DIR
```
