
## Module: upgrade-inspector

### Parameters

| Parameter | Description |
|---|---|
| `{KG_PATH}` | Absolute path to the knowledge graph root directory |
| `{kg_name}` | Name key used in kg-config.json |
| `{KG_TYPE}` | Type string: "project-local" or "personal" |
| `{categories}` | Array of category names configured for this KG |

> **Caller note:** All `{PARAM}` placeholders in this module must be substituted by the caller before any bash block is executed. There is no runtime substitution — any unsubstituted `{PARAM}` will be passed literally to shell commands, producing silent errors (e.g., `grep` will look for a file literally named `{KG_PATH}/rules.md`).

---

### Step 0: Verify active graph, then call kg_upgrade inspect

**Step 0a — Ensure `kg_upgrade` targets `{kg_name}`.**

`kg_upgrade` no longer operates on a config-wide "active" graph — it resolves `scope: "project"` (default) from the caller's cwd, or `scope: "user"` for the personal knowledge graph. There is nothing to switch beforehand:

```bash
CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"
mkdir -p "$(dirname "$CONFIG_PATH")" 2>/dev/null
# one-time migration: seed from the legacy ~/.claude location if the new path is absent
if [ ! -f "$CONFIG_PATH" ] && [ -f "$HOME/.claude/kg-config.json" ]; then
  cp "$HOME/.claude/kg-config.json" "$CONFIG_PATH.tmp.$$" 2>/dev/null && mv -f "$CONFIG_PATH.tmp.$$" "$CONFIG_PATH" 2>/dev/null
fi
KG_TYPE=$(jq -r ".graphs[\"{kg_name}\"].type" "$CONFIG_PATH" 2>/dev/null)
```

If `$KG_TYPE` is `"personal"`, call `kg_upgrade` with `scope: "user"`. Otherwise call it with cwd inside `{kg_name}`'s registered project directory (its default, `scope: "project"`, resolves from cwd). No config mutation or restore step is needed either way.

**Step 0b — Call kg_upgrade (inspect mode, no args).**

Call `kg_upgrade` with no arguments. This is read-only; no changes are written.

The tool returns:
```json
{
  "upgrades": [
    { "category": "directories", "description": "Missing required directories: templates/" },
    { "category": "version-update", "description": "v0.6.4 → v0.6.5 available" }
  ],
  "warnings": [
    { "category": "platform-split", "description": "...", "flaggedLines": ["..."] }
  ]
}
```

**Parse `upgrades[]`:**
- For each entry: add its `description` to the wizard's pending items display.
- For each entry whose `category` is neither `"version-update"` nor `"resolution"` (both handled separately below, and neither is a member of `kg_upgrade`'s apply enum): add the deduplicated `category` value to `_mcp_apply[]` (dedup: only add if not already present), then set its per-category tracking flag in your context if one is listed for it below — categories with no flag listed (e.g. `config-location`, `capture-corruption`) simply don't set one:
  - `"directories"` → `_mcp_covered_directories=true`
  - `"config"` → `_mcp_covered_config=true`
  - `"templates"` → `_mcp_covered_templates=true`
  - `"starter-relocation"` → `_mcp_covered_starter_relocation=true`
  - `"stray-knowledge-dir"` → `_mcp_covered_stray_knowledge_dir=true`
  - `"status-schema"` → `_mcp_covered_status_schema=true` (ADR-067 Task 8.1: reconciles the legacy `.active`/schema-less registry shape and removes the leftover legacy config file; see the confirmMigration note under "Apply MCP-covered items first" below)
- If `category` is `"version-update"`: display the description as an informational item but do NOT add to `_mcp_apply[]` and do NOT set a tracking flag — it is inspect-only and cannot be applied via `kg_upgrade apply`.
- If `category` is `"resolution"`: display the description as an informational item but do NOT add to `_mcp_apply[]` and do NOT set a tracking flag — it is a resolution-failure marker, not a member of the apply enum, and cannot be applied via `kg_upgrade apply`.

These per-category flags are **LLM-tracked state variables** — they are tracked in your context across bash block invocations in this module, not as shell variables. Each guarded bash block below begins with a prose instruction ("Only run if `_mcp_covered_X` is not set") that is the actual gate.

**`warnings[]`** (e.g. `platform-split`): display as advisory notes in the wizard, not as actionable upgrade items. Route through section d's existing wizard flow, not `kg_upgrade apply`.

**If `kg_upgrade` call fails** (MCP server unavailable, tool error): do not set any per-category flags. Display: `⚠️ kg_upgrade unavailable — falling back to local checks for structural items.` Continue to bash detection block; sections a, b, c, l, m run as before.

---

**Before running any checks or making any changes**, inspect the KG's actual state and report only what is missing or upgradeable for this specific install:

```bash
CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"
mkdir -p "$(dirname "$CONFIG_PATH")" 2>/dev/null
# one-time migration: seed from the legacy ~/.claude location if the new path is absent
if [ ! -f "$CONFIG_PATH" ] && [ -f "$HOME/.claude/kg-config.json" ]; then
  cp "$HOME/.claude/kg-config.json" "$CONFIG_PATH.tmp.$$" 2>/dev/null && mv -f "$CONFIG_PATH.tmp.$$" "$CONFIG_PATH" 2>/dev/null
fi
# Inspect what's actually missing or upgradeable
upgrades=()

# Section (a): Directory structure detection
# Only run if _mcp_covered_directories is not set (kg_upgrade did not cover this in Step 0)
for dir in knowledge lessons-learned decisions sessions chat-history tmp; do
  [ ! -d "{KG_PATH}/$dir" ] && upgrades+=("Missing directory: $dir/")
done

# Index reorganization — knowledge/index.md renamed to kg-category-index.md; new root kg-index.md created
# Note: kg-index.md and index.md are treated as equivalent root nav files — if either exists, skip.
if [ -f "{KG_PATH}/knowledge/index.md" ] && [ ! -f "{KG_PATH}/knowledge/kg-category-index.md" ]; then
  upgrades+=("Index update: renames {KG_PATH}/knowledge/index.md to kg-category-index.md and adds a new kg-index.md at the knowledge graph root as the primary entry point")
elif [ ! -f "{KG_PATH}/index.md" ] && [ ! -f "{KG_PATH}/kg-index.md" ]; then
  upgrades+=("New: kg-index.md — the primary entry point for this knowledge graph")
fi

# Missing root-level scaffold files
[ ! -f "{KG_PATH}/me.md" ]                    && upgrades+=("New: me.md — your identity and working style in this project")
[ ! -f "{KG_PATH}/rules.md" ]                 && upgrades+=("New: rules.md — project conventions and behavioral rules")
[ ! -f "{KG_PATH}/triggers.md" ]              && upgrades+=("New: triggers.md — when to apply rules from rules.md")

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
CONFIGURED_PATH=$(jq -r '.graphs["{kg_name}"].path' "$CONFIG_PATH")
echo "$CONFIGURED_PATH" | grep -qE '/docs/?$' && \
  [ -d "$CONFIGURED_PATH/lessons-learned" ] && \
  upgrades+=("Migration available: move KMGraph content from docs/ to knowledge/")

# Archive path convention (for Task A rollback command in v0.3.6):
# Archives created by knowledge-file-migrator are at: {KG_PATH}/.kg-archive-YYYYMMDD-HHMMSS/
# Each archive contains the backed-up files + manifest.json
# Use /kmgraph:kmg-migration list (v0.3.6) to enumerate restore points.

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
# issue-55: as of v0.7.4 the project index filename is "<name>-<pathHash>.db",
# not a bare "<name>.db" -- matching only the old literal would make this
# precondition report "not migrated yet" forever on any freshly built index.
# Accept either form; this guard only needs "has an index ever been built".
INDEX_DIR="${KG_INDEX_DIR:-$HOME/.kmgraph/index}/projects"
REAL_DB=$(find "$INDEX_DIR" -maxdepth 1 -type f \
  \( -name "{kg_name}.db" -o -name "{kg_name}-*.db" \) \
  2>/dev/null | head -1)
if [ -n "$REAL_DB" ]; then
  STALE_FTS5=$(find "$KG_PARENT" \
    -not -path "$KG_PARENT/.git/*" \
    \( -name ".fts5.db" -o -name ".fts5.db-journal" \) \
    2>/dev/null)
  [ -n "$STALE_FTS5" ] && \
    upgrades+=("Cleanup available: stale .fts5.db files found in project tree — pre-migration artifacts safe to delete")
fi

# Wiki pass check
WIKI_DONE=$(jq -r '.graphs["{kg_name}"].wiki_pass_complete // false' "$CONFIG_PATH" 2>/dev/null)
[ "$WIKI_DONE" != "true" ] && \
  upgrades+=("Wiki pass available: convert bare ADR-NNN, ENH-NNN, #NNN, and lesson filename references to [[wiki links]] across knowledge files")

# Gemini CLI upgrade-check hook retrofit (v0.7.9 — ADR-055 amendment, Component B)
_project_root_for_gemini_check="$(dirname "{KG_PATH}")"
if [ -f "${_project_root_for_gemini_check}/GEMINI.md" ] && \
   [ ! -f "${_project_root_for_gemini_check}/.gemini/kmgraph-upgrade-check.sh" ]; then
  upgrades+=("Gemini CLI session-start upgrade-check hook available: nudges toward /kmgraph:kmg-upgrade when a pending upgrade exists, without an LLM/MCP round-trip")
fi

# Section (c): Template update detection
# Only run if _mcp_covered_templates is not set (kg_upgrade did not cover this in Step 0)
# New templates (files in plugin core/default-templates not yet in KG)
# IMPORTANT: The following filenames must NEVER be added to upgrades[] by this loop,
# regardless of whether they exist at the template destination path.
# They are handled by dedicated scaffold checks above (section h) with interactive flows.
# Do not add them as "New template:" items under any circumstances:
#   kg-index.md  — covered by index check above (deploys as index.md or kg-index.md)
#   me.md        — covered by section h (interactive backfill)
#   rules.md     — covered by section h (interactive backfill)
#   triggers.md  — covered by section h (interactive backfill, deploys to KG root)
#   index-personal.md — personal KG only, handled separately
scaffold_covered=("kg-index.md" "me.md" "rules.md" "index-personal.md" "triggers.md")
for tdir in knowledge lessons-learned decisions sessions; do
  for template in "${CLAUDE_PLUGIN_ROOT}/core/default-templates/$tdir/"*; do
    tname=$(basename "$template")
    skip=false
    for covered in "${scaffold_covered[@]}"; do
      [ "$tname" = "$covered" ] && skip=true && break
    done
    [ "$skip" = "true" ] && continue
    dest="{KG_PATH}/$tdir/$tname"
    [ ! -f "$dest" ] && upgrades+=("New template: $tdir/$tname") || true
  done
done

# Section (l): Starter relocation
# Only run if _mcp_covered_starter_relocation is not set (kg_upgrade did not cover this in Step 0)
# Starter relocation check (v0.5.10.7 — ENH-022 Problem 3)
_starters_to_move=()
[ -f "{KG_PATH}/lessons-learned/lesson-template.md" ] && _starters_to_move+=("lessons-learned/lesson-template.md")
[ -f "{KG_PATH}/decisions/ADR-template.md" ]          && _starters_to_move+=("decisions/ADR-template.md")
[ -f "{KG_PATH}/sessions/session-template.md" ]       && _starters_to_move+=("sessions/session-template.md")
if [ ${#_starters_to_move[@]} -gt 0 ]; then
  upgrades+=("starter-relocation|Move ${#_starters_to_move[@]} starter(s) from live dirs → templates/|${_starters_to_move[*]}")
fi

# Section (m): stray-knowledge-dir migration
# Only run if _mcp_covered_stray_knowledge_dir is not set (kg_upgrade did not cover this in Step 0)
# knowledge/knowledge/ migration check (v0.5.10.7 — ENH-022 Problem 2)
if [ -d "{KG_PATH}/knowledge/knowledge" ]; then
  _modified_kk=()
  for _kf in "{KG_PATH}/knowledge/knowledge/"*.md; do
    [ -f "$_kf" ] || continue
    _fname=$(basename "$_kf")
    _src="${CLAUDE_PLUGIN_ROOT}/core/default-templates/concepts/templates/${_fname}"
    [ -f "$_src" ] || _src="${CLAUDE_PLUGIN_ROOT}/core/default-templates/concepts/${_fname}"
    if [ ! -f "$_src" ] || ! diff -q "$_kf" "$_src" > /dev/null 2>&1; then
      _modified_kk+=("$_fname")
    fi
  done
  if [ ${#_modified_kk[@]} -gt 0 ]; then
    upgrades+=("knowledge-knowledge-modified|knowledge/knowledge/ has modified files — manual merge required|${_modified_kk[*]}")
  else
    upgrades+=("knowledge-knowledge-merge|Merge knowledge/knowledge/ (unmodified starters) → knowledge/concepts/ and remove dir|")
  fi
fi

# Section (n): cowork-knowledge detection (v0.6.20 — ADR-066)
COWORK_DIR="$HOME/.claude/cowork-knowledge"
if [ -d "$COWORK_DIR" ] && [ -n "$(find "$COWORK_DIR" -type f 2>/dev/null | head -1)" ]; then
  upgrades+=("cowork-archive|Archive incompatible cowork-knowledge content (ADR-066: real Claude Cowork has no plugin surface; cowork KG mode removed from new setups)|")
fi

# Section (o): global-topic KG relocation (v0.6.20 — ADR-066)
OLD_GT_DIR="$HOME/.claude/knowledge-graphs"
if [ -d "$OLD_GT_DIR" ] && [ -n "$(find "$OLD_GT_DIR" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | head -1)" ]; then
  GT_NAMES=$(find "$OLD_GT_DIR" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | tr '\n' ',' | sed 's/,$//')
  upgrades+=("global-topic-relocate|Copy-forward global-topic KG(s) to ~/.kmgraph/knowledge-graphs/: ${GT_NAMES}|")
fi
```

**IMPORTANT — Filter before presenting:** Before displaying the upgrades list or the "nothing to upgrade" message, remove any item from `upgrades[]` whose basename matches any of the following scaffold-only filenames:

- `kg-index.md`
- `me.md`
- `rules.md`
- `triggers.md`
- `index-personal.md`

These files are handled exclusively by section h with an interactive backfill flow. They must **never** appear as "New template:" or "Updated template:" items in the menu, regardless of what the detection loop added. Remove them now, before any further processing.

If nothing is upgradeable after filtering, say:
```
✅ Your setup is already up to date. Nothing to apply.
```
And exit.

If upgrades exist after filtering, present them:
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

- **Section h (scaffold missing root files):** for each missing file, show the source template path and destination:
  ```
  [preview] Would seed: me.md
    Source: ${CLAUDE_PLUGIN_ROOT}/core/default-templates/concepts/templates/project/me.md
    Dest:   {KG_PATH}/me.md
    Note:   gitignored — fill in your identity after seeding

  [preview] Would seed: rules.md
    Source: ${CLAUDE_PLUGIN_ROOT}/core/default-templates/concepts/templates/project/rules.md
    Dest:   {KG_PATH}/rules.md
    Note:   fill in your project conventions after seeding
  ```

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

**Implementation note:** The preview is a display-only pass over the same inspection data already collected — no new filesystem checks are needed. The `--preview` flag can be passed as an argument to `/kmgraph:kmg-init` to jump directly to the preview without showing the menu first: if the command is invoked with `--preview`, run the inspection, show the preview, and then show the Apply/Choose/Skip menu (without option 0, since preview has already run).

If the user picks option 2 (choose individually), ask every item's yes/no question first and record each answer — do not call `kg_upgrade apply` or run any bash fallback during this loop. Track which `category` each MCP-sourced item came from (Step 0 already read this from the same `upgrades[]` entries); bash-detected items (e.g. missing-directory or stray-file findings) have no `category` and are handled by their own section below, not through `_mcp_apply[]`. After collecting all answers: for each declined item that has a `category`, remove that `category` from `_mcp_apply[]` (dedup-safe: only remove if present) — an item shown but declined must never reach `kg_upgrade apply`, and this matters most for `capture-corruption`, `diff-blank-reconstruction` (issue-47), and `plan-status-drift` (issue-49, Tier A only), all of which rewrite files. Do NOT clear that category's `_mcp_covered_*` flag when pruning — the flag means "this category was present in Step 0's `upgrades[]`," not "this category was applied," and clearing it would route the declined item into the bash fallback (sections a/b/c/l/m) instead, applying it anyway. `templates` covers multiple files deduped into a single `_mcp_apply[]` entry: if the user declines any template item, drop `"templates"` from `_mcp_apply[]` entirely (it applies all-or-nothing) and tell the user the approved template items were skipped along with it. Once all prunes are done, make one batched `kg_upgrade apply` call for whatever remains in `_mcp_apply[]`; if declining leaves it empty, skip the call entirely.

If the user picks option 3 (skip), exit with no changes.

**Regardless of Apply all vs. choose individually:** if `_mcp_apply[]` contains `"status-schema"`, `"capture-corruption"`, `"diff-blank-reconstruction"` (issue-47), or `"plan-status-drift"` (issue-49), show the user that item's full `details` text (not just its one-line `description` from the pending-items list) and get an explicit yes/no on it specifically before proceeding — one confirmation per category present, even when more than one of these four is pending in the same call. These categories require passing `confirmMigration`/`confirmBackfix` below, and the consent that unlocks those flags must be informed by what the fix actually does (schema migration; file renames and frontmatter rewrites; session-file content edits reconstructed from git history; a plan mirror's STATUS line synced to its canonical) — not just the finding summary shown earlier. `confirmBackfix` is a single shared boolean, not per-category (see the drift-guard comment on `ApplyCategory` in `upgrade.ts`): if more than one of `capture-corruption`, `diff-blank-reconstruction`, and `plan-status-drift` are pending, each still gets its own details-shown confirmation per this paragraph — do not let one item's yes silently stand in for another's. If this explicit confirmation is declined for any one item, remove that category from `_mcp_apply[]` (same pruning rule as above); a decline on one confirmBackfix-gated category does not affect another that was separately confirmed.

**Apply MCP-covered items first** (when `_mcp_apply[]` is non-empty):

Call `kg_upgrade apply: [<_mcp_apply contents>]`. **If `_mcp_apply[]` contains `"status-schema"`, the same call must also pass `confirmMigration: true`** — the explicit details-shown confirmation required above satisfies `kg_upgrade`'s consent gate for this migration; without `confirmMigration: true` the tool call will fail with `KMG_INPUT_REQUIRED` even though the user already agreed.

**If `_mcp_apply[]` contains any of `"capture-corruption"`, `"diff-blank-reconstruction"`, or `"plan-status-drift"`, the same call must also pass `confirmBackfix: true`** — the explicit details-shown confirmation(s) required above satisfy `kg_upgrade`'s consent gate for all three backfixes (they share one boolean, not one each — see the paragraph above); without `confirmBackfix: true` the tool call will fail even though the user already agreed.

`_mcp_apply[]` contains exactly the categories Step 0 added to it from `upgrades[]` (minus anything removed above for a declined item) — never anything from `warnings[]`, and never `"version-update"` or `"resolution"`; including either of the latter two will cause Zod validation to reject the entire call. `"platform-split"` IS a valid apply-enum member but is never a candidate here in practice: `kg_upgrade inspect` reports it under `warnings[]`, not `upgrades[]` (see the `warnings[]` handling note above), so Step 0's loop over `upgrades[]` never encounters it — do not add it here manually.

Example: if Step 0 found `directories` and `templates` pending:
`kg_upgrade apply: ["directories", "templates"]`

Example: if Step 0 found `status-schema` and `capture-corruption` pending, both approved:
`kg_upgrade apply: ["status-schema", "capture-corruption"], confirmMigration: true, confirmBackfix: true`

Example: if Step 0 found `capture-corruption` and `diff-blank-reconstruction` both pending — each got its own separate details-shown confirmation above, both approved — the call still passes `confirmBackfix: true` only once (it's one shared flag covering both, not two separate ones):
`kg_upgrade apply: ["capture-corruption", "diff-blank-reconstruction"], confirmBackfix: true`

Example: if Step 0 found `plan-status-drift` pending alone (a stale `~/.claude/plans/` mirror), approved:
`kg_upgrade apply: ["plan-status-drift"], confirmBackfix: true`

Example: if Step 0 found `status-schema` pending (alone or combined with other MCP-covered categories):
`kg_upgrade apply: ["status-schema"], confirmMigration: true`

Then continue to apply wizard-only items (d, e, f, g, h, i, j, k) via their existing bash logic. (Sections a, b, c, l, m are each guarded by their per-category flag — no double-apply.)

---

Then perform these checks in order:

#### a. Directory structure check

Verify all expected directories exist. Create any that are missing:

**Only run the bash block below if `_mcp_covered_directories` is not set** (i.e., `"directories"` was not in Step 0's `upgrades[]` — kg_upgrade did not apply directory creation):

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

**Only run the bash block below if `_mcp_covered_config` is not set** (i.e., `"config"` was not in Step 0's `upgrades[]` — kg_upgrade did not apply config field defaults):

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

if jq '
  .graphs["{kg_name}"] |=
    if .platforms == null then .platforms = [] else . end |
    if .notification == null then .notification = { "webhookUrl": "" } else . end |
    if .type == null then .type = "{KG_TYPE}" else . end
' "$CONFIG_PATH" > "${CONFIG_PATH}.tmp" && [ -s "${CONFIG_PATH}.tmp" ] && jq empty "${CONFIG_PATH}.tmp" 2>/dev/null; then
  mv "${CONFIG_PATH}.tmp" "$CONFIG_PATH"
else
  rm -f "${CONFIG_PATH}.tmp"
  echo "⚠️  kg-config.json update failed (jq error or invalid output) — original left untouched."
fi
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


#### c. Template update check

Compare installed templates against the plugin's current templates. If newer versions exist, offer to update:

**Only run the bash block below if `_mcp_covered_templates` is not set** (i.e., `"templates"` was not in Step 0's `upgrades[]` — kg_upgrade did not apply template updates):

```bash
template_dirs=("knowledge/templates" "lessons-learned" "decisions" "sessions")
updates_available=()

for tdir in "${template_dirs[@]}"; do
  for template in "${CLAUDE_PLUGIN_ROOT}/core/default-templates/$tdir/"*; do
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
- This prevents re-offering platform-split migration on every `/kmgraph:kmg-init` run after migration has already completed.

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

→ Execute shared module: Read `commands/kmg-init-shared/kmg-knowledge-file-migrator.md` and follow it exactly.
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
   To rollback: run `/kmgraph:kmg-migration rollback <id>` to restore. Use `/kmgraph:kmg-migration list` to see restore points.
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
- Only deletes when a real DB for this graph is confirmed under `~/.kmgraph/index/projects/` — either the current `{kg_name}-<pathHash>.db` form (v0.7.4+, issue-55) or the pre-v0.7.4 bare `{kg_name}.db`
- Always prompts — never auto-deletes
- Adds `**/.fts5.db` and `**/.fts5.db-journal` to `.gitignore` on cleanup (idempotent)

#### h. Scaffold missing root files (me.md / rules.md / triggers.md)

**Purpose:** Seed `me.md`, `rules.md`, and/or `triggers.md` from plugin templates when absent, pre-populated with recommendations extracted from existing project and platform files. Presents as a dry run — nothing is written until the user approves. All originals are archived before any changes are made.

`triggers.md` is also handled here when it appears as a new template in section c — this section's interactive flow takes precedence over a silent copy.

**Only runs if** one or more were flagged as missing in the initial inspection.

---

**Step 1 — Scan all sources**

Before prompting, read every available source to build recommendations:

**MANDATORY: Check for each platform file at `{PROJECT_ROOT}` and log its presence before extracting anything.** Print a "Sources found" line before the dry run:
```
Sources found: CLAUDE.md ✓  GEMINI.md ✓  .cursorrules –  AGENTS.md –  README.md ✓  package.json ✓  (+ 3 ADRs, 12 lessons, 2 sessions)
```
Do not skip this line. If a platform file exists but was not checked, that is a bug.

| Source | What to extract |
|--------|----------------|
| `CLAUDE.md` (project + global) | Platform preferences, always/never rules, tool directives, workflow constraints |
| `GEMINI.md` | Platform-specific preferences, style rules |
| `.cursorrules` | Cursor conventions and constraints |
| `AGENTS.md` | Agent/Codex instructions and conventions |
| `.github/copilot-instructions.md` | Copilot rules |
| `.continue/config.json` | Continue.dev preferences |
| `README.md` | Project description, tech stack, goals |
| `package.json` / `pyproject.toml` etc. | Tech stack, scripts, dependencies |
| KG lessons-learned (`patterns/`, `process/`) | Recurring conventions, always/never patterns |
| KG decisions (`decisions/`) | ADRs with architectural rules |
| KG sessions | Working style, communication patterns |
| Existing partial `me.md` / `rules.md` | Preserve any content already filled in |
| `rules.md` (just seeded, if applicable) | Derive trigger phase mappings for `triggers.md` |

For each source found, note: filename → extracted content → which target file it informs (`me.md`, `rules.md`, or `triggers.md`).

**For `triggers.md` specifically:** map each section heading in `rules.md` to a trigger phase. Example mapping:
- `§ Plan Protocol` → "After writing an implementation plan — Apply: rules.md § Plan Protocol"
- `§ Git Workflow` → "Before committing — Apply: rules.md § Git Workflow"
- `§ Knowledge Capture` → "When making an architecture decision — Apply: rules.md § Knowledge Capture > When to Capture"
- Any enforcement/guardrail section → add as a project-specific trigger with the section name

---

**Step 2 — Present dry run (MANDATORY — do not skip or abbreviate)**

**STOP. Do not write any files yet.** Display the full preview first. The user must see and approve the proposed content before anything is written. Format:

```
── Dry run: here's what would be created ──────────────────────────────────

me.md  ({KG_PATH}/me.md)
  Sources: README.md, CLAUDE.md, 3 session summaries
  ┌─────────────────────────────────────────────────────────────────────┐
  │ # Identity — [project name]                                         │
  │                                                                     │
  │ ## Role                                                             │
  │ [extracted role / project description from README]                  │
  │                                                                     │
  │ ## Working Style                                                    │
  │ [patterns extracted from session summaries]                         │
  │  ...                                                                │
  └─────────────────────────────────────────────────────────────────────┘

rules.md  ({KG_PATH}/rules.md)
  Sources: CLAUDE.md § Platform Preferences, 4 lessons, ADR-005, ADR-012
  ┌─────────────────────────────────────────────────────────────────────┐
  │ # Rules — [project name]                                            │
  │                                                                     │
  │ ## Git Workflow                                                      │
  │ [extracted from lessons and ADRs]                                   │
  │  ...                                                                │
  └─────────────────────────────────────────────────────────────────────┘

triggers.md  ({KG_PATH}/triggers.md)
  Sources: rules.md sections + template defaults + [any phase-based lessons found]
  ┌─────────────────────────────────────────────────────────────────────┐
  │ [trigger entries derived from rules.md section headings,           │
  │  each citing its rules.md source — not generic template defaults]   │
  │  ...                                                                │
  └─────────────────────────────────────────────────────────────────────┘

── Platform files found ────────────────────────────────────────────────────

**MANDATORY — do not skip this section.** For every platform file that exists at {PROJECT_ROOT},
show it here with its proposed update. If no platform files exist, print:
  (no platform config files found at {PROJECT_ROOT})

For each platform file found, show:
  1. What cross-reference comment would be added (always): `# See also: knowledge/rules.md`
  2. Any content that overlaps with the newly created rules.md (user must explicitly approve removal)

Format per file:

CLAUDE.md  ✓ found at {PROJECT_ROOT}/CLAUDE.md
  ┌─────────────────────────────────────────────────────────────────────┐
  │ [proposed addition near top of file:]                               │
  │ # See also: knowledge/rules.md — project conventions live there     │
  │                                                                     │
  │ [overlapping content detected (if any):]                            │
  │   Line 14-18: "Never start implementation without Proceed"          │
  │   → Already captured in rules.md § Git Workflow — remove? [y/n]    │
  └─────────────────────────────────────────────────────────────────────┘

GEMINI.md  ✓ found at {PROJECT_ROOT}/GEMINI.md
  ┌─────────────────────────────────────────────────────────────────────┐
  │ [same format]                                                       │
  └─────────────────────────────────────────────────────────────────────┘

[repeat for .cursorrules, AGENTS.md, .github/copilot-instructions.md if found]

── Nothing has been written. These are recommendations only. ──────────────
All content can be edited before applying, and changed again at any time
using /kmgraph:kmg-rules-capture and by editing the files directly.
```

---

**Step 3 — Prompt to apply**

```
Apply these recommendations?
  1. Apply all — archive originals, write all files as shown
  2. Edit before applying — review each file section by section
  3. Apply KG files only — write me.md / rules.md / triggers.md, skip platform file changes
  4. Skip — I'll fill these in manually later
```

---

**Step 4 — Archive then write (options 1, 2, or 3)**

Before writing any file, create a timestamped archive of all originals that would be modified:

```bash
ARCHIVE_DIR="{KG_PATH}/.kg-archive-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$ARCHIVE_DIR"
# Archive any platform files that would be modified
for f in CLAUDE.md GEMINI.md .cursorrules AGENTS.md .github/copilot-instructions.md; do
  if [ -f "{PROJECT_ROOT}/$f" ]; then
    cp "{PROJECT_ROOT}/$f" "$ARCHIVE_DIR/"
    echo "  📦 Archived: $f → $ARCHIVE_DIR/$f"
  fi
done
echo "{\"archived_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"trigger\": \"upgrade-inspector-section-h\"}" \
  > "$ARCHIVE_DIR/manifest.json"
```

After the archive loop, print:

```
✅ Originals archived at:
   $ARCHIVE_DIR

To rollback: run /kmgraph:kmg-migration list to see restore points, or restore manually:
   cp "$ARCHIVE_DIR/<filename>" <original path>
```

Then proceed to write the new files.

Then write each file using the Edit tool (new files) or Edit tool (modifications to platform files).

**If option 2 (edit before applying):** walk through each target file section by section, showing the proposed content and asking the user to confirm, modify, or skip each section before writing.

**Safety rules:**
- Archive is always taken before any write (mandatory — never skip)
- Never delete content from platform files without archiving first
- Platform file updates append a cross-reference comment (e.g., `# See also: knowledge/rules.md`) — they do not silently remove content unless the user explicitly approves removal in the dry run
- If all three files already exist and no platform files need updating: skip this section silently

**If all three files already exist:** skip this section silently.

---

#### g. Wiki pass

**Purpose:** Convert bare `ADR-NNN`, `ENH-NNN`, `#NNN` (GitHub issues), and `Lessons_Learned_X` filename references to `[[wiki links]]` across all files in `lessons-learned/`, `decisions/`, `sessions/`, and `knowledge/concepts/`.

**Execute:** Read `commands/init.md` and run **Step 1f.2** (Obsidian wiki link pass) exactly as written there. Pass `{kg_name}` and `{KG_PATH}`.

**Constraints:**
- Only runs if `wiki_pass_complete` is not `true` in kg-config (the detection check above already verified this)
- Sets `wiki_pass_complete: true` in kg-config on successful completion
- Idempotent: re-running `/kmgraph:kmg-init` after completion skips this check silently

#### i. Content template location migration (v0.5.0 — ADR-040)

**Purpose:** Detect KGs where the five content templates (`patterns.md`, `gotchas.md`, `concepts.md`, `architecture.md`, `workflows.md`) were seeded directly under `knowledge/` (pre-v0.5.0 layout) and offer to move them to `knowledge/templates/` (v0.5.0+ layout).

**Schema version gate (skip section i if already migrated):**

```bash
SCHEMA_VERSION=$(awk '/^---$/{if(in_front){in_front=0;exit}else{in_front=1;next}} in_front && /^kmgraph_schema:/{gsub(/[^0-9]/,"",$2);print $2;exit}' "{KG_PATH}/rules.md" 2>/dev/null)
```

If `$SCHEMA_VERSION` is a valid integer and `$SCHEMA_VERSION -ge 2`: skip section i silently (migration already reflected in schema version).

**Detection:**

```bash
TEMPLATES_TO_MIGRATE=()
for f in patterns.md gotchas.md concepts.md architecture.md workflows.md; do
  if [ -f "{KG_PATH}/knowledge/$f" ] && [ ! -f "{KG_PATH}/knowledge/templates/$f" ]; then
    TEMPLATES_TO_MIGRATE+=("$f")
  fi
done
```

If `TEMPLATES_TO_MIGRATE` is empty, skip this check silently.

**If templates found at old location,** display and offer:

```
Found content templates at knowledge/ (pre-v0.5.0 layout):
  knowledge/patterns.md
  knowledge/concepts.md
  ...

These belong in knowledge/templates/ (v0.5.0+ layout). Options:
  a. Migrate automatically — move to knowledge/templates/, create knowledge/templates/ if needed
  b. Skip — I'll migrate manually
```

**If option (a) — auto-migrate:**

```bash
mkdir -p "{KG_PATH}/knowledge/templates"
for f in "${TEMPLATES_TO_MIGRATE[@]}"; do
  mv "{KG_PATH}/knowledge/$f" "{KG_PATH}/knowledge/templates/$f"
  echo "Moved: knowledge/$f → knowledge/templates/$f"
done
echo "✅ Content template migration complete"
```

**Safety rules:**
- Only moves files that exist at the old path AND are absent at the new path — never clobbers.
- Uses `mv` — no data is lost.
- Does not touch user-created KG entries (lessons, ADRs, patterns entries the user wrote).

#### j. kmgraph-defaults block seed in rules.md (v0.5.0 — ADR-037)

**Purpose:** Detect `rules.md` files missing the `<!-- kmgraph-defaults -->` ... `<!-- /kmgraph-defaults -->` block (introduced in v0.5.0) and offer to prepend it. Also detect graphs that already have the block but predate ADR-037's Knowledge Governance content fix (v0.7.9 — c4), and offer to retrofit just that section.

**Detection:**

```bash
# rules.md not existing at all is a distinct, higher-priority case --
# nothing to seed into. Bail before the grep/awk below, which would
# otherwise leave $HAS_DEFAULTS as an empty string (not "0"), and the
# numeric comparisons below error on an empty string rather than branching
# cleanly. Section h (scaffold missing root files, runs BEFORE
# section j) is what's responsible for creating a missing rules.md; if
# § j sees one still missing, the user already declined section h's own
# offer, so silently skipping here is clearly correct, not just defensible.
#
# HAS_DEFAULTS is unconditionally reset to empty before the check below --
# do not skip this reset. Without it, a leftover truthy value from earlier
# in the same script run would make `${HAS_DEFAULTS:-...}` treat the
# variable as "already set" and skip the grep entirely on the file-exists
# path, silently keeping the stale value instead of computing a real one.
HAS_DEFAULTS=""
HAS_DEFAULTS_CLOSE=""
RULES_IS_TEXT=true
if [ ! -f "{KG_PATH}/rules.md" ]; then
  HAS_DEFAULTS=-1  # sentinel: skip all branches below
  HAS_DEFAULTS_CLOSE=-1
fi

# NUL-byte check -- a rules.md containing NUL bytes (unusual: a bad
# copy/paste, a binary artifact accidentally saved with this name) is not
# safe for the retrofit mutation below to touch, even once `-a` (below)
# makes the marker-detection greps stop erroring on it. macOS's own awk
# (BSD awk, the one actually shipped -- confirmed `awk version 20200816`;
# the "only awk on macOS" comment further down is about this exact binary)
# TRUNCATES a line at its first NUL byte when it re-prints that line. That
# means the retrofit mutation could round-trip a NUL-containing file, exit
# 0, `[ -s ]` would pass, and `mv` would overwrite rules.md with content
# silently missing whatever came after the NUL on that line -- exactly the
# "never removes existing user content" safety rule below being violated,
# dressed up as a reported success. Detect and refuse instead of trying to
# make binary content survive a line-oriented text tool:
if [ -f "{KG_PATH}/rules.md" ] && LC_ALL=C tr -d '\0' < "{KG_PATH}/rules.md" | cmp -s - "{KG_PATH}/rules.md"; then
  RULES_IS_TEXT=true
elif [ -f "{KG_PATH}/rules.md" ]; then
  RULES_IS_TEXT=false  # NUL byte(s) present -- forces SAFE_SINGLE_BLOCK false below
fi

HAS_DEFAULTS=${HAS_DEFAULTS:-$(grep -ac '<!-- kmgraph-defaults -->' "{KG_PATH}/rules.md" 2>/dev/null)}
# Also count the CLOSING marker independently -- counting only the opening
# marker misses the case where the opening marker appears exactly once (the
# real block) but the CLOSING marker appears more than once (e.g. a stray
# extra closing marker quoted in a fenced example, with no matching stray
# opening marker alongside it). `<!-- kmgraph-defaults -->` is not a
# substring of `<!-- /kmgraph-defaults -->`, so the two counts are
# independent, and neither count alone is sufficient -- see `SAFE_SINGLE_BLOCK`
# below, which requires exactly one of BOTH markers, in the right order.
HAS_DEFAULTS_CLOSE=${HAS_DEFAULTS_CLOSE:-$(grep -ac '<!-- /kmgraph-defaults -->' "{KG_PATH}/rules.md" 2>/dev/null)}
# First-occurrence LINE NUMBERS of each marker -- counts alone (above) can't
# catch a malformed file where exactly one of each marker exists, but in the
# WRONG ORDER (e.g. a stray orphan closing marker sitting above the real
# block's own opening marker, from a bad hand-edit). Safe to compute
# unconditionally, even on a missing file or missing markers -- `grep -n`
# on a miss just yields empty output, `head -1` of empty is empty, and the
# branch table below never consults these unless both counts are already
# confirmed to be exactly 1.
#
# `-a` (force text mode) on all four `grep`/`grep -c` calls in this section:
# without it, a rules.md containing a NUL byte (unusual, but not impossible --
# a bad copy/paste, a binary artifact accidentally saved with this name) makes
# `grep -c` still return real counts, but `grep -n` prints a "Binary file ...
# matches" line instead of `line:content`, so `cut -d: -f1` extracts non-numeric
# garbage into $OPEN_LINE/$CLOSE_LINE and the numeric `-lt` comparison below
# throws a raw shell error instead of cleanly routing to the malformed branch.
OPEN_LINE=$(grep -an '<!-- kmgraph-defaults -->' "{KG_PATH}/rules.md" 2>/dev/null | head -1 | cut -d: -f1)
CLOSE_LINE=$(grep -an '<!-- /kmgraph-defaults -->' "{KG_PATH}/rules.md" 2>/dev/null | head -1 | cut -d: -f1)
# Marker-presence alone is not enough -- a graph seeded before this fix has
# the marker but not the Knowledge Governance content added under it.
# Check for the specific sub-heading, restricted to the marker-delimited
# region so a coincidental "## Knowledge Governance" heading elsewhere in
# the user's own rules.md (outside the block) doesn't cause a false skip.
#
# Caveat, accepted rather than solved here: if the OPENING marker is present
# but the CLOSING marker is missing (a malformed/hand-edited block), this
# awk's region-restriction degenerates to "rest of the file" -- so a user's
# own genuine "## Knowledge Governance" heading written later in their file,
# entirely unrelated to this block, would false-positive HAS_GOVERNANCE. This
# no longer causes a silent skip on the malformed case, though: the branch
# table below now routes any opening/closing count or order mismatch to its
# own reported-and-skip branch BEFORE `$HAS_GOVERNANCE` is ever consulted.
HAS_GOVERNANCE=$(awk '/<!-- kmgraph-defaults -->/{found=1} found{print} /<!-- \/kmgraph-defaults -->/{exit}' "{KG_PATH}/rules.md" 2>/dev/null | grep -c '^## Knowledge Governance')
```

A file has **exactly one well-formed block** only if `$RULES_IS_TEXT` is true AND `$HAS_DEFAULTS` is `1` AND `$HAS_DEFAULTS_CLOSE` is `1` AND `$OPEN_LINE` is less than `$CLOSE_LINE` (the opening marker actually precedes the closing one). Call this `SAFE_SINGLE_BLOCK` below. `$RULES_IS_TEXT` being false (NUL bytes present) makes `SAFE_SINGLE_BLOCK` false unconditionally, regardless of what the marker counts/order say — a file the mutation awk can't safely round-trip is unsafe for the retrofit path no matter how clean its markers look. When implementing the `$OPEN_LINE`/`$CLOSE_LINE` comparison, also treat either value being empty or non-numeric as `SAFE_SINGLE_BLOCK` being false (route to the malformed branch), not as a shell error to let propagate — the `-a` flag on the `grep -n` calls above handles the ordinary binary-content case, but failing safe on the comparison itself costs nothing and removes any dependence on that being exhaustive.

Five branches:
- **`$HAS_DEFAULTS` is `-1`** (sentinel — `rules.md` doesn't exist): skip silently, nothing to seed into.
- **NOT `SAFE_SINGLE_BLOCK`, and NOT (`$HAS_DEFAULTS` is `0` AND `$HAS_DEFAULTS_CLOSE` is `0`)** (some marker text is present — one or more opening markers, one or more closing markers, or both — but it does not resolve to exactly one well-ordered pair in a text-safe file): **skip both the retrofit and prepend paths, always, regardless of `$HAS_GOVERNANCE`.** This single branch now covers every malformed/ambiguous shape marker-count, order, and file-content can produce: two-or-more of either marker anywhere in the file (a real block plus a fenced-code-block example elsewhere quoting one or both marker strings, or a genuine duplicate block); a count mismatch (opening present with no closing at all, or a closing marker present with no opening at all -- an orphan); exactly one of each but in the wrong order (a stray orphan closing marker sitting above the real block, e.g. from a bad hand-edit); and `$RULES_IS_TEXT` being false (the file contains NUL bytes) -- macOS's own awk truncates a line at its first NUL byte when re-printing it, so even a marker-clean NUL-containing file is not safe for the retrofit mutation to touch, regardless of how well-formed its markers look. `<!-- kmgraph-defaults -->` is not a substring of `<!-- /kmgraph-defaults -->`, so the two counts are independent — a file can have exactly one opening marker while still being unsafe on any of the other grounds. There is no reliable way to tell which occurrence is the real block, to safely prepend a brand-new block above an orphan closing marker (that would leave two closing markers in the file), or to safely mutate a file a line-oriented text tool can't round-trip, from counts and order alone. Neither the detection awk (unanchored, matches the closing marker as a substring anywhere) nor the mutation awk (first-match, normalized-equality) can recover from any of these shapes on their own — the check has to happen upstream, before either path is offered. Report:
  ```
  ⚠️  rules.md's <!-- kmgraph-defaults --> block looks malformed or ambiguous (opening/closing marker count or order doesn't resolve to exactly one well-formed block). Skipping the defaults/governance check for this run. Resolve manually (remove a duplicate or orphaned marker, de-quote a documented example, or fix the marker order) and re-run to continue.
  ```
- **`$HAS_DEFAULTS` is `0` AND `$HAS_DEFAULTS_CLOSE` is `0`** (both markers entirely absent — the clean, unambiguous "nothing here yet" case): schema-version gate applies here, unchanged from before — if `$SCHEMA_VERSION -ge 2` (computed in section i), skip silently; otherwise the existing full-block prepend path below.
- **`SAFE_SINGLE_BLOCK` AND `$HAS_GOVERNANCE -ge 1`**: skip silently — already fully seeded, nothing to do.
- **`SAFE_SINGLE_BLOCK` AND `$HAS_GOVERNANCE` is `0`**: the marker exists exactly once, well-formed, but predates ADR-037's content fix, regardless of what migrations the graph has separately been through — **not gated by `$SCHEMA_VERSION`** (that gate exists for section i's own, unrelated content-template relocation, not this block's content). Offer the additive-only retrofit path below, never re-prepending the whole block. `SAFE_SINGLE_BLOCK` is what makes this path safe to automate — see the branch above for the shapes that aren't.

**If `$HAS_DEFAULTS` is `0` AND `$HAS_DEFAULTS_CLOSE` is `0` (both markers cleanly absent),** display and offer:

```
rules.md is missing the kmgraph-defaults block (added in v0.5.0).

This block seeds basic Git workflow, version release, and knowledge-governance
rules (when to create an ADR vs. a memory file) that work across teams.
It does not override anything you've already written.

Options:
  a. Prepend the defaults block to rules.md
  b. Skip — I'll add it manually
```

**If option (a) — auto-prepend:**

1. Archive `rules.md` first:
   ```bash
   ARCHIVE_DIR="{KG_PATH}/.kg-archive-$(date +%Y%m%d-%H%M%S)"
   mkdir -p "$ARCHIVE_DIR"
   cp "{KG_PATH}/rules.md" "$ARCHIVE_DIR/rules.md"
   echo "{\"archived_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"trigger\": \"upgrade-inspector-section-j\"}" > "$ARCHIVE_DIR/manifest.json"
   echo "✅ Archived rules.md → $ARCHIVE_DIR/rules.md"
   ```

2. Prepend the defaults block (from `core/default-templates/concepts/templates/project/rules.md`, extracting only the `<!-- kmgraph-defaults -->` ... `<!-- /kmgraph-defaults -->` block):
   ```bash
   DEFAULTS_BLOCK=$(awk '/<!-- kmgraph-defaults -->/{found=1} found{print} /<!-- \/kmgraph-defaults -->/{exit}' \
     "${CLAUDE_PLUGIN_ROOT}/core/default-templates/concepts/templates/project/rules.md")
   if printf '%s\n\n' "$DEFAULTS_BLOCK" | cat - "{KG_PATH}/rules.md" > /tmp/rules-patched.md && [ -s /tmp/rules-patched.md ]; then
     mv /tmp/rules-patched.md "{KG_PATH}/rules.md"
     echo "✅ kmgraph-defaults block prepended to rules.md"
   else
     rm -f /tmp/rules-patched.md
     echo "⚠️  rules.md prepend failed (empty or write error) — original left untouched (archived copy at $ARCHIVE_DIR/rules.md)."
   fi
   ```

**If `SAFE_SINGLE_BLOCK` AND `$HAS_GOVERNANCE` is `0` (exactly one well-formed block, Knowledge Governance missing),** display and offer:

```
rules.md has the kmgraph-defaults block, but it predates a later addition
(Knowledge Governance rules: process decisions -> ADR, memory files as thin
pointers, rules.md-cites-ADR -- ADR-037).

This does not touch anything you've already written, including inside the
existing block.

Options:
  a. Append the Knowledge Governance section into the existing block
  b. Skip — I'll add it manually
```

**If option (a) — retrofit-append:**

1. Archive `rules.md` first, using the exact same archive step as the full-prepend path above (sets `$ARCHIVE_DIR`, must run before the awk block below).

2. Append the Knowledge Governance section immediately before the closing marker:
   ```bash
   GOVERNANCE_BLOCK=$(awk '/^## Knowledge Governance$/{found=1} found{print}' \
     "${CLAUDE_PLUGIN_ROOT}/core/default-templates/concepts/templates/project/rules.md" \
     | awk '/^<!-- \/kmgraph-defaults -->$/{exit} {print}')

   # GOVERNANCE_BLOCK is multi-line. Do NOT pass it via `awk -v` -- BSD awk
   # (the only awk on macOS) rejects a literal newline in a -v assignment
   # outright, so this would fail 100% of the time on the target platform.
   # Pass it through the environment instead, which does not run
   # escape-sequence processing on the value and has no newline restriction.
   #
   # Matched on a WHITESPACE-NORMALIZED copy of each line (strip a trailing
   # \r for CRLF-authored files, and trailing spaces/tabs), not the raw line
   # -- the detection awk above (line ~975) matches the closing marker as an
   # unanchored substring, so it already treats a marker with trailing
   # whitespace or CRLF line endings as "present". A strict `^...$` match on
   # the raw line here would disagree with that and offer a retrofit it then
   # can't perform (verified against fixtures with both variants).
   #
   # Deliberately NOT stripping LEADING whitespace/indentation here, even
   # though that would make detection and mutation agree on an indented
   # marker too: 4+ spaces of leading indentation is Markdown's own syntax
   # for a fenced code block (verbatim-quoted text), so an indented marker
   # line is exactly the "a user is quoting this marker as a documented
   # example" case this whole path exists to not corrupt -- stripping the
   # indentation would make the mutation match a quoted example instead of
   # correctly refusing to. An indented real closing marker (an unusual
   # authoring choice) will still fail loudly via the `END` guard below
   # rather than being silently mismatched; that's the safe direction to be
   # wrong in.
   #
   # The `done` guard still ensures only the first NORMALIZED-match occurrence
   # is treated as the real closing tag; combined with the `SAFE_SINGLE_BLOCK`
   # gate above (which requires exactly one occurrence of BOTH markers, in
   # the right order -- see the branch table), "first match" and "the real
   # block" are the same thing by the time this code runs. The original
   # (unnormalized) line is what gets printed back out, so trailing
   # whitespace/CRLF in the user's file is preserved untouched.
   #
   # `END { exit(done ? 0 : 1) }` makes a genuine miss (no closing marker
   # found at all) a real failure instead of a silently-successful no-op:
   # awk would otherwise pass the file through completely unchanged, the
   # `[ -s ]` check would still see a non-empty file, and the script would
   # report success while having appended nothing.
   GOVERNANCE_BLOCK="$GOVERNANCE_BLOCK" awk '
     BEGIN { block = ENVIRON["GOVERNANCE_BLOCK"] }
     {
       norm = $0
       gsub(/\r$/, "", norm)
       gsub(/[ \t]+$/, "", norm)
     }
     norm == "<!-- /kmgraph-defaults -->" && !done { print block "\n"; print; done = 1; next }
     { print }
     END { exit(done ? 0 : 1) }
   ' "{KG_PATH}/rules.md" > /tmp/rules-governance-patched.md \
     && [ -s /tmp/rules-governance-patched.md ] \
     && mv /tmp/rules-governance-patched.md "{KG_PATH}/rules.md" \
     && echo "✅ Knowledge Governance section appended inside the existing kmgraph-defaults block" \
     || { rm -f /tmp/rules-governance-patched.md; echo "⚠️  Append failed — closing <!-- /kmgraph-defaults --> marker not found, or a write error occurred. Add the section manually, or restore from the archived copy at $ARCHIVE_DIR/rules.md."; }
   ```

**Safety rules:**
- Archive is always taken before writing, on both paths.
- Prepend/append only — never replaces or removes existing user content, including `## Git Workflow`/`## Version & Release` on the retrofit path.
- `SAFE_SINGLE_BLOCK` (exactly one opening marker, exactly one closing marker, opening before closing) is checked BEFORE the retrofit offer is ever shown, not handled inside the retrofit mutation itself — first-match logic inside the awk cannot tell "the real block" from "a quoted example that happens to come first in file order," a raw opening-marker count alone would miss a stray extra closing marker with no matching stray opening marker, and neither count alone catches an orphan closing marker sitting above the real block's own opening marker. All three shapes (duplicate/multiple, count mismatch, wrong order) are caught upstream by `SAFE_SINGLE_BLOCK`, before either path is offered, instead of guessed at downstream. See the branch table above.
- Once the retrofit path is reached (which only happens when `SAFE_SINGLE_BLOCK` holds), the mutation matches on a whitespace/CRLF-normalized (trailing whitespace and CRLF only, deliberately NOT leading indentation — see the code comment above the awk) equality test, consistent with the detection awk's own unanchored substring match — a trailing-whitespace or CRLF-terminated closing marker that detection already counted as present will not silently fail to append. An indented closing marker is a real mismatch between detection and mutation that's still possible in principle, but fails loudly (reported failure) rather than silently mismatching, which is the safer direction to leave unresolved.
- A malformed block (missing, duplicated, or misordered markers) never reaches the retrofit path at all — caught upstream by `SAFE_SINGLE_BLOCK`. Within the retrofit path itself, a genuine awk-level miss is still a reported failure, not a silent no-op that claims success.
- Idempotent: both paths' detection gates skip if their respective content is already present.

#### k. Platform block detection in rules.md (v0.5.0 — ADR-032 remediation)

**Purpose:** Detect `rules.md` files that contain a `## Platform Preferences` or `## Platform` section, which indicates platform-specific directives that should be in the platform config file (e.g., `CLAUDE.md`) per ADR-032. This check is the successor to section d's contamination grep — section d targets tool-directive lines while section k targets the presence of a dedicated platform section heading.

**Schema version gate:** If `$SCHEMA_VERSION -ge 2` (computed in section i), skip section k silently.

**Detection:**

```bash
PLATFORM_SECTION=$(grep -n '^## Platform' "{KG_PATH}/rules.md" 2>/dev/null)
```

If `$PLATFORM_SECTION` is empty, skip this check silently.

**If a platform section heading found,** display and offer:

```
rules.md contains a Platform section (line N):
  "## Platform Preferences"

Per ADR-032, platform-specific tool directives belong in the platform config (CLAUDE.md, GEMINI.md, etc.), not rules.md.

Options:
  a. Relocate automatically — same flow as section d (archive → move → remove from rules.md)
  b. Skip — I'll handle manually
```

**If option (a):** delegate to the section d auto-relocate flow (read `commands/kmg-init-shared/kmg-knowledge-file-migrator.md`), passing the full section content as `{CONTAMINATION}`.

After the platform section is relocated, offer the tier mapping walkthrough inline:

```
Your rules.md platform section has been moved to CLAUDE.md.

Would you like to configure tier mappings in me.md now?
  1. Yes — run tier mapping setup
  2. Skip — I'll edit me.md manually later
```

**If option 1:** Run the tier mapping walkthrough exactly as specified in `commands/init.md § Tier mapping setup`. Target file: `{KG_PATH}/me.md` (or `~/.kmgraph/me.md` if personal KG). After completion, `me.md` will have a populated `platforms[]` block with `profile_schema: 1`.

**Safety rules:**
- Section d and k do not double-run: if section d already relocated the content in this session, the `$SCHEMA_VERSION` gate prevents section k from re-offering.
- Archive is always taken before any write.
- Tier mapping walkthrough is offered only after successful relocation — not independently by this section.

#### l. Starter relocation (v0.5.10.7 — ENH-022 Problem 3)

**Purpose:** Move starter template files from live dirs to `templates/` (ADR-040).

**Detection:** `_starters_to_move[]` populated in the detection phase above.

**Apply (archive-before-write):**

```bash
if [ ${#_starters_to_move[@]} -gt 0 ]; then
  ARCHIVE_DIR="{KG_PATH}/.kg-archive-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "${ARCHIVE_DIR}/starters" "{KG_PATH}/templates"
  echo "{\"archived_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"trigger\":\"starter-relocation\"}" > "${ARCHIVE_DIR}/manifest.json"
  for _f in "${_starters_to_move[@]}"; do
    _dest="{KG_PATH}/templates/$(basename "${_f}")"
    cp "{KG_PATH}/${_f}" "${ARCHIVE_DIR}/starters/$(basename "${_f}")"
    if [ ! -f "$_dest" ]; then
      mv "{KG_PATH}/${_f}" "$_dest"
    else
      rm "{KG_PATH}/${_f}"
      echo "  Note: $(basename ${_f}) already in templates/ — removed live-dir copy"
    fi
  done
  echo "✓ Starters relocated to templates/ (archive: ${ARCHIVE_DIR})"
fi
```

**Safety rules:**
- Archive created before any move.
- Only `*-template.md` files move; README files in live dirs are unaffected.

---

#### m. knowledge/knowledge/ migration (v0.5.10.7 — ENH-022 Problem 2)

**Purpose:** Detect and clean up the legacy `knowledge/knowledge/` nesting artifact from pre-v0.5.10.7 installs.

**Detection:** `_modified_kk[]` and `knowledge-knowledge-merge` / `knowledge-knowledge-modified` populated in the detection phase above.

**Apply — unmodified starters (auto-merge):**

```bash
if [[ " ${upgrades[*]} " =~ "knowledge-knowledge-merge" ]]; then
  ARCHIVE_DIR="{KG_PATH}/.kg-archive-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "${ARCHIVE_DIR}/knowledge-knowledge" "{KG_PATH}/knowledge/concepts"
  cp -r "{KG_PATH}/knowledge/knowledge/." "${ARCHIVE_DIR}/knowledge-knowledge/"
  echo "{\"archived_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"trigger\":\"knowledge-knowledge-merge\"}" > "${ARCHIVE_DIR}/manifest.json"
  mv "{KG_PATH}/knowledge/knowledge/"*.md "{KG_PATH}/knowledge/concepts/" 2>/dev/null || true
  rmdir "{KG_PATH}/knowledge/knowledge" 2>/dev/null || true
  echo "✓ knowledge/knowledge/ merged into knowledge/concepts/ and removed"
fi
```

**Apply — modified files (warn only):**

```bash
if [[ " ${upgrades[*]} " =~ "knowledge-knowledge-modified" ]]; then
  ARCHIVE_DIR="{KG_PATH}/.kg-archive-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "${ARCHIVE_DIR}/knowledge-knowledge"
  cp -r "{KG_PATH}/knowledge/knowledge/." "${ARCHIVE_DIR}/knowledge-knowledge/"
  echo "{\"archived_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"trigger\":\"knowledge-knowledge-modified\"}" > "${ARCHIVE_DIR}/manifest.json"
  echo "⚠️  knowledge/knowledge/ contains modified files: ${_modified_kk[*]}"
  echo "    Archived to ${ARCHIVE_DIR}. Review and move into knowledge/concepts/ manually."
fi
```

**Safety rules:**
- Archive created before any move.
- Modified files are never auto-moved — warn only, user must resolve manually.
- `rmdir` is safe: only removes the dir when empty after the move.

---

#### n. cowork-knowledge archive (v0.6.20 — ADR-066)

**Purpose:** Detect legacy `~/.claude/cowork-knowledge/` content and offer to archive it. Real Claude Cowork has no plugin/slash-command extensibility — this KG mode was never actually reachable through the product it targeted. Cowork KG mode is removed from new setups; existing content is never silently dropped or auto-migrated (ADR-063).

**Detection:** populated in the detection phase above (`cowork-archive` in `upgrades[]`).

If found, display and offer:

```
Found cowork-knowledge content at ~/.claude/cowork-knowledge/:
  N files

This plugin's cowork KG mode is incompatible with real Claude Cowork (no reachable
plugin surface) and has been removed from new setups. Your existing content is not
deleted or migrated automatically.

Options:
  a. Archive — copy to {KG_PATH}/.kg-archive-YYYYMMDD-HHMMSS/cowork-knowledge/, leave original in place
  b. Skip — leave cowork-knowledge/ untouched
```

**If option (a) — archive:**

```bash
ARCHIVE_DIR="{KG_PATH}/.kg-archive-$(date +%Y%m%d-%H%M%S)"
mkdir -p "${ARCHIVE_DIR}/cowork-knowledge"
cp -r "$HOME/.claude/cowork-knowledge/." "${ARCHIVE_DIR}/cowork-knowledge/"
echo "{\"archived_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"source\":\"$HOME/.claude/cowork-knowledge\",\"trigger\":\"cowork-archive\"}" > "${ARCHIVE_DIR}/manifest.json"
echo "✅ Archived cowork-knowledge → ${ARCHIVE_DIR}/cowork-knowledge/"
echo "   Original left in place at $HOME/.claude/cowork-knowledge/ — remove manually once you've confirmed the archive."
```

**If option (b) — skip:** leave `~/.claude/cowork-knowledge/` unchanged.

**Safety rules:**
- Never deletes the original — copy-only (ADR-063: never destroy known-good state).
- No auto-migration into global-topic mode — archiving is the only automated action.

---

#### o. Global-topic KG relocation (v0.6.20 — ADR-066)

**Purpose:** Detect global-topic KGs still at the legacy `~/.claude/knowledge-graphs/<name>/` location and offer a one-time copy-forward to `~/.kmgraph/knowledge-graphs/<name>/` (no wrapper folder — per-KG paths are stored individually in `kg-config.json`, so this needs no pre-built umbrella).

**Detection:** populated in the detection phase above (`global-topic-relocate` in `upgrades[]`).

If found, display and offer:

```
Found global-topic KG(s) at the legacy location:
  ~/.claude/knowledge-graphs/<name>/  (and any others found)

These belong at ~/.kmgraph/knowledge-graphs/<name>/ (current layout). Options:
  a. Copy forward — copy each to ~/.kmgraph/knowledge-graphs/<name>/, leave originals in place, update kg-config.json paths
  b. Skip — I'll relocate manually
```

**If option (a) — copy forward:**

```bash
OLD_GT_DIR="$HOME/.claude/knowledge-graphs"
NEW_GT_ROOT="$HOME/.kmgraph/knowledge-graphs"
mkdir -p "$NEW_GT_ROOT"
_gt_migrated=()
for _gt in "$OLD_GT_DIR"/*/; do
  [ -d "$_gt" ] || continue
  _name=$(basename "$_gt")
  _dest="$NEW_GT_ROOT/$_name"
  if [ -d "$_dest" ]; then
    echo "  Skipped $_name — already exists at $_dest"
    _gt_migrated+=("$_name")
    continue
  fi
  if cp -r "$_gt" "$_dest"; then
    echo "✅ Copied $_name → $_dest"
    _gt_migrated+=("$_name")
  else
    echo "⚠️  Copy failed for $_name — kg-config.json will NOT be repointed for this graph."
    rm -rf "$_dest" 2>/dev/null
  fi
done
echo "Originals left in place at $OLD_GT_DIR — remove manually once you've confirmed the copies."
```

After copying, update `kg-config.json` entries for graphs that actually have content at the new location (either just copied, or already present) — never for a graph whose copy failed, since that would repoint config at content that isn't really there:

```bash
CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"
if [ ${#_gt_migrated[@]} -eq 0 ]; then
  echo "No graphs to repoint — kg-config.json left unchanged."
else
  MIGRATED_JSON=$(printf '%s\n' "${_gt_migrated[@]}" | jq -R . | jq -s .)
  if jq --arg old "$HOME/.claude/knowledge-graphs" --arg new "$HOME/.kmgraph/knowledge-graphs" --argjson names "$MIGRATED_JSON" '
    .graphs |= with_entries(
      if (.key as $k | $names | index($k)) and ((.value.path // "") | startswith($old))
      then .value.path = ($new + (.value.path[($old | length):]))
      else . end
    )
  ' "$CONFIG_PATH" > "${CONFIG_PATH}.tmp" && [ -s "${CONFIG_PATH}.tmp" ] && jq empty "${CONFIG_PATH}.tmp" 2>/dev/null; then
    mv "${CONFIG_PATH}.tmp" "$CONFIG_PATH"
    echo "✅ kg-config.json paths updated for: ${_gt_migrated[*]}"
  else
    rm -f "${CONFIG_PATH}.tmp"
    echo "⚠️  kg-config.json update failed (jq error or invalid output) — original left untouched. Update paths manually if needed."
  fi
fi
```

**If option (b) — skip:** leave both the legacy directory and `kg-config.json` unchanged.

**Safety rules:**
- Copy-only — never deletes or moves the original (ADR-063).
- Never overwrites an existing destination — skips per-KG if already present at the new path.
- `kg-config.json` rewrite only touches `path` values under the old prefix, and only after the copy succeeds.

#### p. Stale FTS5 index format (v0.7.4 — issue-55)

**Purpose:** Offer an opt-in rebuild of a project-local search index that still lives at the pre-v0.7.4 name-only path.

Before v0.7.4 a project-local FTS5 index was stored at `~/.kmgraph/index/projects/<kg_name>.db` — keyed by the graph's *name* alone. Two unrelated repos that both named their graph `knowledge` silently shared one index file, so `kg_search` in one project could return the other project's notes, or (when the shared index was stale) return nothing at all while never falling back to the linear scan that would have found the content. The filename now also carries a short digest of the graph's real filesystem path (`<kg_name>-<pathHash>.db`), which makes that collision impossible.

**Detection:** fully MCP-covered — this category is emitted by `kg_upgrade` inspect (`stale-fts5-index-format` in `upgrades[]`) and has no bash fallback. It fires only when an old-format file exists for this graph **and** no new-format file has been built yet, so it stops appearing as soon as the rebuild has run. It never fires for the personal graph, which has always used a fixed singleton path (`~/.kmgraph/index/personal.db`) and has nothing to migrate.

**Apply:** included in the batched `kg_upgrade apply: [...]` call like any other MCP-covered category. It sets no `_mcp_covered_*` flag and does **not** require `confirmBackfix` — unlike the content-repair categories it never edits a knowledge file, it only writes a new cache file under `~/.kmgraph/index/`. The wizard's per-item yes/no is the only consent it needs.

**Safety rules:**
- Non-destructive — re-reads the graph's own markdown and writes a fresh index. Nothing in the knowledge graph is modified.
- The old index file is left exactly where it is (ADR-063). Once the new one exists the old one is inert and the user can delete it whenever they like.
- Idempotent — applying again on an already-migrated graph just rebuilds at the current-format path.

#### q. Stale handoff-packages location (v0.7.4 — issue-56)

**Purpose:** Offer an opt-in migration of pre-fix `./handoff-packages/<date>/` folders into `knowledge/handoffs/<date>/`.

Before issue-31's fix, `/kmgraph:kmg-handoff` wrote every package to `<repoRoot>/handoff-packages/<date>/`, the same relative-to-cwd literal that predated the v0.6.20 content-location migration. Because `handoff-packages/` is gitignored, `git status` never surfaced these, so a repo can silently accumulate them indefinitely. The default output location is now `knowledge/handoffs/<date>/`, but that fix only changed where *new* packages land — anything already on disk stays exactly where it was until this category is applied.

**Detection:** fully MCP-covered — this category is emitted by `kg_upgrade` inspect (`stale-handoff-packages-location` in `upgrades[]`) and has no bash fallback. It fires only when `<repoRoot>/handoff-packages/` exists and contains at least one dated subfolder; `repoRoot` is derived as the parent directory of the graph's own path, not a hardcoded `"knowledge"` literal, so it works even if a project's KG folder isn't named `knowledge`. It never fires for the personal graph — this is a per-repo convention, not something the personal graph has ever done.

**Apply:** included in the batched `kg_upgrade apply: [...]` call like any other MCP-covered category. It sets no `_mcp_covered_*` flag and does **not** require `confirmBackfix` — like `stray-knowledge-dir`, it only ever deduplicates a file that's byte-identical to one already at the destination, or reports (never overwrites) one that differs. The wizard's per-item yes/no is the only consent it needs.

**Safety rules:**
- Never overwrites — a destination file that differs from its stray counterpart is left untouched on both sides and named in the result for manual review (ADR-063).
- A stray dated folder (and `handoff-packages/` itself) is only removed once it's fully empty; anything flagged for manual review keeps its folder in place.
- Idempotent — applying again after a manual review/cleanup only touches what's still actually stray.

#### r. Gemini CLI upgrade-check hook retrofit (v0.7.9 — ADR-055 amendment, Component B)

**Purpose:** Deploy the session-start upgrade-check hook (`.gemini/kmgraph-upgrade-check.sh` + its `.gemini/settings.json` registration) into a project that already has `GEMINI.md` configured from before this feature shipped. New Gemini CLI configurations get this automatically via `/kmgraph:kmg-init`'s own platform-configuration step; this section only covers already-configured projects that would otherwise never receive it.

**Detection:** fires when `GEMINI.md` exists at the project root (Gemini CLI already configured) AND `.gemini/kmgraph-upgrade-check.sh` does not exist yet (the detection check above already verified this).

**Execute:** identical deploy-and-register logic as `/kmgraph:kmg-init` § Step 1.11's Gemini CLI platform block — `mkdir -p .gemini`, `sed`-substitute `__DEPLOY_TIME_PLUGIN_CACHE_ROOT__` with `$(dirname "${CLAUDE_PLUGIN_ROOT}")`, write and `chmod +x` `.gemini/kmgraph-upgrade-check.sh`, then filter-then-append the hook entry into `.gemini/settings.json`'s `hooks.SessionStart` array (never `unique_by(.name)` — that would collapse every pre-existing nameless hook entry into one on first run).

**Constraints:**
- Gated behind the wizard's existing per-item yes/no in the Apply/Choose/Skip menu — same consent model as every other bash-only-detected item in this file (e.g. Wiki pass above); no separate confirmation flow.
- Idempotent: re-running after successful deployment finds `.gemini/kmgraph-upgrade-check.sh` already present and skips this check silently.
- Additive only: never removes or overwrites a pre-existing hand-written `hooks.SessionStart` entry — only our own prior `"kmgraph-upgrade-check"`-named entry is replaced in place.
