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
1. See what's new — review improvements in this version, then decide what to apply
2. Re-initialize it (reset structure, keep existing lessons)
3. Register a different path as personal KG
4. Cancel
```

**If option 1 selected**, inspect the personal KG's actual state and report only what is missing or upgradeable for this specific install:

```bash
upgrades=()

# Index reorganization — knowledge/index.md renamed to kg-category-index.md; new root kg-index.md created
if [ -f "{personal_kg_path}/knowledge/index.md" ] && [ ! -f "{personal_kg_path}/knowledge/kg-category-index.md" ]; then
  upgrades+=("Index update: renames {personal_kg_path}/knowledge/index.md to kg-category-index.md and adds a new kg-index.md at the knowledge graph root as the primary entry point")
elif [ ! -f "{personal_kg_path}/kg-index-user.md" ]; then
  upgrades+=("New: kg-index-user.md — the primary entry point for this personal knowledge graph")
fi

[ ! -f "{personal_kg_path}/me.md" ]    && upgrades+=("New: me.md — your cross-project identity and working style")
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
for f in patterns.md gotchas.md concepts.md architecture.md workflows.md kg-category-index.md; do
  src="${CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/$f"
  dest="{personal_kg_path}/knowledge/$f"
  [ -f "$src" ] && [ ! -f "$dest" ] && cp "$src" "$dest"
done
```

Only copy if template doesn't already exist (preserves user content on re-init).

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

## Related Commands

- `/kmgraph:init` — Full KG initialization wizard (includes personal KG offer)
- `/kmgraph:capture-lesson` — Capture lessons; shows KG picker when multiple KGs registered
- `/kmgraph:recall` — Search across project and personal KGs
- `/kmgraph:switch` — Change active KG
