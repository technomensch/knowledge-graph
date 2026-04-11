---
description: Create or register a personal knowledge graph for cross-project lessons
allowed-tools: Bash, Read, Write, kg_fts5_rebuild
---

## Execution Rules

All bash/shell checks in this command are **implementation guidance only** — run them silently as internal steps. Never show bash commands, shell code, or raw command output to the user. Present only plain-English results, prompts, and status messages.

# /kmgraph:init-personal-kg

Create a personal knowledge graph at `~/.claude/knowledge-graph/` for capturing
lessons, patterns, and ADRs that apply across multiple projects.

---

## When to Use

- After `/kmgraph:init` (skipped the personal KG offer)
- When you want a dedicated place for workflow lessons, cross-project gotchas, and personal ADRs
- When `/kmgraph:capture-lesson` asks "Save to project KG or personal KG?" but no personal KG exists yet

---

## What This Does

1. Creates `~/.claude/knowledge-graph/` with standard directory structure
2. Registers it in `~/.claude/kg-config.json` as `type: "personal"` with name `"personal"`
3. Copies knowledge templates (patterns, gotchas, concepts)
4. Builds FTS5 search index
5. Does NOT change the active KG — your project KG remains active

After setup, `/kmgraph:capture-lesson` shows a KG picker when saving lessons, and
`/kmgraph:recall` searches both project and personal KGs automatically.

---

## Steps

### Step 1: Check for existing personal KG

**→ Execute shared module:** Read `commands/init-shared/upgrade-inspector.md` and follow it exactly.
Parameters:
- `{KG_PATH}` = resolved personal KG path
- `{kg_name}` = "personal"
- `{KG_TYPE}` = "personal"
- `{categories}` = ["architecture", "debugging", "patterns", "process"]

**After upgrade-inspector completes (Option 1), always continue to Step 8 (content migration) and Step 9 (evidence seeding).** These run independently of the template upgrade check — an up-to-date template install does not mean me.md/rules.md have been populated.

**If option 2 selected (re-initialize):**

1. Archive all existing content before touching anything:
   ```bash
   ARCHIVE_DATE=$(date +%Y-%m-%d)
   ARCHIVE_DIR="{personal_kg_path}/.kg-archive-${ARCHIVE_DATE}"
   mkdir -p "$ARCHIVE_DIR"
   for subdir in knowledge lessons-learned decisions sessions; do
     [ -d "{personal_kg_path}/$subdir" ] && cp -r "{personal_kg_path}/$subdir" "$ARCHIVE_DIR/$subdir"
   done
   for f in me.md rules.md kg-index-global.md; do
     [ -f "{personal_kg_path}/$f" ] && cp "{personal_kg_path}/$f" "$ARCHIVE_DIR/$f"
   done
   ```

2. Record pre-archive lesson and ADR counts for post-validation:
   ```bash
   PRE_LESSON_COUNT=$(find "{personal_kg_path}/lessons-learned" -name "*.md" ! -name "*template*" 2>/dev/null | wc -l | tr -d ' ')
   PRE_ADR_COUNT=$(find "{personal_kg_path}/decisions" -name "ADR-*.md" 2>/dev/null | wc -l | tr -d ' ')
   ```

3. Proceed through Steps 3-7 (directory structure, templates, config, FTS5 index, confirm).

4. After re-init, validate lesson and ADR counts are preserved:
   ```bash
   POST_LESSON_COUNT=$(find "{personal_kg_path}/lessons-learned" -name "*.md" ! -name "*template*" 2>/dev/null | wc -l | tr -d ' ')
   POST_ADR_COUNT=$(find "{personal_kg_path}/decisions" -name "ADR-*.md" 2>/dev/null | wc -l | tr -d ' ')

   if [ "$PRE_LESSON_COUNT" -ne "$POST_LESSON_COUNT" ] || [ "$PRE_ADR_COUNT" -ne "$POST_ADR_COUNT" ]; then
     echo "⚠️  Content count mismatch after re-init."
     echo "   Before: $PRE_LESSON_COUNT lessons, $PRE_ADR_COUNT ADRs"
     echo "   After:  $POST_LESSON_COUNT lessons, $POST_ADR_COUNT ADRs"
     echo "   Archive preserved at: $ARCHIVE_DIR"
   else
     echo "✅ Re-initialization complete. $POST_LESSON_COUNT lessons and $POST_ADR_COUNT ADRs preserved."
     echo "📦 Archive preserved at: $ARCHIVE_DIR"
     echo "   Delete when satisfied: rm -rf $ARCHIVE_DIR"
   fi
   ```

5. Continue to Step 8 (content migration) and Step 9 (evidence seeding).

**If none exists:** Proceed to Step 2.

---

### Step 2: Confirm path

```
Creating personal knowledge graph at: ~/.claude/knowledge-graph/

This is the default path for cross-project lessons. Use a custom path?

1. Use default (~/.claude/knowledge-graph/)
2. Custom path — enter full path
```

Store resolved path as `{personal_kg_path}`.

---

### Step 3: Create directory structure

**→ Execute shared module:** Read `commands/init-shared/directory-scaffold.md` and follow it exactly.
Parameters:
- `{KG_PATH}` = resolved personal KG path
- `{categories}` = ["architecture", "debugging", "patterns", "process"]

---

### Step 4: Copy templates

**→ Execute shared module:** Read `commands/init-shared/template-seed.md` and follow it exactly.
Parameters:
- `{KG_PATH}` = resolved personal KG path
- `{CLAUDE_PLUGIN_ROOT}` = plugin root path

When deploying `me.md` to the personal KG, strip the "See also: ~/.claude/knowledge-graph/me.md" line — it is a project-KG cross-reference that points to itself when deployed as the personal KG's own me.md.

---

### Step 5: Register in config

**→ Execute shared module:** Read `commands/init-shared/config-entry-write.md` and follow it exactly.
Parameters:
- `{KG_PATH}` = resolved personal KG path
- `{kg_name}` = "personal"
- `{KG_TYPE}` = "personal"
- `{categories}` = ["architecture", "debugging", "patterns", "process"]
- `{git_strategy}` = "all-ignore"
- `{category_git_rules}` = all categories set to "ignore"
- `{preserve_active}` = true

---

### Step 6: Build FTS5 index

**→ Execute shared module:** Read `commands/init-shared/fts5-rebuild.md` and follow it exactly.
Parameters:
- `{KG_PATH}` = resolved personal KG path
- `{kg_name}` = "personal"

---

### Step 7: Confirm

```
✅ Personal KG ready at ~/.claude/knowledge-graph/

What changed:
  • Registered as "personal" (type: personal) in ~/.claude/kg-config.json
  • Active KG unchanged: still "[current active KG]"

How to use:
  • /kmgraph:capture-lesson — saves to project KG by default; pick "personal" for cross-project lessons
  • /kmgraph:recall "query" — now searches both project and personal KGs automatically
  • /kmgraph:switch personal — make personal KG active (advanced; usually not needed)
```

---

### Step 8: Content migration offer

Offer to populate `me.md` and `rules.md` from `~/.claude/CLAUDE.md`:

```
me.md and rules.md have been created in your personal KG.
Would you like help populating them from your global ~/.claude/CLAUDE.md?

  1. Yes — show me what would move where (review before writing)
  2. No — I'll fill them in manually
```

**If Yes:**
1. Parse `~/.claude/CLAUDE.md` and display proposed mapping before writing anything:
   ```
   Proposed mapping from ~/.claude/CLAUDE.md:
     "Personal Preferences" section → me.md
     "Cross-Project Conventions" section → rules.md
     Platform-specific / project-specific content → CLAUDE.md (retained)
   ```
2. User confirms each section before it is written.
3. Before rewriting CLAUDE.md, copy original to `CLAUDE.md.bak`.
4. Rewrite `~/.claude/CLAUDE.md` to a minimal pointer:
   ```
   For full context, read ~/.claude/knowledge-graph/rules.md and ~/.claude/knowledge-graph/me.md before acting.
   ```
5. Also offer to migrate `user`-type entries from `~/.claude/projects/*/memory/MEMORY.md` (role, preferences, expertise — not project-specific entries) into personal `me.md`.
6. If user declines or aborts, restore from `CLAUDE.md.bak` and delete it.

**Safety rules:** Never auto-write. User confirms per section. If `~/.claude/CLAUDE.md` does not exist, skip silently.

**Skip this step** if `me.md` already has substantial content (more than the template placeholder text) — the user has already populated it manually.

---

### Step 9: Evidence seeding

After Step 8 (whether or not the migration ran), check whether existing personal lessons or ADRs can seed `Why:`/`Source:` links into `rules.md`:

```bash
LESSON_COUNT=$(find "{personal_kg_path}/lessons-learned" -name "*.md" ! -name "*template*" 2>/dev/null | wc -l | tr -d ' ')
ADR_COUNT=$(find "{personal_kg_path}/decisions" -name "ADR-*.md" 2>/dev/null | wc -l | tr -d ' ')
```

If `LESSON_COUNT` or `ADR_COUNT` is greater than 0:
```
Your personal KG has [N] lessons and [M] ADRs.
Would you like me to scan them and suggest Why:/Source: links for rules.md entries?

  1. Yes — scan and show me suggestions (you approve each one before it is written)
  2. Skip — I'll add evidence links manually
```

If Yes: scan each lesson and ADR for topic matches against `rules.md` entries. Surface candidate `Why:`/`Source:` pairs one at a time — user accepts or skips each. Write only accepted pairs.

If both counts are 0: skip silently (normal for a fresh personal KG).

---

## Related Commands

- `/kmgraph:init` — Full KG initialization wizard (includes personal KG offer)
- `/kmgraph:capture-lesson` — Capture lessons; shows KG picker when multiple KGs registered
- `/kmgraph:recall` — Search across project and personal KGs
- `/kmgraph:switch` — Change active KG
