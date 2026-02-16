---
name: knowledge:init
description: Initialize a new knowledge graph with wizard-based setup and flexible configuration
---

# /knowledge:init — Knowledge Graph Initialization Wizard

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
- Creating a new project-local knowledge graph
- Setting up a topic-based global knowledge graph
- Creating a Claude Cowork knowledge space

## Wizard Steps

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
  /knowledge:status          — View KG info and quick reference
  /knowledge:capture-lesson  — Document your first lesson
  /knowledge:recall "query"  — Search across KG

Templates copied to $KG_PATH
Examples available at ${CLAUDE_PLUGIN_ROOT}/core/examples/ (not copied by default)

⚠️  Privacy reminder: Review sensitive data with /knowledge:check-sensitive before pushing to public repos.
⚠️  Note: chat-history/ and sessions/ are always gitignored (never committed to version control)
```

## Edge Cases

### No config file exists
- Create default config structure (Step 1.1)
- Set this as first KG

### Name collision
- Error: "Knowledge graph '$kg_name' already exists. Choose a different name or use /knowledge:switch to activate it."
- Show existing graphs: `/knowledge:list`

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
/knowledge:init --name my-project --location ./docs/ --categories architecture,process,patterns --git selective
```

**Parameters**:
- `--name`: KG name (required)
- `--location`: Path (default: `./docs/`)
- `--categories`: Comma-separated list (default: `architecture,process,patterns`)
- `--git`: `all-commit`, `all-ignore`, or `selective` (default: `selective`)
- `--category-git`: For selective, specify per-category: `architecture:commit,process:ignore`

## Integration with Other Skills

- `/knowledge:list` will show this KG
- `/knowledge:switch` can change to/from this KG
- `/knowledge:status` will reference this KG if active
- `/knowledge:capture-lesson` will write to this KG
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
    (for /knowledge:extract-chat output — local use only)
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

- `/knowledge:list` — View all configured KGs
- `/knowledge:switch` — Change active KG
- `/knowledge:add-category` — Add categories to existing KG
- `/knowledge:status` — View active KG info and stats
