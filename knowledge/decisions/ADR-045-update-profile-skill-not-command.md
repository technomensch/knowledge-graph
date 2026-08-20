---
title: "ADR-045: Implement Profile Update Functionality as a Skill, Not a Command"
number: 45
created: 2026-04-23T00:00:00Z
status: Accepted
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: v0.5.3-hotfix-extract-chat-history
  commit: b3dea47f
  pr: null
  issue: null
implements: null
related:
  adrs: []
  lessons: []
  kg_entries: []
tags: [profile, skill, command, platform-agnostic, user-profile]
category: architecture
---

# ADR-045: Implement Profile Update Functionality as a Skill, Not a Command

**Date:** 2026-04-23
**Status:** Accepted

---

## Context

**Problem:**
- No skill or command existed for managing user profiles (me.md + rules.md + triggers.md as a unit)
- When told "update the user profile," AI sessions defaulted to updating only `rules.md`, leaving `triggers.md` un-updated — because "user profile" was not defined anywhere as a three-file bundle
- The fix requires both a definition of the term and an automated routing mechanism that enforces the three-file review gate

**Scope:**
- In scope: Claude Code and platforms with skill/auto-trigger support
- Out of scope (deferred): non-Claude Code platforms (Gemini CLI, Cursor, Windsurf, Codex CLI) where skills do not auto-trigger — those users need a slash command or MCP tool

**Constraints:**
- A new slash command requires doc updates across COMMAND-GUIDE.md, CHEAT-SHEET.md, `docs/reference/commands.md`, README, and GETTING-STARTED.md
- A new skill requires only a single SKILL.md file — no doc surface changes

---

## Decision

Implement profile update routing as a **skill** (`skills/update-profile/SKILL.md`) rather than a slash command.

The skill auto-triggers on natural language patterns ("update my profile", "add this to my profile", "update the user profile") and routes changes across the three-file bundle — me.md, rules.md, triggers.md — at either user level (`~/.kmgraph/`) or project level (`knowledge/`).

The three-file bundle definition is also written into `~/.kmgraph/rules.md § Profile > Profile Structure` so it is available to AI sessions as a behavioral rule independent of the skill.

---

## Rationale

### Why Skill Over Command

1. **Minimal doc surface:** A skill requires no changes to COMMAND-GUIDE, CHEAT-SHEET, reference/commands.md, README, or GETTING-STARTED. A command requires all five.
2. **Natural language activation:** Skills fire on conversational phrases without requiring the user to remember a slash command. "Update my profile" is more natural than `/kmgraph:update-profile`.
3. **Behavioral enforcement:** The three-file gate (all three files reviewed before done) is a behavioral constraint — the right layer for a skill, not a slash command.

### Why a Command Is Still the Right Future Path for Other Platforms

Platform-agnostic users (Gemini CLI, Cursor, Windsurf, Codex CLI) cannot invoke Claude Code skills. If those users say "update my profile," they get no routing assistance. A future `kg_update_profile` MCP tool or platform command would close this gap without the current doc-update cost — because by that time, the three-file definition will already be established in the profile files, reducing the docs change to a reference addition only.

### Alternatives Considered

**Command only:**
- Pros: works across all platforms, explicit invocation
- Cons: significant doc updates; adds to an already long command list; "update my profile" should not require a slash command for natural usage
- Rejected for v0.5.3; deferred to platform-agnostic roadmap

**Skill + Command in parallel:**
- Pros: full coverage now
- Cons: duplicates the doc surface cost immediately; premature given the user base is currently Claude Code-only
- Rejected for same reason

---

## Consequences

### Positive
- ✅ Claude Code sessions now correctly route "update my profile" to all three files
- ✅ Zero doc update cost for this release
- ✅ Clear deferred path: a platform-agnostic command/MCP tool can be added when needed

### Negative
- ❌ Gemini CLI, Cursor, Windsurf, and Codex CLI users get no auto-trigger; they must rely on the `rules.md § Profile > Profile Structure` definition being in context
- Mitigated: the definition in `~/.kmgraph/rules.md` is always loaded, so platforms that load rules files will still have the three-file definition even without the skill trigger

### Neutral
- The skill approach is consistent with how other behavioral enforcements (rules-capture, lesson-capture, adr-guide) are implemented in kmgraph
- **Resolution (see [ADR-057](ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth.md)):** this "consistent with" wording was later identified as evidence that the detection layer grew piecemeal rather than by unified design — [[ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth]] documents the fragmentation and the eventual consolidation direction.

---

## Implementation

**Branch:** v0.5.3-hotfix-extract-chat-history

**Delivered:**
- `skills/update-profile/SKILL.md` — trigger patterns, routing table, three-file gate
- `~/.kmgraph/rules.md § Profile > Profile Structure` — definition of "user profile" as three-file bundle
- `~/.kmgraph/triggers.md § When updating a user profile` — gate: all three files reviewed before done
- `knowledge/triggers.md § Before pushing to origin / Before creating a PR` — doc sync hard STOP gates (companion change in same branch)

---

## Future Considerations

1. **Platform-agnostic command:** When non-Claude Code platform usage grows, add `kg_update_profile` as an MCP tool or cross-platform command. The three-file definition will already be in place, reducing the docs cost significantly.
2. **Profile validation:** A future enhancement could validate that every rule in `rules.md` has a corresponding trigger in `triggers.md` — surfacing orphaned rules automatically.

---

**Decision Made:** 2026-04-23
**Last Updated:** 2026-04-23
**Status:** Accepted
