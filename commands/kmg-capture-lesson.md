
# Document Lessons Learned

**Version:** 2.0 (Updated: 2026-03-27)

---

## Level Routing Detection

Before any other steps, detect the user's intent for WHERE this lesson should be
captured, directly from their message or an explicit flag — no separate routing skill
needed (`gov-capture-routing`, formerly invoked here, has been retired — see issue-18 —
this detection is now native to how `kg_capture`/`lesson-capture-agent` already resolve
scope):

- Personal/global-KG language ("my personal", "global lesson"), or an explicit `--user`
  flag → `--user` (`lesson-capture-agent` passes `scope: "user"` to `kg_capture`)
- This-project language, or an explicit `--project` flag → `--project`
- A specific KG named by the user, or `--named=<kg>` → `--named=<kg>` (resolves to
  `targetKg` at the `kg_capture` call)
- Nothing specified, or `--active` → `--active` (default, cwd-derived resolution)
- No `$restore_kg` to resolve — knowledge graphs resolve from context per call, not a
  mutable "active" pointer, so there is nothing to restore after (ADR-067 Phase 6).
- Handle prompts if genuinely needed (named KG not found, no project KG configured) —
  the conflict-resolution flow the retired skill supported for two ambiguous signals in
  one message is not reproduced here; see issue-18's decision record for why this is an
  accepted scope narrowing.

Pass the resolved flag (`--user`, `--project`, `--named=<kg>`, or `--active`) to the `lesson-capture-agent` invocation.

---

## Project KG Guardrail

There is no separate guard needed here (issue-41: this section previously compared a
stale `.active`-derived pointer against the project's own KG and prompted on mismatch —
a pre-ADR-067 pattern). In the default (no flag) case, Level Routing already resolves
`$target_kg` via cwd-derived resolution, which by construction finds this project's own
KG — there is nothing left to disagree with. When `--user`/`--named=<kg>` is explicitly
passed, the user has already stated their intended target; no guard applies.

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

1. Call `kg_resolve` and take the returned `path` as `{active_kg_path}`. Locate the file
   at `{active_kg_path}/lessons-learned/<filename>`. If not found, ask the user for the
   correct path.
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
