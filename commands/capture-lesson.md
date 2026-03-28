---
description: Document lessons learned, problems solved, and patterns with git metadata tracking
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, kg_search, kg_fts5_rebuild
---

# Document Lessons Learned

**Version:** 2.0 (Updated: 2026-03-27)

---

## Syntax Detection

**Create new lesson:**
- `/kmgraph:capture-lesson` — guided Q&A, then capture
- `/kmgraph:capture-lesson <topic>` — same, with topic pre-filled

**Update existing lesson:**
- `/kmgraph:capture-lesson update <filename>` — jump to Step 0

---

## Step 0: Update an Existing Lesson

*Entered when the user invokes `/kmgraph:capture-lesson update <filename>`.*

1. Locate the file at `{active_kg_path}/lessons-learned/<filename>`. If not found, ask the user for the correct path.
2. Read the file and extract: current version, last-updated date.
3. Ask what to change:

> "I'll update **[filename]** (currently v[X]).
>
> What would you like to add or change?
> 1. Add a new section
> 2. Update an existing section — which one?
> 3. Add a changelog note only
> 4. Other — describe it"

4. Gather update content from the user.
5. Show a summary of proposed changes and confirm before writing.
6. Apply updates: preserve all existing content, increment version to v1.X, add `<!-- v1.X Change -->` markers, update git metadata in YAML frontmatter.
7. Dispatch to `lesson-capture-agent` for the write, index rebuild, and commit offer — passing: filename, current version, proposed changes, and user-approved content.

---

## Step 1: Gather Context (New Lesson)

*When no "update" keyword is present.*

Ask the user these questions and **wait for their answers** before continuing:

1. **What problem did you solve or pattern did you implement?**
   — One or two sentences is enough to start.

2. **What should the lesson cover?**
   - The problem encountered
   - Root cause
   - Solution implemented
   - How to replicate it elsewhere
   - Other (describe)

3. **Who is the primary audience?**
   - Future developers on this project
   - Anyone wanting to replicate this pattern
   - General software engineering best practices
   - Other (describe)

4. **Suggested filename:** `Lessons_Learned_[Topic].md`
   — What should `[Topic]` be?

---

## Step 2: Optional — External Sources

> "Were any web searches, articles, or docs consulted while solving this? If yes, paste the URLs and I'll include them. Otherwise, type 'skip'."

Collect any URLs and a one-line note for each ("what did you learn from this source?"). If the user skips, continue.

---

## Step 3: Confirm and Dispatch

Once you have the user's answers, say:

> "Looks like you just solved something worth keeping — let me capture that."

Then invoke `lesson-capture-agent`, passing the following pre-structured context:

- **Problem statement** — from Step 1, question 1
- **Scope / coverage** — from Step 1, question 2
- **Audience** — from Step 1, question 3
- **Filename suggestion** — from Step 1, question 4
- **External sources** — from Step 2 (empty list if skipped)
- **Update context** — if this was Step 0: existing filename, current version, approved changes

The agent handles all execution: duplicate check, category detection, git metadata, file formatting, writing, index update, search rebuild, and commit offer.

---

## Related Commands

- `/kmgraph:update-graph` — extract insights from a lesson into the knowledge graph
- `/kmgraph:sync-all` — batch sync all lessons
- `/kmgraph:create-adr` — create a standalone architectural decision record
