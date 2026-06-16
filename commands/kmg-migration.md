
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

**Step 1 — Read manifests and build table.**

For each archive directory found (project scope first, then personal), read `manifest.json`:

```bash
for ARCHIVE_DIR in "${KG_PATH}/.kg-archive-"*/ "$HOME/.kmgraph/.kg-archive-"*/; do
  [ -d "$ARCHIVE_DIR" ] || continue
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
while IFS= read -r f; do
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
done <<< "$FILES"

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

# Copy current files into safety archive; build list of actually-copied files
COPIED_FILES="[]"
while IFS= read -r f; do
  if [ -f "$DEST_BASE/$f" ]; then
    cp "$DEST_BASE/$f" "$SAFETY_DIR/$f"
    COPIED_FILES=$(echo "$COPIED_FILES" | jq --arg f "$f" '. + [$f]')
  fi
done <<< "$FILES"

# Write manifest with only the files that were actually copied
cat > "$SAFETY_DIR/manifest.json" <<EOF
{
  "archived_at": "$SAFETY_TS",
  "reason": "pre-rollback-safety-snapshot",
  "files": $COPIED_FILES
}
EOF
```

Inform the user: "Pre-rollback snapshot saved as `.kg-archive-${SAFETY_TS}`."

### Step 4 — Restore files from archive

For each file listed in `manifest.json`:

```bash
while IFS= read -r f; do
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
done <<< "$FILES"
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

## Subcommand: `purge`

Usage:
- `/kmgraph:migration purge --list`
- `/kmgraph:migration purge --older-than <days>`
- `/kmgraph:migration purge --id <id>`

Deletes one or more migration archives. **Never auto-deletes without user confirmation.**

### Shared behavior for all variants

- Always confirm before deleting each archive:
  > Delete archive from `<date>` (`<N>` files, `<size>`)? [y/n]
- Never mix project and personal scope in a single operation — each scope is evaluated and confirmed independently.
- On completion, print count of archives deleted and total space freed:
  > Deleted 2 archive(s), freed 18 KB.
- After purge completes, check total remaining archive disk usage across both scopes:

```bash
TOTAL_KB=$(du -sk "${KG_PATH}/.kg-archive-"*/ "$HOME/.kmgraph/.kg-archive-"*/ 2>/dev/null | awk '{sum += $1} END {print sum+0}')
TOTAL_MB=$((TOTAL_KB / 1024))
```

If total exceeds 10 MB, print:
> Note: Migration archives are taking up `X` MB total. Run `/kmgraph:migration purge --older-than 30` to clean up.

If total is ≤ 10 MB or no archives remain, this check is silent.

---

### `--list` variant

Usage: `/kmgraph:migration purge --list`

Show all archives from both project and personal scopes. Output the same formatted table as `migration list`:

| ID (timestamp) | Scope | Reason | Files | Size on disk |

If no archives found in either scope, print:
> No archives found.

---

### `--older-than <days>` variant

Usage: `/kmgraph:migration purge --older-than <days>`

If `--older-than` is omitted, default to **30 days**.

**Steps:**

**Step 1 — Scan archives in both scopes.**

```bash
DAYS="${1:-30}"
NOW=$(date +%s)
CUTOFF=$((NOW - DAYS * 86400))

for ARCHIVE_DIR in "${KG_PATH}/.kg-archive-"*/ "$HOME/.kmgraph/.kg-archive-"*/; do
  [ -d "$ARCHIVE_DIR" ] || continue
  MANIFEST="$ARCHIVE_DIR/manifest.json"
  if [ ! -f "$MANIFEST" ] || ! jq empty "$MANIFEST" 2>/dev/null; then
    continue
  fi

  ARCHIVED_AT=$(jq -r '.archived_at // empty' "$MANIFEST")
  # Convert YYYYMMDD-HHMMSS to epoch
  ARCHIVE_EPOCH=$(date -j -f "%Y%m%d-%H%M%S" "$ARCHIVED_AT" "+%s" 2>/dev/null \
                  || date -d "${ARCHIVED_AT:0:8} ${ARCHIVED_AT:9:2}:${ARCHIVED_AT:11:2}:${ARCHIVED_AT:13:2}" "+%s" 2>/dev/null)

  if [ -n "$ARCHIVE_EPOCH" ] && [ "$ARCHIVE_EPOCH" -lt "$CUTOFF" ]; then
    # This archive is older than DAYS — prompt for confirmation
    FILES_COUNT=$(jq -r '.files | length' "$MANIFEST")
    SIZE=$(du -sh "$ARCHIVE_DIR" 2>/dev/null | cut -f1)
    REASON=$(jq -r '.reason // "—"' "$MANIFEST")

    echo "Delete archive from $ARCHIVED_AT ($REASON, $FILES_COUNT files, $SIZE)? [y/n]"
    read -r CONFIRM
    if [ "$CONFIRM" = "y" ]; then
      rm -rf "$ARCHIVE_DIR"
      DELETED_COUNT=$((DELETED_COUNT + 1))
    fi
  fi
done
```

**Step 2 — Report.**

Print count of archives deleted and space freed. Apply post-purge size warning if applicable (see Shared behavior above).

---

### `--id <id>` variant

Usage: `/kmgraph:migration purge --id <id>`

Where `<id>` is the timestamp string from the manifest (e.g., `20260411-143022`).

**Steps:**

**Step 1 — Locate the archive.**

```bash
ID="$1"

if [ -d "${KG_PATH}/.kg-archive-${ID}" ]; then
  ARCHIVE_DIR="${KG_PATH}/.kg-archive-${ID}"
  PURGE_SCOPE="project"
elif [ -d "$HOME/.kmgraph/.kg-archive-${ID}" ]; then
  ARCHIVE_DIR="$HOME/.kmgraph/.kg-archive-${ID}"
  PURGE_SCOPE="personal"
else
  abort "Archive not found: .kg-archive-${ID}. Run \`/kmgraph:migration purge --list\` to see available archives."
fi

MANIFEST="$ARCHIVE_DIR/manifest.json"
FILES_COUNT=$(jq -r '.files | length' "$MANIFEST" 2>/dev/null || echo "?")
SIZE=$(du -sh "$ARCHIVE_DIR" 2>/dev/null | cut -f1)
ARCHIVED_AT=$(jq -r '.archived_at // "unknown"' "$MANIFEST" 2>/dev/null)
```

**Step 2 — Confirm.**

Prompt the user:
> Delete archive `<id>` from `<date>` (`<N>` files, `<size>`)? [y/n]

**Step 3 — Delete if confirmed.**

```bash
read -r CONFIRM
if [ "$CONFIRM" = "y" ]; then
  rm -rf "$ARCHIVE_DIR"
  echo "Deleted archive $ID."
else
  echo "Cancelled — no changes made."
fi
```

Apply post-purge size warning if applicable (see Shared behavior above).

---

## Path Safety Requirements

- `KG_PATH` and `ARCHIVE_DIR` **must always be double-quoted** in all shell commands.
- Validate `KG_PATH` exists before any operation:
  ```bash
  [ -d "$KG_PATH" ] || abort "KG_PATH not found: $KG_PATH"
  ```
- All file paths containing spaces or Unicode characters must be safely quoted throughout.
