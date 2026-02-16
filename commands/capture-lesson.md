---
description: Document lessons learned, problems solved, and patterns with git metadata tracking
---

# Document Lessons Learned

**Purpose:** Create a comprehensive Lessons Learned document after solving a problem or implementing a new pattern.

**Version:** 1.4 (Updated: 2026-02-12) <!-- v1.4 Change: Plugin version with git metadata -->

---

## Syntax Detection

**Create New Document:**
- `/knowledge:capture-lesson` → Create new document (Steps 1-5 below)
- `/knowledge:capture-lesson <topic>` → Create new document with topic

**Update Existing Document:**
- `/knowledge:capture-lesson update <filename>` → Update existing document (Step 0 below)
- Example: `/knowledge:capture-lesson update Lessons_Learned_Chat_History_Workflow.md`

---

## Step 0: Update Existing Document

**When user types:** `/knowledge:capture-lesson update <filename>`

### Step 0.1: Read Existing Document

1. **Locate file:**
   - Get active KG path from `~/.claude/kg-config.json`
   - Path: `{active_kg_path}/lessons-learned/<filename>`
   - If not found, ask user for correct path

2. **Extract metadata:**
   - Current version (from **Version:** field)
   - Creation date (from **Created:** field or YAML frontmatter)
   - Last update date (from **Version:** field if present)
   - Git metadata from YAML frontmatter (if exists)

3. **Determine next version:**
   - Minor increment: v1.0 → v1.1 → v1.2
   - Format: `**Version:** 1.X (Updated: YYYY-MM-DD) <!-- v1.X Change -->`

### Step 0.2: Ask What to Update

Present options to user:

```markdown
I'll help you update **<filename>**

**Current Version:** v1.X
**Last Updated:** YYYY-MM-DD

**What would you like to update?**

1. [ ] Add new section (will be inserted before Conclusion)
2. [ ] Update existing section (specify which section)
3. [ ] Add to version history only
4. [ ] Other (describe)

Please select an option and provide details.
```

### Step 0.3: Gather Update Content

Based on user selection:

**For "Add new section":**
- Ask for section title
- Ask for section content (or user will provide)
- Ask where to insert (default: before Conclusion)

**For "Update existing section":**
- Ask which section to update
- Ask what to add/change
- Preserve existing content, append new content

**For "Add to version history only":**
- Ask for changelog entry

### Step 0.4: Apply Updates

**Update version history:**
```markdown
**Version:** 1.X (Updated: 2026-02-12) <!-- v1.X Change -->

**Changelog:** <!-- v1.X Change -->
- v1.0 (YYYY-MM-DD): Initial release
- v1.X (2026-02-12): [Brief description of changes] <!-- v1.X Change -->
```

**Add dated section header** (if adding new section):
```markdown
## [Section Name] (Updated: 2026-02-12) <!-- v1.X Change -->

[Content]
```

**Update existing section** (if modifying):
```markdown
## [Existing Section]

[Original content]

### [Sub-section] (Updated: 2026-02-12) <!-- v1.X Change -->

[New content added here]
```

**Add inline comments** at all change locations:
```markdown
<!-- v1.X Change -->
```

### Step 0.5: Confirm with User

Show user the changes that will be made:

```markdown
**Proposed Updates to <filename>:**

**Version:** v1.X → v1.Y

**Changes:**
1. [Change 1 description]
2. [Change 2 description]

**Sections Modified:**
- [Section name] (line XX)
- [Section name] (line YY)

**Proceed with these updates?** (yes/no)
```

### Step 0.6: Write Updated Document

- Preserve ALL existing content
- Add new sections/content as specified
- Update version metadata
- Update git metadata in YAML frontmatter (new commit hash, update timestamp)
- Add all inline comments
- Save file

### Step 0.7: Commit (if user approves)

```bash
git add {active_kg_path}/lessons-learned/<filename>
git commit -m "docs(lessons): update <topic> v1.X

[Description of changes]

v1.X Change
"
```

---

## Instructions (Create New Document)

When the user invokes this command without "update", follow this structured process:

### Step 1.1: Duplicate Detection Pre-Flight <!-- v0.0.3 Change -->

**Before gathering lesson details, check for similar existing lessons:**

**Extract keywords from user's request:**
- Topic/problem domain
- Technology/tool names
- Pattern/approach keywords

**Example:**
```
User: "/knowledge:capture-lesson API error handling"
Keywords: API, error, handling, errors
```

**Search for similar lessons:**
```bash
# Use kg_search MCP tool to search existing lessons
/knowledge:recall "API error handling"

# Or use MCP tool directly:
mcp__plugin_knowledge_knowledge__kg_search(query: "API error handling", format: "summary")
```

**Evaluate search results:**

**If similar lesson found:**
Present options to user:
```markdown
🔍 **Similar Lesson Found:**

**Existing:** Lessons_Learned_Error_Handling_Patterns.md
**Created:** 2026-01-10 | **Category:** patterns

**Would you like to:**
1. **Update existing lesson** — Merge your new findings (recommended if same topic)
   → Redirects to Step 0 (Update Existing Document)
2. **Create new with link** — Create separate lesson with "Related:" reference
   → Continues to Step 1, adds cross-reference
3. **Proceed independently** — Create new lesson without explicit link
   → Continues to Step 1

[User selects option]
```

**Based on user selection:**
- **Option 1**: Redirect to Step 0 (Update Existing Document) with filename from search result
- **Option 2**: Continue to Step 1, store reference for later (add to "Related Resources" in Step 4)
- **Option 3**: Continue to Step 1 normally

**If no similar lesson found:**
```
No similar lessons found. Proceeding with new lesson...
```
→ Continue to Step 1

**Benefits:**
- Prevents duplicate documentation of same topic
- Encourages consolidation over fragmentation
- Maintains single source of truth for each pattern
- Improves discoverability via cross-references

### Step 1: Verification (INTERACTIVE)

**Ask the user these questions:**

1. **What problem did you solve or pattern did you implement?**
   - Briefly describe in 1-2 sentences

2. **What should this lessons learned document cover?**
   - The problem encountered
   - Root cause analysis
   - Solution implemented
   - Prevention systems
   - Replication guidance
   - Other (specify)

3. **What is the primary audience?**
   - Future developers on this project
   - External developers wanting to replicate the pattern
   - General software engineering best practices
   - AI-assisted development workflows
   - Other (specify)

4. **Suggested filename:**
   - Format: `Lessons_Learned_[Topic].md`
   - Example: `Lessons_Learned_Automated_Validation.md`
   - Confirm or suggest alternative

**WAIT FOR USER CONFIRMATION** before proceeding to Step 1.5.

### Step 1.5: Auto-Detect Lesson Category

**After gathering lesson topic, determine category:**

**Category detection logic:**

| Keywords in Topic/Description | Category |
|-------------------------------|----------|
| "architecture", "design decision", "pattern", "structure", "architectural" | `architecture/` |
| "bug", "debug", "error", "fix", "troubleshoot", "debugging" | `debugging/` |
| "workflow", "process", "SOP", "procedure", "ceremony", "practice" | `process/` |
| "reusable", "pattern", "template", "boilerplate", "framework" | `patterns/` |
| No clear match | `[uncategorized]` (root directory) |

**Ask user to confirm:**

```markdown
Based on your topic, I recommend:

**Category:** architecture

This lesson will be saved to: {active_kg_path}/lessons-learned/architecture/

**Is this correct?**
1. ✅ Yes - use architecture/
2. Process - move to process/
3. Debugging - move to debugging/
4. Patterns - move to patterns/
5. Uncategorized - keep at root level

[User selects option]
```

**Category override:**
- User can always override auto-detection
- Option 5 (Uncategorized) places in lessons-learned/ (root)
- Other options place in respective subdirectory

**Filename generation with category:**

```
Category: architecture
Topic: Memory System Foundation
Path: {active_kg_path}/lessons-learned/architecture/Lessons_Learned_Memory_System_Foundation.md
```

**Category README check:**
- If category subdirectory doesn't exist, create it
- Copy category README template if needed

### Step 1.6: Capture External Sources (Optional) <!-- v1.5 Change -->

**Prompt user:**

"Were any web searches, articles, or external documentation consulted while solving this problem?

If yes, please provide:
1. URL
2. Title (leave blank to auto-fetch)
3. What you learned from this source

[Enter URLs one per line, or type 'skip' to continue without sources]"

**For each URL provided:**
1. Auto-fetch page title (if accessible via WebFetch tool)
2. Record access date (today's date)
3. Prompt for context: "What did you learn from [URL]?"
4. Add to `sources` array in frontmatter
5. Generate entry for "External References" section in lesson body

**If user skips:** Leave `sources` array empty in frontmatter

### Step 1.7: Capture Git Metadata (v1.4 Feature) <!-- v1.4 Change -->

**Auto-detect git context (if git repo available):**

1. **Branch:** `git rev-parse --abbrev-ref HEAD`
2. **Commit:** `git rev-parse HEAD`
3. **Author:** `git config user.name` + `git config user.email`
4. **PR (optional):** Check if PR exists for current branch via `gh pr list --head $(current-branch)` (if gh CLI available)
5. **Issue (optional):** Prompt for issue number or auto-detect from branch name (e.g., `fix/issue-001-auth` → issue #001)

**Add to YAML frontmatter:**

```yaml
---
title: "Lesson: [Title]"
created: 2026-02-12T16:30:00Z
author: [Name]
email: [Email]
git:
  branch: [branch-name]
  commit: [commit-hash]
  pr: [pr-number or null]
  issue: [issue-number or null]
tags: []
category: [architecture|process|patterns|debugging]
---
```

**If git not available:**
- Skip git metadata capture
- Create frontmatter with just title, created, tags, category

### Step 2: Structure Planning

Based on user responses, plan document structure using this template:

**Action:**
Read and use the template from: `${CLAUDE_PLUGIN_ROOT}/core/templates/lessons-learned/lesson-template.md`

### Step 3: Content Gathering (INTERACTIVE)

**Ask the user for key information:**

1. **Problem Details:**
   - What specific issues were encountered?
   - What was the impact?
   - Examples or evidence?

2. **Root Cause:**
   - Why did the problem happen?
   - What underlying factors contributed?
   - Were there patterns or systemic issues?

3. **Solution Components:**
   - What did you build/implement?
   - What are the key layers/parts?
   - Code examples or configurations?

4. **Metrics/Evidence:**
   - Before/after comparisons
   - Performance measurements
   - Success indicators

5. **Replication Guidance:**
   - What's the abstract pattern?
   - How can others apply it?
   - What to customize vs keep universal?

**CONFIRM** the gathered information with user before writing.

### Step 4: Document Creation

**Get active KG path from config:**
```bash
# Read ~/.claude/kg-config.json
# Find "active" field
# Get path from graphs[active].path
```

Create the lessons learned document at:
`{active_kg_path}/lessons-learned/{category}/Lessons_Learned_[Topic].md`

**Writing Guidelines:**

1. **Be Specific:** Use actual examples, file paths, code snippets from the project
2. **Be Actionable:** Provide replication patterns and step-by-step guides
3. **Be Complete:** Cover problem → root cause → solution → replication
4. **Be Future-Focused:** Answer questions future developers will have
5. **Use Formatting:**
   - ✅/❌ for before/after comparisons
   - Code blocks with language tags
   - Clear section headers
   - Bullet lists for scannability
6. **Include YAML frontmatter:** With git metadata from Step 1.6

### Step 4.5: Update Master Index

**Auto-update {active_kg_path}/lessons-learned/README.md:**

**Add entry to appropriate category section:**

```markdown
## Architecture Lessons (5 total)

- [2026-02-12 - Memory System Foundation](architecture/Lessons_Learned_Memory_System_Foundation.md) - Four-pillar knowledge capture system
- [2026-01-02 - Skills Architecture](Lessons_Learned_Claude_Code_Skills_Architecture.md) - Claude Code skills global-only pattern
[... existing entries ...]

**Tags:** #architecture #memory #knowledge-graph
```

**Tag extraction:**
Auto-generate tags from:
- Category name (e.g., #architecture)
- Topic keywords (e.g., #memory, #knowledge-graph)
- Technology names mentioned (e.g., #claude-code)

**Update tag index:**

```markdown
## Tag Index

**#architecture** (5 lessons)
- [Memory System Foundation](architecture/Lessons_Learned_Memory_System_Foundation.md)
- [Skills Architecture](Lessons_Learned_Claude_Code_Skills_Architecture.md)
[... other #architecture lessons ...]
```

**Update chronological index:**

```markdown
## Chronological Index

**2026**
- 2026-02-12: [Memory System Foundation](architecture/Lessons_Learned_Memory_System_Foundation.md)

**2025**
- 2025-12-31: [Context Engineering Template](Lessons_learned-Context_Engineering_Template.txt)
[... other 2025 lessons ...]
```

**Update header stats:**

```markdown
**Total Lessons:** 4 → 5
**Last Updated:** 2026-02-12
```

### Step 4.6: Update Knowledge Graph <!-- v0.0.3 Change -->

**After updating the Master Index, present structured choice:**

"✅ Lesson captured! Extract insights to Knowledge Graph?"

**Options:**
1. ✅ **Extract now (recommended)** — Runs `/knowledge:update-graph` for this lesson
   - Extracts patterns, gotchas, concepts to KG
   - knowledge-reviewer agent assesses quality
   - Includes KG files in same commit

2. **Manual later** — Run `/knowledge:update-graph` when ready
   - Deferred extraction, you control timing

3. **Skip** — Update KG later via `/knowledge:sync-all`
   - Batch operation for multiple lessons

**If option 1 selected:**
Execute update-graph workflow inline:
- Call `/knowledge:update-graph --lesson=[current-lesson-filename] --auto`
- knowledge-reviewer agent runs async
- Show quality feedback: "KG entry created. Quality: ✅ Good / ⚠️ Needs review"
- Include KG files in Step 5 commit

**If option 2 or 3:**
Continue to Step 4.7

**Why extract now?** Fresh context enables better pattern identification. Waiting risks forgetting nuances.

### Step 4.7: Link to GitHub Issue (Optional) <!-- v1.4 Change -->

**If issue number was provided in Step 1.6:**

Post comment to GitHub issue (if gh CLI available):

```bash
gh issue comment {issue_number} --body "📚 Lesson Learned: [Title]

A lesson has been documented for this issue.
- Branch: {branch}
- Commit: {commit}
- Category: {category}

See: {path_to_lesson}"
```

**Update lesson frontmatter with issue link confirmation:**
```yaml
git:
  issue: {issue_number}
  issue_linked: true
```

### Step 5: Commit

After documents are created and user approves:

```bash
git add {active_kg_path}/lessons-learned/ {active_kg_path}/knowledge/
git commit -m "docs(lessons): create [topic] lessons learned

[Brief description of what the document covers]

### Key Contents
- Lesson: lessons-learned/{category}/[Topic].md
- Git metadata: branch={branch}, commit={commit}
- KG Updates: [if applicable]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
"
```

---

## Example Invocation

**User types:** `/knowledge:capture-lesson`

**Assistant responds:**

"I'll help you create a Lessons Learned document. Let me ask a few questions first:

1. **What problem did you solve or pattern did you implement?**

2. **What should this lessons learned document cover?**
   - [ ] The problem encountered
   - [ ] Root cause analysis
   - [ ] Solution implemented
   - [ ] Prevention systems
   - [ ] Replication guidance
   - [ ] Other: ___________

3. **What is the primary audience?**
   - [ ] Future developers on this project
   - [ ] External developers wanting to replicate the pattern
   - [ ] General software engineering best practices
   - [ ] Other: ___________

4. **Suggested filename:** Lessons_Learned_[Topic].md

   What should [Topic] be?"

---

## Checklist Before Creating Document

- [ ] User confirmed what to document
- [ ] Verified topic and scope
- [ ] Confirmed filename and category
- [ ] Gathered problem details, root cause, solution, metrics
- [ ] User approved content plan
- [ ] Git metadata captured (if git available)
- [ ] Document follows template structure
- [ ] Includes YAML frontmatter with git context
- [ ] Includes replication pattern for other projects
- [ ] Master index updated
- [ ] Knowledge graph sync recommended
- [ ] Committed with descriptive message

---

## Related Commands

- `/knowledge:update-graph` - Extract insights from lessons to knowledge graph
- `/knowledge:sync-all` - Full knowledge sync pipeline
- `/knowledge:link-issue` - Manually link existing lesson to GitHub issue

---

**Created:** 2026-02-12
**Version:** 1.4
**Usage:** Type `/knowledge:capture-lesson` when you want to document a problem solved or pattern implemented
