---
description: Scaffold new documentation files with v0.0.7 language standards, Section 508 compliance, and optional cross-reference auto-update
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion
---

# Create Documentation

**Purpose:** Scaffold a new documentation file using the active project's v0.0.7 standards — third-person voice, Section 508 accessibility, and canonical structure. Optionally auto-update cross-references in existing files.

**Version:** 1.0 (Created: 2026-02-20)

**Note:** This command creates general documentation (Guides, Concepts, Tutorials, etc.). For Lessons Learned, use `/kmgraph:capture-lesson`. For Architecture Decision Records, use `/kmgraph:create-adr`.

---

## Syntax Detection

```
/kmgraph:create-doc
/kmgraph:create-doc <topic>
/kmgraph:create-doc <topic> --update-refs
/kmgraph:create-doc --update-refs
```

**Examples:**
- `/kmgraph:create-doc` → Interactive wizard (all prompts)
- `/kmgraph:create-doc platform adaptation guide` → Pre-fills topic from argument
- `/kmgraph:create-doc troubleshooting guide --update-refs` → Create and auto-update cross-references in existing files

**Flag Behavior:**
- **Default (no flag):** Lists existing files that likely need cross-reference updates, but does NOT modify them.
- **`--update-refs`:** Automatically injects a link to the new document into the "Related Documentation" section of relevant existing files.

---

## Step 1: Duplicate Detection Pre-Flight

**Before prompting for details, check for similar existing documentation:**

**Extract keywords from user's request (if topic provided):**
- Topic words
- Document type keywords
- Technology/tool names

**Search existing docs:**

```bash
# Search for files matching the topic in docs/ and core/docs/
find docs/ core/docs/ -name "*.md" 2>/dev/null | head -20
```

Use Grep to search for keyword overlap in existing documentation titles.

**If similar document found:**

Present to user:

```
🔍 Similar documentation found:

Existing: docs/PLATFORM-ADAPTATION.md
Title: Platform Adaptation Guide

Would you like to:
1. Update the existing document instead
2. Create a new document with a link to the existing one
3. Proceed independently (create without explicit link)
```

**If no similar document found:**
```
No similar documents found. Proceeding with new document...
```
→ Continue to Step 2

---

## Step 2: Interactive Wizard (INTERACTIVE)

**Ask the user these questions. Wait for answers before proceeding.**

### 2.1 Document Type

```
What type of document are you creating?

1. Guide         — Step-by-step instructions for completing a task
2. Concept       — Plain-English explanation of a term or idea
3. Tutorial      — Learning-oriented walkthrough with exercises
4. Explanation   — Background/context for understanding why something works
5. Reference     — Lookup table, API docs, or command list
6. FAQ           — Frequently Asked Questions
7. Custom        — Enter a custom document type

(Note: Lessons use /kmgraph:capture-lesson | ADRs use /kmgraph:create-adr)
```

**Wait for user selection.**

### 2.2 Topic and Title

```
What is the topic or title of this document?
(Example: "Error Handling Patterns", "Installation on Windows", "MCP Server Reference")
```

**Wait for user response.**

### 2.3 Brief Description

```
In one sentence, what does this document cover?
(This will appear in navigation indexes and cross-references.)
```

**Wait for user response.**

### 2.4 Target Location

```
Where should this file be created?

1. docs/                   — Main user-facing documentation
2. core/docs/              — Internal/contributor documentation
3. Custom path             — Enter a custom path
```

**Wait for user selection.**

**If custom path selected:** Prompt user for the path.

### 2.5 Target Audience (Optional)

```
Who is the primary audience? (Press Enter to skip)

1. New users setting up the plugin
2. Contributors working on the codebase
3. Experienced users referencing features
4. General / all audiences
```

---

## Step 3: Generate Filename and Confirm

**Filename generation rules:**
- Derive from topic/title
- Format: `TOPIC-KEYWORD.md` (uppercase words, hyphens)
- Examples:
  - "Error Handling Patterns Guide" → `ERROR-HANDLING-PATTERNS.md`
  - "Windows Installation" → `INSTALLATION-WINDOWS.md`
  - "MCP Server Reference" → `MCP-SERVER-REFERENCE.md`

**Present summary to user for confirmation:**

```
📄 Creating new documentation:

Type:        [selected type]
Title:       [document title]
Description: [brief description]
Audience:    [audience or "General"]
Location:    [target path/FILENAME.md]
Template:    core/templates/documentation/doc-template.md

Cross-references: [Default: suggest-only | --update-refs: auto-inject]

Proceed? (yes / change details / cancel)
```

**Wait for user confirmation before writing any files.**

---

## Step 4: Scaffold Document from Template

**Read the base template:**

```
Action: Read ${CLAUDE_PLUGIN_ROOT}/core/templates/documentation/doc-template.md
```

**Populate the template with gathered information:**

### 4.1 YAML Frontmatter

```yaml
---
title: "[Document Title]"
type: "[guide | concept | tutorial | explanation | reference | faq | custom]"
created: "[YYYY-MM-DDThh:mm:ssZ]"
author: "[AUTO: git config user.name]"
---
```

Auto-capture git author:
```bash
git config user.name
```

If git is unavailable, leave `author` blank.

### 4.2 Apply v0.0.7 Language Standards

The generated content **must** enforce:

**Third-person voice throughout:**
- Correct: "Users can configure...", "The system provides...", "Contributors should..."
- Never: "you", "your", "we", "our", "they" (as pronoun for users), "them"

**Section 508 Heading Hierarchy:**
- H1 (document title) → H2 (main sections) → H3 (sub-sections only)
- Never skip heading levels
- Never use headings for visual styling alone

**Descriptive Links:**
- Correct: `[Installation Guide](GETTING-STARTED.md) — First-time setup`
- Never: `[click here](...)`, `[here](...)`, `[this link](...)`

**Table Headers:**
- Every table must have a header row with `|---|` separator

### 4.3 Navigation Breadcrumb

Generate the breadcrumb based on target location:

| Location | Breadcrumb Pattern |
|----------|-------------------|
| `docs/` | `[Home](../README.md) > [Document Title]` |
| `core/docs/` | `[Home](../../README.md) > [Core Docs](../README.md) > [Document Title]` |
| Custom path | Derive relative path to README.md |

### 4.4 Section Structure by Document Type

Apply type-specific section structure:

**Guide:**
```markdown
## Prerequisites
## Steps
### Step 1: [Action]
### Step 2: [Action]
## Troubleshooting
## Related Documentation
```

**Concept:**
```markdown
## Overview
## [Core Concept Name]
## How It Works
## Examples
## Related Documentation
```

**Tutorial:**
```markdown
## Learning Objectives
## Prerequisites
## [Task 1]
## [Task 2]
## Summary
## Related Documentation
```

**Explanation:**
```markdown
## Background
## [Key Idea 1]
## [Key Idea 2]
## Implications
## Related Documentation
```

**Reference:**
```markdown
## Overview
## [Category 1]
## [Category 2]
## Related Documentation
```

**FAQ:**
```markdown
## General Questions
## [Topic Area] Questions
## Related Documentation
```

**Custom:**
Use the base template sections as-is.

### 4.5 Related Documentation Pre-fill

Pre-populate with standard cross-references:

```markdown
## Related Documentation

**Getting Started**:
- [Installation Guide](../../docs/GETTING-STARTED.md) — First-time setup and configuration

**Reference**:
- [Command Reference](../../docs/COMMAND-GUIDE.md) — All commands with examples
- [Concepts Guide](../../docs/CONCEPTS.md) — Plain-English term explanations

**Resources**:
- [Templates](../../core/templates/) — Starting scaffolds for new documents
```

Adjust relative paths based on target location depth.

---

## Step 5: Write File

Write the scaffolded document to the target path.

**Validation before writing:**

Run mental checklist:
- [ ] YAML frontmatter is complete
- [ ] H1 → H2 → H3 hierarchy is sequential (no skipped levels)
- [ ] All links use descriptive text (no "click here")
- [ ] All tables have header rows
- [ ] Voice is third-person throughout
- [ ] Navigation breadcrumb reflects correct path
- [ ] "Related Documentation" section is filled in

**Write the file, then confirm:**

```
✅ Created: [target path/FILENAME.md]

Sections scaffolded: [list of generated sections]
Word count: ~[estimate]
```

---

## Step 6: Cross-Reference Handling

### 6.1 Default Behavior (No Flag)

Search for existing documentation files that contain a "Related Documentation" or "Related" section and whose topic overlaps with the new document.

**Search pattern:**
```bash
grep -rl "## Related" docs/ core/docs/ 2>/dev/null
```

**Present suggestion list:**

```
📋 Files that may benefit from a cross-reference to [new doc]:

1. docs/GETTING-STARTED.md — Contains "Related Documentation" section
2. docs/COMMAND-GUIDE.md — Contains "Related Documentation" section
3. docs/CONCEPTS.md — Contains "Related Documentation" section

To automatically inject links, re-run with --update-refs:
/kmgraph:create-doc [topic] --update-refs

Or manually add the following link to each file's Related Documentation section:
- [[Document Title]]([relative path]) — [brief description]
```

### 6.2 With `--update-refs` Flag

**Auto-injection mechanism:**

For each candidate file identified above:

1. **Read the file** and locate `## Related Documentation` or `## Related` section header
2. **Check for duplicate:** Scan the section for the new document's filename — skip if already present
3. **Append link** at the end of that section, before the next `---` or `##`
4. **If section does not exist:** Create `## Related Documentation` section at the end of the file, before any trailing footer content

**Link format to inject:**
```markdown
- [[Document Title]]([relative path from target file]) — [brief description]
```

**If section exists:** Append to end of section.
**If section missing:** Append new section:
```markdown

## Related Documentation

- [[Document Title]]([relative path]) — [brief description]
```

**After all injections, present summary:**

```
✅ Cross-references updated in 3 files:

- docs/GETTING-STARTED.md → appended link to Related Documentation
- docs/COMMAND-GUIDE.md → appended link to Related Documentation
- docs/CONCEPTS.md → appended link to Related Documentation

Skipped: 0 files (no duplicates found)
```

---

## Step 7: Commit

After documents are created and cross-references handled:

```bash
git add [new-doc-path]
# If --update-refs was used, also add modified files:
git add docs/ core/docs/
git commit -m "docs: scaffold [document title] ([type])

[Brief description of document]

Type: [guide|concept|tutorial|explanation|reference|faq|custom]
Location: [target path/FILENAME.md]
Cross-refs: [updated N files | suggest-only]
Standards: v0.0.7 (third-person, Section 508 compliant)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Example Invocations

### Example 1: Basic wizard flow

**User types:** `/kmgraph:create-doc`

**Assistant responds:**

```
I'll help scaffold a new documentation file. First, let me check for similar existing docs...

No similar documents found. Let's set up the details:

What type of document are you creating?

1. Guide         — Step-by-step instructions for completing a task
2. Concept       — Plain-English explanation of a term or idea
3. Tutorial      — Learning-oriented walkthrough
4. Explanation   — Background context for understanding why
5. Reference     — Lookup table, API docs, or command list
6. FAQ           — Frequently Asked Questions
7. Custom        — Enter a custom type

(Note: Lessons → /kmgraph:capture-lesson | ADRs → /kmgraph:create-adr)
```

### Example 2: With topic and flag

**User types:** `/kmgraph:create-doc error handling guide --update-refs`

**Assistant responds:**

```
I'll scaffold a new "Error Handling Guide" and auto-update cross-references.

🔍 Checking for similar docs... None found.

Let me confirm the details before creating:

Type:        Guide
Title:       Error Handling Guide
Location:    docs/ERROR-HANDLING-GUIDE.md
Cross-refs:  --update-refs (will auto-inject links into existing files)

Proceed? (yes / change details / cancel)
```

---

## Checklist Before Creating Document

- [ ] Duplicate detection completed
- [ ] Document type, title, description, and location confirmed by user
- [ ] Filename follows naming convention (UPPERCASE-HYPHENATED.md)
- [ ] Template read from `core/templates/documentation/doc-template.md`
- [ ] YAML frontmatter populated (title, type, created, author)
- [ ] Third-person voice enforced throughout
- [ ] Section 508 heading hierarchy is sequential (no skipped levels)
- [ ] All links use descriptive text (no "click here")
- [ ] All tables have header rows
- [ ] Navigation breadcrumb reflects correct relative path
- [ ] Related Documentation section pre-filled
- [ ] Cross-references handled (suggest-only or --update-refs)
- [ ] File committed with descriptive message

---

## Related Commands

- `/kmgraph:capture-lesson` — Document lessons learned and solved problems
- `/kmgraph:create-adr` — Create Architecture Decision Records
- `/kmgraph:recall` — Search existing documentation and knowledge
- `/kmgraph:sync-all` — Full knowledge pipeline sync

---

**Created:** 2026-02-20
**Version:** 1.0
**Usage:** Type `/kmgraph:create-doc` to scaffold a new documentation file
