---
description: Create Architecture Decision Records with auto-filled git metadata, sequential numbering, and index auto-update
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion
---

# Create Architecture Decision Record

**Purpose:** Create a new Architecture Decision Record (ADR) using the active knowledge graph. Auto-fills git metadata, auto-increments the ADR number, prompts for decision content, and updates the decisions index.

**Version:** 1.0 (Created: 2026-02-20)

**Note:** This command creates Architecture Decision Records. For Lessons Learned, use `/kmgraph:capture-lesson`. For general documentation, use `/kmgraph:create-doc`.

---

## Syntax Detection

```
/kmgraph:create-adr
/kmgraph:create-adr <title>
```

**Examples:**
- `/kmgraph:create-adr` → Interactive wizard (all prompts)
- `/kmgraph:create-adr Use PostgreSQL for primary database` → Pre-fills title from argument

---

## Level Routing Detection

Before any other steps, detect the level signal from the user's invocation and resolve it to an explicit flag.

**Invoke `gov-capture-routing` skill** to:
1. Detect level signal from the user's message (NL patterns or explicit flags)
2. Resolve `$level`, `$target_kg`, `$target_path` (→ `{target_kg}/decisions/`), `$restore_kg`
3. Handle prompts if needed (named KG not found, no project KG configured, conflict resolution)

Pass the resolved flag (`--user`, `--project`, `--named=<kg>`, or `--active`) to the `create-adr-agent` invocation.

#### Tier resolution

Set `$requested_tier` = `standard-tier`. Invoke `ai-model-tier-resolver` module (`commands/init-shared/ai-model-tier-resolver.md`) with `$requested_tier` and `{KG_PATH}`. On success: pass `--model [$resolved_model]` to the subagent.

After the agent returns, extract the draft content and display it verbatim in your main-thread response before asking save/edit/cancel. Do not rely on the tool result being visible to the user.

---

## Step 0: Resolve Active KG Path

**Read the active knowledge graph configuration:**

```bash
# Read ~/.claude/kg-config.json
# Find "active" field
# Get path from graphs[active].path
```

Store as `{active_kg_path}` for all subsequent steps.

**Decisions directory:** `{active_kg_path}/decisions/`

If the decisions directory does not exist, create it:
```bash
mkdir -p {active_kg_path}/decisions/
```

---

## Project KG Guardrail

**STOP before any write if the active KG does not match the current project's KG.**

After resolving `{active_kg_path}`, detect the project root and its KG:

```bash
project_root=$(git rev-parse --show-toplevel 2>/dev/null)
project_kg="${project_root}/knowledge"
```

If `$project_kg` **exists** AND its resolved path **differs** from `{active_kg_path}`:

> "The active KG is **[active_kg_name]** (`{active_kg_path}`), but this project has its own KG at `{project_kg}/`.
>
> Which graph should receive this ADR?
>
> **[1]** Project KG — `{project_kg}/decisions/`
> **[2]** Active KG — `{active_kg_name}` (`{active_kg_path}/decisions/`)
> **[3]** Cancel"

Wait for user selection. Update `{active_kg_path}` to the chosen graph's root before continuing. Do **not** proceed to the Snapshot Gate until the user has chosen.

If `$project_kg` does not exist, or paths match, continue without prompting.

---

## Snapshot Gate

*Runs before Step 1 — context preservation before the ADR dialog.*

Ask:

> "Before creating the ADR — want to run a session summary first?
> This saves the current session state as a persistent summary and makes the 'why' behind this decision available for the ADR's Context section.
>
> [y] Run session summary   [u] Update existing   [n] Skip   [?] What does this do?"

If `?`: explain that this runs `/kmgraph:session-summary` in snapshot mode — a lightweight variant that records what was worked on, open plan items, and file changes without requiring a full wrap-up. The result is written to disk and used to enrich the ADR's Context section.

If `y`:
> "Include git history in the session summary? (adds ~5-15 sec)
>
> [y] Yes — include commits   [n] No — conversation + files only"

Invoke `session-summary-agent --snapshot` (with `--git` if yes). When the agent returns, say:

> "Session summary saved — I'll use that to fill in the ADR's context and background."

Then continue to Step 1.

If `u`:
> "Include git history in the updated session summary? (adds ~5-15 sec)
>
> [y] Yes — include commits   [n] No — conversation + files only"

Invoke `session-summary-agent --snapshot --update` (with `--git` if yes). This refreshes the most recent session summary for the current session rather than creating a new one. When the agent returns, say:

> "Session summary updated — I'll use that to fill in the ADR's context and background."

Then continue to Step 1.

If `n`: proceed to Step 1.

---

## Step 1: Auto-Increment ADR Number

**Scan for existing ADRs:**

```bash
ls {active_kg_path}/decisions/ | grep -E '^ADR-[0-9]+'
```

**Parse existing numbers:**
- Extract the numeric portion from each `ADR-NNN-*.md` filename
- Find the highest number (handle gaps in numbering — use highest found, not count)
- Next ADR number = highest + 1
- If no ADRs exist, start at 001

**Format:** Zero-padded to 3 digits: `001`, `002`, `042`, `100`

**Edge cases:**
- Gap in numbering (e.g., 001, 003 exist → next is 004, not 002)
- Single ADR exists → next is its number + 1
- No ADRs exist → start at 001

**Announce to user:**
```
Auto-detected: ADR-002 (next sequential number from 1 existing ADR)
```

---

## Step 2: Auto-Collect Git Metadata

**Collect the following automatically:**

```bash
git config user.name        # author
git config user.email       # email
git rev-parse --abbrev-ref HEAD  # branch
git rev-parse HEAD          # commit (full SHA)
```

**Parse PR and issue numbers from branch name:**
- Branch `feature/123-add-caching` → pr candidate: `123`
- Branch `issue/456-fix-auth` → issue: `456`
- Branch with no numeric prefix → `null`
- Verify PR with: `gh pr list --head $(git rev-parse --abbrev-ref HEAD) --json number --jq '.[0].number'` (if gh CLI available)

**If git is not available:**
- Skip all git metadata fields
- Create frontmatter with title, number, created, status, category only

**Current timestamp:** Use ISO 8601 format: `YYYY-MM-DDTHH:MM:SSZ`

---

## Step 3: Interactive Wizard (INTERACTIVE)

**Ask the user these questions. Wait for answers before proceeding.**

If a title was passed as a command argument, pre-fill question 1 and confirm it rather than prompting fresh.

### 3.1 Decision Title

```
What is the title of this decision?
(Example: "Use PostgreSQL for Primary Database", "Adopt Trunk-Based Development")
```

**Wait for user response.**

### 3.2 Decision Status

```
What is the current status of this decision?

1. Proposed    — Decision under consideration (default)
2. Accepted    — Decision approved and implemented
3. Deprecated  — No longer relevant
4. Superseded  — Replaced by a newer ADR (will prompt for superseding ADR number)
```

**Default:** Proposed. Wait for user selection.

### 3.3 Category

```
Which category best describes this decision?

1. Architecture   — System design, component structure, patterns
2. Process        — Development workflow, team processes, procedures
3. Technology     — Tool selection, framework choices, infrastructure
```

**Wait for user selection.**

### 3.4 Context

```
Describe the situation requiring this decision.

Include:
- What needs to be decided
- Why it matters
- Who is affected
- Any constraints or limitations

(2–5 sentences or bullet points)
```

**Wait for user response.**

### 3.5 Decision

```
What is the decision?
State it clearly and concisely — what was chosen or will be done.

(1–3 sentences)
```

**Wait for user response.**

### 3.6 Rationale

```
Why was this decision made?

Include:
- Primary reasons for this choice
- Alternatives considered and why they were rejected
- Key trade-offs accepted

(Bullet points preferred)
```

**Wait for user response.**

### 3.7 Consequences

```
What are the consequences of this decision?

Include:
- Positive impacts (✅)
- Negative impacts or costs (❌)
- How costs are mitigated (if applicable)

(Bullet points preferred)
```

**Wait for user response.**

### 3.8 Related Lessons (Optional)

```
Is this decision related to any existing lessons learned?

If yes, provide the filename(s):
  Example: Lessons_Learned_Database_Pooling.md

(Press Enter to skip)
```

**Wait for user response or skip.**

---

## Step 4: Generate Filename and Confirm

**Filename generation:**
- Derive slug from title: lowercase, spaces → hyphens, remove special characters
- Format: `ADR-{NNN}-{slug}.md`
- Examples:
  - Title "Use PostgreSQL for Primary Database" → `ADR-002-use-postgresql-for-primary-database.md`
  - Title "Adopt Trunk-Based Development" → `ADR-002-adopt-trunk-based-development.md`
- Truncate slug to 60 characters if needed

**Present summary to user for confirmation:**

```
📋 Creating new Architecture Decision Record:

Number:    ADR-002
Title:     [title]
Status:    [status]
Category:  [category]
File:      {active_kg_path}/decisions/ADR-002-[slug].md

Git metadata auto-filled:
  Author:  [name] <[email]>
  Branch:  [branch]
  Commit:  [short-hash]

Related lessons: [filenames or "None"]

Proceed? (yes / change details / cancel)
```

**Wait for user confirmation before writing any files.**

---

## Step 5: Create ADR File

**Read the base template:**

```
Action: Read ${CLAUDE_PLUGIN_ROOT}/core/default-templates/decisions/ADR-template.md
```

**Populate template with gathered data, replacing all placeholder fields:**

### 5.1 YAML Frontmatter

```yaml
---
title: "ADR-{NNN}: {title}"
number: {NNN}
created: {YYYY-MM-DDTHH:MM:SSZ}
status: {status}
author: {git config user.name}
email: {git config user.email}
git:
  branch: {branch}
  commit: {full commit SHA}
  pr: {pr-number or null}
  issue: {issue-number or null}
implements: null
related:
  adrs: []
  lessons: [{lesson filenames if provided, else empty list}]
  kg_entries: []
tags: [{category}]
category: {architecture|process|technology}
---
```

### 5.2 Document Body

Populate each section with the content gathered in Step 3:

- **H1 title:** `# ADR-{NNN}: {title}`
- **Date:** Current date (YYYY-MM-DD)
- **Status line:** `**Status:** {status}`
- **Context section:** User's context response (structured as Problem / Scope bullets)
- **Decision section:** User's decision response
- **Rationale section:** User's rationale response (alternatives, trade-offs)
- **Consequences section:** User's consequences response (positive, negative, mitigation)
- **Related Decisions section:** Empty or pre-filled if user provided related ADRs
- **Related Documentation / Lessons Learned:** Linked lessons if provided in Step 3.8

**Preserve all template section headers.** Fill placeholder text with user responses; leave unprovided optional sections as "None" or empty.

**Cross-References:** When referencing other KMGraph files in the ADR body, use Obsidian wiki link syntax: `[[filename-without-extension]]`. For ADRs, always use the full filename: `[[ADR-028-rules-md-scaffolding]]`, not `[[ADR-028]]`. For external GitHub issues and PRs, use standard markdown links: `[#NNN](url)`. Never use wiki links for external URLs.

---

## Step 6: Update Decisions Index

**Update `{active_kg_path}/decisions/README.md`:**

### 6.1 Update total count and date

Find and replace the header stats:
```markdown
**Total ADRs:** N → N+1
**Last Updated:** {today's date}
```

### 6.2 Add to "All ADRs (Chronological)" section

Append the new entry at the top of the chronological list:
```markdown
- [ADR-{NNN}: {title}](ADR-{NNN}-{slug}.md) — **Status:** {status} — {one-line context summary}
```

### 6.3 Add to "By Category" section

Add under the correct category heading:
- Architecture → `### Architecture`
- Process → `### Process`
- Technology → `### Technology Choices`

Entry format:
```markdown
- [ADR-{NNN}](ADR-{NNN}-{slug}.md) — {title}
```

**If the category section does not exist in the README**, create it before adding the entry.

**Update the "Creating a New ADR" section** to reference the new command:
```markdown
Run `/kmgraph:create-adr` — the command handles numbering, metadata, and index updates automatically.
```

Only add this line if it is not already present.

---

## Step 7: Commit

After both files are written and confirmed:

```bash
git add {active_kg_path}/decisions/ADR-{NNN}-{slug}.md
git add {active_kg_path}/decisions/README.md
git commit -m "docs(adr): create ADR-{NNN}: {title}

Status: {status}
Category: {category}
Branch: {branch}
Commit: {short-hash}

{one-line context summary}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Example Invocation

**User types:** `/kmgraph:create-adr`

**Assistant responds:**

```
Creating new Architecture Decision Record...

Auto-detected: ADR-002 (next sequential number)

Collecting git metadata...
  Author:  Jane Smith <jane@example.com>
  Branch:  feature/add-caching
  Commit:  a1b2c3d

Let me ask a few questions:

1. What is the title of this decision?
```

---

## Checklist Before Creating ADR

- [ ] Active KG path resolved from `~/.claude/kg-config.json`
- [ ] ADR number auto-incremented correctly (highest existing + 1)
- [ ] Git metadata collected (author, email, branch, commit)
- [ ] Title, status, and category confirmed by user
- [ ] Context, decision, rationale, and consequences gathered
- [ ] Filename follows `ADR-{NNN}-{slug}.md` pattern
- [ ] User confirmed summary before file creation
- [ ] Template read from `core/default-templates/decisions/ADR-template.md`
- [ ] YAML frontmatter fully populated (all `[FUTURE-AUTO]` fields filled)
- [ ] All template placeholder text replaced with actual content
- [ ] `decisions/README.md` total count updated
- [ ] `decisions/README.md` chronological list updated
- [ ] `decisions/README.md` by-category section updated
- [ ] Both files committed with descriptive message

---

## Related Commands

- `/kmgraph:capture-lesson` — Document lessons learned (ADR link offered after capture)
- `/kmgraph:create-doc` — Scaffold general documentation files
- `/kmgraph:recall` — Search existing ADRs and lessons
- `/kmgraph:link-issue` — Link an existing ADR to a GitHub issue

---

**Created:** 2026-02-20
**Version:** 1.0
**Usage:** Type `/kmgraph:create-adr` to create a new Architecture Decision Record
