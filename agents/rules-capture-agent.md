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

## Phase 0: Platform Detection

Run this detection block once at the start of each invocation, before Phase 1. Detection result is a conceptual struct: `{platform: string, agents_present: bool}`.

`platform` is one of: `claude-code`, `gemini`, `cursor`, `windsurf`, `copilot`, `zed`, `claude-code-web`, `unknown`.
`agents_present` is true when `AGENTS.md` (or a recognized case variant) is found at project root, regardless of which platform is detected.

### Step 1: Resolve project root

Walk up from cwd until a `.git/` directory is found. If none found, use cwd as root. All paths below are relative to this root.

### Step 2: Check for AGENTS.md (set agents_present flag — independent of platform detection)

Use Glob to look for `AGENTS.md`, `agents.md`, `Agents.md` at project root.
- If the canonical `AGENTS.md` is found: set `agents_present = true`.
- If only a wrong-case variant (`agents.md` or `Agents.md`) is found: set `agents_present = true` AND record a warning: "Found `agents.md` — the AGENTS.md spec requires uppercase `AGENTS.md`. Rename to activate for all tool adopters."
- If none found: set `agents_present = false`.

### Step 3: Detect platform using the 9-level priority table (check in order; use first match)

**Priority 1 — Claude Code:** Check whether a `.claude/` directory exists at project root (Glob: `.claude/`).
- If present: `platform = "claude-code"`. Config target: `CLAUDE.md`.

**Priority 2 — Gemini:** Check whether `GEMINI.md` or `AGENT.md` exists at project root. Also check wrong-case variants `gemini.md`, `Gemini.md`, `agent.md`, `Agent.md`.
- If canonical uppercase file found: `platform = "gemini"`. Config target: `GEMINI.md`.
- If only wrong-case variant found: `platform = "gemini"` AND record warning: "Found `gemini.md` (or `agent.md`) — Gemini CLI requires uppercase `GEMINI.md`. Rename to activate."

**Priority 3 — Cursor:** Check whether a `.cursor/` directory exists at project root (Glob: `.cursor/`).
- If present: `platform = "cursor"`. Config target: `.cursor/rules/` (fallback: `.cursorrules`).

**Priority 4 — Windsurf:** Check whether `.windsurfrules` **file** exists at project root. Use `[ -f "$root/.windsurfrules" ]` (not `-e`) — if `.windsurfrules` is a directory, Windsurf is NOT detected.
- If a regular file: `platform = "windsurf"`. Config target: `.windsurfrules`.

**Priority 5 — GitHub Copilot:** Check whether `.github/copilot-instructions.md` exists at project root (Glob: `.github/copilot-instructions.md`).
- If present: `platform = "copilot"`. Config target: `.github/copilot-instructions.md`.

**Priority 6 — Zed:** Check whether a `.zed/` directory OR a `.rules` **file** exists at project root. For `.rules`, use `[ -f "$root/.rules" ]` — if `.rules` is a directory, Zed is NOT detected via that indicator.
- If either condition is true: `platform = "zed"`. Config target: `.rules`.

**Priority 7 — AGENTS.md only (no other native indicator matched):** `agents_present` was set in Step 2. Platform is not set by this priority level — it contributes only to the `agents_present` flag. `platform` is not assigned at this step — leave it at its current unset value and continue to Priority 8.

**Priority 8 — Claude Code (web / IDE without CLI):** Check whether `CLAUDE.md` exists at project root with no `.claude/` directory (already confirmed absent from priority 1). Also check wrong-case variants `claude.md`, `Claude.md`.
- If canonical `CLAUDE.md` found: `platform = "claude-code-web"`. Config target: `CLAUDE.md`.
- If only wrong-case variant found: `platform = "claude-code-web"` AND record warning: "Found `claude.md` — Claude Code requires uppercase `CLAUDE.md`. Rename to activate."

**Priority 9 — Unknown:** No indicator matched in priorities 1–8.
- `platform = "unknown"`. Route to `knowledge/rules.md` with a note (see Phase 1).

### Step 4: Apply multi-match rules

- **AGENTS.md + a native platform file detected (e.g., `.claude/` + `AGENTS.md`):** This is expected layering. Keep the native platform result; set `agents_present = true`. Do NOT ask the user.
- **Two native platform files** (e.g., `GEMINI.md` + `.windsurfrules` both present): Genuine ambiguity — ask the user: "I found both `GEMINI.md` and `.windsurfrules`. Which platform should I write this rule to?" Then use the user's answer as the detected platform.

### Step 5: Symlink dedup (before presenting any routing menu)

Before presenting routing targets to the user, check whether the top two candidate target files resolve to the same inode using `realpath -e`:

```bash
realpath -e "$root/CLAUDE.md"
realpath -e "$root/AGENTS.md"
```

- If both commands succeed and return the same path: deduplicate — show only one entry in the routing menu (label it "cross-tool + Claude Code").
- If `realpath -e` returns an error for either path (dangling symlink, circular chain, permission denied): treat that file as absent for dedup purposes only, and log: "Found broken symlink at `<path>` — treating as absent."

### Step 6: Surface any case-mismatch warnings

If any wrong-case warning was recorded in Steps 2–3, append it to the routing suggestion shown to the user. Example:

```
 Want me to make this a rule? → CLAUDE.md § Platform Preferences  (Claude Code)
 ⚠️  Found "claude.md" — Claude Code requires the filename to be "CLAUDE.md" (uppercase).
    The file is not loaded by Claude Code. Rename it to activate.
```

Still route the rule to the correct target (the user's intent is clear; the rename is their fix).

### Detection output

After completing Steps 1–6, the detection result `{platform, agents_present}` is available for use in Phase 1 and subsequent phases. Detection is not cached across invocations — LLM context has no persistent state between calls.

---

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
