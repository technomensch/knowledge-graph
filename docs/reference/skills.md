---
title: Skills Catalog
category:
  uri: reference
position: 5
slug: reference-skills
---

# Skills Catalog

Skills are auto-triggered context providers. They activate based on natural-language signals in the conversation — no explicit invocation needed. Each skill provides guidance and suggests the most relevant command for the current moment.

## How Skills Work

Skills listen for keywords and patterns in the conversation. When a match is detected, the skill surfaces a suggestion in the conversation context. The user can act on the suggestion or ignore it — skills never execute commands automatically.

## Skill Reference

| Skill | Triggers On | Suggests |
|---|---|---|
| **lesson-capture** | "figured it out", "solved it", "pattern here is", bug breakthrough, debugging victory | `/kmgraph:capture-lesson` with pre-filled context |
| **kg-recall** | "have we done this before", "did we solve this", past decisions, history questions | `/kmgraph:recall` with extracted search terms |
| **session-wrap** | Session ending, context limit approaching, major milestone completed | `/kmgraph:session-summary` before compaction |
| **adr-guide** | "I'm thinking of using...", architecture decisions, tech choice discussions | `/kmgraph:create-adr` with decision guidance |
| **doc-update-router** | "update [doc name]", "update the session summary", "update the changelog" | Routes to the correct update command; bypasses direct file edits |
| **stuck-work-escalation** | A bug, test, or task has resisted 3+ distinct fix attempts or 30+ minutes of effort | Activates Opus diagnosis gate, enforces hypothesis logging per attempt, drives to structured exit-path decision at 5 attempts |
| **docs-impact-scan** | "push to origin", "push and merge", "push and merge with admin", "open PR", "create PR", "finishing up", "ready to push" | Scans for all user-facing docs affected by current branch changes; validates list with user before dispatching `/kmgraph:update-doc --user-facing` for each confirmed file |
| **sidebar-update** | A docs file is moved or renamed, "move [doc]", "rename [doc]", `git mv` on a `docs/` path | Finds the stale `id:` entry in `sidebars.js`, updates it to the new path, scans for broken internal links |
| **capture-router** | "capture that", "remember that", "save that", and similar natural-language capture phrases | Auto-detects content type and destination from content signals; presents single confirmation before writing |
| **rules-capture** | "always X", "never X", "from now on X", "don't do X" (standing rule), "I prefer X", "make that a rule" — implicit behavioral corrections without capture vocabulary | Detects scope (project vs personal, rule vs me), shows one-line suggestion with 4-target shortcut menu, dispatches to `rules-capture-agent` on confirmation |
| **gov-execute-plan** | "execute plan", implementation start, `docs/plans/*.md` mentioned | Zero-deviation 8-step execution protocol |
| **knowledge-graph-usage** | Questions about KMGraph itself, "how do I...", "what command..." | Orients to the four-layer architecture and surfaces relevant commands |
| **brainstorm-recall** | `superpowers:brainstorming` invoked; fires before `adr-guide` | Invokes `kmgraph:recall` with the topic; surfaces results under "Prior Art" before any recommendation |

## Trigger Keywords

Skills use pattern matching on natural language, not exact commands. The `lesson-capture` skill fires on phrases that indicate a breakthrough:

- "figured it out"
- "solved it"
- "the pattern here is"
- "the fix was"
- "turns out the issue was"
- "what I learned"

The `capture-router` skill fires on capture intent phrases:

- "capture that"
- "remember that"
- "save that"
- "let's document this"

Skills are designed to catch capture opportunities that users would otherwise miss because they are in flow.

## Skills vs Commands

Skills provide suggestions. Commands execute actions. A skill surfaces `/kmgraph:capture-lesson` at the right moment; the command does the actual capture. Skills can be thought of as a smart prompt layer that knows when to interrupt.

## Related

- [Agents Catalog](agents) — Heavy-lift handlers triggered by skills
- [Command Guide](/knowledge-graph/reference/command-guide) — Full command reference
- [Concepts — Automation Layer](/concepts/why-kmgraph) — How skills, agents, and hooks fit together
