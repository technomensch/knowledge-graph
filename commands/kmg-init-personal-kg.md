
## Execution Rules

All bash/shell checks in this command are **implementation guidance only** — run them silently as internal steps. Never show bash commands, shell code, or raw command output to the user. Present only plain-English results, prompts, and status messages.

# /kmgraph:kmg-init-personal-kg

Create a personal knowledge graph at `~/.kmgraph/` (platform-neutral default path) for capturing
lessons, patterns, and ADRs that apply across multiple projects.

---

## When to Use

- After `/kmgraph:kmg-init` (skipped the personal KG offer)
- When you want a dedicated place for workflow lessons, cross-project gotchas, and personal ADRs
- When `/kmgraph:kmg-capture-lesson` asks "Save to project KG or personal KG?" but no personal KG exists yet

---

## What This Does

1. Creates `~/.kmgraph/` with standard directory structure
2. Registers it in `~/.kmgraph/kg-config.json` as `type: "personal"` with name `"personal"`
3. Copies knowledge templates (patterns, gotchas, concepts)
4. Builds FTS5 search index
5. Does NOT change the active KG — your project KG remains active

After setup, `/kmgraph:kmg-capture-lesson` shows a KG picker when saving lessons, and
`/kmgraph:kmg-recall` searches both project and personal KGs automatically.

---

## Steps

### Step 1: Check for existing personal KG

Check if a personal knowledge graph already exists: look up `~/.kmgraph/kg-config.json` for any entry with `type: "personal"` at the target path (`~/.kmgraph/` by default).

**If NO existing personal KG is found:** skip this step and proceed to Step 2 (directory scaffolding).

**If an existing personal KG IS found:**

> ⚠️ **STOP — EXISTING PERSONAL KG DETECTED**
>
> A personal knowledge graph already exists at [path].
>
> **You MUST present the menu below before proceeding.**
> **Do NOT run any initialization, scaffolding, FTS5, or wiki steps yet.**
> **Wait for the user to select an option.**

Present this menu to the user:

```
A personal knowledge graph already exists at [path].

What would you like to do?

1. See what's new   — run upgrade inspector (recommended)
2. Check for issues — run upgrade inspector
3. Re-initialize    ⚠️  destructive; resets templates and structure
4. Cancel — the existing personal KG is already set up

Enter option (1/2/3/4):
```

**Do not proceed past this point until the user has entered a selection.**

#### Options 1 or 2: Run Upgrade Inspector (MANDATORY)

**→ You MUST execute this shared module. Read `commands/kmg-init-shared/kmg-upgrade-inspector.md` and follow it exactly before running any other step.**

Parameters:
- `{KG_PATH}` = resolved personal KG path
- `{kg_name}` = "personal"
- `{KG_TYPE}` = "personal"
- `{categories}` = ["architecture", "debugging", "patterns", "process"]

**Cross-project platform-split check (section d):** Section d auto-routes to `~/.claude/CLAUDE.md § Platform Preferences` for personal KGs via the `{KG_TYPE}` = "personal" passed above — no extra parameters needed.

**After upgrade-inspector completes, always continue to Step 8 (content migration) and Step 9 (evidence seeding).** These run independently of the template upgrade check — an up-to-date template install does not mean me.md/rules.md have been populated.

#### Option 3: Re-initialize

Proceed to the re-initialization flow below (archive first, then wizard).

#### Option 4: Cancel

Exit immediately. Do not create or modify any files. Confirm to the user: "No changes made."

**Re-initialization flow (Option 3):**

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
Creating personal knowledge graph at: ~/.kmgraph/

This is the default path for cross-project lessons. Use a custom path?

1. Use default (~/.kmgraph/)
2. Custom path — enter full path
```

Store resolved path as `{personal_kg_path}`.

---

### Step 3: Create directory structure

**→ Execute shared module:** Read `commands/kmg-init-shared/kmg-directory-scaffold.md` and follow it exactly.
Parameters:
- `{KG_PATH}` = resolved personal KG path
- `{categories}` = ["architecture", "debugging", "patterns", "process"]

---

### Step 4: Copy templates

**→ Execute shared module:** Read `commands/kmg-init-shared/kmg-template-seed.md` and follow it exactly.
Parameters:
- `{KG_PATH}` = resolved personal KG path
- `{CLAUDE_PLUGIN_ROOT}` = plugin root path

When deploying `me.md` to the personal KG, strip the "See also: ~/.kmgraph/me.md" line — it is a project-KG cross-reference that points to itself when deployed as the personal KG's own me.md.

After `template-seed.md` completes, also scaffold `triggers.md` if it does not already exist:

```bash
[ -f "{KG_PATH}/triggers.md" ] || cp "{CLAUDE_PLUGIN_ROOT}/core/default-templates/concepts/templates/user/triggers.md" "{KG_PATH}/triggers.md"
echo "✅ triggers.md scaffolded at {KG_PATH}/triggers.md"
```

#### § Tier mapping setup

After scaffolding `me.md`, prompt the user to configure tier mappings:

```
Your me.md has been created at {KG_PATH}/me.md. Let's configure which models to use for each task tier.

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

**Headless mode** (`CLAUDE_CODE_HEADLESS=1`): Skip all prompts. Write empty tier_map stubs. Log: `"Headless mode — tier mapping skipped. Edit {KG_PATH}/me.md YAML frontmatter to configure."`

---

### Step 5: Register in config

**→ Execute shared module:** Read `commands/kmg-init-shared/kmg-config-entry-write.md` and follow it exactly.
Parameters:
- `{KG_PATH}` = resolved personal KG path
- `{kg_name}` = "personal"
- `{KG_TYPE}` = "personal"
- `{categories}` = ["architecture", "debugging", "patterns", "process"]
- `{git_strategy}` = "all-ignore"
- `{category_git_rules}` = all categories set to "ignore"

---

### Step 6: Build FTS5 index

**→ Execute shared module:** Read `commands/kmg-init-shared/kmg-fts5-rebuild.md` and follow it exactly.
Parameters:
- `{KG_PATH}` = resolved personal KG path
- `{kg_name}` = "personal"

---

### Step 7: Confirm

```
✅ Personal KG ready at ~/.kmgraph/

What changed:
  • Registered as "personal" (type: personal) in ~/.kmgraph/kg-config.json
  • No other KG is affected — resolution stays context-derived from your cwd

How to use:
  • /kmgraph:kmg-capture-lesson — saves to the project KG resolved from cwd by default; pick "personal" for cross-project lessons
  • /kmgraph:kmg-recall "query" — now searches both project and personal KGs automatically
  • Pass targetKg: "personal" to kg_capture directly for a one-off personal-KG write from anywhere
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
   For full context, read ~/.kmgraph/rules.md and ~/.kmgraph/me.md before acting.
   ```
5. Also offer to migrate `user`-type entries from `~/.claude/projects/*/memory/MEMORY.md` (role, preferences, expertise — not project-specific entries) into personal `me.md`.
6. If user declines or aborts, restore from `CLAUDE.md.bak` and delete it.

**Safety rules:** Never auto-write. User confirms per section. If `~/.claude/CLAUDE.md` does not exist, skip silently.

**Skip this step** if `me.md` already has substantial content (more than the template placeholder text) — the user has already populated it manually.

---

### Step 8.1: Obsidian wiki link pass

Run this step as content enrichment on every init/upgrade for personal KGs that do not yet have `wiki_pass_complete: true` in their config entry. This step is NOT gated on migration (personal KGs are never migrated).

**Trigger:** Skip this step only if the config entry for this personal KG already has `wiki_pass_complete: true`. Otherwise, always proceed.

**Pre-pass: Build ADR number → filename map**

Before any substitution, scan `{personal_kg_path}/decisions/` and build a lookup table:

```bash
# Build map: ADR number → full basename (without extension)
declare -A ADR_MAP
declare -A ADR_COLLISION

for f in "$personal_kg_path/decisions"/ADR-*.md; do
  [ -e "$f" ] || continue
  basename_noext=$(basename "$f" .md)
  num=$(echo "$basename_noext" | grep -oE '^ADR-[0-9]+')
  if [ -n "${ADR_MAP[$num]:-}" ]; then
    ADR_COLLISION[$num]=1
    echo "⚠️  ADR number collision: $num maps to both ${ADR_MAP[$num]} and $basename_noext — skipping substitution for $num"
  else
    ADR_MAP[$num]="$basename_noext"
  fi
done
```

Any number in `ADR_COLLISION` is skipped during substitution with a warning.

**GitHub repo URL:** Read from `git remote get-url origin` (run from the personal KG root), strip `.git`, append `/issues/`. If no remote is configured, skip `#NNN` substitution entirely and log: `ℹ️  No git remote detected — skipping GitHub issue link substitution.`

**Scope:** Process only `.md` files under these four subdirectories:
- `{personal_kg_path}/lessons-learned/`
- `{personal_kg_path}/decisions/`
- `{personal_kg_path}/sessions/`
- `{personal_kg_path}/concepts/`

Never touch `chat-history/` or files outside these four directories.

**For each `.md` file in scope:**

Skip the file if:
- It is a symlink (skip with warning: `⚠️  Skipping symlink: {path}`)
- Its filename matches `*template*`

Processing:
1. Parse the file and mark NO-SUBSTITUTE zones: YAML frontmatter (opening `---` to closing `---` at file top), triple-backtick code blocks, 4-space indented code blocks, inline backtick spans, existing wiki links (`[[...]]`), existing markdown links (`[...](...)`  or `[...][...]`), and heading lines (lines starting with one or more `#` characters).

2. In body text only (outside all NO-SUBSTITUTE zones), apply substitutions in this order:
   - **a. ENH references:** Replace bare `ENH-NNN` → `[[ENH-NNN]]`
   - **b. ADR references:** Replace bare `ADR-NNN` (not in `ADR_COLLISION`) → `[[{ADR_MAP[ADR-NNN]}]]` (full filename from pre-pass map). Skip with warning if collision or if number not in map.
   - **c. GitHub issues:** Replace bare `#NNN` (not in a heading, not in inline code) → `[#NNN]({GITHUB_ISSUES_URL}/NNN)`. Skip entirely if no git remote.
   - **d. Lesson filenames:** Replace bare `Lessons_Learned_X` or `Lessons_Learned_X.md` → `[[Lessons_Learned_X]]` (build match list from `Lessons_Learned_*` filenames in `lessons-learned/` at scan time).

3. Write back ONLY if content changed:
   ```bash
   # Atomic write — prevents truncation on crash
   orig_size=$(wc -c < "$file")
   if printf '%s' "$new_content" > "${file}.tmp" && [ -s "${file}.tmp" ]; then
     tmp_size=$(wc -c < "${file}.tmp")
     # Substitutions only ever add characters (wrapping references in [[...]]
     # or links) — a legitimate write is never meaningfully shorter than the
     # original. A size far below the original signals a truncated write
     # (e.g. the process was killed mid-printf), not a valid substitution pass.
     if [ "$tmp_size" -ge $(( orig_size * 9 / 10 )) ]; then
       mv "${file}.tmp" "${file}"
     else
       rm -f "${file}.tmp"
       echo "⚠️  Wiki-link write for $file looked truncated (${tmp_size} bytes vs ${orig_size} original) — skipped, original left untouched."
     fi
   else
     rm -f "${file}.tmp"
     echo "⚠️  Wiki-link write for $file failed — original left untouched."
   fi
   ```

**On completion:**

```
✅ Wiki links applied to N files. (M files unchanged)
```

Write `wiki_pass_complete: true` to the KG config entry:

```bash
CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}"
mkdir -p "$(dirname "$CONFIG_PATH")" 2>/dev/null
# one-time migration: seed from the legacy ~/.claude location if the new path is absent
if [ ! -f "$CONFIG_PATH" ] && [ -f "$HOME/.claude/kg-config.json" ]; then
  cp "$HOME/.claude/kg-config.json" "$CONFIG_PATH.tmp.$$" 2>/dev/null && mv -f "$CONFIG_PATH.tmp.$$" "$CONFIG_PATH" 2>/dev/null
fi
if jq '.graphs["personal"].wiki_pass_complete = true' \
  "$CONFIG_PATH" > "${CONFIG_PATH}.tmp" && [ -s "${CONFIG_PATH}.tmp" ] && jq empty "${CONFIG_PATH}.tmp" 2>/dev/null; then
  mv "${CONFIG_PATH}.tmp" "$CONFIG_PATH"
else
  rm -f "${CONFIG_PATH}.tmp"
  echo "⚠️  kg-config.json update failed (jq error or invalid output) — original left untouched."
fi
```

If the personal KG has no content files yet (fresh install), exit cleanly with `0 files modified` — no error.

**`--dry-run` mode (optional):** Print what would change per file without writing anything and do not set the `wiki_pass_complete` flag.

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

- `/kmgraph:kmg-init` — Full KG initialization wizard (includes personal KG offer)
- `/kmgraph:kmg-capture-lesson` — Capture lessons; shows KG picker when multiple KGs registered
- `/kmgraph:kmg-recall` — Search across project and personal KGs
