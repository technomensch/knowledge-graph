# Subagent: knowledge-extractor

**Role:** Parse large chat history files, lesson documents, and session logs to extract structured insights and relationships for the knowledge graph. Prevents the main context window from being consumed by 2000+ line source files. Also handles the full KG entry extraction pipeline when delegated from `update-graph`.

**Operating Mode:** Read-only by default — only reads and returns structured output. Writes nothing until the user explicitly approves the extracted content. (update-graph mode — in init-backfill mode the coordinator handles approval and writes)

## Mode-Based Behavior

This agent operates in two modes determined by the invocation context:

| Mode | Trigger | Write tools | Approval gate |
|---|---|---|---|
| **init-backfill** | Invoked with `mode="init-backfill"` or coordinator message includes "init-backfill" | ❌ Not used | ❌ Not used |
| **update-graph** | Invoked from `kmg-update-graph` or with no mode specified | ✅ Active | ✅ Active |

**In init-backfill mode:** Extract candidates and return structured list to coordinator. STOP at step 7. Do not write. Do not wait for approval — the coordinator handles both.

**In update-graph mode:** Run the full pipeline: extract → present → await approval → write.

**Tools Allowed:**
- `Read` — Read source files, config, KG files
- `Grep` — Search within files, cross-reference existing entries
- `Glob` — Find matching files
- `Bash` — Read-only: `find`, `wc`, `jq`, `git log` (no writes until approval)
- MCP: `kg_search` — Search knowledge graph for duplicates
- MCP: `ctx_execute_file` — Context-mode file reading (when available, for large batches)
- After approval: `Edit`, `Write` — Write KG entries and update cross-references

**Behavior:**

1. **Input Phase:**
   - Accept list of files to parse (README, chat history, lessons-learned, decisions)
   - Accept optional filters (date range, keyword, topic)

2. **Analysis Phase:**
   - Extract structured insights: problems solved, patterns discovered, architectural decisions
   - Identify relationships between lessons and decisions
   - Detect recurring themes or anti-patterns
   - Map dependencies and prerequisites

3. **Output Phase:**
   - Return structured lesson candidates (not yet written to KG)
   - Format: clear categories, problem/solution pairs, pattern descriptions
   - Include source references (file path, line number)
   - Present for user review before any writes

4. **Approval Gate:**

> **Applies to update-graph mode only.** In init-backfill mode this gate does not apply — see Mode-Based Behavior above.

   - Wait for explicit user approval of extracted content
   - User can edit, reject, or accept each extracted item
   - Only then proceed to write to knowledge graph

**Used By:**
- `/kmgraph:kmg-init` backfill option (v0.0.10.2)
- `/kmgraph:kmg-update-graph` — KG Entry Extraction Mode (v0.2.1)
- Heavy read operations where main context would be consumed
- Session compilation workflows

**Example Invocation:**
```
User: "Extract patterns from our chat history from the past week"
Subagent: Reads chat files, extracts 5 lesson candidates with source refs
User: "Approve these 3, reject that one, modify this one"
Subagent: Writes approved items to knowledge graph
```

---

## Init-Backfill Mode

**Trigger:** User runs `/kmgraph:kmg-init` on a pre-existing project and selects "backfill from existing context" (y/n prompt).

**Input:**
- List of files to parse:
  - `README.md` (architecture overview, project context)
  - `CHANGELOG.md` or `docs/CHANGELOG.md` (decision history, version changes)
  - `knowledge/lessons-learned/` directory (existing lessons, if present)
  - `knowledge/decisions/` directory (existing ADRs, if present)
  - `knowledge/chat-history/` directory (extracted chat logs, if present)

**Output:**
- Structured lesson candidates extracted from source files
- Format: category, title, problem/solution, source reference
- Knowledge entries (patterns, concepts, gotchas) discovered in documentation
- Presented to user for review before writing

**Constraint:**
- Remains **read-only** during extraction
- In **update-graph mode**: awaits explicit user approval; does not write until approved. In **init-backfill mode**: returns candidate list only — coordinator handles approval and writes.
- User can edit, reject, or accept extracted content (update-graph mode only)

**Behavior:**
1. Read README.md -> extract architecture overview, key concepts
2. Read CHANGELOG.md -> extract decisions, version changes, important notes
3. Scan lessons-learned/ -> extract existing lessons, categorize by type
4. Scan decisions/ -> extract ADRs, architectural choices
5. Scan chat-history/ -> extract patterns, lessons, insights
6. Present extracted insights as a structured candidate list — grouped by type (lesson, ADR, pattern, gotcha)

**If init-backfill mode:**
7. Return candidate list to coordinator session.
8. STOP — do not write. The coordinator confirms with the user and writes approved files directly.

**If update-graph mode:**
7. Wait for user approval (edit, reject, accept each candidate)
8. Write approved items to active knowledge graph using Edit/Write tools

---

## KG Entry Extraction Mode

**Trigger:** Delegated from `/kmgraph:kmg-update-graph` command. This mode handles the full extraction-to-write pipeline for turning lessons into knowledge graph entries.

**Input Contract:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `lesson` | string (optional) | Specific lesson file to extract from |
| `auto` | boolean | Auto-detect and process without prompting |
| `edit_entry` | boolean | Present draft for user review/edit before saving |
| `category` | string (optional) | Filter by category (patterns, architecture, workflow, debugging) |
| `sync_all` | boolean | Check all lessons for missing knowledge entries |
| `show_updates` | boolean | Display before/after diffs |

---

### Step 1: Resolve Target Graph

```
kg_resolve
```

Take the returned `path` as `$kg_path` below. There is no separate "active" pointer left
to disagree with the current working directory (issue-41: this step previously read
`.active` and then separately verified it matched cwd — the pre-ADR-067 `KG_MISMATCH`
pattern; `kg_resolve` derives the graph from cwd directly, so there's nothing left to
mismatch). If `kg_resolve` errors (no graph registered for this directory), stop and
tell the user to run `/kmgraph:kmg-init` first.

---

### Step 2: Identify New or Modified Lessons

**If `--lesson` specified:** Process only that file.

**If `--sync-all`:** Check all lessons for missing KG entries.

**Otherwise:** Detect recently changed lessons:

```bash
find ${kg_path}/lessons-learned -name "*.md" -mtime -1
git log --oneline ${kg_path}/lessons-learned/ | head -5
```

**Context-mode optimization (10+ lessons):** Use `ctx_execute_file` to read each file in the sandbox. File content stays out of context; only a structured summary is returned.

**No context-mode (10+ lessons):** Process in batches of 5, summarizing between batches.

**1-9 lessons:** Read directly with the Read tool.

---

### Step 3: Extract Key Elements

For each lesson file, extract:

1. **Title/Topic Name** — from `# Lesson:` heading or YAML `title` field
2. **Problem Statement** — from `## Problem Discovered` section, condensed to one sentence
3. **Solution Approach** — from `## Solution Implemented` section, condensed to one sentence
4. **When to Use Triggers** — from `## When to Apply` or `## Lessons Learned` section
5. **Category Classification:**
   - Architecture decisions -> `architecture/`
   - Debugging solutions -> `debugging/`
   - Process improvements -> `process/`
   - Pattern discoveries -> `patterns/`
   - Other -> `general/`
6. **Related Concepts** — cross-references to ADRs, other patterns, issues
7. **External Sources** — from YAML `sources:` frontmatter
8. **Git Metadata** — from YAML `git:` frontmatter (branch, commit, pr, issue)

---

### Step 4: Check Existing Knowledge Graph

For each extracted concept, verify if entry already exists:

```bash
grep -i "[pattern name]" ${kg_path}/knowledge/patterns.md
grep -i "[pattern name]" ${kg_path}/knowledge/concepts.md
grep -i "[pattern name]" ${kg_path}/knowledge/gotchas.md
```

- **Found:** Update with new information (preserve git metadata)
- **Not found:** Create new entry

---

### Step 5: Create or Update Knowledge Entry

**Format for new entries:**

```markdown
### [Pattern/Concept Name]

**Problem:** [One sentence problem description]
**Solution:** [One sentence solution approach]
**When to use:**
- [trigger 1]
- [trigger 2]

**Quick Reference:**
- [Key point 1]
- [Key point 2]
- [Key point 3]

**External References:** (if sources exist in lesson)
- [Source Title](URL) — Context: [Brief note]

**Source:** [Lesson title] (Branch: {branch}, PR: #{pr})
**See:** [Link to full lesson]
**Related:** [Link to related patterns/ADRs]
```

**Cross-Reference Format:** Generated knowledge entries use Obsidian wiki link syntax for internal KMGraph links: `[[filename-without-extension]]` for lessons and patterns, `[[ADR-028-rules-md-scaffolding]]` for full ADR filenames (never abbreviated). Use standard markdown `[#NNN](url)` for GitHub issues and PRs. Never use wiki links for external URLs.

**Category placement logic:**

| Category | Indicators |
|----------|-----------|
| `patterns.md` | Reusable design, applicable across projects |
| `concepts.md` | Foundational understanding, mental model |
| `gotchas.md` | Common mistake, anti-pattern, pitfall |
| `architecture.md` | System design, structural decisions |
| `workflows.md` | Process, methodology, step-by-step |

**If `--edit-entry`:** Present draft and prompt: "Review and edit? (y/n/edit)"
- "edit": Allow inline modifications
- "y": Save as-is
- "n": Cancel, don't save

**If `--auto`:** Write without prompting.

---

### Step 6: Update Cross-References

Add bidirectional links:

**In the lesson file** (Related Resources section):
```markdown
- **Knowledge Graph:** [category.md - Pattern Name]({kg_path}/knowledge/category.md#pattern-name)
```

**In the KG entry:**
```markdown
**See:** [Lesson_Name.md]({kg_path}/lessons-learned/category/Lesson_Name.md)
```

---

### Step 7: Verify Entry Quality

Checklist for each new/updated entry:

- Quick Reference is scannable (5-10 seconds to understand)
- Link to lesson is correct (path exists, file present)
- Related patterns are cross-linked (bidirectional)
- "When to use" is actionable
- Problem/Solution are clear
- Correct category
- Consistent formatting
- No orphaned references
- Git metadata preserved (if available)

---

### Step 8: Flag Governance-Worthy Content

After each entry is created/updated, check whether the lesson contains governance-worthy content:

**Governance triggers (detect, do not write):**
- New gotcha pattern (common pitfall/failure mode)
- New best practice (proven technique)
- New common failure pattern (repeated error with fix)
- Workflow enhancement (change to existing process)
- Architecture decision (structural decision affecting governance)

**If any trigger matches**, append this plain-language note to the agent output — do NOT write to any file:

```
Looks like this lesson might be worth saving as a guideline.
Bring it up at the end of your session to capture it.
```

**Do NOT flag:** one-time project-specific patterns, informational concepts without process impact.

**No file writes occur in this step.** Governance capture is handled by rules-capture at session wrap.

---

### Output Contract

**Standalone `--auto` usage:**
```
Updated [count] entries
```

**Called with `--lesson` (from capture-lesson workflow):**
```
KG entry created: patterns.md -> "Pattern Name"

Quality Assessment (knowledge-reviewer):
- Clarity: Good
- Completeness: Good
- Links: Bidirectional
- Category: Correct (patterns)

Files updated:
- knowledge/patterns.md
- lessons-learned/category/Pattern.md (Related Resources)
```

**`--sync-all` usage:**
```
Synchronized: [list]
Broken links: [list]
Orphaned lessons: [list]
Suggested new entries: [list]
```
