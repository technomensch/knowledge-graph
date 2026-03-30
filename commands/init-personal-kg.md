---
description: Create or register a personal knowledge graph for cross-project lessons
allowed-tools: Bash, Read, Write, kg_fts5_rebuild
---

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
1. Use this existing KG (no action needed)
2. Re-initialize it (reset structure, keep existing lessons)
3. Register a different path as personal KG
4. Cancel
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
for f in patterns.md gotchas.md concepts.md architecture.md workflows.md index.md; do
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
