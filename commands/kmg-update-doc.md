
# Update Documentation

**Purpose:** Update an existing documentation file. When used with `--user-facing`, enters a guided wizard for updating plugin/project documentation with v0.0.7 language standards enforcement. Without the flag, a disambiguation dialog clarifies whether the target is plugin documentation or knowledge graph content.

**Version:** 1.0 (Created: 2026-02-21)

**Note:** This command updates existing files. To scaffold a new document, use `/kmgraph:kmg-create-doc`. To update a knowledge graph lesson, use `/kmgraph:kmg-capture-lesson`. To update an ADR, use `/kmgraph:kmg-create-adr`.

---

## Syntax

```
/kmgraph:kmg-update-doc <file>
/kmgraph:kmg-update-doc <file> --user-facing
```

**Examples:**
- `/kmgraph:kmg-update-doc COMMAND-GUIDE.md --user-facing` → Update plugin documentation wizard
- `/kmgraph:kmg-update-doc README.md --user-facing` → Update README with new feature information
- `/kmgraph:kmg-update-doc some-lesson.md` → Disambiguation dialog, then confirm KG content update
- `/kmgraph:kmg-update-doc docs/CHEAT-SHEET.md --user-facing` → Update cheat sheet syntax block

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
- Call `kg_resolve` to get the target KG path for the current working directory (no separate "active" pointer to read — ADR-067 derives the graph from cwd directly). If `kg_resolve` errors (no graph registered for this directory), skip auto-detection and fall through to the disambiguation dialog.
- If the resolved file path falls within the resolved KG directory, automatically pre-select option 2 (KG content) in the disambiguation dialog

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
   → Re-run with: /kmgraph:kmg-update-doc <file> --user-facing

2. Knowledge graph content
   Content created using the plugin
   (lessons, KG entries, ADRs, session summaries)
   → Confirm to update KG content

3. Cancel
```

- **Option 1 selected:** Proceed immediately to Step 2 with `--user-facing` mode active
- **Option 2 selected:** Proceed to Step 1b (KG content confirmation)
- **Option 3 selected:** Exit with message `Update cancelled.`

**Note:** If KG auto-detection identified the file as KG content (Step 0), pre-select option 2 with a note: `(Auto-detected as KG content based on resolved KG path)`

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

## Step 2.5: Pre-flight Housekeeping Scan

Run automatically after Step 2, before any content changes. Scan `$TARGET_FILE` for the following and report findings. If violations are found, ask: "Fix housekeeping issues before proceeding? (yes / skip / cancel)"

**Version & date hygiene**
```bash
# Stale version header
grep -n "^\*\*Version:\*\*" "$TARGET_FILE"

# Stale Updated header
grep -n "Updated:" "$TARGET_FILE"

# Stale section comments
grep -n "<!-- Updated:" "$TARGET_FILE"

# [NEW in vX.X] badges — flag any from releases older than the current release series
grep -n "\[NEW in v" "$TARGET_FILE"

# Inline (vX.X-beta) annotations — same rule
grep -n "(v[0-9]\+\.[0-9]\+-beta)" "$TARGET_FILE"

# -beta in user-facing version strings
grep -n "\*\*Version:\*\*.*-beta" "$TARGET_FILE"
```

**Link integrity**
```bash
# Extract all markdown links to local files and verify they exist
grep -oE "\[([^\]]+)\]\(([^)]+\.md[^)]*)\)" "$TARGET_FILE"
# For each resolved path: check file exists; report any that don't
```

**README-specific (run only when $TARGET_FILE is README.md)**
```bash
# Hard counts (stale by definition)
grep -n "([0-9]\+ Total)\|([0-9]\+ tools)\|([0-9]\+ agents)\|([0-9]\+ commands)" "$TARGET_FILE"

# Verify all commands listed exist in commands/
grep -oE "/kmgraph:[a-z-]+" "$TARGET_FILE" | sort -u

# Ancient resolved issue notices
grep -n "Already fixed in v0\." "$TARGET_FILE"

# Internal roadmap language
grep -inE "Phase [0-9]+ \(|publication\)" "$TARGET_FILE"
```

**Voice & style**
```bash
# Second-person voice (flag for COMMAND-GUIDE.md)
grep -inE "\b(you|your)\b" "$TARGET_FILE"

# Em dashes
grep -n " — " "$TARGET_FILE"
```

**Display findings summary before proceeding:**
```
Pre-flight scan: $TARGET_FILE

✅ Version header current       (or ⚠️  Shows X.X — current is Y.Y)
✅ Date headers current         (or ⚠️  N stale timestamps found)
✅ Section comments current     (or ⚠️  N stale <!-- Updated: --> found)
✅ No stale [NEW] badges        (or ⚠️  N badges from prior release series)
✅ No hard counts               (or ⚠️  Found: "23 Total" at line N)
✅ No broken internal links     (or ⚠️  N missing files)
✅ No internal roadmap language (or ⚠️  Found at line N)

Fix before proceeding? (yes / skip / cancel)
```

---

## User-Facing Docs — Reference File List

When running a full release docs pass (`--user-facing` with no specific file), work through this list immediately. When a specific Tier 1 file is updated, Step 7b prompts to continue with the rest. Tier 1 on every release; Tier 2 when related content changed; Tier 3 periodically.

**Tier 1 — Every release**
- `README.md`
- `CHANGELOG.md`
- `INSTALL.md`
- `docs/quickstart.mdx`
- `docs/CHEAT-SHEET.md`
- `docs/reference/command-guide.md`
- `docs/reference/commands.md`

**Tier 2 — When related content changes**
- `docs/CONFIGURATION.md`
- `docs/GLOSSARY.md`
- `docs/CONCEPTS.md`
- `docs/reference/agents.md`
- `docs/reference/skills.md`
- `docs/reference/hooks.md`
- `docs/reference/templates.md`
- `docs/reference/ARCHITECTURE.md`
- `docs/reference/PLATFORM-ADAPTATION.md`
- `docs/reference/WORKFLOWS.md`
- `docs/reference/META-ISSUE-GUIDE.md`
- `docs/reference/PATTERNS-GUIDE.md`
- `docs/reference/SANITIZATION-CHECKLIST.md`
- `docs/guides/create-adr.md`
- `docs/guides/me-and-rules.md`
- `docs/guides/capture-from-bugfix.md`
- `docs/guides/backfill-existing-notes.md`
- `docs/guides/customize-hooks.md`
- `docs/guides/customize-templates.md`
- `docs/guides/integrate-notebooklm.md`
- `docs/guides/integrate-notion.md`
- `docs/guides/integrate-obsidian.md`
- `docs/guides/migrate-claude-gemini.md`
- `docs/guides/multi-kg-workflows.md`
- `docs/guides/pattern-writing.md`
- `docs/guides/sanitize-before-sharing.md`
- `docs/guides/sync-across-machines.md`
- `docs/guides/track-meta-issue.md`
- `docs/guides/use-in-cursor.md`

**Tier 3 — Periodic review**
- `docs/FAQ.md`
- `docs/PERSONAL-V-PROJECT.md`
- `docs/SEARCH.md`
- `docs/TRACK-ISSUES.md`
- `docs/4-LAYERS.md`
- `docs/4-PILLARS.md`
- `docs/concepts/automation-layer.md`
- `docs/concepts/why-kmgraph.md`
- `docs/troubleshooting/index.md`
- `docs/index.mdx`

**Excluded** (not user-facing): `CLAUDE.md`, `GEMINI.md`, `CONTRIBUTING.md`, `ROADMAP.md`, `docs/specs/`, `docs/plans/`, `docs/templates/`

---

## Step 3: Select Update Type

```
What type of update?

1. Add new command entry — adds a new /kmgraph:<command> block
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

## Step 6b: Deprecation Strategy (When Applicable)

**When to deprecate old documentation:**

If updating documentation introduces a breaking change to documented patterns, APIs, or commands (e.g., old command pattern replaced by new agent-dispatched pattern), mark the old section as deprecated rather than deleting it.

**Deprecation format:**

```markdown
> ⚠️ **DEPRECATED (v0.X.0):** This pattern is no longer recommended.
>
> **Reason:** [Brief explanation — why this changed, what replaced it]
>
> **Migration path:** [Concrete steps or link to new pattern]
>
> **Removal timeline:** Scheduled for removal in v[future-version] ([date or release cycle])
>
> **Affected users:** [Who this impacts — old commands, specific workflows, etc.]
```

**Examples:**

```markdown
> ⚠️ **DEPRECATED (v0.2.0):** Thick commands (200+ lines) are no longer the standard pattern.
>
> **Reason:** Thin command + agent separation reduces duplication and improves maintainability.
>
> **Migration path:** Old thick command → Thin dispatcher (~100-150 lines) + Agent execution logic.
> See `/kmgraph:create-agent` for agent scaffolding.
>
> **Removal timeline:** Scheduled for removal in v0.3.0 (Q3 2026)
>
> **Affected users:** Anyone maintaining custom commands or extending KMGraph
```

**Path from deprecation to cleanup (with user approval):**

1. **Deprecation phase** (v0.X.0 → v0.X+1.0)
   - Mark section with deprecation notice (see format above)
   - Document migration path clearly
   - Keep full documentation for reference
   - Commit: `docs(deprecation): mark [section] as deprecated in v0.X.0`

2. **Cleanup phase** (v0.X+1.0 → v0.X+2.0) — **Requires user approval**
   - After minimum 1-2 minor version cycles, audit deprecated sections
   - Check if section is still referenced in issues, discussions, or community feedback
   - **Ask user approval:** "This section has been deprecated since v0.X.0. Is it safe to archive to docs/deprecated/? Any concerns from users?"
   - If approved: move to `docs/deprecated/` archive folder
   - Commit: `docs(cleanup): archive [section] to docs/deprecated/ (removal scheduled v0.X+2.0)`
   - **Create tracking:** Use `/kmgraph:kmg-start-issue-tracking` to document removal rationale and get final approval for removal phase

3. **Removal phase** (v0.X+2.0+) — **Requires explicit user approval**
   - Review archived section; confirm no remaining references or user questions
   - **Ask final approval:** "Ready to permanently remove [section] from documentation? (This cannot be undone via git history)."
   - If approved:
     - Delete archived file from `docs/deprecated/`
     - Commit: `docs(removal): delete archived [section] (removed in v0.X+2.0)`
     - Update CHANGELOG with removal entry under "Removed" section
   - **Capture lesson:** "Deprecation → Cleanup → Removal lifecycle with approval gates"

**Key principle:** Never delete user-facing documentation without explicit user approval at two gates (cleanup approval, removal approval). Documented deprecation + approval = no surprises.

---

## Single Source of Truth (DRY for Documentation)

When updating documentation that explains a concept or architectural pattern, establish and maintain a **single authoritative source** to avoid duplication and version skew.

**Pattern:**

```
Concept: Four-Layer Architecture

Authoritative source: docs/CONCEPTS.md (primary documentation with diagrams, examples, rationale)
├─ reference/commands.md → References: "See CONCEPTS.md § Four-Layer Architecture for overview"
├─ quickstart.md → References: "See CONCEPTS.md § Four-Layer Architecture"
└─ CHEAT-SHEET.md → May repeat only syntax/quick-ref snippets, NOT conceptual explanations
```

**Why:**
- Single point of update reduces maintenance burden
- Prevents version skew (old info in one doc, new in another)
- Readers always see current, consistent explanations
- Cross-references establish information hierarchy

**How to apply:**

1. **Identify the authority** — Which doc is the "home" for this concept?
   - Architectural patterns → `docs/CONCEPTS.md`
   - Command usage/syntax → `docs/reference/commands.md`
   - Quick reference → `docs/CHEAT-SHEET.md`
   - Getting started workflows → `docs/quickstart.md`

2. **Write authoritative version once** — Full explanation, examples, rationale in the authority doc

3. **Reference from other docs** — "For details on X, see [CONCEPTS.md § Heading](link)"

4. **Repeat only syntax/code snippets** — Quick-reference sections can repeat examples if they help readability, but NOT explanations

5. **Audit cross-references** — When updating authority doc, verify all references point to current section

**Example (avoid):**
```
docs/CONCEPTS.md: "The four-layer architecture separates concerns across Context, Logic, Lifecycle, and Data layers..."
docs/COMMAND-GUIDE.md: "The four-layer architecture separates concerns across Context, Logic, Lifecycle, and Data layers..."
← DUPLICATION: Version skew risk if one is updated but not the other
```

**Example (correct):**
```
docs/CONCEPTS.md: "The four-layer architecture separates concerns across Context, Logic, Lifecycle, and Data layers. [full explanation with diagrams]"
docs/COMMAND-GUIDE.md: "See CONCEPTS.md § Four-Layer Architecture for architectural overview."
← SINGLE SOURCE: One place to update, all docs stay in sync
```

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

## Step 7b: Tier 1 Continuation Prompt

**Run after Step 7 when `--user-facing` was active and a specific file was provided.**

Check whether `$TARGET_FILE` appears in the Tier 1 list. If it does, prompt:

```
$TARGET_FILE is a Tier 1 doc. Continue with remaining Tier 1 files?

Remaining:
[list each Tier 1 file not yet updated this session]

(yes / skip)
```

- **yes:** Repeat Steps 2–7b for each remaining Tier 1 file in order.
- **skip:** Exit. Remind the user: "Remaining Tier 1 files were skipped — run `/kmgraph:kmg-update-doc --user-facing` with no file to sweep them."

If `$TARGET_FILE` is not in the Tier 1 list, exit normally without this prompt.

---

## Checklist (Internal)

**Routing**
- [ ] File path resolved (`$TARGET_FILE` confirmed)
- [ ] KG auto-detection checked against `kg_resolve`-resolved KG path
- [ ] Disambiguation dialog shown (if `--user-facing` was absent)
- [ ] Correct path taken (user-facing wizard or KG content confirmation)

**Pre-flight housekeeping (Step 2.5)**
- [ ] Version header is current
- [ ] Date headers (`Updated:`, `Last Updated:`) are current
- [ ] All `<!-- Updated: -->` section comments are current
- [ ] No stale `[NEW in vX.X]` badges from prior release series
- [ ] No stale inline `(vX.X-beta)` version annotations
- [ ] No hard counts (command totals, agent counts, tool counts)
- [ ] No broken internal links
- [ ] No internal roadmap language in user-facing copy
- [ ] README-specific: no ancient resolved issue notices
- [ ] Voice: no second-person in COMMAND-GUIDE.md; no em dashes

**Content update**
- [ ] Update type selected
- [ ] Update content gathered from user
- [ ] v0.0.7 standards validation run
- [ ] Diff preview shown and confirmed
- [ ] Edit/Write applied with update marker
- [ ] Committed with standards-compliant commit message
