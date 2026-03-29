---
description: Initialize a new knowledge graph with wizard-based setup and flexible configuration
---

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
- Setting up a topic-based global knowledge graph
- Creating a Claude Cowork knowledge space

## Pre-Wizard: Existing KG Detection

Before starting the wizard, check if a knowledge graph already exists for this project in `~/.claude/kg-config.json`. If the current working directory matches an existing KG's path (or is a parent/child of one), present this menu instead of jumping straight to the wizard:

```
A knowledge graph named "[name]" already exists in the config and is set as active.
It's [type] at [path] with categories: [list].

What would you like to do?

1. Verify/upgrade existing KG — check for missing directories, update templates,
   add new config fields from this plugin version
2. Create a new, separate knowledge graph (different name/location)
3. Re-initialize "[name]" (reset categories, git strategy, etc.)
4. Cancel — the existing KG is already set up
```

### Option 1: Verify/Upgrade Flow

When the user selects verify/upgrade, perform these checks in order:

#### 1a. Directory structure check

Verify all expected directories exist. Create any that are missing:

```bash
expected_dirs=(knowledge lessons-learned decisions sessions chat-history)
for dir in "${expected_dirs[@]}"; do
  if [ ! -d "$KG_PATH/$dir" ]; then
    mkdir -p "$KG_PATH/$dir"
    echo "✅ Created missing directory: $dir/"
  fi
done

# Check category subdirectories
for category in "${categories[@]}"; do
  if [ ! -d "$KG_PATH/lessons-learned/$category" ]; then
    mkdir -p "$KG_PATH/lessons-learned/$category"
    echo "✅ Created missing category directory: lessons-learned/$category/"
  fi
done
```

#### 1b. Config field check

Check for config fields introduced in newer versions. Add defaults for any missing fields without overwriting existing values:

```bash
# Fields that may be missing from older installs:
# - platforms: [] (added in v0.2.0)
# - autoSwitch: false (added in v0.2.0)
# - notification: { webhookUrl: "" } (added in v0.2.0)

jq '
  .graphs["'"$kg_name"'"] |=
    if .platforms == null then .platforms = [] else . end |
    if .autoSwitch == null then .autoSwitch = false else . end |
    if .notification == null then .notification = { "webhookUrl": "" } else . end
' ~/.claude/kg-config.json > ~/.claude/kg-config.json.tmp
mv ~/.claude/kg-config.json.tmp ~/.claude/kg-config.json
```

#### 1c. Template update check

Compare installed templates against the plugin's current templates. If newer versions exist, offer to update:

```bash
template_dirs=("knowledge" "lessons-learned" "decisions" "sessions")
updates_available=()

for tdir in "${template_dirs[@]}"; do
  for template in "${CLAUDE_PLUGIN_ROOT}/core/templates/$tdir/"*; do
    dest="$KG_PATH/$tdir/$(basename $template)"
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

#### 1d. Platform config check

Re-run platform detection (Step 1.11) and offer to configure any newly detected platforms that aren't already registered.

#### 1e. FTS5 index check

The search index (`.fts5.db`) is local-only and gitignored — it does not survive upgrades or fresh clones. Check whether it needs to be rebuilt:

```bash
KG_ROOT=$(jq -r '.graphs["'"$kg_name"'"].path' ~/.claude/kg-config.json)
FTS5_DECLINED=$(jq -r '.graphs["'"$kg_name"'"].fts5_declined // false' ~/.claude/kg-config.json)

if [ "$FTS5_DECLINED" = "true" ]; then
  echo "⏭️  Search index: skipped (previously declined)"
elif [ ! -f "$KG_ROOT/.fts5.db" ]; then
  echo "⚠️  Search index not found (local file, not version-controlled)."
  echo ""
  echo "  Rebuild now? This may take a moment for large knowledge graphs."
  echo "    1. Yes — rebuild index"
  echo "    2. Skip for now (search will use linear scan)"
fi
```

If the user selects **Yes**, call `kg_fts5_rebuild`. If the user selects **Skip**, continue without rebuilding (linear scan remains available as fallback).

#### 1f. Output verification summary

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

### Options 2–4

- **Option 2 (Create new):** Proceed to the full wizard (Step 1 below) with a different name.
- **Option 3 (Re-initialize):** Run the full wizard but pre-populate answers from the existing config. Warn that this will reset categories and git strategy. Do NOT delete existing lessons or decisions.
- **Option 4 (Cancel):** Exit with no changes.

---

## Wizard Steps (New KG)

### Step 1: KG Location

```
Where should this knowledge graph be stored?

1. Project-local (./docs/)
2. Global topic-based (~/.claude/knowledge-graphs/[name]/)
3. Claude Cowork (~/.claude/cowork-knowledge/[topic]/)
4. Custom path
```

**Recommendation**: Project-local for single-project use, global for topic-based knowledge sharing across projects.

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
- `location_type`: "project-local", "global", "cowork", "custom"
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
    KG_PATH="./docs/"
    ;;
  "global")
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

```bash
mkdir -p "$KG_PATH"/{knowledge,lessons-learned,decisions,sessions,chat-history}

# Create category subdirectories
for category in "${categories[@]}"; do
  mkdir -p "$KG_PATH/lessons-learned/$category"
done

# Create meta-issue if governance category selected
if [[ " ${categories[@]} " =~ " governance " ]]; then
  mkdir -p "$KG_PATH/meta-issues"
fi
```

### Step 1.6: Copy templates

```bash
# Copy KG templates
cp "${CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/patterns.md" "$KG_PATH/knowledge/"
cp "${CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/gotchas.md" "$KG_PATH/knowledge/"
cp "${CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/concepts.md" "$KG_PATH/knowledge/"
cp "${CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/architecture.md" "$KG_PATH/knowledge/"
cp "${CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/workflows.md" "$KG_PATH/knowledge/"
cp "${CLAUDE_PLUGIN_ROOT}/core/templates/knowledge/index.md" "$KG_PATH/knowledge/"

# Copy lesson/ADR templates
cp "${CLAUDE_PLUGIN_ROOT}/core/templates/lessons-learned/README.md" "$KG_PATH/lessons-learned/"
cp "${CLAUDE_PLUGIN_ROOT}/core/templates/lessons-learned/lesson-template.md" "$KG_PATH/lessons-learned/"
cp "${CLAUDE_PLUGIN_ROOT}/core/templates/decisions/README.md" "$KG_PATH/decisions/"
cp "${CLAUDE_PLUGIN_ROOT}/core/templates/decisions/ADR-template.md" "$KG_PATH/decisions/"

# Copy session template
cp "${CLAUDE_PLUGIN_ROOT}/core/templates/sessions/session-template.md" "$KG_PATH/sessions/"

# Copy MEMORY template if not exists
if [ ! -f "~/.claude/projects/$(basename $(pwd))/memory/MEMORY.md" ]; then
  echo "Note: MEMORY.md template available at ${CLAUDE_PLUGIN_ROOT}/core/templates/MEMORY-template.md"
  echo "Copy manually if needed for new projects."
fi
```

### Step 1.6.5: Install Post-Commit Hook (Optional) <!-- v0.0.3 Change -->

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

### Step 1.7: Update .gitignore (if git repo exists)

```bash
if [ -d .git ] && [ "$location_type" == "project-local" ]; then
  # Add gitignore rules based on git strategy
  if [ "$git_strategy" == "all-ignore" ]; then
    echo "docs/" >> .gitignore
  elif [ "$git_strategy" == "selective" ]; then
    for category in "${!category_git_rules[@]}"; do
      if [ "${category_git_rules[$category]}" == "ignore" ]; then
        echo "docs/lessons-learned/$category/" >> .gitignore
        echo "docs/knowledge/${category}.md" >> .gitignore
      fi
    done
    # Always gitignore sessions and chat-history
    echo "docs/sessions/" >> .gitignore
    echo "docs/chat-history/" >> .gitignore
  fi
fi
```

### Step 1.8: Write config entry

```bash
# Build config entry JSON
config_entry=$(cat <<EOF
{
  "name": "$kg_name",
  "path": "$KG_PATH",
  "type": "$location_type",
  "categories": [
    $(for cat in "${categories[@]}"; do
      prefix="${category_prefixes[$cat]:-null}"
      git_rule="${category_git_rules[$cat]:-commit}"
      echo "{ \"name\": \"$cat\", \"prefix\": $prefix, \"git\": \"$git_rule\" },"
    done | sed '$ s/,$//')
  ],
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "lastUsed": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)

# Update config with jq (or manual JSON manipulation)
jq ".graphs[\"$kg_name\"] = $config_entry | .active = \"$kg_name\"" \
  ~/.claude/kg-config.json > ~/.claude/kg-config.json.tmp
mv ~/.claude/kg-config.json.tmp ~/.claude/kg-config.json
```

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

Next steps:
  /kmgraph:status          — View KG info and quick reference
  /kmgraph:capture-lesson  — Document your first lesson
  /kmgraph:recall "query"  — Search across KG

Templates copied to $KG_PATH
Examples available at ${CLAUDE_PLUGIN_ROOT}/core/examples/ (not copied by default)

⚠️  Privacy reminder: Review sensitive data with /kmgraph:check-sensitive before pushing to public repos.
⚠️  Note: chat-history/ and sessions/ are always gitignored (never committed to version control)
```

### Step 1.10: Optional Backfill from Existing Project

**Prompt user:**
```
If initializing in a pre-existing project with chat history, source files, or documentation:

Would you like to backfill the knowledge graph from existing project context? [y/N]

This will parse:
  • README.md (architecture overview)
  • CHANGELOG.md / docs/CHANGELOG.md (decision history)
  • Files in docs/lessons-learned/ or docs/decisions/ (existing knowledge)
  • Chat history files in docs/chat-history/ (if present)

The knowledge-extractor subagent will suggest new lessons and knowledge entries
for your review before writing them to the KG.
```

**If yes:**
- Invoke `knowledge-extractor` subagent in "init-backfill" mode
- Pass list of files to parse (README, CHANGELOG, docs/lessons-learned/, docs/decisions/, docs/chat-history/)
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

For each approved platform, write the appropriate file using the content source in the table above:

```bash
# Gemini CLI example
cp "${CLAUDE_PLUGIN_ROOT}/core/templates/AGENTS-template.md" "$(pwd)/GEMINI.md"

# Cursor / Windsurf — write KMGraph behaviors subset
# Continue.dev — inject prompt section into .continue/config.json
# VS Code Copilot — write .github/copilot-instructions.md
# Aider — inject conventions section into .aider.conf.yml
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
    "path": "/path/to/kg/docs",
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

### Project already has docs/ directory
- Detect existing directories
- Prompt: "docs/ already exists. Merge with existing structure? [y/N]"
- If yes: Create only missing subdirectories, don't overwrite
- If no: Return to wizard Step 1, suggest different location

## Turbo Mode

Skip wizard with flags:

```bash
/kmgraph:init --name my-project --location ./docs/ --categories architecture,process,patterns --git selective
```

**Parameters**:
- `--name`: KG name (required)
- `--location`: Path (default: `./docs/`)
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
├── knowledge/
│   ├── patterns.md          (empty template)
│   ├── gotchas.md           (empty template)
│   ├── concepts.md          (empty template)
│   ├── architecture.md      (empty template)
│   ├── workflows.md         (empty template)
│   └── index.md             (navigation hub)
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
└── chat-history/            🔒 ALWAYS GITIGNORED
    (for /kmgraph:extract-chat output — local use only)
```

**Git Handling:**
- `sessions/` and `chat-history/` are ALWAYS added to `.gitignore` (never committed)
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
      "path": "/Users/name/projects/my-app/docs/",
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
