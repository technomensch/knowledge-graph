---
title: Platform Detection
category:
  uri: design
position: 1
slug: design-platform-detection
---

# Design: Platform Detection for `rules-capture`

**Status: DRAFT — awaiting sign-off**
**Author:** v0.3.6-beta design phase
**Depends on:** v0.3.5-beta (platform split of tool directives out of `knowledge/rules.md`)

---

## Problem

The `rules-capture` skill routes behavioral corrections to one of four targets, but has no platform axis. A correction like "always use Glob not grep" lands in `knowledge/rules.md` (universal, team-scoped) when it should go to `CLAUDE.md` (Claude Code-specific, tool-scoped).

`CLAUDE.md` at the repo root IS the platform config file for Claude Code. Other platforms use their native files (`GEMINI.md`, `.cursorrules`, `AGENTS.md`). There is no `knowledge/platform/` directory — the native files own tool directives directly.

This doc answers the five design questions from the v0.3.6 plan and proposes concrete decisions.

---

## Design Question 1 — Platform Detection Mechanism

**Question:** How does the skill know which platform is active?

**Decision: File-presence heuristic, evaluated at classification time.**

The skill (an LLM prompt, not a shell script) cannot read environment variables directly. Instead, it uses a prioritized file-presence check:

| Priority | Indicator file/dir | Platform | Native config target |
|---|---|---|---|
| 1 | `.claude/` directory exists | Claude Code | `CLAUDE.md` |
| 2 | `GEMINI.md` exists at repo root | Gemini CLI | `GEMINI.md` |
| 3 | `.cursor/` directory exists | Cursor | `.cursorrules` |
| 4 | `AGENTS.md` exists at repo root | Codex/OpenAI | `AGENTS.md` |
| 5 | `CLAUDE.md` exists (no `.claude/`) | Claude Code (web/IDE) | `CLAUDE.md` |

Rules:
- Use the **first match** — stop at priority 1 if `.claude/` is found
- If **multiple indicators** are found (e.g. `.claude/` + `GEMINI.md`): ask the user which platform to target
- If **no indicator** matches: platform is `unknown` → see Q3 fallback

**Why not env vars:** Skills run as LLM context, not shell processes. Environment probing requires a Bash call which is heavier and unreliable in non-CC environments.

**Why not explicit user declaration:** Adds friction. File presence is always available at classification time with a single Glob check.

---

## Design Question 2 — Classification Signal: Is a Rule Platform-Specific?

**Question:** What cues indicate a captured rule belongs in a platform file?

**Decision: Two-pass signal check.**

**Pass 1 — Hard signals (auto-route to platform file, no ambiguity):**
- Rule text contains a platform tool name from the known vocabulary:
  - Claude Code: `Glob`, `Grep`, `Read`, `Edit`, `Write`, `Bash`, `Agent`, `WebFetch`, `ctx_batch_execute`, `ctx_search`, `MCP`, `slash command`, `hook`, `CLAUDE.md`
  - Gemini CLI: `Gemini`, `gemini`, `GEMINI.md`, `activate_skill`
  - Cursor: `Cursor`, `.cursorrules`
  - Codex: `AGENTS.md`, `codex`
- User says "in Claude", "in Gemini", "in Cursor", "on this platform"
- Rule references a CLI flag or API that only exists on one platform

**Pass 2 — Soft signals (ask one clarifying question):**
- Rule mentions a command format that looks platform-specific but is ambiguous (e.g., "always use the search tool" — which search tool?)
- Rule is about output behavior that differs per platform (e.g., "don't produce long responses" — is this Claude-only or universal?)

**Universal (no platform signal → `knowledge/rules.md` as before):**
- Process behavior: "always run tests before committing", "never force-push"
- Workflow conventions: "one PR per feature", "always update CHANGELOG"
- Communication preferences: "keep responses short"

---

## Design Question 3 — Fallback Behavior

**Question:** If platform cannot be detected, route to `knowledge/rules.md` with a warning, or ask user?

**Decision: Route to `knowledge/rules.md` and show a one-line note.**

If platform detection returns `unknown`:
1. Route the rule to `knowledge/rules.md` as a universal rule
2. Append a note to the suggestion line:

```
 Want me to make this a rule? → knowledge/rules.md (universal — platform unknown)
 "Always use Glob for file search, not find."
 (yes / platform-rule / project-me / personal-rule / personal-me / no)
```

The `platform-rule` shortcut lets the user override to the correct platform file without requiring them to type a path.

**Why not ask:** If the platform is undetectable, the user likely has a non-standard setup. Asking adds friction on every capture. The fallback is safe (universal rules.md is always correct as a destination), and `platform-rule` is one word to override.

---

## Design Question 4 — Drawing the Universal/Platform Boundary

**Question:** How is the boundary drawn for partially platform-specific rules?

**Decision: Tool-API specificity as the line.**

A rule is **platform-specific** if and only if it references a **named tool, API, or command that is unavailable on at least one other platform**.

| Rule | Classification | Target |
|---|---|---|
| "Always use Glob not find" | Platform-specific — `Glob` is a Claude Code tool | `CLAUDE.md` |
| "Always use Grep not rg" | Platform-specific — `Grep` is a Claude Code tool | `CLAUDE.md` |
| "Always run tests before committing" | Universal — no platform tool named | `knowledge/rules.md` |
| "Don't use context-mode for small files" | Platform-specific — `context-mode` is a Claude plugin | `CLAUDE.md` |
| "Keep responses short" | Universal — communication style | `~/.kmgraph/me.md` |
| "Always open the plan file after writing it" | Universal — workflow process | `knowledge/rules.md` |

For **hybrid rules** (part universal, part platform-specific):
- Split into two rules at capture time
- Example: "always run Glob for file search and always run tests before pushing"
  - Rule 1: "Always use Glob for file search" → platform
  - Rule 2: "Always run tests before pushing" → universal

---

## Design Question 5 — Cross-Project Platform Rules

**Question:** Should `~/.kmgraph/platform/claude.md` exist for cross-project platform prefs?

**Decision: Yes — add as a 6th routing target, but defer UI to v0.3.7.**

The full routing matrix becomes:

| Scope | Type | Target | Committed? |
|---|---|---|---|
| Project | Rule | `knowledge/rules.md` | Yes (team-wide) |
| Project | Me | `knowledge/me.md` | No (gitignored) |
| Project | Platform | native platform file (`CLAUDE.md`, `GEMINI.md`, etc.) | Yes (team-wide) |
| Personal | Rule | `~/.kmgraph/rules.md` | Personal KG |
| Personal | Me | `~/.kmgraph/me.md` | Personal KG |
| Personal | Platform | `~/.kmgraph/platform/<platform>.md` | Personal KG |

**v0.3.6 scope (this release):** Implement targets 1–5 only (project platform file). The personal platform target (row 6) is scaffolded in the routing table but the dispatch path is deferred.

**Why defer personal platform:** Low urgency. Most platform prefs live at the project level in `CLAUDE.md`. Cross-project platform prefs can be handled by manually editing `~/.claude/CLAUDE.md` (or equivalent) until v0.3.7 adds the routing path.

---

## Routing Table (v0.3.6 Final)

After classification, the 5 active targets + shortcuts:

| Target | Label shown to user | Shortcut |
|---|---|---|
| native platform file (`CLAUDE.md`, `GEMINI.md`, etc.) | `platform (project, <platform>)` | `platform` |
| `knowledge/rules.md` | `rules.md (project, universal)` | `yes` |
| `knowledge/me.md` | `me.md (project, personal)` | `project-me` |
| `~/.kmgraph/rules.md` | `rules.md (personal, universal)` | `personal-rule` |
| `~/.kmgraph/me.md` | `me.md (personal, style)` | `personal-me` |

---

## New-File Handling

If the target platform file does not yet exist (e.g., `GEMINI.md` for a project that only has `CLAUDE.md`):

1. Detect absence before presenting suggestion
2. Append `[new file]` to the suggestion line:

```
 Want me to make this a rule? → GEMINI.md (new file) (platform, Gemini)
 "Always use the search_files tool, not shell find."
 (yes / rules.md / project-me / personal-rule / personal-me / no)
```

3. On acceptance, create the file with a standard platform header

---

## Implementation Targets (from plan scope)

This design resolves all five questions. Implementation proceeds to:

1. **Task 1** — Platform detection: file-presence heuristic in `skills/rules-capture/SKILL.md`
2. **Task 2** — Classification axis: two-pass signal check added to `SKILL.md`
3. **Task 3** — 5th routing target in `agents/rules-capture-agent.md` + confirmation UX + new-file handling
4. **Task 4** — Test cases: `platform_detection_tests.md` with input → expected-routing cases
5. **Task 5** — CHANGELOG + version bump + PR

---

## Open Items (post sign-off)

- [ ] Confirm: shortcut vocabulary — `platform` as a keyword doesn't conflict with existing shortcut set (`yes`, `project-me`, `personal-rule`, `personal-me`, `no`)?
- [ ] Protected files needing follow-up (require explicit permission to modify): `commands/init.md` (remove `knowledge/platform/` scaffolding step), `commands/init-shared/upgrade-inspector.md` (update relocation target from `knowledge/platform/claude.md` → `CLAUDE.md`), `core/default-templates/concepts/rules.md` (update guidance comment)
