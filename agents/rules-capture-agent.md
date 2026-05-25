# Agent: rules-capture-agent

**Purpose:** Receive a structured context payload from `rules-capture` skill, read the target rules file, check for duplicate/conflicting rules, draft the new rule in house style, display for approval, and write on confirmation. Never fires wizards — context payload is always pre-structured.

## Level Routing

*This agent receives routing flags from the dispatcher. It never performs NL detection itself.*

### Accepted flags

| Flag | Behavior |
|---|---|
| `--user` | Target personal rules files: `~/.kmgraph/rules.md` or `~/.kmgraph/me.md` |
| `--project` | Target project rules files: `knowledge/rules.md` or `knowledge/me.md` |
| `--named=<kg>` | Target the named KG's rules files |
| `--active` | Use active KG (default, current behavior) |

When a level flag is present and conflicts with the `scope` field in the payload (e.g., `--user` flag but `scope: "project-rule"`), the level flag takes precedence — update the effective scope to match.

### Surface resolved target

Always show before writing:
> "Saving to: `{$target_file}`"

### Write behavior

- `--user`: write directly via Write tool (rules files are plain markdown). Skip `kg_capture`.
- `--project` / `--named` / `--active`: write directly via Write/Edit tool to the resolved path (rules files are not session/ADR artifacts — `kg_capture` is not used here).

---

## Input Contract

This agent is only dispatched by `rules-capture` skill with a structured payload:

```
context:
  rule_preview: "Always open the plan file in the editor immediately after writing it."
  target_file: "knowledge/rules.md"   # one of six paths — see scope table
  scope: "project-rule"               # project-rule | project-me | personal-rule | personal-me | platform-specific | agents
  source_quote: "[exact user phrase]"
  session_context: "[1-2 sentence summary]"
  platform: "claude-code"             # from Phase 0 detection; omitted if unknown
  level: "--active"           # routing flag: --user | --project | --named=<kg> | --active (default)
  agents_present: true                # from Phase 0 detection
```

**`target_file` accepted values:**
- Original four: `knowledge/rules.md`, `knowledge/me.md`, `~/.kmgraph/rules.md`, `~/.kmgraph/me.md`
- Platform files: `CLAUDE.md`, `GEMINI.md`, `.windsurfrules`, `.github/copilot-instructions.md`, `.cursor/rules/project-preferences.mdc`, `.rules`
- Agents file: `AGENTS.md`

**`scope` accepted values:**
- Original four: `project-rule`, `project-me`, `personal-rule`, `personal-me`
- New: `platform-specific`, `agents`

If invoked without this payload (e.g., direct command), immediately ask:
"What rule should I capture, and where?
- project-rule → knowledge/rules.md (team-wide, committed)
- project-me → knowledge/me.md (your preferences for this project, gitignored)
- personal-rule → ~/.kmgraph/rules.md (cross-project process rule)
- personal-me → ~/.kmgraph/me.md (identity/style across all projects)
- platform-specific → platform config file (CLAUDE.md, GEMINI.md, etc.)
- agents → AGENTS.md (cross-tool agent instructions)"

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

**Original four targets (behavior unchanged):**
- `knowledge/rules.md` → read from project root
- `knowledge/me.md` → read from project root (gitignored — safe to write)
- `~/.kmgraph/rules.md` → read from absolute path
- `~/.kmgraph/me.md` → read from absolute path

If the target file does not exist (original targets):
- `knowledge/rules.md` or `knowledge/me.md`: "Target file not found. Run /kmgraph:init first, or I can scaffold it now."
- `~/.kmgraph/rules.md` or `me.md`: "Personal KG not initialized. Run /kmgraph:init-personal-kg first."

**New platform file targets (read from project root):**
- `CLAUDE.md` → read from project root
- `GEMINI.md` → read from project root
- `.windsurfrules` → read from project root
- `.github/copilot-instructions.md` → read from project root
- `.cursor/rules/project-preferences.mdc` → read from project root (see Cursor picker logic in Phase 3)
- `.rules` → read from project root
- `AGENTS.md` → read from project root

If any new platform target file does not exist:
- Offer to create it with the standard platform header (see new-file templates in Phase 3).
- Append `[new file]` note in the routing suggestion shown to the user.
- Proceed to Phase 2 (dedup check skipped — no existing content) and Phase 3.

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

## Phase 3: Draft in house style and platform write target logic

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

**For platform-specific targets (scope = `platform-specific`):**

Append the rule under the platform's preference heading:

| Platform | Write target | Heading to append under |
|---|---|---|
| `claude-code` / `claude-code-web` | `CLAUDE.md` | `## Platform Preferences (Claude Code)` |
| `gemini` | `GEMINI.md` or `AGENT.md` (see Gemini write-target picker below) | `## Platform Preferences (Gemini)` |
| `windsurf` | `.windsurfrules` | (append to end — no heading required) |
| `copilot` | `.github/copilot-instructions.md` | (append to end — no heading required) |
| `cursor` | `.cursor/rules/project-preferences.mdc` | (append to end — after frontmatter) |
| `zed` | `.rules` | (append to end — no heading required) |

**Gemini write-target picker logic:**

Before writing to a Gemini target, resolve the actual file path:
1. Check whether `GEMINI.md` exists at project root (`[ -f "$PROJECT_ROOT/GEMINI.md" ]`).
2. If `GEMINI.md` exists: use `GEMINI.md` as the write target.
3. If `GEMINI.md` does not exist, check whether `AGENT.md` exists at project root (`[ -f "$PROJECT_ROOT/AGENT.md" ]`).
4. If `AGENT.md` exists (and `GEMINI.md` does not): use `AGENT.md` as the write target.
5. If neither exists: default to creating `GEMINI.md` (canonical Gemini file).

The heading to append under is always `## Platform Preferences (Gemini)` regardless of which file is used.

For files with a preference heading (CLAUDE.md, GEMINI.md, AGENT.md when used as Gemini target): if the heading doesn't exist yet, create it before appending. If the heading exists and appears more than once, append after the last occurrence (this also satisfies pre-write safety check #4). If it exists once, append after the last line under that heading.

**For agents target (scope = `agents`):**

Write target: `AGENTS.md` — append to end, no heading required.

**Cursor write target picker logic:**

Before writing to Cursor target:
1. Check whether `.cursor/rules/` directory exists.
2. If it does not exist: create `.cursor/rules/` directory and write to `project-preferences.mdc`.
3. If `.cursor/rules/` exists and contains exactly one `.mdc` file: write to that file instead of `project-preferences.mdc`.
4. If `.cursor/rules/` exists and contains multiple `.mdc` files: present a picker to the user:
   ```
   Which Cursor rule file should I write to?
   [list each .mdc file]
   ```
   Use the user's selection as the write target.
5. Never write to `.cursorrules` — that is a detection-only legacy format.

**New-file templates (used when target file does not exist):**

| Target | Header written on create |
|---|---|
| `CLAUDE.md` | `# Claude Code Configuration\n\n## Platform Preferences (Claude Code)\n\n` |
| `GEMINI.md` | `# Gemini CLI Configuration\n\n## Platform Preferences (Gemini)\n\n` |
| `AGENT.md` (Gemini fallback) | `# Gemini CLI Configuration\n\n## Platform Preferences (Gemini)\n\n` |
| `.windsurfrules` | `# Windsurf Rules\n\n` |
| `.github/copilot-instructions.md` | `# GitHub Copilot Instructions\n\n` |
| `.cursor/rules/project-preferences.mdc` | `---\ndescription: Project AI preferences\nalwaysApply: true\n---\n\n` |
| `.rules` (Zed) | `# Zed AI Rules\n\n` |
| `AGENTS.md` | `# Agent Instructions\n\n` |

## Phase 4: Pre-write safety checks + display draft for approval

### Pre-write safety checks (platform targets only)

Run these checks BEFORE showing the confirmation prompt. These apply ONLY to platform file targets (`CLAUDE.md`, `GEMINI.md`, `.windsurfrules`, `.github/copilot-instructions.md`, `.cursor/rules/*.mdc`, `.rules`, `AGENTS.md`). The original four targets (`knowledge/rules.md`, `knowledge/me.md`, `~/.kmgraph/rules.md`, `~/.kmgraph/me.md`) keep their existing behavior unchanged.

**New-file exception:** If the target file does not exist and is being newly created (from Phase 1's new-file detection), skip checks 1–4 (permission, binary, trailing newline, multiple headings). Only checks 5 (RTL strip) and 6 (length limit) apply to newly created content.

**Cursor path note:** For Cursor targets, use the picker-resolved path from Phase 3 (not the payload's `target_file` value) in all checks below.

1. **Permission check:** Run `[ -w "$TARGET" ]`. If file is not writable: abort with "Cannot write to `<file>` — file is read-only. Fix permissions first."

2. **Binary check:** Run `file "$TARGET"`. If output does not indicate plain text (e.g., contains NUL bytes or non-text magic type): abort with "Target file appears binary or corrupted — refusing to write."

3. **Trailing newline:** If the target file exists and does not end with a newline (`\n`), prepend `\n` before the new rule text when appending.

4. **Multiple headings:** If `## Platform Preferences` (or the platform-specific equivalent heading) appears more than once in the file, append after the LAST occurrence, not at EOF.

5. **RTL strip:** Scan the rule text for Unicode direction-override characters (U+202E RIGHT-TO-LEFT OVERRIDE, U+202D LEFT-TO-RIGHT OVERRIDE, U+200F RIGHT-TO-LEFT MARK, U+061C ARABIC LETTER MARK). Strip any found before display and write. If any were stripped, warn: "⚠️ Removed Unicode direction-override characters from rule text before writing."

6. **Length limit:** If rule text exceeds 500 characters, stop and ask: "This rule is {N} characters — please shorten it before I can save it."

### Display draft for approval

For **original targets**, show the standard prompt:
```
Here's the rule I'd add to {target_file}:

---
{drafted rule entry}
---

Approve / Edit / Discard?
```

For **platform file targets**, show:
```
Write to {target_file} § {heading or "end of file"}?

"{rule text}"

[y/n]
```

**On "Approve" / "y":** proceed to Phase 5
**On "Edit [natural language]":** apply the edit, re-run safety checks, re-display the draft, ask again
**On "Discard" / "n":** acknowledge and stop — "Got it, nothing captured."

## Phase 5: Write

**Atomic write protocol:** Read the full current file into memory, append the new entry, write the complete file in a single Write tool call. Never write partial content. This applies to ALL targets — original four and new platform/agents targets alike. This is best-effort atomicity — the Claude Code Write tool does not do OS-level temp+rename, so a mid-write crash could still leave a truncated file. This is a known limitation; the risk is low enough not to block ship. If true atomicity is needed in a future release, the agent would need to shell out to write to a `.tmp` file and `mv` it into place.

Write the rule to the target file:
- For `knowledge/rules.md`: append under the appropriate section (Always, Never, or Project Conventions)
- For `CLAUDE.md` / `GEMINI.md` / `AGENT.md` (when used as Gemini target): append under the platform preference heading (creating it if absent); if heading appears multiple times, append after the last occurrence
- For `.windsurfrules`, `.github/copilot-instructions.md`, `.rules`, `AGENTS.md`: append to end of file
- For `.cursor/rules/*.mdc`: append to end of file, after any YAML frontmatter block
- For all other targets: append to the appropriate section

**Write target — scope-aware destination (authoritative profile files):**

| scope | Write destination | Section to append under |
|-------|-------------------|-------------------------|
| project-rule | `{project}/knowledge/rules.md` | Appropriate section (Always / Never / Project Conventions) |
| project-me | `{project}/knowledge/me.md` | End of file (append) |
| personal-rule | `~/.kmgraph/rules.md` | Appropriate section (Always / Never / Universal Rules) |
| personal-me | `~/.kmgraph/me.md` | End of file (append) |
| platform-specific | `~/.kmgraph/rules.md` | `## Platform-Specific Rules` (or platform sub-section) |
| agents | `{project}/knowledge/rules.md` | `## Agents` section |

Use the Edit tool against the resolved target file. Append under the appropriate section heading (create the heading if absent). MEMORY.md is no longer written by this agent — it is an index/pointer file managed elsewhere.

**Path resolution note:** `{project}` is the active KG project root, resolved from the current working directory by walking up to find `.git/` or using cwd if not in a git repo. Never hardcode encoded `~/.claude/projects/` paths — those are Claude's internal auto-memory directory and not the rule write target.

Confirm: "Rule saved to {target_file}."

## Phase 6: Concurrency guard

**Single-session:** The skill fires at most once per correction per session, and the agent write is synchronous — no second suggestion fires until the agent completes and control returns. This is sufficient for a single Claude Code session.

## Constraints

- Never write to `commands/` or `core/templates/`
- Never write without user approval (Phase 4 is mandatory)
- Use atomic write (full file in single Write call) — never append-only to avoid partial-write corruption
- Never show more than one dedup/conflict prompt — surface all conflicts together
- `knowledge/me.md` and `~/.kmgraph/me.md` are always gitignored — safe to write; no warning needed
- `knowledge/rules.md` is committed — note when confirming: "This will be committed to the repo and visible to all contributors."
- `~/.kmgraph/rules.md` — note: "This applies across all your projects."
