# Skill: rules-capture

**Purpose:** Detect implicit mid-session behavioral corrections and preferences — phrases the user issues without asking to "capture" anything — and offer to write them to the authoritative rule files (`knowledge/rules.md` or `~/.kmgraph/me.md`), rather than only the MEMORY.md feedback system.

## Trigger Patterns (match any)

High-confidence — fire immediately:
- "always [do X]" / "never [do X]" (when X is Claude's behavior)
- "from now on [do X]"
- "going forward [do X]"
- "every time [you do X]" / "each time [you do X]"
- "make sure you [always X]"
- "don't [do X]" / "do not [do X]" (when X is a process or behavioral pattern, not a one-time task)
- "I prefer [X]" / "I like when you [X]" / "I want you to [X]" (behavioral, not task-specific)
- "make that a rule" / "add that to your rules" / "rule:"
- "I need you to [always/never] X"

Medium-confidence — fire only if Claude just performed the action being corrected in the previous turn:
- "not like that" / "no, [do it differently]"
- "you keep [doing X]"
- "next time, [do X instead]"

## Do NOT trigger on

**Ephemeral guards** — phrases with these scope-limiting words indicate session-only instructions, NOT rules:
- "yet" / "for now" / "right now" / "this time" / "just this once" / "until [condition]" / "while [condition]"
- Examples that must NOT fire:
  - "don't push yet" → ephemeral
  - "stop the server" → ephemeral task
  - "stop once this issue is resolved" → ephemeral condition
  - "do not look at these attachments until I have added them all" → time-bounded

**Observation/complaint guards** — past-tense descriptions of what happened are NOT directives:
- "I had to stop you" / "I stopped because" / "I confirmed it is working" / "the debugging stopped"
- "you didn't [do X]" referring to a past event (not a standing rule)

**Clarification guards** — corrections to a misunderstanding in this turn are NOT rules:
- "Correction, I don't mean [X]" / "no, I mean [Y]" in response to Claude's immediate output
- One-time redirects that don't establish a standing pattern

**Code-correction guards** — corrections about code in a diff are NOT behavioral rules:
- "don't use `any` in TypeScript" (about code content, not Claude's process)
- "use `const` not `var`" (linting preference, not behavioral)

**In-context choice guards** — selecting between options presented by Claude is NOT a rule:
- "I prefer the bigger of the two" / "let's go with option 1"

**Other skill triggers** — yield to these:
- "capture that" / "remember that" / "save that" → `capture-router` skill handles
- "capture a lesson" → `lesson-capture` skill handles
- "create an ADR" → `adr-guide` skill handles

## Platform Detection

Run this detection block once per rules-capture invocation, just before Scope Classification. Detection result is a conceptual struct: `{platform: string, agents_present: bool}`.

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
- `platform = "unknown"`. Route to `knowledge/rules.md` with a note (see Scope Classification).

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

If any wrong-case warning was recorded in Steps 2–3, append it to the routing suggestion shown in the Execution Flow section. Example:

```
 Want me to make this a rule? → CLAUDE.md § Platform Preferences  (Claude Code)
 ⚠️  Found "claude.md" — Claude Code requires the filename to be "CLAUDE.md" (uppercase).
    The file is not loaded by Claude Code. Rename it to activate.
```

Still route the rule to the correct target (the user's intent is clear; the rename is their fix).

### Detection output

After completing Steps 1–6, the detection result `{platform, agents_present}` is available for use in Scope Classification and Execution Flow below. Detection is not cached across invocations — LLM context has no persistent state between calls.

---

## Scope Classification

After trigger fires, classify using two axes:

**Axis 1 — Scope: project vs personal**
- Project: correction references this repo, specific commands, files, or project workflows; or user says "in this project / in here / for this codebase"
- Personal: correction references general Claude behavior, style, tone, phrasing, or "any project / always / no matter what"

**Axis 2 — Type: rule vs me**
- Rule: behavioral directive, process standard, or convention — should apply to anyone working in this context (team-sharable)
- Me: personal identity, style, tone preference, or working-style note — specific to this user, not sharable

Combined into four targets:

| Scope | Type | → Target | Committed? |
|-------|------|-----------|------------|
| Project | Rule | `knowledge/rules.md` | Yes (team-wide) |
| Project | Me | `knowledge/me.md` | No (gitignored, user-specific) |
| Personal | Rule | `~/.kmgraph/rules.md` | Personal KG |
| Personal | Me | `~/.kmgraph/me.md` | Personal KG (gitignored) |

Signal examples per target:
- `knowledge/rules.md`: "always run npm run build before PR", "never force-push", "from now on identify model per phase" — team process
- `knowledge/me.md`: "in this project, I prefer to see diffs before you push", "remind me to check the hook after ECC installs" — personal workflow for this project
- `~/.kmgraph/rules.md`: "don't use the term 'update' for files that need to be created" — cross-project process rule
- `~/.kmgraph/me.md`: "no em dashes in any written content", "less technical jargon in confirmations" — identity/style across all projects

If both axes are ambiguous: ask one question — "Is this a rule for the whole team on this project, just for you on this project, or for all your projects?"

**Axis 3 — Platform-specificity: platform-specific vs universal**

A rule is **platform-specific** if it references a named tool, API, or command unavailable on at least one other platform.

**Pass 1 — Hard signals (auto-classify as platform-specific):**
- Rule text contains a platform tool name:
  - Claude Code: `Glob`, `Grep`, `Read`, `Edit`, `Write`, `Bash`, `Agent`, `WebFetch`, `ctx_batch_execute`, `ctx_search`, `MCP`, `slash command`, `hook`, `CLAUDE.md`
  - Gemini CLI: `Gemini`, `gemini`, `GEMINI.md`, `AGENT.md`, `activate_skill`
  - Cursor: `Cursor`, `.cursorrules`, `.cursor/rules`
  - Windsurf: `Windsurf`, `Cascade`, `.windsurfrules`
  - GitHub Copilot: `Copilot`, `copilot-instructions`, `@workspace`
  - Zed: `Zed`, `.zed/`, `.rules`
- User says "in Claude", "in Gemini", "in Cursor", "in Windsurf", "on this platform"
- Rule references a CLI flag or API that only exists on one platform

**Pass 2 — Soft signals (ask one clarifying question before routing):**
- Rule mentions a command format that looks platform-specific but is ambiguous (e.g., "always use the search tool" — which search tool?)
- Rule is about output behavior that differs per platform

**Universal (no platform signal — route to knowledge/rules.md as before):**
- Process behavior: "always run tests before committing", "never force-push"
- Workflow conventions: "one PR per feature", "always update CHANGELOG"
- Communication preferences: "keep responses short"

## Conflict Priority Rule

If `lesson-capture` and `rules-capture` would both fire on the same turn (e.g., "figured it out — and from now on always invalidate on write"):
- Both skills fire independently
- `lesson-capture` handles the bug-solved portion
- `rules-capture` handles the behavioral directive portion
- Each shows its own one-line suggestion; user can accept either or both

## Execution Flow

### 1. Classify and draft preview

Without asking the user anything, classify scope and draft a one-line preview of the rule:
- Extract the behavioral directive as a concise Always/Never statement
- **Minimum length guard:** If the captured rule draft is fewer than 3 words, ask before routing: "Can you complete the rule? e.g., 'Always use Glob for file search, not find.'" Do not route a single-word or two-word rule.
- Apply platform-specificity classification (Axis 3):
  1. Run Pass 1 hard signals against the rule text — if any match, mark as platform-specific
  2. If no hard signal, run Pass 2 soft signals — if any match, ask one clarifying question before routing
  3. If neither pass fires, classify as universal
- Apply Axis 1 (scope) and Axis 2 (type) classification using the existing four-target table
- Combine all three axes to determine the suggested target:
  - Platform-specific rule with detected platform (non-unknown): suggest the platform's native config file (e.g., `CLAUDE.md`)
  - Platform-specific rule with `platform = unknown`: suggest `knowledge/rules.md` with a `platform-rule` shortcut
  - Universal rule: use the four-target table result as before
- If ambiguous on Axis 1 or 2: ask one question, then proceed

### 2. Present inline suggestion

Append a single suggestion line to the end of your normal reply (do NOT replace the reply).

**Format (shown conditionally based on detection results):**
```
 Want me to make this a rule? → {suggested_target} ({scope label})
 "{preview of rule as Always/Never/preference statement}"
 (platform / agents / yes / project-me / personal-rule / personal-me / no)
```
When `platform = unknown` and rule is platform-specific, replace `platform` with `platform-rule` in the shortcut list.

**Shortcut visibility rules:**
- `platform` shortcut: shown ONLY when `platform ≠ unknown` AND rule is platform-specific
- `platform-rule` shortcut: shown ONLY when `platform = unknown` AND rule is platform-specific (in place of `platform`)
- `agents` shortcut: shown ONLY when `agents_present = true`
- All other shortcuts always shown

**Full shortcut reference:**
- `platform` — write to the detected platform's native config file (e.g., `CLAUDE.md`, `GEMINI.md`, `.windsurfrules`)
- `agents` — write to `AGENTS.md`
- `platform-rule` — shown instead of `platform` when `platform = unknown` and rule is platform-specific; prompts user: "Which platform file should I write to?" then routes accordingly
- `yes` — accept suggested target as-is
- `project-me` → `knowledge/me.md`
- `personal-rule` → `~/.kmgraph/rules.md`
- `personal-me` → `~/.kmgraph/me.md`
- `no` — drop, do not re-prompt this session

**Example — platform-specific rule detected in Claude Code with AGENTS.md present:**
```
 Want me to make this a rule? → CLAUDE.md § Platform Preferences (platform, Claude Code)
 "Always use Glob for file search, not find."
 (platform / agents / yes / project-me / personal-rule / personal-me / no)
```

**Example — universal rule (no platform signal, no AGENTS.md):**
```
 Want me to make this a rule? → knowledge/rules.md (project, team)
 "Always run tests before committing."
 (yes / project-me / personal-rule / personal-me / no)
```
(`platform` and `agents` shortcuts omitted — not applicable.)

**Example — platform-specific rule with platform=unknown fallback:**
```
 Want me to make this a rule? → knowledge/rules.md (universal — platform unknown)
 "Always use Glob for file search, not find."
 (platform-rule / yes / project-me / personal-rule / personal-me / no)
```
(`platform-rule` shortcut asks "Which platform file should I write to?" then routes accordingly.)

**Example — personal style rule:**
```
 Want me to make this a rule? → ~/.kmgraph/me.md (personal style)
 "Avoid technical jargon in user-facing confirmation messages."
 (yes / project-me / personal-rule / personal-me / no)
```

### 3. Handle response

- **"yes"** → dispatch to `rules-capture-agent` with structured payload (see below)
- **"platform"** → flip target to the detected platform's native config file (e.g., `CLAUDE.md`), dispatch to agent
- **"agents"** → flip target to `AGENTS.md`, dispatch to agent
- **"platform-rule"** → ask "Which platform file should I write to?" — accept user's answer, flip target to that file, dispatch to agent
- **"project-me"** → flip target to `knowledge/me.md`, dispatch to agent
- **"personal-rule"** → flip target to `~/.kmgraph/rules.md`, dispatch to agent
- **"personal-me"** → flip target to `~/.kmgraph/me.md`, dispatch to agent
- **"no"** / silence → drop, do not re-prompt for the same correction this session
- Natural language override always works: "make it project me.md", "user rules", "nope", "skip", "put it in my personal me", "write it to CLAUDE.md", "put it in AGENTS.md"

### 4. Dispatch payload

When dispatching to `rules-capture-agent`, pass:
```
context:
  rule_preview: "Always open the plan file in the editor immediately after writing it."
  target_file: "knowledge/rules.md"   # exact path — one of:
                                      #   knowledge/rules.md
                                      #   knowledge/me.md
                                      #   ~/.kmgraph/rules.md
                                      #   ~/.kmgraph/me.md
                                      #   CLAUDE.md, GEMINI.md, .windsurfrules, etc.  (platform-specific)
                                      #   AGENTS.md
  scope: "project-rule"               # one of: project-rule | project-me | personal-rule | personal-me
                                      #          | platform-specific | agents
  source_quote: "[exact phrase user said that triggered this]"
  session_context: "[1-2 sentence summary of what was happening when this correction arose]"
  platform: "claude-code"             # from detection result; omit field entirely if platform = unknown
  agents_present: true                # from detection result; always include
```

## Do NOT

- Ask clarifying questions before showing the suggestion (suggestion comes first)
- Re-prompt if user declines
- Fire more than once per correction (if user already responded to the suggestion, do not re-show for the same phrase)
- Write anything directly — all writes are handled by the agent

## Conflict Avoidance

This skill does NOT conflict with:
- `capture-router` — fires on explicit "capture/save/remember that"; rules-capture fires on implicit behavioral directives without capture vocabulary
- `lesson-capture` — fires on bugs solved/patterns learned; rules-capture fires on process/behavioral directives; both may fire on the same turn (see Conflict Priority Rule above)
- `adr-guide` — fires on architecture decisions with trade-off rationale
- `doc-update-router` — fires on "update docs" requests

## Natural Language & ECC Compatibility

- No Claude Code tool name dependencies in trigger detection — natural language only
- Works in any conversational context
- ECC-compatible: no slash command dependencies
