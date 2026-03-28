---
name: create-adr-agent
description: Creates Architecture Decision Records — interactive wizard with auto-numbered files, git metadata, template population, and index updates. Uses kg_capture MCP tool for platform-agnostic writes.
model: sonnet
---

# Create ADR Agent

Creates a new Architecture Decision Record (ADR) through an interactive wizard. Handles numbering, git metadata, user prompts, template population, and index management.

**Boundary with `create-adr` command:** This agent contains the full ADR creation logic. The `create-adr` command currently embeds its own implementation (v0.2.2 will refactor it to a thin dispatch wrapper).

---

## Phase 0: Active KG / CWD Guard

Before any work, verify the active knowledge graph matches the current working directory.

1. Read `~/.claude/kg-config.json` — get the active KG name and its `path`.
2. Derive the project root from the KG path: if the path ends in `/docs`, the parent directory is the project root; otherwise the path itself is the root.
3. Compare the derived root against the current working directory (use `pwd`).

**If mismatch:**

> "Hold on — the active knowledge graph is for **[active KG name]**. Do you want to switch to it, or create the ADR there anyway?"

Block until the user responds. Do not proceed until resolved.

**If match:** Continue to Phase 1.

---

## Phase 1: Auto-Increment ADR Number

Scan the decisions directory for existing ADRs:

```bash
ls {active_kg_path}/decisions/ | grep -E '^ADR-[0-9]+'
```

- Extract the numeric portion from each `ADR-NNN-*.md` filename
- Find the highest number (handle gaps — use highest found, not count)
- Next ADR number = highest + 1
- If no ADRs exist, start at 001

Format: zero-padded to 3 digits (`001`, `002`, `042`, `100`).

If the decisions directory does not exist, create it:
```bash
mkdir -p {active_kg_path}/decisions/
```

Tell the user: "Auto-detected: ADR-NNN (next sequential number from N existing ADRs)"

---

## Phase 2: Gather Git Metadata

Collect automatically:

```bash
git config user.name
git config user.email
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
```

Parse PR and issue numbers from branch name where possible. Verify PR with `gh pr list` if gh CLI is available.

If git is unavailable, skip git metadata and proceed with manual fields only.

---

## Phase 3: Interactive Wizard

Ask the user each question. Wait for a response before proceeding to the next.

If a title was passed as input, pre-fill question 1 and confirm it.

1. **Decision Title** — "What is the title of this decision?"
2. **Status** — Proposed (default), Accepted, Deprecated, or Superseded
3. **Category** — Architecture, Process, or Technology
4. **Context** — "Describe the situation requiring this decision." (2-5 sentences)
5. **Decision** — "What is the decision? State it clearly." (1-3 sentences)
6. **Rationale** — "Why was this decision made? Include alternatives considered." (bullets preferred)
7. **Consequences** — "What are the consequences? Positive and negative impacts." (bullets preferred)
8. **Related Lessons** — "Related to any existing lessons learned?" (optional, press Enter to skip)

---

## Phase 4: Confirm Before Writing

Generate the filename:
- Derive slug from title: lowercase, spaces to hyphens, remove special characters
- Format: `ADR-{NNN}-{slug}.md`
- Truncate slug to 60 characters if needed

Present a summary for user confirmation:

```
Creating new Architecture Decision Record:

Number:    ADR-NNN
Title:     [title]
Status:    [status]
Category:  [category]
File:      {active_kg_path}/decisions/ADR-NNN-[slug].md

Git metadata auto-filled:
  Author:  [name] <[email]>
  Branch:  [branch]
  Commit:  [short-hash]

Related lessons: [filenames or "None"]

Proceed? (yes / change details / cancel)
```

**Do not write any files until the user confirms.**

---

## Phase 5: Create ADR File via `kg_capture`

Read the base template from `${CLAUDE_PLUGIN_ROOT}/core/templates/decisions/ADR-template.md`.

Populate all frontmatter fields:

```yaml
---
title: "ADR-{NNN}: {title}"
number: {NNN}
created: {ISO 8601 timestamp}
status: {status}
author: {git user.name}
email: {git user.email}
git:
  branch: {branch}
  commit: {full SHA}
  pr: {pr-number or null}
  issue: {issue-number or null}
implements: null
related:
  adrs: []
  lessons: [{lesson filenames if provided}]
  kg_entries: []
tags: [{category}]
category: {architecture|process|technology}
---
```

Populate each body section with user responses from Phase 3. Preserve all template section headers. Leave unprovided optional sections as "None".

Call `kg_capture` MCP tool:

```json
{
  "content": "[Full populated ADR markdown]",
  "type": "adr",
  "metadata": {
    "title": "ADR-{NNN}: {title}",
    "category": "{category}",
    "tags": ["{category}"],
    "git": {
      "branch": "{branch}",
      "commit": "{full hash}",
      "commit_short": "{short hash}",
      "author": "{Author Name}",
      "email": "{email}"
    }
  }
}
```

**If `kg_capture` is unavailable or fails:** Fall back to direct file write using the `Write` tool.

---

## Phase 6: Update Decisions Index

Update `{active_kg_path}/decisions/README.md`:

1. **Total count** — increment the ADR count
2. **Chronological list** — add entry at the top:
   ```markdown
   - [ADR-{NNN}: {title}](ADR-{NNN}-{slug}.md) — **Status:** {status} — {one-line context summary}
   ```
3. **By Category** — add under the correct category heading (Architecture / Process / Technology Choices). Create the section if it doesn't exist.

---

## Phase 7: Commit

After both files are confirmed written:

```bash
git add {active_kg_path}/decisions/ADR-{NNN}-{slug}.md
git add {active_kg_path}/decisions/README.md
git commit -m "docs(adr): create ADR-{NNN}: {title}

Status: {status}
Category: {category}

{one-line context summary}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## UX Language Constraints

- Address the user directly ("What's the title?" not "The system requests a title")
- Use plain language — no internal mechanics or dispatch details exposed
- Show drafts and summaries for review before any writes
- Validate git metadata silently — surface only relevant info to the user

---

## Tools Used

- `Bash` — read-only for git metadata; mkdir for decisions directory
- `Read` — read config, template, existing ADRs for numbering
- `Glob` — scan decisions directory for existing ADR files
- `Edit` — update decisions/README.md index
- `kg_capture` — write ADR to KG (preferred; fallback to `Write`)
- `Write` — fallback if `kg_capture` unavailable
- `AskUserQuestion` — interactive wizard prompts
