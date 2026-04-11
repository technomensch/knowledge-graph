---
description: List migration restore points and roll back knowledge graph files to a previous archived state
---

## Execution Rules

All bash/shell checks in this command are **implementation guidance only** — run them silently as internal steps. Never show bash commands, shell code, or raw command output to the user. Present only plain-English results, prompts, and status messages.

# /kmgraph:migration — Migration Management

Inspect and restore knowledge graph archives created by the knowledge-file-migrator. Supports two subcommands: `list` and `rollback`.

## Guard: Active Knowledge Graph Required

Before any subcommand executes, verify that an active knowledge graph is configured:

```bash
KG_CONFIG="$HOME/.claude/kg-config.json"

if [ ! -f "$KG_CONFIG" ]; then
  abort "No active knowledge graph found. Run \`/kmgraph:init\` first."
fi

ACTIVE_KG=$(jq -r '.active // empty' "$KG_CONFIG")
if [ -z "$ACTIVE_KG" ]; then
  abort "No active knowledge graph found. Run \`/kmgraph:init\` first."
fi

KG_PATH=$(jq -r --arg name "$ACTIVE_KG" '.graphs[$name].path // empty' "$KG_CONFIG")
KG_TYPE=$(jq -r --arg name "$ACTIVE_KG" '.graphs[$name].type // empty' "$KG_CONFIG")

if [ -z "$KG_PATH" ] || [ ! -d "$KG_PATH" ]; then
  abort "No active knowledge graph found. Run \`/kmgraph:init\` first."
fi
```

---

## Subcommand: `list`

Usage: `/kmgraph:migration list`

### Steps

**Step 1 — Locate archive directories.**

Scan both scopes for archive directories:

```bash
# Project KG archives
PROJECT_ARCHIVES=$(ls -d "${KG_PATH}/.kg-archive-"*/ 2>/dev/null)

# Personal KG archives
PERSONAL_ARCHIVES=$(ls -d "$HOME/.kmgraph/.kg-archive-"*/ 2>/dev/null)
```

**Step 2 — Read manifests and build table.**

For each archive directory found (project scope first, then personal), read `manifest.json`:

```bash
for ARCHIVE_DIR in $PROJECT_ARCHIVES $PERSONAL_ARCHIVES; do
  MANIFEST="$ARCHIVE_DIR/manifest.json"

  if [ ! -f "$MANIFEST" ]; then
    # Missing manifest — show degraded row
    DIRNAME=$(basename "$ARCHIVE_DIR")
    echo "[manifest missing — date unknown] | $DIRNAME | — | —"
    continue
  fi

  # Validate JSON
  if ! jq empty "$MANIFEST" 2>/dev/null; then
    DIRNAME=$(basename "$ARCHIVE_DIR")
    echo "[manifest missing — date unknown] | $DIRNAME | — | —"
    continue
  fi

  ARCHIVED_AT=$(jq -r '.archived_at // "unknown"' "$MANIFEST")
  REASON=$(jq -r '.reason // "—"' "$MANIFEST")
  FILES=$(jq -r '.files | join(", ")' "$MANIFEST")
  SIZE=$(du -sh "$ARCHIVE_DIR" 2>/dev/null | cut -f1)

  # Determine scope label
  if [[ "$ARCHIVE_DIR" == "$KG_PATH"* ]]; then
    SCOPE="project"
  else
    SCOPE="personal"
  fi

  echo "$ARCHIVED_AT | $SCOPE | $REASON | $FILES | $SIZE"
done
```

**Step 3 — Output.**

Display a formatted table with columns: **ID** (timestamp), **Scope**, **Reason**, **Files**, **Size on disk**.

If no archives were found in either scope, print:

> No restore points available.

If a row has a missing or invalid manifest, display it as:

> `[manifest missing — date unknown]` | `<dir-name>` | — | —

Do not crash or silently skip rows with missing manifests.

---

## Subcommand: `rollback`

Usage: `/kmgraph:migration rollback <id> [--include-platform-config]`

Where `<id>` is the timestamp string from the manifest (e.g., `20260411-143022`).

### Step 1 — Locate and validate the archive

```bash
ID="$1"
FLAG_INCLUDE_PLATFORM="$2"  # "--include-platform-config" or empty

# Determine archive location — check project KG first, then personal KG
if [ -d "${KG_PATH}/.kg-archive-${ID}" ]; then
  ARCHIVE_DIR="${KG_PATH}/.kg-archive-${ID}"
  ROLLBACK_SCOPE="project"
elif [ -d "$HOME/.kmgraph/.kg-archive-${ID}" ]; then
  ARCHIVE_DIR="$HOME/.kmgraph/.kg-archive-${ID}"
  ROLLBACK_SCOPE="personal"
else
  abort "Archive not found: .kg-archive-${ID}. Run \`/kmgraph:migration list\` to see available restore points."
fi

MANIFEST="$ARCHIVE_DIR/manifest.json"
if [ ! -f "$MANIFEST" ] || ! jq empty "$MANIFEST" 2>/dev/null; then
  abort "Archive manifest is missing or invalid at: $ARCHIVE_DIR"
fi

FILES=$(jq -r '.files[]' "$MANIFEST")

if [ "$ROLLBACK_SCOPE" = "personal" ]; then
  DEST_BASE="$HOME/.kmgraph"
else
  DEST_BASE="$KG_PATH"
fi
```

Scope isolation: a **project** archive rollback never touches `~/.kmgraph/` or `~/.claude/CLAUDE.md`. A **personal** archive rollback never touches project-local files under `$KG_PATH`.

### Step 2 — Idempotency check (diff -q)

Before making any changes, compare each archived file against the current on-disk version:

```bash
ALL_IDENTICAL=true
for f in $FILES; do
  CURRENT_FILE="$DEST_BASE/$f"
  ARCHIVED_FILE="$ARCHIVE_DIR/$f"
  if [ ! -f "$ARCHIVED_FILE" ]; then
    ALL_IDENTICAL=false
    break
  fi
  if ! diff -q "$CURRENT_FILE" "$ARCHIVED_FILE" > /dev/null 2>&1; then
    ALL_IDENTICAL=false
    break
  fi
done

if [ "$ALL_IDENTICAL" = "true" ]; then
  echo "Already at this state — no changes made."
  exit 0
fi
```

If all files are identical, print "Already at this state — no changes made." and stop without writing anything.

### Step 3 — Create safety archive (pre-rollback backup)

Before restoring any files, snapshot the current state to a new timestamped archive:

```bash
SAFETY_TS=$(date +%Y%m%d-%H%M%S)
if [ "$ROLLBACK_SCOPE" = "personal" ]; then
  SAFETY_DIR="$HOME/.kmgraph/.kg-archive-${SAFETY_TS}"
else
  SAFETY_DIR="${KG_PATH}/.kg-archive-${SAFETY_TS}"
fi

# Timestamp collision guard: append -2, -3, etc. until unique
if [ -d "$SAFETY_DIR" ]; then
  SUFFIX=2
  while [ -d "${SAFETY_DIR}-${SUFFIX}" ]; do
    SUFFIX=$((SUFFIX + 1))
  done
  SAFETY_DIR="${SAFETY_DIR}-${SUFFIX}"
fi

mkdir -p "$SAFETY_DIR"

# Write manifest for the safety archive
cat > "$SAFETY_DIR/manifest.json" <<EOF
{
  "archived_at": "$SAFETY_TS",
  "reason": "pre-rollback-safety-snapshot",
  "files": $(jq -c '.files' "$MANIFEST")
}
EOF

# Copy current files into safety archive
for f in $FILES; do
  if [ -f "$DEST_BASE/$f" ]; then
    cp "$DEST_BASE/$f" "$SAFETY_DIR/$f"
  fi
done
```

Inform the user: "Pre-rollback snapshot saved as `.kg-archive-${SAFETY_TS}`."

### Step 4 — Restore files from archive

For each file listed in `manifest.json`:

```bash
for f in $FILES; do
  ARCHIVE_FILE="$ARCHIVE_DIR/$f"
  DEST_FILE="$DEST_BASE/$f"

  # Check: missing from archive
  if [ ! -f "$ARCHIVE_FILE" ]; then
    echo "⚠️  '$f' missing from archive — skipped."
    continue
  fi

  # Check: destination is a symlink
  if [ -L "$DEST_FILE" ]; then
    echo "'$f' is now a symlink — rollback would write to its target. Proceed? [y/n]"
    read SYMLINK_CONFIRM
    if [ "$SYMLINK_CONFIRM" != "y" ]; then
      echo "Skipped '$f' (symlink)."
      continue
    fi
  fi

  # Restore the file
  cp "$ARCHIVE_FILE" "$DEST_FILE"
  echo "Restored: $f"
done
```

- If a file is **missing from the archive**: warn "⚠️  `<filename>` missing from archive — skipped." and continue with remaining files.
- If the **destination is a symlink**: prompt the user — "`<filename>` is now a symlink — rollback would write to its target. Proceed? [y/n]" — and skip if the user answers no.

### Step 5 — Platform config rollback (optional flag)

Only executes when `--include-platform-config` is passed **and** the manifest contains a `platform_config_appended` field.

```bash
if [ "$FLAG_INCLUDE_PLATFORM" = "--include-platform-config" ]; then
  PLATFORM_CONFIG_PATH=$(jq -r '.platform_config_appended.path // empty' "$MANIFEST")
  PLATFORM_LINES=$(jq -r '.platform_config_appended.lines[]? // empty' "$MANIFEST")

  if [ -n "$PLATFORM_CONFIG_PATH" ] && [ -n "$PLATFORM_LINES" ]; then
    LINE_COUNT=$(jq -r '.platform_config_appended.lines | length' "$MANIFEST")

    echo "Remove $LINE_COUNT line(s) from $PLATFORM_CONFIG_PATH? This cannot be automatically verified for safety. [y/n]"
    read PLATFORM_CONFIRM
    if [ "$PLATFORM_CONFIRM" = "y" ]; then
      TEMP_FILE=$(mktemp)
      cp "$PLATFORM_CONFIG_PATH" "$TEMP_FILE"
      while IFS= read -r line; do
        grep -vxF "$line" "$TEMP_FILE" > "${TEMP_FILE}.new" && mv "${TEMP_FILE}.new" "$TEMP_FILE"
      done <<< "$PLATFORM_LINES"
      cp "$TEMP_FILE" "$PLATFORM_CONFIG_PATH"
      rm -f "$TEMP_FILE"
      echo "Removed $LINE_COUNT line(s) from $PLATFORM_CONFIG_PATH."
    else
      echo "Platform config rollback skipped."
    fi
  fi
fi
```

Require explicit confirmation before removing any lines from the platform config file. Removal uses `grep -vxF` to match exact lines only.

### Step 6 — Completion message

```
Restore complete. Archive at .kg-archive-<id>/ preserved (run /kmgraph:migration purge <id> to delete).
```

Print which files were restored and from where, followed by the above completion message.

---

## Path Safety Requirements

- `KG_PATH` and `ARCHIVE_DIR` **must always be double-quoted** in all shell commands.
- Validate `KG_PATH` exists before any operation:
  ```bash
  [ -d "$KG_PATH" ] || abort "KG_PATH not found: $KG_PATH"
  ```
- All file paths containing spaces or Unicode characters must be safely quoted throughout.
