---
description: Initialize a new knowledge graph with wizard-based setup and flexible configuration
---

## Execution Rules

All bash/shell checks in this command are **implementation guidance only** — run them silently as internal steps. Never show bash commands, shell code, or raw command output to the user. Present only plain-English results, prompts, and status messages.

# /kmgraph:init — Knowledge Graph Initialization Wizard

Initialize a new knowledge graph with interactive wizard that guides you through location selection, category setup, and git strategy configuration.

## What This Does

Creates a complete knowledge graph structure with:
- Directory scaffolding (knowledge/, lessons-learned/, decisions/, sessions/)
- Configuration entry in `~/.claude/kg-config.json`
- Category-specific subdirectories
- Git strategy setup (.gitignore rules)
- Sets new KG as "active" for subsequent operations

## When to Use

- First-time setup after installing the plugin
- **After a plugin update** — verify/upgrade existing KG to current version
- Creating a new project-local knowledge graph
- Setting up a topic-based personal knowledge graph
- Creating a Claude Cowork knowledge space

## Pre-Wizard: Existing KG Detection

Before starting the wizard, check if a knowledge graph already exists for this project in `~/.claude/kg-config.json`. If the current working directory matches an existing KG's path (or is a parent/child of one), present this menu instead of jumping straight to the wizard:

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

**→ Execute shared module:** Read `commands/init-shared/upgrade-inspector.md` and follow it exactly.
Parameters:
- `{KG_PATH}` = resolved path for this KG (from `~/.claude/kg-config.json` entry for the matched KG)
- `{kg_name}` = name key of the matched KG in kg-config.json
- `{KG_TYPE}` = type field from the KG config entry ("project-local" or "personal")
- `{categories}` = categories array from the KG config entry

#### 1d. Platform config check

Re-run platform detection (Step 1.11) and offer to configure any newly detected platforms that aren't already registered.

#### 1f.0. Legacy migration

When upgrading from v0.2.1 or earlier, the `.fts5.db` index may be stored in the project root. Before migrating, check whether the file is intentionally gitignored — if it is, it is active local state, not a legacy stray, and must not be moved or have its gitignore rule removed:

```bash
if [ -f "$KG_ROOT/.fts5.db" ]; then
  if git -C "$KG_ROOT" check-ignore -q ".fts5.db" 2>/dev/null; then
    # Intentionally gitignored — this is the active local index, not a legacy file.
    # Leave it in place. After any path migration it will be orphaned but harmless;
    # a fresh index will be rebuilt at the new location on next use.
    echo "ℹ️  Search index at $KG_ROOT/.fts5.db is gitignored (local state) — leaving in place."
  else
    # Not gitignored — this is a legacy stray file. Migrate to user cache.
    mkdir -p "$HOME/.claude/kg-fts5"
    mv "$KG_ROOT/.fts5.db" "$HOME/.claude/kg-fts5/$kg_name.db"
    echo "✅ Legacy search index migrated to user cache."
    # Remove the .fts5.db gitignore rule only if it was a legacy stray (not intentional)
    if [ -f "$KG_ROOT/.gitignore" ]; then
      grep -v "^\*\*/\.fts5\.db$" "$KG_ROOT/.gitignore" > "$KG_ROOT/.gitignore.tmp"
      mv "$KG_ROOT/.gitignore.tmp" "$KG_ROOT/.gitignore"
    fi
  fi
fi
```

Proceed to the FTS5 rebuild check (Step 1f) below.

#### 1f.0. FTS5 Index Location Migration Consent

Check whether the old `~/.claude/kg-fts5/` index exists and whether the user has already consented to migration:

```bash
KG_NAME="{kg_name}"
OLD_DB="$HOME/.claude/kg-fts5/${KG_NAME}.db"
FTS5_MIGRATED=$(jq -r ".graphs[\"${KG_NAME}\"].fts5_index_migrated // false" "$HOME/.claude/kg-config.json" 2>/dev/null)

if [ -f "$OLD_DB" ] && [ "$FTS5_MIGRATED" != "true" ]; then
  printf '\nKMGraph — Search Index Location Change\n\n'
  printf 'Your search index is moving from:\n'
  printf '  ~/.claude/kg-fts5/          (Claude Code only)\n'
  printf 'to:\n'
  printf '  ~/.kmgraph/index/           (works across all AI tools)\n\n'
  printf 'Your knowledge base is NOT affected — only the search cache moves.\n'
  printf 'Search falls back to linear scan until you rebuild (seconds).\n'
  printf 'The old directory is NOT deleted — remove it manually after confirming.\n\n'
  printf 'Proceed?  1. Yes   2. No (skip, linear scan continues to work)\n'
  read -r CONSENT
  if [ "$CONSENT" = "1" ]; then
    # Write consent marker — prevents prompt from reappearing on subsequent init runs
    jq ".graphs[\"${KG_NAME}\"].fts5_index_migrated = true" "$HOME/.claude/kg-config.json" > /tmp/kg-config-tmp.json \
      && mv /tmp/kg-config-tmp.json "$HOME/.claude/kg-config.json"
    printf '✓ Index location updated. Run kg_fts5_rebuild or /kmgraph:sync-all to rebuild.\n'
  else
    printf 'Skipped. Search continues via linear scan until you choose to migrate.\n'
  fi
fi
```

**Constraints:**
- Do NOT auto-rebuild on Yes — log only; user triggers rebuild explicitly
- Do NOT delete old DB — user removes `~/.claude/kg-fts5/` manually after confirming
- Idempotency: On Yes, write `fts5_index_migrated: true` to the active graph's entry in `~/.claude/kg-config.json` (done by the jq command above). On subsequent `/kmgraph:init` runs, the `FTS5_MIGRATED` check skips the prompt.
- On No: do NOT write the marker — prompt reappears on next init (correct behavior)

#### 1f.0b. Stale in-project FTS5 file cleanup

After the DB location migrated to `~/.kmgraph/index/`, old `.fts5.db` files can remain scattered throughout the project tree. These are dead weight — they waste disk space and can cause third-party tools (e.g. Obsidian) to crash when indexing the vault.

**When to run:** Always run this check during the upgrade path. It is idempotent — if no stale files exist, it exits silently.

```bash
KG_ROOT="{project_root}"  # root of the git repo containing the KG

# 1. Confirm real DB exists at the new location before deleting anything
REAL_DB="$HOME/.kmgraph/index/projects/${kg_name}.db"
if [ ! -f "$REAL_DB" ]; then
  echo "ℹ️  Skipping stale FTS5 cleanup — new-location DB not found at $REAL_DB."
  echo "   Run /kmgraph:sync-all to build it first, then re-run /kmgraph:init."
  # exit_step
fi

# 2. Find all stale .fts5.db and .fts5.db-journal files in the project tree
STALE_FILES=$(find "$KG_ROOT" \
  -not -path "$KG_ROOT/.git/*" \
  \( -name ".fts5.db" -o -name ".fts5.db-journal" \) \
  2>/dev/null)

if [ -z "$STALE_FILES" ]; then
  # Nothing to clean up
  exit_step
fi

# 3. Show what was found and offer to delete
echo ""
echo "Stale FTS5 index files found in project tree:"
echo "$STALE_FILES" | while read -r f; do
  SIZE=$(du -sh "$f" 2>/dev/null | cut -f1)
  echo "  $f  ($SIZE)"
done
echo ""
echo "These are pre-migration artifacts. The real search index lives at:"
echo "  $REAL_DB"
echo ""
echo "Safe to delete?  1. Yes — remove stale files   2. No — skip"
read -r CLEANUP_CONSENT

if [ "$CLEANUP_CONSENT" = "1" ]; then
  echo "$STALE_FILES" | while read -r f; do
    rm -f "$f" && echo "  ✓ Deleted $f"
  done

  # 4. Ensure **/.fts5.db is in .gitignore to prevent recurrence
  GITIGNORE="$KG_ROOT/.gitignore"
  if [ -f "$GITIGNORE" ] && ! grep -qF "**/.fts5.db" "$GITIGNORE"; then
    echo "" >> "$GITIGNORE"
    echo "# FTS5 search index (lives in ~/.kmgraph/index/, never in the project tree)" >> "$GITIGNORE"
    echo "**/.fts5.db" >> "$GITIGNORE"
    echo "**/.fts5.db-journal" >> "$GITIGNORE"
    echo "  ✓ Added **/.fts5.db and **/.fts5.db-journal to .gitignore"
  fi

  echo "✅ Stale FTS5 cleanup complete."
else
  echo "Skipped. Files left in place."
fi
```

**Constraints:**
- Do NOT delete unless real DB at `~/.kmgraph/index/projects/` is confirmed
- Always prompt — never auto-delete
- Add both `**/.fts5.db` and `**/.fts5.db-journal` to `.gitignore` (idempotent check)
- Skip `.git/` directory in the find scan

#### 1f.1. Project-local path migration (docs/ → knowledge/)

**E15 — Stale path pre-check:** Before evaluating migration triggers, verify the configured path exists on disk:

```bash
CONFIGURED_PATH=$(jq -r '.graphs["'"$kg_name"'"].path' ~/.claude/kg-config.json)

if [ ! -d "$CONFIGURED_PATH" ]; then
  echo "⚠️  Your configured KG path does not exist: $CONFIGURED_PATH"
  echo "   This may be due to a project rename or directory move."
  echo ""
  echo "   Options:"
  echo "     1. Update the path — re-run /kmgraph:init to reconfigure"
  echo "     2. Skip — leave config as-is"
  # Do not proceed with migration trigger evaluation if the path is missing.
fi
```

**E3 — Recovery flag check:** If `migration_in_progress: true` is set in the config entry, display recovery options before continuing:

```bash
MIGRATION_IN_PROGRESS=$(jq -r '.graphs["'"$kg_name"'"].migration_in_progress // false' ~/.claude/kg-config.json)
ROLLBACK_IN_PROGRESS=$(jq -r '.graphs["'"$kg_name"'"].rollback_in_progress // false' ~/.claude/kg-config.json)

if [ "$ROLLBACK_IN_PROGRESS" = "true" ]; then
  echo "⚠️  A previous rollback was interrupted."
  echo ""
  echo "   Options:"
  echo "     1. Resume rollback — continue restoring files to docs/"
  echo "     2. Skip — leave in current state (may be inconsistent)"
  # If user selects Resume rollback: continue the rollback steps below
  # If user selects Skip: exit without changes
fi

if [ "$MIGRATION_IN_PROGRESS" = "true" ]; then
  echo "⚠️  A previous migration was interrupted."
  echo ""
  echo "   Options:"
  echo "     1. Resume — complete the move from docs/ to knowledge/"
  echo "     2. Rollback — move files back to docs/ and restore config"
  echo "     3. Skip — leave in current state (may be inconsistent)"

  # If user selects Resume: continue with migration steps below (fall through)
  # If user selects Skip: exit without changes

  # If user selects Rollback:
  # Set rollback flag before starting; clears both flags on completion
  jq '.graphs["'"$kg_name"'"].rollback_in_progress = true' \
    ~/.claude/kg-config.json > ~/.claude/kg-config.json.tmp
  mv ~/.claude/kg-config.json.tmp ~/.claude/kg-config.json

  # rb-a. Reverse root scaffold file moves
  for f in me.md rules.md kg-index.md; do
    [ -f "knowledge/$f" ] && mv "knowledge/$f" "docs/$f"
  done

  # rb-b. Reverse subdir moves (skip symlinks)
  for subdir in lessons-learned decisions sessions chat-history tmp; do
    if [ -L "knowledge/$subdir" ]; then
      echo "⚠️  knowledge/$subdir is a symlink — skipping. Move manually if needed."
      continue
    fi
    [ -d "knowledge/$subdir" ] && mv "knowledge/$subdir" "docs/$subdir"
  done

  # rb-b2. Reverse knowledge/concepts/ if it was moved from docs/knowledge/
  if [ -d "knowledge/concepts" ] && [ ! -d "docs/knowledge" ]; then
    mv "knowledge/concepts" "docs/knowledge"
  fi

  # rb-c. Restore kg-config.json path
  PROJECT_ROOT=$(pwd)
  jq ".graphs[\"$kg_name\"].path = \"$PROJECT_ROOT/docs\"" \
    ~/.claude/kg-config.json > ~/.claude/kg-config.json.tmp
  mv ~/.claude/kg-config.json.tmp ~/.claude/kg-config.json

  # rb-d. Reverse .gitignore rules
  if [ -f .gitignore ]; then
    _sed_inplace \
      -e 's|knowledge/sessions/|docs/sessions/|g' \
      -e 's|knowledge/chat-history/|docs/chat-history/|g' \
      -e 's|knowledge/lessons-learned/\(.*\)/|docs/lessons-learned/\1/|g' \
      -e 's|knowledge/tmp/|docs/tmp/|g' \
      -e 's|knowledge/me\.md|docs/me.md|g' \
      .gitignore
    grep -qx 'knowledge/' .gitignore && \
      _sed_inplace -e 's|^knowledge/$|docs/|' .gitignore || true
  fi

  # rb-e. Reverse cross-reference rewrites in docs/ files and platform configs
  find docs/ -name "*.md" -type f 2>/dev/null | while read f; do
    _sed_inplace \
      -e 's|knowledge/lessons-learned/|docs/lessons-learned/|g' \
      -e 's|knowledge/decisions/|docs/decisions/|g' \
      -e 's|knowledge/sessions/|docs/sessions/|g' \
      -e 's|knowledge/chat-history/|docs/chat-history/|g' \
      -e 's|knowledge/concepts/|docs/knowledge/|g' \
      "$f"
  done
  for f in CLAUDE.md README.md GEMINI.md .cursorrules .windsurfrules .github/copilot-instructions.md .aider.conf.yml; do
    [ -f "$f" ] && _sed_inplace \
      -e 's|knowledge/lessons-learned/|docs/lessons-learned/|g' \
      -e 's|knowledge/decisions/|docs/decisions/|g' \
      -e 's|knowledge/sessions/|docs/sessions/|g' \
      -e 's|knowledge/chat-history/|docs/chat-history/|g' \
      -e 's|knowledge/concepts/|docs/knowledge/|g' \
      "$f" || true
  done

  # rb-f. Clear both flags
  jq 'del(.graphs["'"$kg_name"'"].migration_in_progress) | del(.graphs["'"$kg_name"'"].rollback_in_progress)' \
    ~/.claude/kg-config.json > ~/.claude/kg-config.json.tmp
  mv ~/.claude/kg-config.json.tmp ~/.claude/kg-config.json

  echo "✅ Rollback complete. KG restored to docs/. Run /kmgraph:status to verify."
  # Exit — do not proceed with forward migration
fi
```

**Trigger conditions** (all must be true):
- KG type is `project-local`
- Configured path ends in `/docs` or `/docs/`
- `docs/lessons-learned/` exists at that path (confirms KMGraph content, not just any docs folder)

Note: Migration applies to project-local KGs only. Personal KGs (`~/.kmgraph/`) use a fixed path and never have a `docs/` layout — they are intentionally excluded by the type check above.

```bash
KG_TYPE=$(jq -r '.graphs["'"$kg_name"'"].type' ~/.claude/kg-config.json)
KG_PATH_ENDS_DOCS=$(echo "$CONFIGURED_PATH" | grep -E '/docs/?$')

if [ "$KG_TYPE" = "project-local" ] && [ -n "$KG_PATH_ENDS_DOCS" ] && [ -d "$CONFIGURED_PATH/lessons-learned" ]; then
  echo "Your knowledge graph is stored in docs/ — the new recommended location is knowledge/."
  echo ""
  echo "Move it now? This is reversible — if anything goes wrong, run /kmgraph:init again to roll back."
  echo "  1. Yes — move KMGraph subdirs to knowledge/, update config and all cross-references"
  echo "  2. No — keep in docs/ (no changes)"
fi
```

**Migration logic (if user selects Yes):**

```bash
# Portable in-place sed (macOS uses -i '', GNU/Linux uses -i)
_sed_inplace() {
  if sed --version 2>/dev/null | grep -q GNU; then
    sed -i "$@"
  else
    sed -i '' "$@"
  fi
}

# a. Create new location
mkdir -p knowledge/

# b. Set atomic migration flag before moving files
jq '.graphs["'"$kg_name"'"].migration_in_progress = true' \
  ~/.claude/kg-config.json > ~/.claude/kg-config.json.tmp
mv ~/.claude/kg-config.json.tmp ~/.claude/kg-config.json

# c. Archive KMGraph content from docs/ before moving (preserve for validation and recovery)
ARCHIVE_DATE=$(date +%Y-%m-%d)
ARCHIVE_DIR=".kg-archive-${ARCHIVE_DATE}"
mkdir -p "$ARCHIVE_DIR"

for subdir in lessons-learned decisions sessions chat-history tmp; do
  [ -d "docs/$subdir" ] && [ ! -L "docs/$subdir" ] && cp -r "docs/$subdir" "$ARCHIVE_DIR/$subdir"
done
if [ -d "docs/knowledge" ]; then
  cp -r "docs/knowledge" "$ARCHIVE_DIR/knowledge"
fi
for f in me.md rules.md kg-index.md; do
  [ -f "docs/$f" ] && cp "docs/$f" "$ARCHIVE_DIR/$f"
done

# Add archive dir to .gitignore so it is never committed
grep -qxF ".kg-archive-*/" .gitignore 2>/dev/null || echo ".kg-archive-*/" >> .gitignore

# d. Move ONLY known KMGraph subdirs (never the entire docs/)
# IMPORTANT: Do NOT add 'knowledge' to this list — docs/knowledge/ is handled
# by the special case below (renamed to knowledge/concepts/ to avoid nesting).
for subdir in lessons-learned decisions sessions chat-history tmp; do
  if [ -L "docs/$subdir" ]; then
    echo "⚠️  docs/$subdir is a symlink — skipping automatic move. Move manually if needed."
    continue
  fi
  [ -d "docs/$subdir" ] && mv "docs/$subdir" "knowledge/$subdir"
done

# Special case: docs/knowledge/ → knowledge/concepts/ (NOT knowledge/knowledge/)
# This MUST run after the loop above. The loop explicitly excludes 'knowledge'
# so this block is the only place docs/knowledge/ is handled.
# Result: knowledge/concepts/ (quick-reference entries), never knowledge/knowledge/.
if [ -d "docs/knowledge" ]; then
  if [ -d "knowledge/concepts" ]; then
    echo "⚠️  docs/knowledge/ detected but knowledge/concepts/ already exists — merging."
    rsync -a --ignore-existing "docs/knowledge/" "knowledge/concepts/" && rm -rf "docs/knowledge"
  else
    echo "⚠️  docs/knowledge/ detected. Moving to knowledge/concepts/ to avoid nesting."
    echo "   If you prefer a different name, rename knowledge/concepts/ manually."
    mv "docs/knowledge" "knowledge/concepts"
  fi
fi

# Move root-level scaffold files if present
for f in me.md rules.md kg-index.md; do
  [ -f "docs/$f" ] && mv "docs/$f" "knowledge/$f"
done

# e-pre. Validate file counts match archive before proceeding
VALIDATION_FAILED=0
for subdir in lessons-learned decisions sessions chat-history tmp; do
  if [ -d "$ARCHIVE_DIR/$subdir" ]; then
    ARCHIVE_COUNT=$(find "$ARCHIVE_DIR/$subdir" -type f | wc -l | tr -d ' ')
    DEST_COUNT=$(find "knowledge/$subdir" -type f 2>/dev/null | wc -l | tr -d ' ')
    if [ "$ARCHIVE_COUNT" -ne "$DEST_COUNT" ]; then
      echo "⚠️  File count mismatch in $subdir: archive has $ARCHIVE_COUNT, knowledge/ has $DEST_COUNT"
      VALIDATION_FAILED=1
    fi
  fi
done

if [ "$VALIDATION_FAILED" -eq 1 ]; then
  echo ""
  echo "❌ Migration validation failed — file counts do not match."
  echo "   Your original content is preserved at: $ARCHIVE_DIR/"
  echo "   Triggering rollback..."
  # Trigger rollback (see rollback block below)
  ROLLBACK_REASON="validation_failed"
fi

# d. Update kg-config.json path
PROJECT_ROOT=$(pwd)
OLD_PATH="$PROJECT_ROOT/docs"
jq ".graphs[\"$kg_name\"].path = \"$PROJECT_ROOT/knowledge\"" \
  ~/.claude/kg-config.json > ~/.claude/kg-config.json.tmp
mv ~/.claude/kg-config.json.tmp ~/.claude/kg-config.json

# d2. Update sibling KG entries pointing to the same old path (exact match only)
jq -r '.graphs | to_entries[] | select(.value.path == "'"$OLD_PATH"'") | .key' \
  ~/.claude/kg-config.json | while read sibling; do
  [ "$sibling" = "$kg_name" ] && continue
  jq ".graphs[\"$sibling\"].path = \"$PROJECT_ROOT/knowledge\"" \
    ~/.claude/kg-config.json > ~/.claude/kg-config.json.tmp
  mv ~/.claude/kg-config.json.tmp ~/.claude/kg-config.json
  echo "Updated sibling KG config path: $sibling → $PROJECT_ROOT/knowledge"
done

# e. Update .gitignore rules
if [ -f .gitignore ]; then
  _sed_inplace \
    -e 's|docs/sessions/|knowledge/sessions/|g' \
    -e 's|docs/chat-history/|knowledge/chat-history/|g' \
    -e 's|docs/lessons-learned/\(.*\)/|knowledge/lessons-learned/\1/|g' \
    -e 's|docs/tmp/|knowledge/tmp/|g' \
    -e 's|docs/me\.md|knowledge/me.md|g' \
    .gitignore
  # Rewrite blanket docs/ KMGraph rule only if KMGraph confirmed to own docs/
  # (trigger condition verified docs/lessons-learned/ exists above — safe to rewrite)
  grep -qx 'docs/' .gitignore && \
    _sed_inplace -e 's|^docs/$|knowledge/|' .gitignore || true
fi

# e2. Rewrite docs/ path references inside migrated markdown files
find knowledge/ -name "*.md" -type f | while read f; do
  _sed_inplace \
    -e 's|docs/lessons-learned/|knowledge/lessons-learned/|g' \
    -e 's|docs/decisions/|knowledge/decisions/|g' \
    -e 's|docs/sessions/|knowledge/sessions/|g' \
    -e 's|docs/chat-history/|knowledge/chat-history/|g' \
    -e 's|docs/knowledge/|knowledge/concepts/|g' \
    "$f"
done

# Also update platform config files if present
for f in CLAUDE.md README.md GEMINI.md .cursorrules .windsurfrules .github/copilot-instructions.md .aider.conf.yml; do
  [ -f "$f" ] && _sed_inplace \
    -e 's|docs/lessons-learned/|knowledge/lessons-learned/|g' \
    -e 's|docs/decisions/|knowledge/decisions/|g' \
    -e 's|docs/sessions/|knowledge/sessions/|g' \
    -e 's|docs/chat-history/|knowledge/chat-history/|g' \
    -e 's|docs/knowledge/|knowledge/concepts/|g' \
    "$f" || true
done

# Scan project MEMORY.md for stale docs/ references and surface them
PROJECT_DIR_NAME=$(basename "$(pwd)")
MEMORY_FILE=$(find "$HOME/.claude/projects/" -path "*${PROJECT_DIR_NAME}*/memory/MEMORY.md" 2>/dev/null | head -1)
if [ -n "$MEMORY_FILE" ]; then
  STALE=$(grep -n "docs/" "$MEMORY_FILE" | grep -E "docs/(lessons-learned|decisions|sessions|knowledge)" || true)
  if [ -n "$STALE" ]; then
    echo "⚠️  Stale docs/ references found in your MEMORY.md ($MEMORY_FILE):"
    echo "$STALE"
    echo "   Update manually or re-run /kmgraph:init after editing."
  fi
fi

# i. Legacy feedback-entry backfill offer (upgrade only)
# Run only when upgrading an existing KG that has rules.md scaffold or content.
# Scans project MEMORY.md for feedback-type entries previously stored there (legacy)
# that have not yet been migrated to rules.md.

if [ -n "$MEMORY_FILE" ] && [ -f "knowledge/rules.md" ]; then
  # Identify feedback entries: lines containing "[→ rules.md]" marker or entries
  # whose content is not already present in rules.md (keyword overlap check).
  # Display each candidate and offer to migrate:
  #
  #   Found N legacy feedback rule(s) in MEMORY.md not yet migrated to knowledge/rules.md:
  #
  #   1. "Never delete branches without explicit user approval" [→ rules.md]
  #   2. "Always open the plan file in the editor after writing it" [→ rules.md]
  #
  #   Migrate these to knowledge/rules.md? [y/a/s]
  #     y = yes, this one   a = yes, all   s = skip all
  #
  # For each entry confirmed:
  #   - Draft in house style (Always/Never bullet with Why: line from memory entry body)
  #   - Show draft and ask: Approve / Edit / Skip
  #   - On approve: append to the correct section in knowledge/rules.md
  # Do NOT remove the MEMORY.md entry — leave it as a pointer with [→ rules.md] already appended.
  # Do NOT auto-write without per-entry confirmation.
  echo ""
  echo "  Checking MEMORY.md for legacy behavioral rules not yet migrated to rules.md..."
  # [Implementation: parse $MEMORY_FILE for lines containing '[→ rules.md]' or
  #  lines under a 'feedback' section; cross-check against knowledge/rules.md content;
  #  surface any that appear absent; offer migration per entry]
fi

# Safety rules for block (i):
# - Never auto-write any entry without per-entry user confirmation.
# - If knowledge/rules.md already contains a semantically matching entry, skip silently.
# - If MEMORY.md does not exist or path cannot be found, skip block silently.
# - Draft format must match existing knowledge/rules.md house style:
#   "- [Always/Never] [directive]" with optional "  - Why:" and "  - Source:" sub-bullets.
# Note: feedback-type MEMORY.md entries are a legacy migration path — MEMORY.md is no longer
# the active governance store. New behavioral rules go directly to rules.md via rules-capture.
# Step 1.6.5 covers only user-type entries (role, preferences → personal me.md).

# f. Clear migration flag
jq 'del(.graphs["'"$kg_name"'"].migration_in_progress)' \
  ~/.claude/kg-config.json > ~/.claude/kg-config.json.tmp
mv ~/.claude/kg-config.json.tmp ~/.claude/kg-config.json

echo "✅ Graph moved to knowledge/. Config updated."
echo ""
echo "📦 Archive preserved at: $ARCHIVE_DIR/"
echo "   Your original docs/ content is intact there. Once you've verified everything"
echo "   migrated correctly, delete it with: rm -rf $ARCHIVE_DIR"
echo ""

# g. Post-migration backfill
# The search index always needs a rebuild after migration — file paths changed.
echo "Rebuilding search index for new location..."
# Call kg_fts5_rebuild with the new KG path (knowledge/)
# If indexed > 0: confirm. If indexed == 0: warn about path misconfiguration.

echo ""
LESSON_COUNT=$(find "knowledge/lessons-learned" -name "*.md" ! -name "*template*" 2>/dev/null | wc -l | tr -d ' ')
KG_ENTRY_COUNT=$(find "knowledge/knowledge" -name "*.md" ! -name "*template*" 2>/dev/null | wc -l | tr -d ' ')

if [ "$LESSON_COUNT" -gt 0 ] && [ "$KG_ENTRY_COUNT" -eq 0 ]; then
  echo "⚠️  $LESSON_COUNT lessons migrated but no KG entries exist yet."
  echo ""
  echo "  Run /kmgraph:update-graph to extract patterns from your lessons?"
  echo "  This populates knowledge/ with structured entries for fast recall."
  echo ""
  echo "    1. Yes — run update-graph now"
  echo "    2. Skip — I'll run it later"
  # If Yes: invoke /kmgraph:update-graph --auto --sync-all
fi

# h. Content migration offer — populate me.md and rules.md from existing CLAUDE.md
# me.md and rules.md were scaffolded empty. If a CLAUDE.md exists, offer to populate them.
ME_MD="knowledge/me.md"
RULES_MD="knowledge/rules.md"
PROJECT_CLAUDE_MD="$(pwd)/CLAUDE.md"

if [ -f "$PROJECT_CLAUDE_MD" ] && { [ -f "$ME_MD" ] || [ -f "$RULES_MD" ]; }; then
  echo ""
  echo "  me.md and rules.md have been created in knowledge/."
  echo "  Would you like help populating them from your existing CLAUDE.md?"
  echo ""
  echo "    1. Yes — show me what would move where (review before writing)"
  echo "    2. No — I'll fill them in manually"
fi
# If Yes:
#   Follow Step 1.6.5 exactly:
#   1. Parse project CLAUDE.md; display proposed section → file mapping before writing
#   2. User confirms each section
#   3. Before rewriting CLAUDE.md, copy original to CLAUDE.md.bak
#   4. Rewrite CLAUDE.md to pointer: "For full context, read knowledge/rules.md and knowledge/me.md before acting."
#   5. If user aborts, restore from CLAUDE.md.bak and delete it

# h.2. Evidence seeding — scan for Why/Source candidates after rules.md is populated
# Only runs if rules.md was just written (either from CLAUDE.md or scaffolded)
if [ -f "knowledge/rules.md" ]; then
  echo ""
  echo "  Scanning your existing lessons and decisions for evidence candidates..."
  echo "  I'll suggest Why: and Source: annotations for rules where evidence exists."
  echo "  You can accept each suggestion individually or skip all."
  echo ""
  
  # For each major section in the written rules.md, search lessons-learned/ and decisions/
  # for files whose title/content matches the rule topic.
  # Present matches as: "Section '[name]' — found potential source: [filename]"
  # Ask: "Add Why: + Source: to this section? [y/n]"
  # If yes: append the Why: and Source: lines to the section in rules.md
  #
  # Search strategy:
  # - grep -r for keywords from the rule section heading in lessons-learned/ and decisions/
  # - Surface up to 1-2 candidates per section (best match by filename keyword overlap)
  # - Skip sections that already have Why:/Source: lines
  # - Skip if lessons-learned/ and decisions/ are both empty
  
  LESSON_COUNT=$(find "knowledge/lessons-learned" -name "*.md" ! -name "*template*" 2>/dev/null | wc -l | tr -d ' ')
  ADR_COUNT=$(find "knowledge/decisions" -name "ADR-*.md" 2>/dev/null | wc -l | tr -d ' ')
  
  if [ "$LESSON_COUNT" -eq 0 ] && [ "$ADR_COUNT" -eq 0 ]; then
    echo "  (No lessons or decisions yet — evidence seeding skipped. Run this again after capturing lessons.)"
  else
    echo "  Found $LESSON_COUNT lessons and $ADR_COUNT decisions to scan."
    echo ""
    echo "  For each rule section where a match is found, you'll be asked to confirm"
    echo "  the Why: and Source: annotation before it's written."
    echo ""
    echo "    1. Scan and show me suggestions"
    echo "    2. Skip — I'll add evidence links manually"
    # If 1: execute the per-section scan and offer annotation per match
    # If 2: continue to step i
  fi
fi

# i. Personal KG prompt — offer to run /kmgraph:init at user level if not already set up
PERSONAL_KG_EXISTS=$(jq -r '.graphs | to_entries[] | select(.value.type == "personal") | .key' ~/.claude/kg-config.json 2>/dev/null)
if [ -z "$PERSONAL_KG_EXISTS" ]; then
  echo ""
  echo "  Your project KG is now at knowledge/ — want to set up a personal KG too?"
  echo "  A personal KG at ~/.kmgraph/ captures cross-project lessons"
  echo "  and conventions that apply everywhere, not just this project."
  echo ""
  echo "    1. Yes — run /kmgraph:init-personal-kg now"
  echo "    2. Skip — I'll set it up later with /kmgraph:init-personal-kg"
  # If Yes: invoke /kmgraph:init-personal-kg
  # After personal KG is set up, run the content migration offer for the personal level:
  #   Source: ~/.claude/CLAUDE.md
  #   Targets: ~/.kmgraph/me.md, ~/.kmgraph/rules.md
  #   Also offer to migrate user-type entries from ~/.claude/projects/.../memory/MEMORY.md → personal me.md
  #   (See Step 1.6.5 Personal KG case for full details)
  # After personal KG me.md/rules.md are created: run the same evidence seeding offer
  # using personal KG path for both the target files and the source scan directories
  # (~/.kmgraph/lessons-learned/ and ~/.kmgraph/decisions/)
fi
```

**Safety constraint:** Only named KMGraph subdirectories (`lessons-learned/`, `decisions/`, `sessions/`, `chat-history/`, `tmp/`) and root scaffold files (`me.md`, `rules.md`, `kg-index.md`) are moved. Never touch other `docs/` contents. Symlinked subdirs are skipped with a warning.

#### 1f.2. Obsidian wiki link pass

**Trigger:** Run this step if `wiki_pass_complete` is not `true` in the KG config entry.
Re-running `/kmgraph:init` is the supported way to trigger the wiki pass at any time —
no separate command needed.

```bash
WIKI_DONE=$(jq -r --arg kg "$kg_name" '.graphs[$kg].wiki_pass_complete // false' \
  ~/.claude/kg-config.json 2>/dev/null)
if [ "$WIKI_DONE" = "true" ]; then
  echo "ℹ️  Wiki pass already complete — skipping. Re-run /kmgraph:init to force recheck."
  # exit_step
fi
```

If `WIKI_DONE` is `true`, skip this step entirely.

**Pre-pass: Build ADR number → filename map**

Before any substitution, scan `{KG_PATH}/decisions/` and build a lookup table:

```bash
# Build map: ADR number → full basename (without extension)
declare -A ADR_MAP
declare -A ADR_COLLISION

for f in "$KG_PATH/decisions"/ADR-*.md; do
  [ -e "$f" ] || continue
  basename_noext=$(basename "$f" .md)
  num=$(echo "$basename_noext" | grep -oE '^ADR-[0-9]+')
  if [ -n "${ADR_MAP[$num]:-}" ]; then
    # Collision — two files share the same number
    ADR_COLLISION[$num]=1
    echo "⚠️  ADR number collision: $num maps to both ${ADR_MAP[$num]} and $basename_noext — skipping substitution for $num"
  else
    ADR_MAP[$num]="$basename_noext"
  fi
done
```

Any number in `ADR_COLLISION` is skipped during substitution. Print a warning for each collision so the user can resolve them manually.

**GitHub repo URL:** Read from `git remote get-url origin`, strip `.git`, append `/issues/`. If no remote is configured, skip `#NNN` substitution entirely and log: `ℹ️  No git remote detected — skipping GitHub issue link substitution.`

**Scope:** Process only `.md` files under these four subdirectories:
- `{KG_PATH}/lessons-learned/`
- `{KG_PATH}/decisions/`
- `{KG_PATH}/sessions/`
- `{KG_PATH}/concepts/`

Never touch `chat-history/` or files outside these four directories.

**For each `.md` file in scope:**

Skip the file if:
- It is a symlink (skip with warning: `⚠️  Skipping symlink: {path}`)
- Its filename matches `*template*`

Processing:
1. Parse the file and mark NO-SUBSTITUTE zones: YAML frontmatter (opening `---` to closing `---` at file top), triple-backtick code blocks, 4-space indented code blocks, inline backtick spans, existing wiki links (`[[...]]`), existing markdown links (`[...](...)`  or `[...][...]`), and heading lines (lines starting with one or more `#` characters).

2. In body text only (outside all NO-SUBSTITUTE zones), apply substitutions in this order:
   - **a. ENH references:** Replace bare `ENH-NNN` → `[[ENH-NNN]]`
   - **b. ADR references:** Replace bare `ADR-NNN` (where `ADR-NNN` is not in `ADR_COLLISION`) → `[[{ADR_MAP[ADR-NNN]}]]` (full filename from pre-pass map). Skip with warning if collision or if number not in map.
   - **c. GitHub issues:** Replace bare `#NNN` (not in a heading, not in inline code) → `[#NNN]({GITHUB_ISSUES_URL}/NNN)`. Skip entirely if no git remote.
   - **d. Lesson filenames:** Replace bare `Lessons_Learned_X` or `Lessons_Learned_X.md` → `[[Lessons_Learned_X]]` (build match list from `Lessons_Learned_*` filenames in `lessons-learned/` at scan time).

3. Write back ONLY if content changed:
   ```bash
   # Atomic write — prevents truncation on crash
   printf '%s' "$new_content" > "${file}.tmp"
   mv "${file}.tmp" "${file}"
   ```

**On completion:**

```
✅ Wiki links applied to N files. (M files unchanged)
```

Write `wiki_pass_complete: true` to the KG config entry:

```bash
jq '.graphs["'"$kg_name"'"].wiki_pass_complete = true' \
  ~/.claude/kg-config.json > ~/.claude/kg-config.json.tmp
mv ~/.claude/kg-config.json.tmp ~/.claude/kg-config.json
```

**`--dry-run` mode (optional):** If `--dry-run` was passed to `/kmgraph:init`, print what would change per file without writing anything and do not set the `wiki_pass_complete` flag.

#### 1f. FTS5 index check

The search index (`.fts5.db`) is local-only and gitignored — it does not survive upgrades or fresh clones.

**Before offering a rebuild, verify the KG path is correct:**

The `kg_fts5_rebuild` tool indexes `lessons-learned/`, `decisions/`, `sessions/`, and `knowledge/` at the KG root. If those directories do not exist at the configured root but do exist at `{kgPath}/docs/`, the configured path is wrong — the rebuild will return 0 files and search will be broken.

```bash
KG_ROOT=$(jq -r '.graphs["'"$kg_name"'"].path' ~/.claude/kg-config.json)

# Check for content directories at root
DIRS_AT_ROOT=0
for dir in lessons-learned decisions sessions knowledge; do
  [ -d "$KG_ROOT/$dir" ] && DIRS_AT_ROOT=$((DIRS_AT_ROOT + 1))
done

# Check if content is under docs/ instead
DIRS_AT_DOCS=0
for dir in lessons-learned decisions sessions knowledge; do
  [ -d "$KG_ROOT/docs/$dir" ] && DIRS_AT_DOCS=$((DIRS_AT_DOCS + 1))
done

if [ "$DIRS_AT_ROOT" -eq 0 ] && [ "$DIRS_AT_DOCS" -gt 0 ]; then
  echo "⚠️  KG path misconfiguration detected."
  echo ""
  echo "  Configured path: $KG_ROOT"
  echo "  Content found at: $KG_ROOT/docs/"
  echo ""
  echo "  The search index and recall commands will return 0 results with the"
  echo "  current path. The KG root should point to the directory that contains"
  echo "  lessons-learned/, decisions/, and sessions/ directly."
  echo ""
  echo "  Fix the KG path?"
  echo "    1. Yes — update config to $KG_ROOT/docs/"
  echo "    2. No — leave as-is (index rebuild skipped)"
  # If user selects Yes: update kg-config.json path for this KG to $KG_ROOT/docs/
  # then continue with the corrected path
fi
```

**→ Execute shared module:** Read `commands/init-shared/fts5-rebuild.md` and follow it exactly.
Parameters:
- `{KG_PATH}` = resolved KG path (confirmed correct from the check above)
- `{kg_name}` = name key of this KG in kg-config.json

#### 1g. Knowledge extraction check

The `knowledge/` directory holds structured patterns, concepts, and gotchas extracted from lessons. It is populated by `/kmgraph:update-graph` and is never populated automatically. Check whether extraction has been run:

```bash
LESSON_COUNT=$(find "$KG_ROOT/lessons-learned" -name "*.md" ! -name "*template*" 2>/dev/null | wc -l | tr -d ' ')
KG_COUNT=$(find "$KG_ROOT/knowledge" -name "*.md" ! -name "*template*" 2>/dev/null | wc -l | tr -d ' ')

if [ "$LESSON_COUNT" -gt 0 ] && [ "$KG_COUNT" -eq 0 ]; then
  echo "⚠️  knowledge/ is empty — $LESSON_COUNT lessons exist but patterns have never been extracted."
  echo ""
  echo "  Run /kmgraph:update-graph now to populate structured KG entries?"
  echo "    1. Yes — extract patterns from existing lessons"
  echo "    2. Skip for now"
fi
```

If the user selects **Yes**, run `/kmgraph:update-graph --auto --sync-all`. The `--auto` flag skips per-lesson prompts (consent was given by answering Yes here) and `--sync-all` processes all lessons with missing entries in one pass. If the user selects **Skip**, continue — `update-graph` can be run at any time.

#### 1h. Output verification summary

```
✅ Knowledge graph "[name]" verified!

  Directories:  all present (X created)
  Config:       up to date (Y fields added)
  Templates:    X updated, Y skipped
  Platforms:    [list] configured
  Index:        rebuilt / skipped / not applicable

  Plugin version: [version from plugin.json]
  KG version:     [version from kg-config.json, if tracked]

No action needed — your KG is ready to use.
```

#### 1i. Post-upgrade archive size check

After the upgrade inspection completes (section 1h), silently calculate the total disk usage of all migration archive directories across both scopes:

```bash
TOTAL_KB=$(du -sk "${KG_PATH}/.kg-archive-"*/ "$HOME/.kmgraph/.kg-archive-"*/ 2>/dev/null \
           | awk '{sum += $1} END {print sum+0}')
TOTAL_MB=$((TOTAL_KB / 1024))
```

- If total > 10 MB: print the following (substituting the actual MB value):
  > Note: Migration archives are taking up `X` MB. Run `/kmgraph:migration purge --older-than 30` to clean up.
- If total ≤ 10 MB or no archive directories exist: silent (no output).

---

### Options 2–4

- **Option 2 (Create new):** Proceed to the full wizard (Step 1 below) with a different name.
- **Option 3 (Re-initialize):** Run the full wizard but pre-populate answers from the existing config. Warn that this will reset categories and git strategy. Do NOT delete existing lessons or decisions.
- **Option 4 (Cancel):** Exit with no changes.

---

## Wizard Steps (New KG)

### Step 1: KG Location

```
Where should this knowledge graph be stored?

1. Project-local (./knowledge/)
2. Global topic-based (~/.claude/knowledge-graphs/[name]/)
3. Claude Cowork (~/.claude/cowork-knowledge/[topic]/)
4. Custom path
```

**Recommendation**: Project-local for single-project use, personal for topic-based knowledge sharing across projects.

### Step 2: KG Name

```
What should this knowledge graph be called?

Examples: "my-project", "ai-research", "devops-patterns", "security-learnings"
```

**Validation**: Name must be unique (not already in config), alphanumeric + hyphens only.

### Step 3: Categories

```
Which categories do you want to include?

Default categories:
☐ architecture — System design patterns and architectural decisions
☐ process — Development workflows and team processes
☐ patterns — Reusable code and design patterns
☐ debugging — Troubleshooting and debugging techniques
☐ governance — Project governance and constraints

Custom categories:
☐ Add custom category (you'll be prompted for name + prefix)
```

**Recommendation**: Start with architecture + process + patterns. Add others as needed.

### Step 4: Git Strategy

```
How should this knowledge graph interact with git?

1. All committed (public knowledge sharing)
2. All gitignored (private notes only)
3. Selective (choose which categories to commit)
```

**If selective strategy chosen**:
```
For each category, choose:
- [architecture]: ☐ Commit  ☐ Gitignore
- [process]:      ☐ Commit  ☐ Gitignore
- [patterns]:     ☐ Commit  ☐ Gitignore
...
```

**Recommendation**:
- Public repos: Use selective (commit shareable patterns, gitignore personal notes)
- Private repos: Commit all
- Claude Cowork: Gitignore all (no repo to push to)

### Step 5: Custom Prefix (if custom categories added)

```
Custom category "security" detected.

What prefix should be used for lessons in this category?
(Leave blank for no prefix, or enter like "sec-")
```

**Examples**:
- "sec-" → `lessons-learned/security/sec-incident-response.md`
- "ml-" → `lessons-learned/ml-ops/ml-training-pipeline.md`

## Implementation

### Step 1.1: Check if config exists

```bash
if [ ! -f ~/.claude/kg-config.json ]; then
    # First-time setup - create config with default structure
    cat > ~/.claude/kg-config.json <<'EOF'
{
  "version": "1.0.0",
  "active": null,
  "graphs": {},
  "sanitization": {
    "enabled": false,
    "patterns": [],
    "action": "warn"
  }
}
EOF
fi
```

### Step 1.2: Run wizard prompts

Use `AskUserQuestion` tool for each step. Collect:
- `location_type`: "project-local", "personal", "cowork", "custom"
- `custom_path`: if location_type == "custom"
- `kg_name`: alphanumeric + hyphens
- `categories`: array of selected categories
- `custom_categories`: array of {name, prefix}
- `git_strategy`: "all-commit", "all-ignore", "selective"
- `category_git_rules`: if selective, map of category → "commit" | "ignore"

### Step 1.3: Validate inputs

- Check `kg_name` doesn't exist in config already
- Check `custom_path` is a valid directory (if provided)
- Check category names are valid (alphanumeric + hyphens)

### Step 1.4: Determine final path

```bash
case $location_type in
  "project-local")
    KG_PATH="./knowledge/"
    ;;
  "personal")
    KG_PATH="$HOME/.claude/knowledge-graphs/$kg_name/"
    ;;
  "cowork")
    KG_PATH="$HOME/.claude/cowork-knowledge/$kg_name/"
    ;;
  "custom")
    KG_PATH="$custom_path"
    ;;
esac
```

### Step 1.5: Create directory structure

**Pre-flight check (E2, E16):** Before running `mkdir -p`, check if `$KG_PATH` already exists:

```bash
if [ -d "$KG_PATH" ]; then
  # Check for KMGraph markers
  if [ -d "$KG_PATH/lessons-learned" ] || [ -d "$KG_PATH/decisions" ]; then
    # Already a KMGraph install — skip to Verify/Upgrade (Step 1f)
    echo "KMGraph directories detected at $KG_PATH — switching to Verify/Upgrade flow."
    # proceed to Step 1f
  else
    # Directory exists but no KMGraph markers
    echo "⚠️  $KG_PATH already exists with unrecognized content."
    echo "Create only missing KMGraph subdirectories inside it? [y/N]"
    echo "Choosing N aborts init — use --location to specify a different path."
    # If user answers N: exit init
    # If user answers Y: proceed with mkdir -p below (existing non-KMGraph files untouched)
  fi
fi
```

**→ Execute shared module:** Read `commands/init-shared/directory-scaffold.md` and follow it exactly.
Parameters:
- `{KG_PATH}` = resolved KG path (from Step 1.4)
- `{categories}` = categories array collected in Step 1.2

### Step 1.6: Copy templates

**→ Execute shared module:** Read `commands/init-shared/template-seed.md` and follow it exactly.
Parameters:
- `{KG_PATH}` = resolved KG path (from Step 1.4)
- `{CLAUDE_PLUGIN_ROOT}` = plugin root path (environment variable available in this context)

### Step 1.6.5: me.md and rules.md backfill offer

Run this step whenever `me.md` contains only template placeholder text — on new installs,
after content migration, and on re-runs of `/kmgraph:init`. Skip only if `me.md` already
has substantial content (user has populated it manually).

**Trigger check:**
```bash
ME_CONTENT=$(cat "{KG_PATH}/me.md" 2>/dev/null)
ME_IS_TEMPLATE=$(echo "$ME_CONTENT" | grep -c "<!-- What is this project" || true)
[ "$ME_IS_TEMPLATE" -eq 0 ] && echo "me.md has been populated — skipping backfill offer." && exit_step
```

Before offering backfill, explain what these files are:
```
me.md and rules.md have been created in knowledge/.

  me.md    — your identity and working style for this project. AI tools read this
             to understand your role, preferences, and constraints before acting.

  rules.md — project conventions and behavioral rules. Commit format, branch naming,
             tool preferences, approval gates. AI tools follow these automatically.

Both files are templates right now. Would you like help populating them from your
existing CLAUDE.md?

  1. Yes — show me what would move where (review before writing)
  2. No — I'll fill them in manually (edit knowledge/me.md and knowledge/rules.md)
```

**If Yes:**

1. Parse the project-level `CLAUDE.md` (in current working directory) first, then `~/.claude/CLAUDE.md` for personal content.
2. Display proposed mapping before writing anything:
   ```
   Proposed mapping from CLAUDE.md:
     Section "Project Conventions" → rules.md
     Section "Personal Preferences" → me.md
     Platform-specific adapter content → CLAUDE.md (retained as pointer + platform content)
   ```
3. User confirms each section before it is written.
4. Before rewriting CLAUDE.md, copy original to `CLAUDE.md.bak`.
5. Rewrite CLAUDE.md to a minimal pointer + any platform-specific content with no home in rules.md:
   ```
   For full context, read knowledge/rules.md and knowledge/me.md before acting.
   ```
6. If user declines or aborts mid-migration, restore from `CLAUDE.md.bak` and delete it.

**Safety rules:**
- Never delete content from source files without user confirmation.
- Never auto-write to `~/.claude/CLAUDE.md` — only suggest; user executes manually or approves per-write.
- If source file does not exist, skip silently.
- **Skip this step** if `me.md` already has substantial content — detected by checking for the presence of the `<!-- What is this project` comment string. If absent, the user has populated the file.
- **Always run** on migration completion and on re-runs, not just new installs.

**Personal KG case:** When initializing the personal KG (Step 1.8.5), run the same offer using `~/.claude/CLAUDE.md` as source and `~/.kmgraph/me.md` / `~/.kmgraph/rules.md` as targets. Also offer to migrate relevant entries from `~/.claude/projects/.../memory/MEMORY.md` (user-type memories: role, preferences, expertise) to personal `me.md`.

---

### Step 1.6.6: Install Post-Commit Hook (Optional) <!-- v0.0.3 Change -->

**Prompt user:**
```
Install post-commit hook for lesson suggestions? [y/N]

This hook will detect lesson-worthy commits (fix, debug, implement, refactor,
pattern, architecture) and suggest running /kmgraph:capture-lesson.

Default: No (opt-in for alpha release)
```

**If yes:**
```bash
# Copy hook template to git hooks directory
if [ -d .git ]; then
  cp "${CLAUDE_PLUGIN_ROOT}/core/examples-hooks/post-commit-lesson-suggestion" \
     .git/hooks/post-commit
  chmod +x .git/hooks/post-commit

  echo "✅ Post-commit hook installed: .git/hooks/post-commit"
  echo "   Will suggest lesson capture for commits with keywords:"
  echo "   fix, solved, debug, implement, refactor, pattern, architecture"
else
  echo "⚠️  No git repository detected. Hook not installed."
  echo "   To install later, copy:"
  echo "   ${CLAUDE_PLUGIN_ROOT}/core/examples-hooks/post-commit-lesson-suggestion"
  echo "   to .git/hooks/post-commit and make executable."
fi
```

**If no:**
```
Hook not installed. You can install it later by copying:
  ${CLAUDE_PLUGIN_ROOT}/core/examples-hooks/post-commit-lesson-suggestion
to .git/hooks/post-commit and making it executable.
```

**Note:** Default is "No" for v0.0.3-alpha. Consider changing to "Yes" for v1.0.0 once users have validated the hook behavior.

### Step 1.6.7: Platform directive scaffold (new install only)

Seed the `## Platform Preferences (Claude Code)` section in `CLAUDE.md` for Claude Code users. `CLAUDE.md` at the repo root IS the authoritative platform config file for Claude Code — no separate `knowledge/platform/` directory needed.

Check whether `CLAUDE.md` already has a `## Platform Preferences` section. If not, append it:

```bash
if ! grep -q "## Platform Preferences" "${PROJECT_ROOT}/CLAUDE.md" 2>/dev/null; then
  cat >> "${PROJECT_ROOT}/CLAUDE.md" << 'PLATFORM_EOF'

## Platform Preferences (Claude Code)

Claude Code-specific tool directives. This section is the authoritative home for Claude Code tool preferences.

### File and Content Search

- File search: use Glob and Grep tools — not Bash `find` or `grep`
- Content search: use Grep tool — not `rg` or `grep` in Bash

### Output and Context Management

- Avoid Bash commands producing >20 lines of output — use context-mode MCP tools instead
- Subagents: use for heavy file exploration to keep main context clean

### Search Scope Restrictions

Never run grep scans over plan directories or `.jsonl` chat history files
- **Why:** these paths contain non-executable plan text and chat transcripts — scanning them consumes context without reaching executable code
- **Example paths to avoid:** `docs/plans/`, `knowledge/plans/`, `*.jsonl`
PLATFORM_EOF
  echo "✅ Added ## Platform Preferences (Claude Code) section to CLAUDE.md"
else
  echo "ℹ️  CLAUDE.md already has a Platform Preferences section — skipping."
fi
```

**Note:** This step runs on new installs only. Existing installs detect and migrate via the upgrade-inspector's section d check.

---

### Step 1.6.8: Wiki link pass (idempotent)

Run the Obsidian wiki link pass on the newly initialized KG. This converts bare
`ADR-NNN`, `ENH-NNN`, `#NNN` (GitHub issues), and `Lessons_Learned_X` references
into `[[wiki links]]` across all files in `lessons-learned/`, `decisions/`,
`sessions/`, and `knowledge/concepts/`.

**Trigger:** Run if `wiki_pass_complete` is not `true` in the KG config entry.
This step is idempotent — re-running `/kmgraph:init` at any time will re-check
and run the pass if not yet complete.

```bash
WIKI_DONE=$(jq -r --arg kg "$kg_name" '.graphs[$kg].wiki_pass_complete // false' \
  ~/.claude/kg-config.json 2>/dev/null)
if [ "$WIKI_DONE" = "true" ]; then
  echo "ℹ️  Wiki pass already complete — skipping."
  # exit_step
fi
```

If `WIKI_DONE` is `false` or absent, offer:
```
Wiki link pass available — converts bare ADR-NNN, ENH-NNN, #NNN, and lesson
filename references to [[wiki links]] across your knowledge files.

  1. Run wiki pass now
  2. Skip — I'll run it later by re-running /kmgraph:init
```

If the user selects 1, execute the full wiki link pass logic from Step 1f.2
(ADR map build, NO-SUBSTITUTE zones, substitutions a–d, atomic write-back,
`wiki_pass_complete: true` flag write).

**`--dry-run` mode:** If `/kmgraph:init` was invoked with `--dry-run`, print
what would change per file without writing anything and do not set the flag.

---

### Step 1.7: Update .gitignore (if git repo exists)

```bash
if [ -d .git ] && [ "$location_type" == "project-local" ]; then
  # Add gitignore rules based on git strategy
  if [ "$git_strategy" == "all-ignore" ]; then
    echo "knowledge/" >> .gitignore
  elif [ "$git_strategy" == "selective" ]; then
    for category in "${!category_git_rules[@]}"; do
      if [ "${category_git_rules[$category]}" == "ignore" ]; then
        echo "knowledge/lessons-learned/$category/" >> .gitignore
        echo "knowledge/knowledge/${category}.md" >> .gitignore
      fi
    done
    # Always gitignore sessions, chat-history, tmp, and me.md
    echo "knowledge/sessions/" >> .gitignore
    echo "knowledge/chat-history/" >> .gitignore
    echo "knowledge/tmp/" >> .gitignore
  fi
  # E14 — me.md is always personal regardless of git strategy
  echo "knowledge/me.md" >> .gitignore
  echo ""
  echo "Note: knowledge/me.md is always personal — gitignored regardless of your git strategy."
  echo "      Each contributor maintains their own copy."
fi
```

### Step 1.8: Write config entry

**→ Execute shared module:** Read `commands/init-shared/config-entry-write.md` and follow it exactly.
Parameters:
- `{KG_PATH}` = resolved KG path (from Step 1.4)
- `{kg_name}` = KG name collected in Step 1.2
- `{KG_TYPE}` = type field — "project-local", "personal", or "cowork" (from `location_type` in Step 1.2)
- `{categories}` = categories array collected in Step 1.2
- `{git_strategy}` = selected git strategy from Step 1.2
- `{category_git_rules}` = per-category git rules map from Step 1.2 (if selective strategy)
- `{preserve_active}` = false

### Step 1.8.5: Global Personal KG Offer

After the project KG is registered and active, offer to create a personal KG for cross-project knowledge:

```
Would you like to create a personal knowledge graph for cross-project lessons?

This creates a personal KG at ~/.kmgraph/ where you can save
lessons, patterns, and ADRs that apply across all your projects — not just this one.

Examples of personal lessons:
  • "Plan language: use Create vs Update for new vs existing files"
  • "MCP registration quirks across IDEs"
  • "TypeScript strict mode gotchas"

1. Yes — create personal KG at ~/.kmgraph/
2. No — skip for now (can create later with /kmgraph:init-personal-kg)
```

**If Yes:**

1. Check if `~/.kmgraph/` already exists in `kg-config.json` (any entry with `type: "personal"` at that path). If so:
   > "A personal KG already exists at `~/.kmgraph/`. Skipping creation."
   Register it if not already in config; otherwise no-op.

2. Create directory structure:
   ```bash
   mkdir -p "$HOME/.kmgraph"/{knowledge,lessons-learned,decisions,sessions}
   mkdir -p "$HOME/.kmgraph/lessons-learned"/{architecture,debugging,patterns,process}
   ```

3. Copy templates:
   ```bash
   # Category templates → knowledge/templates/ subfolder
   mkdir -p "$HOME/.kmgraph/knowledge/templates"
   for f in patterns.md gotchas.md concepts.md architecture.md workflows.md; do
     cp "${CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/templates/$f" "$HOME/.kmgraph/knowledge/templates/" 2>/dev/null || true
   done
   # kg-category-index deploys as kg-category-index-global.md at personal KG level
   cp "${CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/kg-category-index.md" "$HOME/.kmgraph/knowledge/kg-category-index-global.md" 2>/dev/null || true
   # Root-level files — me.md, rules.md, kg-index-global.md → KG root (from user profile starters)
   cp "${CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/templates/user/me.md" "$HOME/.kmgraph/me.md"
   # Tier mapping setup — run immediately after me.md is seeded (see § Tier mapping setup below)
   [ -f "$HOME/.kmgraph/rules.md" ] && echo "rules.md already exists — skipping scaffold." || \
     cp "${CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/templates/user/rules.md" "$HOME/.kmgraph/rules.md"
   [ -f "$HOME/.kmgraph/triggers.md" ] && echo "triggers.md already exists — skipping scaffold." || \
     cp "${CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/templates/user/triggers.md" "$HOME/.kmgraph/triggers.md"
   [ -f "$HOME/.kmgraph/kg-index-global.md" ] && echo "kg-index-global.md already exists — skipping scaffold." || \
     cp "${CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/kg-index-global.md" "$HOME/.kmgraph/kg-index-global.md"
   ```

#### § Tier mapping setup

After seeding `me.md`, prompt the user to configure tier mappings:

```
Your me.md has been created at ~/.kmgraph/me.md. Let's configure which models to use for each task tier.

Which platforms are you using? (select all that apply)
  1. Claude (claude.ai / Claude Code)
  2. Gemini (Gemini CLI / AI Studio)
  3. Ollama (local, port 11434)
  4. LM Studio (local, port 1234)
  5. Skip — I'll configure this manually later
```

**For each selected cloud platform (1 or 2):** Pre-fill the default tier_map from the template — no prompts needed.

**For Ollama (option 3):**
1. Ask for host (default: `localhost`) and port (default: `11434`)
2. Attempt discovery: `curl -s http://{host}:{port}/api/tags` (2s timeout)
   - If success: display model list (paginated, 10 per page); ask user to assign one per tier
   - If failure: print warning, offer manual entry
3. Write the completed platform entry to `me.md` YAML frontmatter

**For LM Studio (option 4):**
1. Ask for host (default: `localhost`) and port (default: `1234`)
2. Attempt discovery: `curl -s http://{host}:{port}/v1/models` (2s timeout)
   - If success: display model list (paginated, 10 per page); ask user to assign one per tier
   - If failure: print warning, offer manual entry
3. Write the completed platform entry to `me.md` YAML frontmatter

**Headless mode** (`CLAUDE_CODE_HEADLESS=1`): Skip all prompts. Write empty tier_map stubs. Log: `"Headless mode — tier mapping skipped. Edit ~/.kmgraph/me.md YAML frontmatter to configure."`

4. Register in `~/.claude/kg-config.json`:
   ```json
   "personal": {
     "name": "personal",
     "path": "~/.kmgraph",
     "type": "personal",
     "categories": [
       {"name": "architecture", "prefix": null, "git": "ignore"},
       {"name": "debugging", "prefix": null, "git": "ignore"},
       {"name": "patterns", "prefix": null, "git": "ignore"},
       {"name": "process", "prefix": null, "git": "ignore"}
     ],
     "createdAt": "[timestamp]",
     "lastUsed": "[timestamp]"
   }
   ```
   Note: `"active"` is NOT changed — project KG remains active.

5. Build FTS5 index for the new personal KG:
   Call `kg_fts5_rebuild` with `kgPath: "~/.kmgraph"`. Post-rebuild guard: if `indexed` is 0, log a note (normal for empty KG).

6. Confirm:
   > "✅ Personal KG created at `~/.kmgraph/`
   > Capture cross-project lessons with `/kmgraph:capture-lesson` — you'll be asked which KG to save to."

7. Content migration offer for personal KG:

   Run the Step 1.6.5 content migration logic with personal KG parameters:
   - Source file: `~/.claude/CLAUDE.md`
   - Target me.md: `~/.kmgraph/me.md`
   - Target rules.md: `~/.kmgraph/rules.md`
   - Also offer to migrate `user`-type entries from `~/.claude/projects/*/memory/MEMORY.md` into personal `me.md` (role, preferences, expertise — not project-specific entries)

   Prompt:
   ```
   me.md and rules.md have been created in your personal KG.
   Would you like help populating them from your global ~/.claude/CLAUDE.md?

     1. Yes — show me what would move where (review before writing)
     2. No — I'll fill them in manually
   ```

   Apply all the same safety rules from Step 1.6.5: no auto-write, user confirms per section, backup before rewrite.
   **Skip this step** if `me.md` already has substantial content (more than the template placeholder text) — the user has already populated it manually.

8. Evidence seeding for personal me.md and rules.md:

   After step 7 (whether or not the user ran the migration offer), check whether existing personal lessons or ADRs can seed Why/Source links into rules.md:

   ```bash
   LESSON_COUNT=$(find "$HOME/.kmgraph/lessons-learned" -name "*.md" ! -name "*template*" 2>/dev/null | wc -l | tr -d ' ')
   ADR_COUNT=$(find "$HOME/.kmgraph/decisions" -name "ADR-*.md" 2>/dev/null | wc -l | tr -d ' ')
   ```

   If `LESSON_COUNT` or `ADR_COUNT` is greater than 0:
   ```
   Your personal KG has [N] lessons and [M] ADRs.
   Would you like me to scan them and suggest Why:/Source: links for rules.md entries?

     1. Yes — scan and show me suggestions (you approve each one before it is written)
     2. Skip — I'll add evidence links manually
   ```

   If Yes: scan each lesson and ADR for topic matches against rules.md entries. Surface candidate Why/Source pairs one at a time — user accepts or skips each. Write only accepted pairs.

   If `LESSON_COUNT` and `ADR_COUNT` are both 0: skip silently (normal for a fresh personal KG).

**If No (to the overall personal KG offer):**
   > "No problem. Run `/kmgraph:init-personal-kg` any time to set this up later."

---

### Step 1.9: Output success message

```
✅ Knowledge graph "$kg_name" initialized!

Location: $KG_PATH
Categories: $(echo ${categories[@]} | tr ' ' ', ')
Git strategy: $git_strategy
Active: Yes

Directory Structure:
  knowledge/           — Quick-reference knowledge entries
  lessons-learned/     — Full lesson documentation (strategy: $git_strategy)
  decisions/           — Architecture Decision Records
  sessions/            — Session summaries (always gitignored)
  chat-history/        — Chat extraction output (always gitignored)
  tmp/                 — Scratch space (always gitignored)

  Root files:
  kg-index.md          — KG navigation hub
  me.md                — Personal context (always gitignored)
  rules.md             — Project rules and conventions

Next steps:
  /kmgraph:status          — View KG info and quick reference
  /kmgraph:capture-lesson  — Document your first lesson
  /kmgraph:recall "query"  — Search across KG

Templates copied to $KG_PATH
Examples available at ${CLAUDE_PLUGIN_ROOT}/core/examples/ (not copied by default)

⚠️  Privacy reminder: Review sensitive data with /kmgraph:check-sensitive before pushing to public repos.
⚠️  Note: chat-history/, sessions/, tmp/, and me.md are always gitignored (never committed to version control)

💡 Quarterly review recommended: me.md and rules.md change slowly but do change — review for drift and bloat every few months.
   Update knowledge/index.md whenever you add major new subdirectories.
```

### Step 1.10: Optional Backfill from Existing Project

**Prompt user:**
```
If initializing in a pre-existing project with chat history, source files, or documentation:

Would you like to backfill the knowledge graph from existing project context? [y/N]

This will parse:
  • README.md (architecture overview)
  • CHANGELOG.md / docs/CHANGELOG.md (decision history)
  • Files in knowledge/lessons-learned/ or knowledge/decisions/ (existing knowledge)
  • Chat history files in knowledge/chat-history/ (if present)

The knowledge-extractor subagent will suggest new lessons and knowledge entries
for your review before writing them to the KG.
```

**If yes:**
- Invoke `knowledge-extractor` subagent in "init-backfill" mode
- Pass list of files to parse (README, CHANGELOG, knowledge/lessons-learned/, knowledge/decisions/, knowledge/chat-history/)
- Present extracted lesson candidates to user for review
- Write approved items to knowledge graph
- Output summary of backfilled entries

```
✅ Backfill complete!

Discovered and added:
  • X lessons from existing documentation
  • Y architecture decisions from CHANGELOG
  • Z patterns from source files

Review these entries in your KG and edit as needed.
```

**If no:**
```
Backfill skipped. The knowledge graph starts empty and grows as you document lessons
and decisions during development.

Start with: /kmgraph:capture-lesson to document your first learning.
```

### Step 1.11: Configure AI Platform Files (Optional)

After the knowledge graph is initialized, detect which AI coding tools are installed and offer to write platform-specific configuration files so those tools are aware of KMGraph.

#### Platform Detection

Run these checks to build the list of detected platforms:

```bash
# Gemini CLI
which gemini 2>/dev/null || [ -d "$HOME/.gemini" ]

# Cursor
[ -d "$HOME/.cursor" ] || [ -d "$HOME/Library/Application Support/Cursor" ]

# Windsurf
[ -d "$HOME/.windsurf" ] || [ -d "$HOME/Library/Application Support/Windsurf" ]

# Continue.dev
[ -d "$HOME/.continue" ]

# VS Code Copilot
code --list-extensions 2>/dev/null | grep -q "GitHub.copilot"

# Aider
which aider 2>/dev/null
```

Collect results into `detected_platforms` array (values: `gemini`, `cursor`, `windsurf`, `continue`, `copilot`, `aider`).

#### Multi-Platform Confirmation UX

**No platforms detected:** Skip this step silently. Do not prompt.

**One platform detected:**
```
Want me to configure KMGraph for [platform]? [y/N]
```

**Multiple platforms detected:**
```
I see you have [A], [B], and [C]. Want me to configure KMGraph for all of them?

1. Configure all
2. Choose which ones
3. Skip (I'll do it myself)
```

If option 2 (choose), prompt individually for each detected platform.

**For any platform the user declines:** Show the exact file path and exact content to paste — never redirect to docs. Then show a verification step:
```
To configure manually, create/edit:
  [exact file path]

Paste this content:
  [exact file content]

Once added, ask your AI: "Is there a knowledge graph available?"
It should respond with a description of KMGraph's capture and recall capabilities.
```

#### Platform File Map

| Platform | File | Content source |
|---|---|---|
| Gemini CLI | `GEMINI.md` in project root | `core/templates/AGENTS-template.md` |
| Cursor | `.cursorrules` | Project conventions + KMGraph behaviors subset |
| Windsurf | `.windsurfrules` | Same as `.cursorrules` |
| Continue.dev | `.continue/config.json` prompt section | KMGraph behaviors subset |
| VS Code Copilot | `.github/copilot-instructions.md` | Project conventions + KMGraph behaviors subset |
| Aider | `.aider.conf.yml` conventions section | KMGraph behaviors subset |

#### Overwrite Protection

Before writing any platform file, check if it already exists:

```bash
if [ -f "$target_file" ]; then
  # Show a human-readable diff: describe the sections that would change
  echo "⚠️  $target_file already exists."
  echo "Here is what would change:"
  # Describe additions (KMGraph section) vs. existing content
  diff "$target_file" "$proposed_content_temp_file"
  echo ""
  # Prompt before overwriting
  echo "Overwrite $target_file with the updated content? [y/N]"
fi
# Never silently replace an existing file
```

If the user declines overwrite: show the exact content to merge manually (per the declined-platform flow above).

#### Writing Platform Files

Each platform file written should begin with the knowledge pointer line, followed only by minimal platform-specific adapter content. Full rules are not duplicated here — they live in `knowledge/rules.md` and `knowledge/me.md`.

```
For full context, read knowledge/rules.md and knowledge/me.md before acting.
```

For each approved platform, write the appropriate file using the content source in the table above:

```bash
# Gemini CLI example
# Prepend pointer line then append template content
echo "For full context, read knowledge/rules.md and knowledge/me.md before acting." > "$(pwd)/GEMINI.md"
echo "" >> "$(pwd)/GEMINI.md"
cat "${CLAUDE_PLUGIN_ROOT}/core/templates/AGENTS-template.md" >> "$(pwd)/GEMINI.md"

# Cursor / Windsurf — write pointer line + KMGraph behaviors subset
# Continue.dev — inject pointer line + prompt section into .continue/config.json
# VS Code Copilot — write pointer line + minimal content to .github/copilot-instructions.md
# Aider — inject pointer line + conventions section into .aider.conf.yml
```

Output confirmation per platform:
```
✅ Configured: GEMINI.md (Gemini CLI)
✅ Configured: .cursorrules (Cursor)
```

#### Config Registration

After writing each platform file, register the platform name in `~/.claude/kg-config.json` under the active KG entry's `platforms` array. Use the canonical names: `"gemini"`, `"cursor"`, `"windsurf"`, `"continue"`, `"copilot"`, `"aider"`.

```bash
# Add platform to the platforms array for the active KG
# If the "platforms" field is absent, initialize it as an empty array first
jq ".graphs[\"$kg_name\"].platforms = (.graphs[\"$kg_name\"].platforms // []) + [\"$platform_name\"]" \
  ~/.claude/kg-config.json > ~/.claude/kg-config.json.tmp
mv ~/.claude/kg-config.json.tmp ~/.claude/kg-config.json
```

Do not error if the `platforms`, `autoSwitch`, or `notification` fields are absent in an existing config entry — treat all missing fields as their defaults:
- `platforms`: `[]`
- `autoSwitch`: `false`
- `notification.webhookUrl`: `""`

The updated config entry schema:

```json
{
  "my-project": {
    "path": "/path/to/kg/knowledge",
    "type": "project-local",
    "autoSwitch": false,
    "platforms": ["gemini", "cursor"],
    "notification": { "webhookUrl": "" }
  }
}
```

## Edge Cases

### No config file exists
- Create default config structure (Step 1.1)
- Set this as first KG

### Name collision
- If detected during pre-wizard check: present the 4-option menu (verify/upgrade, create new, re-initialize, cancel)
- If detected during wizard Step 2 (user typed a name that exists): suggest verify/upgrade or a different name

### Custom path doesn't exist
- Prompt: "Directory '$custom_path' doesn't exist. Create it? [y/N]"
- If yes: `mkdir -p "$custom_path"`
- If no: Return to wizard Step 1

### Not in git repo (project-local)
- Warning: "No git repository detected. Git strategy will have no effect."
- Continue with setup, skip .gitignore updates

### Project already has knowledge/ directory
- Detect existing directories (handled by E2/E16 pre-flight in Step 1.5)
- If KMGraph markers exist: switch to Verify/Upgrade flow
- If no markers: Prompt: "knowledge/ already exists with unrecognized content. Create only missing KMGraph subdirectories inside it? [y/N]"
- If yes: Create only missing subdirectories, don't overwrite existing content
- If no: Return to wizard Step 1, suggest different location via `--location`

## Turbo Mode

Skip wizard with flags:

```bash
/kmgraph:init --name my-project --location ./knowledge/ --categories architecture,process,patterns --git selective
```

**Parameters**:
- `--name`: KG name (required)
- `--location`: Path (default: `./knowledge/`)
- `--categories`: Comma-separated list (default: `architecture,process,patterns`)
- `--git`: `all-commit`, `all-ignore`, or `selective` (default: `selective`)
- `--category-git`: For selective, specify per-category: `architecture:commit,process:ignore`

## Integration with Other Skills

- `/kmgraph:list` will show this KG
- `/kmgraph:switch` can change to/from this KG
- `/kmgraph:status` will reference this KG if active
- `/kmgraph:capture-lesson` will write to this KG
- All other skills operate on this KG once active

## Files Created

```
$KG_PATH/
├── kg-index.md              (KG navigation hub)
├── me.md                    🔒 ALWAYS GITIGNORED (personal context)
├── rules.md                 (project rules and conventions)
├── knowledge/
│   ├── patterns.md          (empty template)
│   ├── gotchas.md           (empty template)
│   ├── concepts.md          (empty template)
│   ├── architecture.md      (empty template)
│   ├── workflows.md         (empty template)
│   └── kg-category-index.md (category navigation)
├── lessons-learned/
│   ├── README.md            (index template)
│   ├── lesson-template.md   (lesson template with git metadata)
│   ├── architecture/        (if selected)
│   ├── process/             (if selected)
│   ├── patterns/            (if selected)
│   └── [custom categories]/ (if added)
├── decisions/
│   ├── README.md            (ADR index)
│   └── ADR-template.md      (ADR template)
├── sessions/                🔒 ALWAYS GITIGNORED
│   └── session-template.md  (session summary template)
├── chat-history/            🔒 ALWAYS GITIGNORED
│   (for /kmgraph:extract-chat output — local use only)
└── tmp/                     🔒 ALWAYS GITIGNORED (scratch space)
```

**Git Handling:**
- `sessions/`, `chat-history/`, `tmp/`, and `me.md` are ALWAYS added to `.gitignore` (never committed)
- `lessons-learned/` categories follow the selected git strategy (selective/all-ignore/all-commit)
- `knowledge/` follows the selected git strategy per-file
- `decisions/` typically committed (architecture decisions are usually shared)

## Configuration Entry

```json
{
  "version": "1.0.0",
  "active": "my-project",
  "graphs": {
    "my-project": {
      "name": "my-project",
      "path": "/Users/name/projects/my-app/knowledge/",
      "type": "project-local",
      "categories": [
        { "name": "architecture", "prefix": null, "git": "commit" },
        { "name": "process", "prefix": null, "git": "ignore" },
        { "name": "patterns", "prefix": null, "git": "commit" }
      ],
      "createdAt": "2026-02-13T10:30:00Z",
      "lastUsed": "2026-02-13T10:30:00Z"
    }
  }
}
```

## See Also

- `/kmgraph:list` — View all configured KGs
- `/kmgraph:switch` — Change active KG
- `/kmgraph:add-category` — Add categories to existing KG
- `/kmgraph:status` — View active KG info and stats
