---
description: Search across project memory systems (lessons, decisions, knowledge graph, sessions)
---

# Knowledge Recall

Search across all project memory systems to find relevant knowledge, lessons, decisions, and session history.

---

## Description

This skill provides unified search across four memory systems:
- **Lessons Learned:** Past problems solved and patterns discovered
- **Architecture Decisions (ADRs):** Formal decision documentation
- **Knowledge Graph:** Quick-reference concepts, patterns, and gotchas
- **Session Summaries:** Historical work context and outcomes

**Philosophy:** Memory retrieval should be fast, comprehensive, and actionable.

---

## Usage

```bash
/knowledge:recall <topic>
/knowledge:recall <topic> --type=<lessons|decisions|knowledge|sessions|all>
/knowledge:recall <topic> --format=<summary|paths|detailed|none>
```

**Parameters:**
- `topic` (required): What to search for (keywords or phrases)
- `--type` (optional): Filter by memory type (default: all)
- `--format` (optional): Output format (default: summary)

**Examples:**
```bash
/knowledge:recall skills architecture
/knowledge:recall deployment --type=lessons
/knowledge:recall version control --format=paths
/knowledge:recall dual format --format=detailed
```

---

## Execution Steps

### Step 0: Get Active KG Path

**Read configuration:**
```bash
# Read ~/.claude/kg-config.json
# Find "active" field
# Get path from graphs[active].path
# Store as {active_kg_path}
```

**If no config exists:**
```
No knowledge graph configured. Run /knowledge:init to get started.
```

### Step 1: Parse Query

Extract topic and options:

**Example:**
```
Input: "/knowledge:recall CI/CD pipelines --type=lessons"
→ Topic: "CI/CD pipelines"
→ Type: lessons
→ Format: summary (default)
```

**Parse logic:**
- Everything before first `--` is the topic
- Extract `--type=X` if present (default: all)
- Extract `--format=X` if present (default: summary)

### Step 2: Determine Search Scope

Based on `--type` parameter:

| Type | Directories to Search |
|------|----------------------|
| `all` (default) | lessons-learned/, decisions/, knowledge/, sessions/ |
| `lessons` | lessons-learned/ only |
| `decisions` | decisions/ only |
| `knowledge` | knowledge/ only |
| `sessions` | sessions/ only |

### Step 3: Execute Search

**Search strategy - parallel grep across directories:**

```bash
# For "all" type (search everywhere)
grep -r -i "<topic>" {active_kg_path}/lessons-learned/ --include="*.md" -l
grep -r -i "<topic>" {active_kg_path}/decisions/ --include="*.md" -l
grep -r -i "<topic>" {active_kg_path}/knowledge/ --include="*.md" -l
grep -r -i "<topic>" {active_kg_path}/sessions/ --include="*.md" -l
```

**Also search MEMORY.md if it exists:**
```bash
# Find MEMORY.md for this project (if linked in config)
# Search: grep -i "<topic>" ~/.claude/projects/*/memory/MEMORY.md
```

**Search targets:**
- File names (case-insensitive)
- Content (case-insensitive)
- Metadata tags (if present)
- YAML frontmatter fields

**Multi-word handling:**
- Split query into keywords: "CI/CD pipelines" → ["CI/CD", "pipelines"]
- Search for each keyword
- Rank results with multiple keyword matches higher

### Step 4: Rank Results

**Ranking criteria (points system):**

1. **Exact match in filename:** +10 points
2. **Multiple keyword matches:** +5 points per match
3. **Recent files (last 30 days):** +3 points
4. **Structural importance:**
   - Architecture lessons: +2 points
   - ADR status=Accepted: +2 points
   - README files: -1 point (usually indexes, not content)

**Sort results by total score (highest first)**

### Step 5: Format Output

#### Format: `summary` (Default)

```markdown
## Search Results: "<topic>"

Found X matches across memory systems:

### Lessons Learned (Y matches)

1. **Filename.md** ⭐⭐⭐⭐⭐ (exact match)
   - Category: architecture
   - Date: YYYY-MM-DD
   - Preview: "First 100 chars of relevant content..."
   - Path: {active_kg_path}/lessons-learned/architecture/Filename.md

2. **Another.md** ⭐⭐⭐
   - Category: debugging
   - Date: YYYY-MM-DD
   - Preview: "Content preview..."
   - Path: {active_kg_path}/lessons-learned/debugging/Another.md

### Architecture Decisions (Z matches)

1. **001-title.md** ⭐⭐⭐⭐
   - Status: Accepted
   - Date: YYYY-MM-DD
   - Preview: "Decision preview..."
   - Path: {active_kg_path}/decisions/001-title.md

### Knowledge Graph (N matches)

1. **patterns.md → Section Name**
   - Quick summary available
   - Path: {active_kg_path}/knowledge/patterns.md#section-name

### Session Summaries (M matches)

1. **YYYY-MM-DD_description.md** ⭐⭐⭐
   - Type: Feature Development
   - Date: YYYY-MM-DD
   - Preview: "Session preview..."
   - Path: {active_kg_path}/sessions/YYYY-MM/YYYY-MM-DD_description.md

---

**Quick Actions:**
- Read details: Use Read tool with paths above
- Related topics: [extracted from cross-refs]
- Create new: /knowledge:capture-lesson (if no relevant results)
```

**Star rating logic:**
- ⭐⭐⭐⭐⭐ (5 stars): 10+ points (exact match)
- ⭐⭐⭐⭐ (4 stars): 7-9 points (very relevant)
- ⭐⭐⭐ (3 stars): 4-6 points (relevant)
- ⭐⭐ (2 stars): 2-3 points (somewhat relevant)
- ⭐ (1 star): 1 point (tangentially relevant)

#### Format: `paths`

```
{active_kg_path}/lessons-learned/architecture/Filename.md
{active_kg_path}/decisions/001-title.md
{active_kg_path}/knowledge/patterns.md
{active_kg_path}/sessions/YYYY-MM/YYYY-MM-DD_description.md
```

Simple list of matching file paths for piping to other tools.

#### Format: `detailed`

Show full context with 5 lines before/after each match:

```markdown
## Detailed Results: "<topic>"

### Match 1: {active_kg_path}/lessons-learned/architecture/Filename.md

**Line 42:**
```
  39 | context line
  40 | context line
  41 | context line
> 42 | Line containing MATCHED KEYWORD in bold
  43 | context line
  44 | context line
  45 | context line
```

[Continue for all matches...]
```

#### Format: `none`

No formatted output. Use this when you just want to trigger the search for analysis but don't need the full results displayed to user.

**Use case:** When `/knowledge:sync-all` needs to check if a topic already exists before creating new entries.

### Step 6: Suggest Next Actions

Based on results:

**If 0 results:**
```
No matches found for "<topic>".

**Suggestions:**
- Try broader keywords
- Check spelling
- Create new documentation: /knowledge:capture-lesson
```

**If 1-3 results:**
```
**Next Steps:**
- Read full context: Use paths above with Read tool
- Explore related: [links to cross-referenced docs]
```

**If 4+ results:**
```
**Narrow your search:**
- Use --type=lessons (search only lessons)
- Use more specific keywords
- Browse by category in active KG at: {active_kg_path}/lessons-learned/
```

**Always suggest related topics:**
Extract from cross-references in found documents and suggest:
```
**Related topics you might want to explore:**
- dual-format (found in 2 related docs)
- skills-architecture (found in 1 related doc)
```

---

## Integration with Other Skills

**With /knowledge:capture-lesson:**
```
User: /knowledge:recall authentication
Claude: "Found 2 lessons about authentication..."
User: "None of these match my issue"
Claude: "Create new lesson? Type /knowledge:capture-lesson"
```

**With /knowledge:session-summary:**
```
User: /knowledge:recall today's work
Claude: "No session summary found for today. Type /knowledge:session-summary to create one"
```

**With /knowledge:update-graph:**
```
User: /knowledge:recall skills architecture
Claude: "Found 3 matches. To extract insights to KG, run /knowledge:update-graph"
```

---

## Examples

### Example 1: Find architecture decisions

```
User: /knowledge:recall skills architecture
```

**Output:**
```markdown
## Search Results: "skills architecture"

Found 3 matches across memory systems:

### Lessons Learned (1 match)

1. **Lessons_Learned_Skills_Architecture.md** ⭐⭐⭐⭐⭐
   - Category: architecture
   - Date: 2025-12-29
   - Preview: "Skills discovery patterns and global-only installation..."
   - Path: {active_kg_path}/lessons-learned/architecture/Lessons_Learned_Skills_Architecture.md

### Architecture Decisions (1 match)

1. **002-skills-global-only.md** ⭐⭐⭐⭐
   - Status: Accepted
   - Preview: "Skills load from global directory only..."
   - Path: {active_kg_path}/decisions/002-skills-global-only.md

### Knowledge Graph (1 match)

1. **patterns.md → Skills Global-Only Pattern**
   - Quick summary: "Skills installation and discovery patterns"
   - Path: {active_kg_path}/knowledge/patterns.md#skills-global-only

---

**Quick Actions:**
- Read lesson: {active_kg_path}/lessons-learned/architecture/Lessons_Learned_Skills_Architecture.md
- Related topics: global-directory, project-local, discovery-patterns
```

### Example 2: Find debugging solutions

```
User: /knowledge:recall validation fails --type=lessons
```

**Output:**
```markdown
## Search Results: "validation fails"

Found 0 matches in lessons learned.

**Suggestions:**
- Try broader keywords: "validation" or "fails"
- Check other systems: /knowledge:recall validation --type=all
- Create new lesson: /knowledge:capture-lesson
```

### Example 3: Get paths only

```
User: /knowledge:recall memory system --format=paths
```

**Output:**
```
{active_kg_path}/lessons-learned/Lessons_Learned_Memory_System_Phase_1_Foundation.md
{active_kg_path}/decisions/005-memory-system-architecture.md
{active_kg_path}/sessions/2026-01/2026-01-02_memory-system-design.md
{active_kg_path}/knowledge/concepts.md
```

---

## Technical Details

**Search tool:** `grep` (built-in, fast, regex support)
**File types:** Only `.md` files
**Case sensitivity:** Case-insensitive by default (`-i` flag)
**Performance:** <2 seconds for entire KG directory
**Max results:** Display top 10 per category (rankable)

**Grep flags used:**
- `-r` : Recursive search
- `-i` : Case-insensitive
- `-l` : List filenames only (for paths format)
- `--include="*.md"` : Search only markdown files
- `-n` : Show line numbers (for detailed format)
- `-C 5` : Show 5 lines of context (for detailed format)

---

## Troubleshooting

### Problem: Too many results

**Solution:**
- Use `--type` filter: `/knowledge:recall topic --type=lessons`
- Use more specific keywords
- Browse category directly in active KG

### Problem: No results found

**Solution:**
- Try broader keywords
- Check spelling
- Try different memory type: `--type=sessions` vs `--type=lessons`
- Search all systems: `/knowledge:recall topic --type=all`
- Check if you're in the correct KG: `/knowledge:status`

### Problem: Results not relevant

**Solution:**
- Refine query with more specific technical terms
- Browse categories manually to discover content
- Use `/knowledge:list` to see other configured KGs

### Problem: Want to see full context

**Solution:**
- Use `--format=detailed` to see 5 lines before/after each match
- Use `--format=paths` then Read tool for full file content

---

## Related Commands

- `/knowledge:capture-lesson` - Document new lessons learned
- `/knowledge:update-graph` - Extract insights from lessons to KG
- `/knowledge:sync-all` - Full knowledge sync pipeline
- `/knowledge:status` - Show active KG info and quick reference

---

**Created:** 2026-02-12
**Version:** 2.0 (Plugin version - multi-KG support)
**Integration:** Works with all four memory systems + MEMORY.md
**Search Scope:** Active knowledge graph from ~/.claude/kg-config.json
