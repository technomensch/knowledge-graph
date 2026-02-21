---
description: Update an existing documentation file — plugin/project documentation (--user-facing) or knowledge graph content
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion
---

# Update Documentation

**Purpose:** Update an existing documentation file. When used with `--user-facing`, enters a guided wizard for updating plugin/project documentation with v0.0.7 language standards enforcement. Without the flag, a disambiguation dialog clarifies whether the target is plugin documentation or knowledge graph content.

**Version:** 1.0 (Created: 2026-02-21)

**Note:** This command updates existing files. To scaffold a new document, use `/knowledge:create-doc`. To update a knowledge graph lesson, use `/knowledge:capture-lesson`. To update an ADR, use `/knowledge:create-adr`.

---

## Syntax

```
/knowledge:update-doc <file>
/knowledge:update-doc <file> --user-facing
```

**Examples:**
- `/knowledge:update-doc COMMAND-GUIDE.md --user-facing` → Update plugin documentation wizard
- `/knowledge:update-doc README.md --user-facing` → Update README with new feature information
- `/knowledge:update-doc some-lesson.md` → Disambiguation dialog, then confirm KG content update
- `/knowledge:update-doc docs/CHEAT-SHEET.md --user-facing` → Update cheat sheet syntax block

---

## Step 0: Resolve File Path

Before any other step, locate the target file.

**If `<file>` is an absolute or relative path** (starts with `/`, `./`, or `../`):
- Verify the file exists at the given path
- If not found, report an error and exit

**If `<file>` is a bare filename** (e.g., `COMMAND-GUIDE.md`):
- Search in this order:
  1. `docs/<file>`
  2. `core/docs/<file>`
  3. Project root `<file>`
- If multiple matches are found, present a numbered list and ask the user to select one
- If no match is found, report an error and exit

**KG content auto-detection:**
- Read `~/.claude/kg-config.json` to get the active KG path
- If the resolved file path falls within the active KG directory, automatically pre-select option 2 (KG content) in the disambiguation dialog

**Confirmed path stored as `$TARGET_FILE` for subsequent steps.**

---

## Step 1: Route by Flag

### Without `--user-facing` — Disambiguation Dialog

Always show this prompt when `--user-facing` is absent:

```
⚠️  Before proceeding — what type of document is this?

Resolved file: $TARGET_FILE

1. Plugin documentation (user-facing)
   Docs that ship with the plugin for end users
   (README, COMMAND-GUIDE, CHEAT-SHEET, GETTING-STARTED, etc.)
   → Re-run with: /knowledge:update-doc <file> --user-facing

2. Knowledge graph content
   Content created using the plugin
   (lessons, KG entries, ADRs, session summaries, MEMORY.md)
   → Confirm to update KG content

3. Cancel
```

- **Option 1 selected:** Proceed immediately to Step 2 with `--user-facing` mode active
- **Option 2 selected:** Proceed to Step 1b (KG content confirmation)
- **Option 3 selected:** Exit with message `Update cancelled.`

**Note:** If KG auto-detection identified the file as KG content (Step 0), pre-select option 2 with a note: `(Auto-detected as KG content based on active KG path)`

#### Step 1b: KG Content Confirmation

```
Updating knowledge graph content: $TARGET_FILE

This file is within the active knowledge graph. Confirming this is
intentional — for plugin documentation updates, re-run with --user-facing.

Proceed with KG content update? (yes / cancel)
```

If confirmed, read `$TARGET_FILE`, display its current contents, and ask:
```
What changes would you like to make to this file?
(Describe additions, removals, or modifications.)
```

Apply changes using Edit tool, then confirm completion:
```
✅ KG content updated: $TARGET_FILE
```

### With `--user-facing` — Proceed to Step 2

---

## Step 2: Read and Display Current State

Read `$TARGET_FILE` and display a summary:

```
📄 Updating: $TARGET_FILE (user-facing plugin documentation)

Sections found:
[List all ## headings from the file]

Current version: [extracted from "**Version**:" line or "**Updated**:" line, or "unknown"]
Last updated: [extracted from date in file, or "unknown"]
```

---

## Step 3: Select Update Type

```
What type of update?

1. Add new command entry — adds a new /knowledge:<command> block
2. Update existing command entry — modify flags, examples, or descriptions
3. Add new section — insert a new ## section
4. Update metadata only — bump version number and/or last-updated date
5. Run standards validation only — no content changes; report violations
6. Custom — describe the change in free text
```

**Wait for user selection.**

---

## Step 4: Gather Update Content

Based on the selection from Step 3:

**Option 1 (Add new command entry):**
```
Command name (e.g., update-doc):
Purpose (one sentence, third-person):
Difficulty level (Essential/Intermediate/Advanced):
Flags/options (optional):
Example usage:
```

**Option 2 (Update existing command entry):**
```
Which command entry to update:
What specifically to change (add flag, update description, add example, etc.):
```

**Option 3 (Add new section):**
```
New section heading:
Section content (describe or provide directly):
Placement (after which existing section):
```

**Option 4 (Update metadata only):**
```
New version number (current: [current]):
New date (current: [current], press Enter for today's date):
```

**Option 5 (Standards validation only):**
Skip directly to Step 5.

**Option 6 (Custom):**
```
Describe the changes to make:
```

**Wait for user input.**

---

## Step 5: Run v0.0.7 Standards Validation

Before applying any content changes, validate the proposed content (or existing file for option 5).

Run these checks:

**Check 1 — Third-person voice:**
```bash
grep -inE "\b(you|your|we|our)\b" "$TARGET_FILE"
```
Flag any matches. Acceptable exceptions: quoted user input, examples, code blocks.

**Check 2 — Heading hierarchy:**
- Scan all `#` through `######` headings
- Flag any level that skips (e.g., `##` followed directly by `####`)

**Check 3 — Table headers:**
- Find all Markdown tables
- Verify each has a `|---|` separator row

**Check 4 — Link text:**
```bash
grep -inE "\[click here\]|\[here\]|\[link\]" "$TARGET_FILE"
```
Flag any bare or non-descriptive link text.

**Display validation summary:**
```
Standards check (v0.0.7):

✅ Third-person voice  (or ⚠️  N violations found — line X: "your")
✅ Heading hierarchy   (or ⚠️  Skipped level — ## to #### at line X)
✅ Table headers       (or ⚠️  Table missing header at line X)
✅ Link text           (or ⚠️  Non-descriptive link at line X)
```

If option 5 (validation only): display the report and exit.

If violations found for content changes: ask user whether to fix violations before proceeding or proceed anyway.

---

## Step 6: Preview and Confirm

Show a summary of proposed changes before writing:

```
📝 Proposed changes to [filename]:

[Describe what will be added/changed/removed in plain language]

Standards check: [✅/⚠️ summary from Step 5]

Proceed? (yes / edit / cancel)
```

- **yes:** Apply changes
- **edit:** Return to Step 4 to revise
- **cancel:** Exit without changes

---

## Step 7: Apply Changes and Commit

**Apply changes** using the Edit tool (preferred) or Write tool for full rewrites.

**Add update marker** at the top of the updated section or near the file's version metadata:
```markdown
<!-- Updated: YYYY-MM-DD -->
```

**Commit the change:**
```bash
git add "$TARGET_FILE"
git commit -m "docs(user-facing): update [filename] — [brief description]

Standards: v0.0.7 (third-person, Section 508 compliant)
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

**Confirm completion:**
```
✅ Updated: $TARGET_FILE
   Committed: docs(user-facing): update [filename] — [brief description]
```

---

## Checklist (Internal)

- [ ] File path resolved (`$TARGET_FILE` confirmed)
- [ ] KG auto-detection checked against active KG path
- [ ] Disambiguation dialog shown (if `--user-facing` was absent)
- [ ] Correct path taken (user-facing wizard or KG content confirmation)
- [ ] Update type selected
- [ ] Update content gathered from user
- [ ] v0.0.7 standards validation run
- [ ] Diff preview shown and confirmed
- [ ] Edit/Write applied with update marker
- [ ] Committed with standards-compliant commit message
