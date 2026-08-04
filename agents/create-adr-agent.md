
# Create ADR Agent

Creates a new Architecture Decision Record (ADR) through an interactive wizard. Handles numbering, git metadata, user prompts, template population, and index management.

**Boundary with `create-adr` command:** This agent contains the full ADR creation logic. The `create-adr` command currently embeds its own implementation (v0.2.2 will refactor it to a thin dispatch wrapper).

---

## Level Routing (Phase -1)

*Runs before all other phases. Resolves the target KG path from flags passed by the dispatcher.*

### Accepted flags

| Flag | Behavior |
|---|---|
| `--user` | Write to the personal KG's decisions/ — via `kg_capture` with `scope: "user"` (gated by `confirmPersonalScopeAccess`) |
| `--project` | Write to current repo's project KG decisions/ — no switch/restore needed |
| `--named=<kg>` | Write to named KG decisions/ — no switch |
| `--active` | Write to active KG decisions/ (default, current behavior) |

These flags are set by the `create-adr` command dispatcher directly (see that command's Level Routing Detection). This agent never performs NL detection — flags only.

### Path resolution

1. Read flag (default: `--active`)
2. Resolve `$target_path`:
   - `--user` → resolved internally by `kg_capture` when `scope: "user"` is passed; no manual path computation needed here, but still show the resolved path to the user per "Surface resolved target" below (the `kg_capture` response includes it).
   - `--project` → read `~/.kmgraph/kg-config.json`, find graph matching current working directory → `{graph.path}/decisions/`
   - `--named=<kg>` → read `~/.kmgraph/kg-config.json`, find graph by name → `{graph.path}/decisions/`
   - `--active` → `{active_kg_path}/decisions/`

### Surface resolved target

In the ADR draft, always show before any write:
> "Saving to: `{$target_path}`"

### Write behavior

- `--user`: pass `scope: "user"` to `kg_capture` — same call path as every other flag, gated by `confirmPersonalScopeAccess`. No separate Write-tool path.
- `--project` / `--named` / `--active`: use `kg_capture` to resolved path (via `targetKg` for `--project`/`--named`, cwd-resolved for `--active`). If `kg_capture` MCP unavailable: surface error and stop — **for every flag, including `--user`.** Do not fall back to a direct Write-tool write for `scope: "user"` specifically: a personal-scope write with `kg_capture` unreachable must fail loudly, not silently retry through an ungated path against the wrong (project-local) directory.

### Targeting for `--project`

Pass `targetKg: {project_kg}` directly to `kg_capture` — knowledge graphs resolve automatically from context rather than a mutable "active" pointer, so no switch/restore step is needed before or after the write.

### Interaction with Phase 0 Graph Resolution

Phase 0 always resolves the graph via `kg_resolve` regardless of which flag is set — there is no separate mismatch warning to skip. Explicit `--user`/`--project`/`--named` routing still determines the write target (see Path resolution above); Phase 0's resolution supplies `$active_kg_path`/`$active_kg_name` for numbering and other cwd-derived reads.

---

## Phase 0: Resolve Target Graph

```
kg_resolve
```

There is no separate "active" pointer left to disagree with your current working directory (ADR-067 retires the old CWD-mismatch guard, since `kg_resolve` derives the graph from cwd directly — nothing to mismatch against). If `kg_resolve` errors (no graph registered for this directory), stop and tell the user to run `/kmgraph:kmg-init` first. Otherwise, store the returned `path` as `$active_kg_path` and `name` as `$active_kg_name` for use in later phases.

Continue to Phase 0.5.

---

## Phase 0.5: Context-Input Gate

Check whether the dispatching skill passed a context payload (`context_provided: true`).

**If context was passed:** store the payload fields for use in Phase 3. Set an internal flag: `wizard_mode: false`. Continue to Phase 1 (numbering) and Phase 2 (git metadata) as normal — these are always auto-collected.

**If no context was passed (direct invocation):** set `wizard_mode: true`. Continue to Phase 1 as normal. Phase 3 will run the interactive wizard.

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

**Cross-branch collision check:**

Before proceeding, verify the number is not already taken on any other branch:

```bash
git log --all --oneline -- "decisions/ADR-{NNN}-*.md" 2>/dev/null
```

- If the command returns no output: number is clean — proceed.
- If the command returns results: another branch has already used ADR-{NNN}. Increment by 1 and re-run the check. Repeat until a clean number is found.
- If git is unavailable: skip this check and proceed with the calculated number.

Tell the user: "Auto-detected: ADR-NNN (verified clean across all branches)"

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

**If `wizard_mode: false` (context was passed):**

Skip all 8 wizard questions. Use the passed payload to populate all fields:
- title → from payload
- status → from payload (default "Proposed" if blank)
- category → from payload
- context → from payload
- decision → from payload
- rationale → from payload
- consequences → from payload (leave as "None" if blank)
- related_lessons → from payload (empty array if blank)
- `$implements_ref` → from `payload.implements_ref` if present; otherwise `null`

Proceed directly to Phase 3.5.

**If `wizard_mode: true` (no context passed):**

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
9. **Implementation Commit** — "Has this decision already been implemented? If yes, run `git log --oneline -5` and paste the commit hash. If not yet implemented, press Enter to skip (you'll back-fill this after the commit lands)."

   - If hash provided: store as `$implements_ref = "[[<hash>]] — <commit subject from git log>"`
   - If skipped: store as `$implements_ref = null`

---

## Phase 3.5: Draft Display and Approve/Edit/Discard

**Only runs when `wizard_mode: false`.** When `wizard_mode: true`, Phase 4 (Confirm Before Writing) handles the summary review — skip this phase.

Generate the full ADR content from the populated fields (same template as Phase 5). Display it to the user:

> "Here's the ADR draft:
>
> ---
> **ADR-{NNN}: {title}**
> Status: {status} | Category: {category}
>
> **Context**
> {context}
>
> **Decision**
> {decision}
>
> **Rationale**
> {rationale}
>
> **Consequences**
> {consequences}
>
> **Related lessons:** {related_lessons or "None"}
>
> **Git metadata:** Author: {name}, Branch: {branch}, Commit: {short-hash}
> ---
>
> **Approve** — create ADR from this draft
> **Edit** — tell me what to change
> **Discard** — don't create this ADR"

**If Approve:**
1. Dispatch `session-summary-agent --snapshot` with context `triggered by: ADR` — non-blocking; the agent creates today's session file if absent or appends if present. Do not wait for it to complete before proceeding.
2. Skip Phase 4 (Confirm Before Writing) and proceed directly to Phase 5 (file write).

**If Edit:**
- Ask: "What would you like to change?" (free-form — e.g., "the rationale should include the option we rejected" or "set status to Accepted")
- Apply the correction to the relevant field(s)
- Re-display the full updated draft with the same Approve / Edit / Discard prompt
- Repeat until user selects Approve or Discard

**If Discard:** Stop. Confirm: "ADR discarded — nothing was saved."

---

## Phase 4: Confirm Before Writing

**Runs when:** `wizard_mode: true` (interactive wizard path). When `wizard_mode: false`, Phase 3.5 handles review and this phase is skipped.

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

Read the base template from `${CLAUDE_PLUGIN_ROOT}/core/default-templates/decisions/ADR-template.md`.

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
implements: {$implements_ref}
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

**If `kg_capture` is unavailable or fails:**
- `--user` (`scope: "user"`): do NOT fall back to a direct Write-tool write. Surface the error and stop — a personal-scope write must never bypass `confirmPersonalScopeAccess`, and a filesystem fallback here would both skip that gate and write to the wrong (project-local) directory. Tell the user `kg_capture` is unreachable and the personal-KG write did not happen.
- `--project` / `--named` / `--active`: fall back to direct file write using the `Write` tool, to `{target_path}` as resolved above (not the personal path — this fallback is scoped to the non-personal flags only).

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

**If `$implements_ref` is null** (design-first ADR — not yet implemented):

After the implementation commit lands, update the `implements` field:
> "ADR-{NNN} is saved. Once you implement this decision, run `git log --oneline -1` and update `implements` in the ADR frontmatter with the commit hash."

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
