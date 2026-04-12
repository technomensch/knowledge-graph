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
| `{preserve_active}` | Boolean — if true, do not change the active KG after upgrade |

> **Caller note:** All `{PARAM}` placeholders in this module must be substituted by the caller before any bash block is executed. There is no runtime substitution — any unsubstituted `{PARAM}` will be passed literally to shell commands, producing silent errors (e.g., `grep` will look for a file literally named `{KG_PATH}/rules.md`).

---

**Before running any checks or making any changes**, inspect the KG's actual state and report only what is missing or upgradeable for this specific install:

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

# rules.md platform-split check (v0.3.5 — ADR-032)
# Content fingerprint only: Claude-specific tool names present in rules.md
# Detection note: pattern targets tool-directive lines only (lines with preference verbs
# + Claude tool names). Does not match mentions in other contexts, e.g. "Grep output requires
# review" or "never use Glob in filenames". False negatives are acceptable — under-detection
# is safer than over-detection for a migration that removes user content.
if [ -f "{KG_PATH}/rules.md" ]; then
  CONTAMINATION=$(grep -nE '(use|prefer|avoid|never use|always use|do not use|switch to|stop using).{0,80}(\bGlob\b|\bGrep\b|context-mode|\bsubagent\b|\.jsonl)|(\bGlob\b|\bGrep\b|context-mode|\bsubagent\b|\.jsonl).{0,80}(use|prefer|avoid|instead|only|never)' "{KG_PATH}/rules.md" 2>/dev/null)
  [ -n "$CONTAMINATION" ] && \
    upgrades+=("Update: rules.md — Claude-specific tool references detected; offer to relocate to CLAUDE.md § Platform Preferences (ADR-032)")
fi

# Path migration available
CONFIGURED_PATH=$(jq -r '.graphs["{kg_name}"].path' ~/.claude/kg-config.json)
echo "$CONFIGURED_PATH" | grep -qE '/docs/?$' && \
  [ -d "$CONFIGURED_PATH/lessons-learned" ] && \
  upgrades+=("Migration available: move KMGraph content from docs/ to knowledge/")

# Archive path convention (for Task A rollback command in v0.3.6):
# Archives created by knowledge-file-migrator are at: {KG_PATH}/.kg-archive-YYYYMMDD-HHMMSS/
# Each archive contains the backed-up files + manifest.json
# Use /kmgraph:migration list (v0.3.6) to enumerate restore points.

# docs/ knowledge content migration check (v0.3.5 — legacy layout cleanup)
# Applies when KG has been migrated to knowledge/ but docs/ subdirs still contain files
KG_PARENT=$(dirname "{KG_PATH}")
DOCS_FOUND=()
for subdir in decisions enhancements lessons-learned issues chat-history; do
  if [ -d "$KG_PARENT/docs/$subdir" ]; then
    file_count=$(find "$KG_PARENT/docs/$subdir" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
    [ "$file_count" -gt 0 ] && DOCS_FOUND+=("  docs/$subdir/  — $file_count files")
  fi
done
[ ${#DOCS_FOUND[@]} -gt 0 ] && \
  upgrades+=("Migration available: knowledge content found under docs/ (pre-migration layout) — move to knowledge/")

# Stale in-project FTS5 file check (post-~/.kmgraph/index/ migration)
REAL_DB="$HOME/.kmgraph/index/projects/{kg_name}.db"
if [ -f "$REAL_DB" ]; then
  STALE_FTS5=$(find "$KG_PARENT" \
    -not -path "$KG_PARENT/.git/*" \
    \( -name ".fts5.db" -o -name ".fts5.db-journal" \) \
    2>/dev/null)
  [ -n "$STALE_FTS5" ] && \
    upgrades+=("Cleanup available: stale .fts5.db files found in project tree — pre-migration artifacts safe to delete")
fi

# Wiki pass check
WIKI_DONE=$(jq -r '.graphs["{kg_name}"].wiki_pass_complete // false' ~/.claude/kg-config.json 2>/dev/null)
[ "$WIKI_DONE" != "true" ] && \
  upgrades+=("Wiki pass available: convert bare ADR-NNN, ENH-NNN, #NNN, and lesson filename references to [[wiki links]] across knowledge files")

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
    [ "$skip" = "true" ] && continue
    dest="{KG_PATH}/$tdir/$tname"
    [ ! -f "$dest" ] && upgrades+=("New template: $tdir/$tname") || true
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
  0. Preview all changes — see what would change before anything is written
  1. Apply all
  2. Let me choose which ones to apply
  3. Skip — my setup is already how I want it
```

#### Option 0: Preview all changes

If the user selects option 0 (or if the command was invoked with `--preview`):

For each item in `upgrades[]`, show a preview entry:

- **Directories (check a):** list each directory path that would be created, e.g.:
  ```
  [preview] Would create directory: {KG_PATH}/sessions/
  [preview] Would create directory: {KG_PATH}/chat-history/
  ```

- **Config fields (check b):** show the current JSON value (missing/null) and the default that would be written, e.g.:
  ```
  [preview] kg-config.json — graphs.{kg_name}.platforms: (missing) → []
  [preview] kg-config.json — graphs.{kg_name}.autoSwitch: (missing) → false
  ```

- **Templates (check c):** for each template that would be updated, show a line-by-line unified diff between the installed version and the plugin version. For templates that are new (not yet installed), show the full file content. Use plain text — no ANSI color codes required:
  ```
  [preview] Template update: knowledge/index.md
  --- installed
  +++ plugin
  - old line
  + new line

  [preview] New template: sessions/session-template.md
  (full file content follows)
  ```
  Compute the diff using a simple line-by-line comparison (no external `diff` dependency required).

- **Section d (platform-split):** for each flagged line from `rules.md`, show its line number, the line content, the target heading in `CLAUDE.md` it would be appended under, and the archive path that would be created:
  ```
  [preview] rules.md platform-split:
    Line 14: - File search: Glob and Grep — not Bash find/grep
    Line 15: - Content search: Grep tool — not rg or grep in Bash
    Target: CLAUDE.md § Platform Preferences
    Archive: {KG_PATH}/.kg-archive-YYYYMMDD-HHMMSS/ (would be created before any write)
  ```

After showing all preview entries, print the summary:
```
X changes would be applied. Nothing was written.
```

Then show the Apply/Choose/Skip menu again so the user can proceed with full information:
```
Apply all, pick individually, or skip?
  1. Apply all
  2. Let me choose which ones to apply
  3. Skip — my setup is already how I want it
```

**Implementation note:** The preview is a display-only pass over the same inspection data already collected — no new filesystem checks are needed. The `--preview` flag can be passed as an argument to `/kmgraph:init` to jump directly to the preview without showing the menu first: if the command is invoked with `--preview`, run the inspection, show the preview, and then show the Apply/Choose/Skip menu (without option 0, since preview has already run).

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

#### d. rules.md platform-split check (v0.3.5-beta — ADR-032)

**Purpose:** Detect and offer to relocate Claude Code-specific tool directives from `rules.md` to the platform's native config file (`CLAUDE.md § Platform Preferences` for project-local KGs; `~/.claude/CLAUDE.md § Platform Preferences` for personal KGs), preserving `rules.md` as platform-agnostic per ADR-032.

**Schema version gate (skip section d if already migrated):**

Before running the contamination grep, check the `kmgraph_schema` field in `{KG_PATH}/rules.md`:

```bash
SCHEMA_VERSION=$(awk '/^---$/{if(in_front){in_front=0;exit}else{in_front=1;next}} in_front && /^kmgraph_schema:/{gsub(/[^0-9]/,"",$2);print $2;exit}' "{KG_PATH}/rules.md" 2>/dev/null)
```

If `$SCHEMA_VERSION` is a valid integer and `$SCHEMA_VERSION -ge 2`:
- Skip section d entirely — print nothing, add no upgrade item.
- This prevents re-offering platform-split migration on every `/kmgraph:init` run after migration has already completed.

If `$SCHEMA_VERSION` is absent, empty, or non-numeric: treat as absent — proceed with the contamination grep below.

**Detection — content fingerprint only:**

```bash
# Detection note: pattern targets tool-directive lines only (lines with preference verbs
# + Claude tool names). Does not match mentions in other contexts, e.g. "Grep output requires
# review" or "never use Glob in filenames". False negatives are acceptable — under-detection
# is safer than over-detection for a migration that removes user content.
CONTAMINATION=$(grep -nE '(use|prefer|avoid|never use|always use|do not use|switch to|stop using).{0,80}(\bGlob\b|\bGrep\b|context-mode|\bsubagent\b|\.jsonl)|(\bGlob\b|\bGrep\b|context-mode|\bsubagent\b|\.jsonl).{0,80}(use|prefer|avoid|instead|only|never)' "{KG_PATH}/rules.md" 2>/dev/null)
```

If `CONTAMINATION` is empty, skip this check silently.

**If matches found:** display the flagged lines and offer. The user should review the shown lines before choosing — option (a) will move exactly what is listed:

```
Found Claude-specific tool references in rules.md:
  Line 14: - File search: Glob and Grep — not Bash find/grep
  Line 15: - Content search: Grep tool — not rg or grep in Bash
  ...

Review the lines above. These appear to be Claude Code-specific tool directives.
They belong in CLAUDE.md (## Platform Preferences section), not rules.md.

Options:
  a. Relocate automatically — move exactly the lines shown above to CLAUDE.md and remove from rules.md
  b. Show me the lines — I'll handle the edit manually
  s. Skip — leave both files unchanged
```

**If option (a) — auto-relocate (bulk):**

→ Execute shared module: Read `commands/init-shared/knowledge-file-migrator.md` and follow it exactly.
Parameters:
- `{KG_PATH}` = `{KG_PATH}`
- `{KG_TYPE}` = `{KG_TYPE}`
- `{PROJECT_ROOT}` = current project root directory
- `{CONTAMINATION}` = grep output from the detection step above

The shared module handles: archiving `rules.md`, appending flagged lines to the correct `CLAUDE.md`, removing them from `rules.md`, and adding a guidance comment.

**If option (b) — manual review:**

Display each flagged line with its line number. Print:
```
Here are the lines to move manually:
  [line content 1]
  [line content 2]
  ...

Target: CLAUDE.md § Platform Preferences
No changes made — move them manually when ready.
```

**If option (s) — skip:**

Leave both files unchanged.

**Safety rules:**
- Option (a) is a bulk operation — all flagged lines are relocated in one shot (archive is taken first).
- If `CLAUDE.md § Platform Preferences` already exists, append — never overwrite existing content.
- If user selects skip or manual, leave both files unchanged.

#### e. docs/ knowledge content migration (legacy layout cleanup)

**Purpose:** Detect knowledge artifacts left under `docs/` from pre-v0.3.0 layouts and offer to move them to `knowledge/` (current layout).

**Detection:**

```bash
KG_PARENT=$(dirname "{KG_PATH}")
DOCS_FOUND=()
for subdir in decisions enhancements lessons-learned issues chat-history; do
  if [ -d "$KG_PARENT/docs/$subdir" ]; then
    file_count=$(find "$KG_PARENT/docs/$subdir" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
    [ "$file_count" -gt 0 ] && DOCS_FOUND+=("  docs/$subdir/  — $file_count files")
  fi
done
```

If `DOCS_FOUND` is empty, skip this check silently.

**If content found,** display and offer:

```
Found knowledge content under docs/ (pre-migration layout):
  docs/decisions/  — N files
  docs/lessons-learned/ — M files
  ...

These belong in knowledge/ (current layout). Options:
  a. Migrate automatically — archive docs/ content, move to knowledge/, update cross-references
  b. Skip — I'll migrate manually
```

**If option (a) — auto-migrate:**

1. **Archive first** — before moving any file, create a timestamped archive:
   ```bash
   ARCHIVE_DIR="{KG_PATH}/.kg-archive-$(date +%Y%m%d-%H%M%S)"
   mkdir -p "$ARCHIVE_DIR"
   for subdir in decisions enhancements lessons-learned issues chat-history; do
     [ -d "$KG_PARENT/docs/$subdir" ] && cp -r "$KG_PARENT/docs/$subdir" "$ARCHIVE_DIR/"
   done
   echo "{\"archived_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"source\": \"docs/\", \"trigger\": \"upgrade-inspector-section-e\"}" > "$ARCHIVE_DIR/manifest.json"
   echo "✅ Archive created at $ARCHIVE_DIR"
   ```

2. **Move files** — for each populated subdir, move `.md` files:
   ```bash
   for subdir in decisions enhancements lessons-learned issues chat-history; do
     src="$KG_PARENT/docs/$subdir"
     dest="{KG_PATH}/$subdir"
     if [ -d "$src" ]; then
       mkdir -p "$dest"
       find "$src" -name "*.md" -type f -print0 | while IFS= read -r -d '' f; do
         rel="${f#$src/}"
         dest_file="$dest/$rel"
         dest_dir=$(dirname "$dest_file")
         mkdir -p "$dest_dir"
         mv "$f" "$dest_file"
         echo "Moved: docs/$subdir/$rel → knowledge/$subdir/$rel"
       done
     fi
   done
   ```

3. **Cross-reference rewrite** — update any remaining `docs/{subdir}/` references in the KG files to `knowledge/{subdir}/`:
   ```bash
   find "{KG_PATH}" -name "*.md" -type f -print0 | xargs -0 sed -i.bak \
     -e 's|docs/decisions/|knowledge/decisions/|g' \
     -e 's|docs/lessons-learned/|knowledge/lessons-learned/|g' \
     -e 's|docs/enhancements/|knowledge/enhancements/|g' \
     -e 's|docs/issues/|knowledge/issues/|g' \
     -e 's|docs/chat-history/|knowledge/chat-history/|g'
   find "{KG_PATH}" -name "*.md.bak" -delete
   echo "✅ Cross-references rewritten"
   ```

4. **Cleanup** — remove now-empty source dirs:
   ```bash
   for subdir in decisions enhancements lessons-learned issues chat-history; do
     src="$KG_PARENT/docs/$subdir"
     if [ -d "$src" ] && [ -z "$(find "$src" -name "*.md" -type f 2>/dev/null)" ]; then
       rmdir "$src" 2>/dev/null && echo "Removed empty dir: docs/$subdir/" || echo "Skipped (non-empty): docs/$subdir/"
     fi
   done
   echo "✅ Cleanup complete"
   ```
   Uses `rmdir` — fails safely if anything remains in the directory (hidden files, assets, subdirs).

5. **Report:**
   ```
   ✅ Migration complete.

   Files moved to knowledge/. Archive available at: {KG_PATH}/.kg-archive-YYYYMMDD-HHMMSS/
   Empty source dirs removed from docs/.
   To rollback: run `/kmgraph:migration rollback <id>` to restore. Use `/kmgraph:migration list` to see restore points.
   ```

**If option (b) — skip:**

Leave all files unchanged. Print:
```
Skipped docs/ migration — no changes made.
To migrate manually: move files from docs/{decisions,lessons-learned,...}/ to knowledge/ and update cross-references.
```

**Safety rules:**
- Archive is always taken before any file is moved (step 1 is mandatory).
- Never delete the source `docs/` directory — only move `.md` files. Non-markdown assets remain in place.
- Cleanup (step 4) uses `rmdir` — fails safely on any dir that still has content.
- Cross-reference rewrite uses `find -print0 | xargs -0` — safe on paths with spaces.
- Cross-reference rewrite only targets files inside `{KG_PATH}` — does not touch project source code or other directories.

#### f. Stale in-project FTS5 file cleanup

**Purpose:** Remove `.fts5.db` and `.fts5.db-journal` files left in the project tree after the search index migrated to `~/.kmgraph/index/`. These files waste disk space and can crash third-party tools (e.g. Obsidian) when indexing the vault.

**Execute:** Read `commands/init.md` and run **Step 1f.0b** (Stale in-project FTS5 file cleanup) exactly as written there. Pass `{kg_name}` and the project root (`dirname {KG_PATH}`) as `KG_ROOT`.

**Constraints:**
- Only runs if the detection check above found stale files
- Only deletes when real DB at `~/.kmgraph/index/projects/{kg_name}.db` is confirmed
- Always prompts — never auto-deletes
- Adds `**/.fts5.db` and `**/.fts5.db-journal` to `.gitignore` on cleanup (idempotent)

#### g. Wiki pass

**Purpose:** Convert bare `ADR-NNN`, `ENH-NNN`, `#NNN` (GitHub issues), and `Lessons_Learned_X` filename references to `[[wiki links]]` across all files in `lessons-learned/`, `decisions/`, `sessions/`, and `knowledge/concepts/`.

**Execute:** Read `commands/init.md` and run **Step 1f.2** (Obsidian wiki link pass) exactly as written there. Pass `{kg_name}` and `{KG_PATH}`.

**Constraints:**
- Only runs if `wiki_pass_complete` is not `true` in kg-config (the detection check above already verified this)
- Sets `wiki_pass_complete: true` in kg-config on successful completion
- Idempotent: re-running `/kmgraph:init` after completion skips this check silently
