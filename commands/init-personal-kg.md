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

Read `~/.claude/kg-config.json`. Look for any entry with `type: "personal"`.

**If one already exists:**
```
A personal KG is already registered: "[name]" at [path]

Options:
1. Verify and upgrade — check for missing files, new templates, and offer to populate me.md/rules.md
2. Re-initialize it (reset structure, keep existing lessons)
3. Register a different path as personal KG
4. Cancel
```

**Important:** Option 1 is the default upgrade path. Do NOT offer "use as-is / no action needed" — there may be new templates, missing files, or unpopulated me.md/rules.md to address. Always run the upgrade check.

**If option 1 selected**, inspect the personal KG's actual state and report only what is missing or upgradeable for this specific install:

```bash
upgrades=()

# Index reorganization — knowledge/index.md renamed to kg-category-index-global.md; new root kg-index-global.md created
if [ -f "{personal_kg_path}/knowledge/index.md" ] && [ ! -f "{personal_kg_path}/knowledge/kg-category-index-global.md" ]; then
  upgrades+=("Index update: renames {personal_kg_path}/knowledge/index.md to kg-category-index-global.md and adds a new kg-index-global.md at the personal KG root as the primary entry point")
elif [ ! -f "{personal_kg_path}/kg-index-global.md" ]; then
  upgrades+=("New: kg-index-global.md — the primary entry point for this personal knowledge graph")
fi

[ ! -f "{personal_kg_path}/me.md" ]    && upgrades+=("New: me.md — your cross-project identity and working style")
# When writing me.md to personal KG, strip the "See also: ~/.claude/knowledge-graph/me.md" line — self-referential at personal KG level
[ ! -f "{personal_kg_path}/rules.md" ] && upgrades+=("New: rules.md — cross-project behavioral rules and preferences")

# FTS5 index — personal KG is always outside git so gitignore doesn't apply.
# If .fts5.db exists it is intentional local state — never suggest removal or migration.
# Only surface it if missing (offer to rebuild).
[ ! -f "{personal_kg_path}/.fts5.db" ] && upgrades+=("Search index missing — will be rebuilt on first use")

for tdir in knowledge lessons-learned decisions sessions; do
  for template in "${CLAUDE_PLUGIN_ROOT}/core/templates/$tdir/"*; do
    dest="{personal_kg_path}/$tdir/$(basename $template)"
    [ ! -f "$dest" ] && upgrades+=("New template: $tdir/$(basename $template)")
  done
done
```

If nothing is upgradeable:
```
✅ Your personal KG is already up to date. Nothing to apply.
```

If upgrades exist:
```
Here's what's available for your personal KG:
  • [item 1]
  • [item 2]

Apply all, pick individually, or skip?
  1. Apply all
  2. Let me choose which ones to apply
  3. Skip — my setup is already how I want it
```

After applying upgrades (or if nothing to upgrade), **always continue to Step 8 (content migration) and Step 9 (evidence seeding)**. These run independently of the template upgrade check — an up-to-date template install does not mean me.md/rules.md have been populated.

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

```bash
mkdir -p "{personal_kg_path}"/{knowledge,lessons-learned,decisions,sessions}
mkdir -p "{personal_kg_path}/lessons-learned"/{architecture,debugging,patterns,process}
```

---

### Step 4: Copy templates

```bash
for f in patterns.md gotchas.md concepts.md architecture.md workflows.md; do
  src="${CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/$f"
  dest="{personal_kg_path}/knowledge/$f"
  [ -f "$src" ] && [ ! -f "$dest" ] && cp "$src" "$dest"
done
# kg-category-index deploys as kg-category-index-global.md at personal KG level
src="${CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/kg-category-index.md"
dest="{personal_kg_path}/knowledge/kg-category-index-global.md"
[ -f "$src" ] && [ ! -f "$dest" ] && cp "$src" "$dest"
```

Only copy if template doesn't already exist (preserves user content on re-init).

When deploying `me.md` to the personal KG, strip the "See also: ~/.claude/knowledge-graph/me.md" line — it is a project-KG cross-reference that points to itself when deployed as the personal KG's own me.md.

---

### Step 5: Register in config

Add or update the `"personal"` entry in `~/.claude/kg-config.json`:

```json
"personal": {
  "name": "personal",
  "path": "~/.claude/knowledge-graph",
  "type": "personal",
  "categories": [
    {"name": "architecture", "prefix": null, "git": "ignore"},
    {"name": "debugging",    "prefix": null, "git": "ignore"},
    {"name": "patterns",     "prefix": null, "git": "ignore"},
    {"name": "process",      "prefix": null, "git": "ignore"}
  ],
  "createdAt": "[timestamp]",
  "lastUsed": "[timestamp]"
}
```

Do NOT change `"active"` — project KG remains active.

---

### Step 6: Build FTS5 index

Call `kg_fts5_rebuild` with `kgPath: "{personal_kg_path}"`.

- If `indexed > 0`: confirm success
- If `indexed = 0`: normal for empty KG — log note, not an error

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
