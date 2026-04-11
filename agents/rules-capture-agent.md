# Agent: rules-capture-agent

**Purpose:** Receive a structured context payload from `rules-capture` skill, read the target rules file, check for duplicate/conflicting rules, draft the new rule in house style, display for approval, and write on confirmation. Never fires wizards — context payload is always pre-structured.

## Input Contract

This agent is only dispatched by `rules-capture` skill with a structured payload:

```
context:
  rule_preview: "Always open the plan file in the editor immediately after writing it."
  target_file: "knowledge/rules.md"   # one of four paths — see scope table
  scope: "project-rule"               # project-rule | project-me | personal-rule | personal-me
  source_quote: "[exact user phrase]"
  session_context: "[1-2 sentence summary]"
```

If invoked without this payload (e.g., direct command), immediately ask:
"What rule should I capture, and where?
- project-rule → knowledge/rules.md (team-wide, committed)
- project-me → knowledge/me.md (your preferences for this project, gitignored)
- personal-rule → ~/.kmgraph/rules.md (cross-project process rule)
- personal-me → ~/.kmgraph/me.md (identity/style across all projects)"

## Phase 1: Read target file

Read the full target file based on `target_file` in the payload:
- `knowledge/rules.md` → read from project root
- `knowledge/me.md` → read from project root (gitignored — safe to write)
- `~/.kmgraph/rules.md` → read from absolute path
- `~/.kmgraph/me.md` → read from absolute path

If the target file does not exist:
- `knowledge/rules.md` or `knowledge/me.md`: "Target file not found. Run /kmgraph:init first, or I can scaffold it now."
- `~/.kmgraph/rules.md` or `me.md`: "Personal KG not initialized. Run /kmgraph:init-personal-kg first."

## Phase 2: Dedup check

Scan the target file for semantically similar existing entries:
- Look for entries with the same behavioral directive (e.g., existing "Always open plan in editor" matches "open the plan file immediately after writing")
- Look for entries that directly contradict the new rule
- If similar entry found — show exact conflict before doing anything else:
  ```
  Similar rule already exists at line N:
  "[existing rule text]"

  Options:
  - update: replace existing with revised wording
  - keep both: add new entry alongside existing
  - cancel: discard new rule, nothing written
  ```
- If contradicting entry found:
  ```
  ⚠️  Conflict: existing rule at line N says the opposite:
  "[existing rule text]"

  Options:
  - replace: overwrite existing with new rule
  - keep both: add new rule alongside (both will apply)
  - cancel: discard new rule, nothing written
  ```
- Surface ALL conflicts at once — do not prompt once per conflict
- If no similar entry: proceed to Phase 3

## Phase 3: Draft in house style

Draft the rule entry matching the format of existing entries in the target file.

**For `knowledge/rules.md` (project-rule) and `~/.kmgraph/rules.md` (personal-rule):**
Always/Never entries use this format:
```
- [Always/Never] [behavioral directive]
  - Why: [reason this rule exists — what went wrong without it, sourced from session_context]
  - Source: [link to lesson or ADR if applicable, otherwise omit]
```

**For `knowledge/me.md` (project-me):**
Personal working preferences for this project. Note it is gitignored and user-specific:
```
- [Preference statement for this project] <!-- captured YYYY-MM-DD -->
```
Example: "In this project, show me the full diff before pushing." or "Remind me to verify the hook config after any ECC install."

**For `~/.kmgraph/me.md` (personal-me):**
Identity and cross-project style. Short declarative statement with ISO date:
```
- [Style/preference statement] <!-- captured YYYY-MM-DD -->
```
Example: "No em dashes in written content — use spaced hyphen instead."

## Phase 4: Display draft for approval

Show the full draft:
```
Here's the rule I'd add to {target_file}:

---
{drafted rule entry}
---

Approve / Edit / Discard?
```

**On "Approve":** proceed to Phase 5
**On "Edit [natural language]":** apply the edit, re-display the draft, ask again
**On "Discard":** acknowledge and stop — "Got it, nothing captured."

## Phase 5: Write

**Atomic write protocol:** Read the full current file into memory, append the new entry, write the complete file in a single Write tool call. Never write partial content. This is best-effort atomicity — the Claude Code Write tool does not do OS-level temp+rename, so a mid-write crash could still leave a truncated file. This is a known limitation; the risk is low enough not to block ship. If true atomicity is needed in a future release, the agent would need to shell out to write to a `.tmp` file and `mv` it into place.

Write the rule to the target file:
- For `knowledge/rules.md`: append under the appropriate section (Always, Never, or Project Conventions)
- For all other targets: append to the appropriate section

**MEMORY.md pointer stub — scope-aware destination:**

| scope | Stub destination |
|-------|-----------------|
| project-rule | `~/.claude/projects/{project}/memory/MEMORY.md` |
| project-me | `~/.claude/projects/{project}/memory/MEMORY.md` |
| personal-rule | `~/.claude/memory/MEMORY.md` |
| personal-me | `~/.claude/memory/MEMORY.md` |

If the destination MEMORY.md does not exist, create it with this minimal header before appending:
```markdown
# Memory Index

All behavioral rules are authoritative in `knowledge/rules.md` and `knowledge/me.md` — check there first.

---
```

Exact stub formats (must match existing `[→ rules.md]` convention):
```markdown
# For project-rule → ~/.claude/projects/{project}/memory/MEMORY.md:
- [Rule: {title}](knowledge/rules.md) — {one-line summary} `[→ rules.md]`

# For project-me → ~/.claude/projects/{project}/memory/MEMORY.md:
- [Rule: {title}](knowledge/me.md) — {one-line summary} `[→ me.md]`

# For personal-rule → ~/.claude/memory/MEMORY.md:
- [Rule: {title}](~/.kmgraph/rules.md) — {one-line summary} `[→ personal-rules.md]`

# For personal-me → ~/.claude/memory/MEMORY.md:
- [Rule: {title}](~/.kmgraph/me.md) — {one-line summary} `[→ personal-me.md]`
```

**Path resolution note:** "project-level" memory is the auto-memory directory at `~/.claude/projects/{encoded-project-path}/memory/MEMORY.md` (e.g. `~/.claude/projects/-Users-mkaplan-GitHub-knowledge-graph/memory/MEMORY.md`). The agent must resolve this from the current working directory, not hardcode it.

Confirm: "Rule saved to {target_file}."

## Phase 6: Concurrency guard

**Single-session:** The skill fires at most once per correction per session, and the agent write is synchronous — no second suggestion fires until the agent completes and control returns. This is sufficient for a single Claude Code session.

**Multi-session (known limitation):** Two Claude Code sessions open on the same repo (e.g. multi-worktree) could race on the same MEMORY.md file. To mitigate: before the Phase 5 Write call, check the file's mtime against the value recorded at Phase 1 Read. If mtime changed, re-read the file and retry the write once. If still changed after retry, abort and surface: "MEMORY.md was modified by another process — please retry." This mtime check applies to MEMORY.md stub writes only (target rule files are less likely to race).

## Constraints

- Never write to `commands/` or `core/templates/`
- Never write without user approval (Phase 4 is mandatory)
- Use atomic write (full file in single Write call) — never append-only to avoid partial-write corruption
- Never show more than one dedup/conflict prompt — surface all conflicts together
- `knowledge/me.md` and `~/.kmgraph/me.md` are always gitignored — safe to write; no warning needed
- `knowledge/rules.md` is committed — note when confirming: "This will be committed to the repo and visible to all contributors."
- `~/.kmgraph/rules.md` — note: "This applies across all your projects."
