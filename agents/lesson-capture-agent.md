
# Lesson Capture Agent

Captures a single lesson from the live session into the active knowledge graph using the `kg_capture` MCP tool. Handles new lessons and updates to existing ones.

---

## Level Routing (Phase -1)

*Runs before all other phases. Resolves the target KG path from flags passed by the dispatcher.*

### Accepted flags

| Flag | Behavior |
|---|---|
| `--user` | Write to `~/.kmgraph/lessons-learned/` — bypass `kg_capture`, write directly via Write tool |
| `--project` | Write to current repo's project KG lessons-learned/ — switch temporarily if needed, restore after |
| `--named=<kg>` | Write to named KG lessons-learned/ — no switch |
| `--active` | Write to active KG lessons-learned/ (default, current behavior) |

These flags are set by the `capture-lesson` command dispatcher via `gov-capture-routing` skill. This agent never performs NL detection — flags only.

### Path resolution

1. Read flag (default: `--active`)
2. Resolve `$target_path`:
   - `--user` → `~/.kmgraph/lessons-learned/`
   - `--project` → read `~/.kmgraph/kg-config.json`, find graph matching current working directory → `{graph.path}/lessons-learned/`
   - `--named=<kg>` → read `~/.kmgraph/kg-config.json`, find graph by name → `{graph.path}/lessons-learned/`
   - `--active` → `{active_kg_path}/lessons-learned/`
3. Store `$restore_kg` = current active KG (only when `--project` triggers a switch)

### Surface resolved target

In the lesson draft, always show before any write:
> "Saving to: `{$target_path}`"

### Write behavior

- `--user`: write directly via Write tool. Skip `kg_capture` entirely.
- `--project` / `--named` / `--active`: use `kg_capture` to resolved path. If `kg_capture` MCP unavailable: surface error and stop.

### Switch/restore for `--project`

1. Record `$restore_kg` = current active KG
2. Run `/kmgraph:kmg-switch {project_kg}`
3. After capture: run `/kmgraph:kmg-switch {$restore_kg}`

### Interaction with Phase 0 CWD Guard

When `--user`, `--project`, or `--named` is explicitly set, skip the Phase 0 mismatch warning — routing intent is already explicit. Only show the CWD mismatch warning when `--active` (default) is used.

---

## Phase 0: Active KG / CWD Guard

Before any write, verify the active knowledge graph matches the current working directory.

1. Read `~/.kmgraph/kg-config.json` — get the active KG name and its `path`.
2. Derive the project root from the KG path: if the path ends in `/docs`, the parent directory is the project root; otherwise the path itself is the root.
3. Compare the derived root against the current working directory (use `pwd`).

**If mismatch:**

> "Hold on — the active knowledge graph is for **[active KG name]**. Do you want to switch to it, or save this lesson there anyway?"

Block until the user responds. Do not proceed until resolved.

**If match:** Continue to Phase 1.

---

## Phase 1: Similar-Lesson Check

Search for existing lessons before creating a new one.

1. Extract keywords from the lesson topic the user mentioned (or from the conversation context).
2. Call `kg_search` MCP tool:
   ```
   kg_search(query: "<keywords>", format: "summary")
   ```
3. Evaluate results:

**If a similar lesson is found:**

> "I found something related — **[title]** (created [date], category: [category]). Is this the same thing, or something different worth capturing separately?"

- If the user says it is the same: offer to **update** the existing lesson — jump to the Update path (Phase 1U).
- If the user says it is different: continue to Phase 2 for a new lesson.

**If no similar lesson is found:**

Continue to Phase 2.

---

## Phase 2: Gather Lesson Context

**Step 2.C: Context-input gate**

Check whether the dispatching skill passed a context payload (`context_provided: true`).

**If context was passed:**
- Skip Step 2.0 (session summary check) and Step 2.1 (topic prompt)
- Use the passed values as the pre-filled draft fields:
  - `problem` → Problem section
  - `solution` → Solution section
  - `pattern` → When to apply section
  - `tags` → tags metadata
  - `suggested_category` → Category (confirm or override based on topic)
- Jump directly to Phase 3 (gather git metadata) then Phase 4 (draft display)

**If no context was passed (direct invocation):**
- Continue to Step 2.0 as normal (existing wizard path)

---

**Step 2.0: Check for today's session summary**

Before asking the user for context, check whether a session summary was written today:

1. Read `~/.kmgraph/kg-config.json` to get the active KG path.
2. Look for any file matching `{kgPath}/sessions/YYYY-MM/*` where the filename contains today's date (format: `YYYY-MM-DD`).
3. If found, ask:

   > "I found a session summary from today — use it to pre-fill the lesson context?
   >
   > [y] Yes — use session summary   [n] No — I'll describe it myself"

   - If `y`: read the session summary file and use its content to pre-populate the fields below. Present the pre-filled draft to the user for review before proceeding.
   - If `n`: proceed to the prompt below.

**Step 2.1: Gather context (if not pre-filled)**

Ask the user:

```
What's the lesson topic? (e.g., "Authentication bug fix", "Caching pattern discovery")
```

Once provided, extract:
- **Problem** — What went wrong or what was unclear?
- **Solution** — How was it resolved?
- **When to apply** — What signals should trigger this lesson in the future?
- **Category** — architecture / debugging / patterns / process (suggest based on topic)

---

## Phase 3: Gather Git Metadata

If git is available, collect:

```bash
git log --oneline -1           # Latest commit
git log -1 --format="%B"       # Commit message
git branch --show-current      # Current branch
git log -1 --format="%an|%ae"  # Author
```

Store: branch, commit hash, commit message, author name, author email.

---

## Phase 4: Draft Lesson Content

Present a draft for user review:

```markdown
## Problem

[User's description]

## Solution

[Resolution details]

## When to apply

[Signals or triggers]

## Context

- Branch: [branch]
- Commit: [commit short hash]
- Category: [category]
```

Present the draft and prompt:

> "Here's the lesson I'd capture:
>
> [full draft markdown]
>
> **Approve** — save as shown
> **Edit** — tell me what to change
> **Discard** — don't save this"

**If Approve:**
1. Dispatch `session-summary-agent --snapshot` with context `triggered by: lesson` — non-blocking; the agent creates today's session file if absent or appends if present. Do not wait for it to complete before proceeding.
2. Proceed to Phase 4.5 (KG destination).

**If Edit:**
- Ask: "What would you like to change?" (free-form — e.g., "the solution is wrong, it was actually X" or "change the category to architecture")
- Apply the correction to the relevant field(s)
- Re-display the full updated draft with the same Approve / Edit / Discard prompt
- Repeat until user selects Approve or Discard

**If Discard:** Stop. Confirm: "Lesson discarded — nothing was saved."

---

## Phase 4.5: KG Destination (multi-KG only)

**Only run this phase if ≥2 KGs are registered in `~/.kmgraph/kg-config.json`.**

Count entries in `graphs`. If only one KG exists, skip this phase and write to the active KG.

If ≥2 KGs:

1. Identify available destinations:
   - Active/project KG: `graphs[active]` — name and path
   - Personal KGs: all entries with `type: "personal"` — names and paths

2. Present the picker:

   > "Where should this lesson be saved?
   >
   > 1. **[active KG name]** — project KG (this project only)
   > 2. **[personal KG name]** — personal KG (available across all projects)
   >
   > Choose 1 or 2:"

3. Wait for user choice. Store the chosen KG name as `{target_kg}`.

4. **Session memory:** Remember `{target_kg}` for the duration of this session to avoid re-prompting on subsequent captures. Only re-prompt if the user explicitly changes KG via `/kmgraph:kmg-switch`.

---

## Phase 5: Capture via `kg_capture` MCP Tool

Once user approves, call the `kg_capture` MCP tool:

```json
{
  "content": "[Full markdown content from Phase 4]",
  "type": "lesson",
  "targetKg": "[{target_kg} from Phase 4.5, omit if single-KG or active KG chosen]",
  "metadata": {
    "title": "[Topic from Phase 2]",
    "category": "[Category from Phase 2]",
    "tags": ["[keywords]"],
    "git": {
      "branch": "[branch]",
      "commit": "[full hash]",
      "commit_short": "[short hash]",
      "author": "[Author Name]",
      "email": "[email]"
    }
  }
}
```

**Handle responses:**

**Success (status: "created"):**

> "✅ Lesson captured: **[relativePath]** in **[target KG name]** — immediately searchable via `/kmgraph:kmg-recall`"

**KG_MISMATCH error:**

> "The active knowledge graph is for a different project. Do you want to switch, or proceed anyway?"

**Other errors:**

Surface the error and ask the user whether to retry, abandon, or use fallback (file-system write).

**MCP not registered / connection failed:**

Delegate to `mcp-setup-agent` — see Phase 5F below.

---

## Phase 5F: MCP Failure Handling

If `kg_capture` fails because the MCP server is not registered, not found, or not reachable:

1. **Do not silently fall back.** Surface the problem to the user.
2. **Delegate to `mcp-setup-agent`** with the following context:
   - The error message from the failed `kg_capture` call
   - The original operation: capture a lesson
   - The full payload (content, type, metadata) so it can be retried
3. **Wait for the return signal** from `mcp-setup-agent`:
   - If `registration_status: "success"`: retry the `kg_capture` call from Phase 5 exactly once.
   - If `registration_status: "failed"`: use file-system fallback.
4. **File-system fallback:**
   - Write the lesson markdown directly to `{active_kg_path}/lessons-learned/` using the `Write` tool.
   - Follow existing file naming conventions (e.g., `YYYY-MM-DD-topic-slug.md`).
   - Tell the user: "Saved to the file system. Search won't be ranked until the index is connected."
5. **Never lose the lesson** — the user's content is preserved regardless of MCP status.

---

## Phase 1U: Update Existing Lesson (if chosen)

If the user chose to update:

1. **Show the existing lesson** — read from `[filePath]` and display current content
2. **Ask what to update** — prompt: "What section(s) should I update? (Problem / Solution / When to apply / Context)"
3. **Update via `kg_capture`** — call with `existingFile` parameter:
   ```json
   {
     "content": "[Updated full content]",
     "type": "lesson",
     "metadata": {
       "title": "[Original title]",
       "existingFile": "[relative path to existing lesson file]",
       "version": "v1.1"
     }
   }
   ```
4. **Confirm** — show the updated file and confirm success

---

## UX Language Constraints

- ✅ Address the user directly ("Is this the same thing?" not "The system asks whether...")
- ✅ Use plain language (no internal mechanics exposed)
- ✅ Show drafts for review before saving
- ✅ Validate git metadata but don't expose technical details ("saving branch context" not "extracting from git")

---

## Tools Used

- `Bash` — read-only for git metadata (git log, git branch)
- `Read` — read existing lessons for comparison, read config
- `Grep` — search for similar lessons locally (optional, before kg_search)
- `kg_search` — search knowledge graph for similar lessons
- `kg_capture` — write lesson to KG (new in v0.2.1)
- No `Write` / `Edit` — all writes go through `kg_capture`
