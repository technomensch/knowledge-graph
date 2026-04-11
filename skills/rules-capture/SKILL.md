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
- `knowledge/rules.md`: "always run mkdocs build before PR", "never force-push", "from now on identify model per phase" — team process
- `knowledge/me.md`: "in this project, I prefer to see diffs before you push", "remind me to check the hook after ECC installs" — personal workflow for this project
- `~/.kmgraph/rules.md`: "don't use the term 'update' for files that need to be created" — cross-project process rule
- `~/.kmgraph/me.md`: "no em dashes in any written content", "less technical jargon in confirmations" — identity/style across all projects

If both axes are ambiguous: ask one question — "Is this a rule for the whole team on this project, just for you on this project, or for all your projects?"

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
- Identify the target file using scope classification above
- If ambiguous: ask one question, then proceed

### 2. Present inline suggestion

Append a single suggestion line to the end of your normal reply (do NOT replace the reply):

```
 Want me to make this a rule? → {target file} ({scope label})
 "{preview of rule as Always/Never/preference statement}"
 (yes / project-me / personal-rule / personal-me / no)
```

The shortcut options let the user flip to any of the four targets without typing a full sentence:
- `yes` — accept suggested target as-is
- `project-me` → `knowledge/me.md`
- `personal-rule` → `~/.kmgraph/rules.md`
- `personal-me` → `~/.kmgraph/me.md`
- `no` — drop, do not re-prompt this session

Examples:
```
 Want me to make this a rule? → knowledge/rules.md (project, team)
 "Always open the plan file in the editor immediately after writing it."
 (yes / project-me / personal-rule / personal-me / no)
```
```
 Want me to make this a rule? → ~/.kmgraph/me.md (personal style)
 "Avoid technical jargon in user-facing confirmation messages."
 (yes / project-me / personal-rule / personal-me / no)
```

### 3. Handle response

- **"yes"** → dispatch to `rules-capture-agent` with structured payload (see below)
- **"project-me"** → flip target to `knowledge/me.md`, dispatch to agent
- **"personal-rule"** → flip target to `~/.kmgraph/rules.md`, dispatch to agent
- **"personal-me"** → flip target to `~/.kmgraph/me.md`, dispatch to agent
- **"no"** / silence → drop, do not re-prompt for the same correction this session
- Natural language override always works: "make it project me.md", "user rules", "nope", "skip", "put it in my personal me"

### 4. Dispatch payload

When dispatching to `rules-capture-agent`, pass:
```
context:
  rule_preview: "Always open the plan file in the editor immediately after writing it."
  target_file: "knowledge/rules.md"   # exact path — one of four possible values:
                                      #   knowledge/rules.md
                                      #   knowledge/me.md
                                      #   ~/.kmgraph/rules.md
                                      #   ~/.kmgraph/me.md
  scope: "project-rule"               # one of: project-rule | project-me | personal-rule | personal-me
  source_quote: "[exact phrase user said that triggered this]"
  session_context: "[1-2 sentence summary of what was happening when this correction arose]"
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
