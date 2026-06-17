
# Document Lessons Learned

**Version:** 2.0 (Updated: 2026-03-27)

---

## Level Routing Detection

Before any other steps, detect the level signal from the user's invocation and resolve it to an explicit flag.

**Invoke `gov-capture-routing` skill** to:
1. Detect level signal from the user's message (NL patterns or explicit flags)
2. Resolve `$level`, `$target_kg`, `$target_path` (→ `{target_kg}/lessons-learned/`), `$restore_kg`
3. Handle prompts if needed (named KG not found, no project KG configured, conflict resolution)

Pass the resolved flag (`--user`, `--project`, `--named=<kg>`, or `--active`) to the `lesson-capture-agent` invocation.

---

## Project KG Guardrail

**STOP before any write if the active KG does not match the current project's KG.**

After routing resolves `$target_kg`, detect the project root and its KG:

```bash
project_root=$(git rev-parse --show-toplevel 2>/dev/null)
project_kg="${project_root}/knowledge"
```

If `$project_kg` **exists** AND its resolved path **differs** from `$target_kg`, and the user did not explicitly pass `--user` or `--named=<kg>`:

> "The active KG is **[active_kg_name]** (`$target_kg`), but this project has its own KG at `{project_kg}/`.
>
> Which graph should receive this lesson?
>
> **[1]** Project KG — `{project_kg}/lessons-learned/`
> **[2]** Active KG — `{active_kg_name}` (`$target_kg/lessons-learned/`)
> **[3]** Cancel"

Wait for user selection. Update `$target_kg` and `$target_path` to the chosen graph before continuing. Do **not** dispatch to `lesson-capture-agent` until the user has chosen.

If `$project_kg` does not exist, or paths match, or user explicitly specified a target, continue without prompting.

---

## Syntax Detection

**Create new lesson:**
- `/kmgraph:kmg-capture-lesson` — guided Q&A, then capture
- `/kmgraph:kmg-capture-lesson <topic>` — same, with topic pre-filled

**Update existing lesson:**
- `/kmgraph:kmg-capture-lesson update <filename>` — jump to Step 0

---

## Step 0: Update an Existing Lesson

*Entered when the user invokes `/kmgraph:kmg-capture-lesson update <filename>`.*

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

## Snapshot Gate (New Lesson Path)

*Runs before Step 1 when creating a new lesson (not an update).*

Ask:

> "Before capturing — want to run a session summary first?
> This saves the current session state as a persistent summary and makes the 'why' behind this lesson available for the lesson's context field.
>
> [y] Run session summary   [n] Skip   [?] What does this do?"

If `?`: explain that this runs `/kmgraph:kmg-session-summary` in snapshot mode — a lightweight variant that records what was worked on, open plan items, and file changes without requiring a full wrap-up. The result is written to disk and used to enrich the lesson's context field.

If `y`:
> "Include git history in the session summary? (adds ~5-15 sec)
>
> [y] Yes — include commits   [n] No — conversation + files only"

Then invoke `session-summary-agent` with `--snapshot` (and `--git` if user said yes). When the agent returns, say:

> "Session summary saved — I'll use that to fill in the lesson's context and background."

Then continue to Step 1.

If `n`: proceed directly to Step 1.

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

#### Tier resolution

Set `$requested_tier` = `standard-tier`. Invoke `ai-model-tier-resolver` module (`commands/init-shared/ai-model-tier-resolver.md`) with `$requested_tier` and `{KG_PATH}`. On success: pass `--model [$resolved_model]` to the subagent.

Then invoke `lesson-capture-agent`, passing the following pre-structured context:

- **Problem statement** — from Step 1, question 1
- **Scope / coverage** — from Step 1, question 2
- **Audience** — from Step 1, question 3
- **Filename suggestion** — from Step 1, question 4
- **External sources** — from Step 2 (empty list if skipped)
- **Update context** — if this was Step 0: existing filename, current version, approved changes

The agent handles all execution: duplicate check, category detection, git metadata, file formatting, writing, index update, search rebuild, and commit offer.

After the agent returns, extract the draft content and display it verbatim in your main-thread response before asking save/edit/cancel. Do not rely on the tool result being visible to the user.

**Output Format:** Generated lesson files use Obsidian wiki link syntax for cross-references: `[[filename-without-extension]]` for lessons, `[[ADR-028-rules-md-scaffolding]]` for full ADR filenames (never abbreviated), and standard markdown `[#NNN](url)` for external GitHub issues and PRs. Never use wiki links for external URLs.

---

## Related Commands

- `/kmgraph:kmg-update-graph` — extract insights from a lesson into the knowledge graph
- `/kmgraph:kmg-sync-all` — batch sync all lessons
- `/kmgraph:kmg-create-adr` — create a standalone architectural decision record
