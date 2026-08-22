---
title: "ENH-050: Document Trigger Keywords Tied to Each Command/Skill in User-Facing Docs"
number: 050
status: proposed
version_target: null
github_issue: 181
created: 2026-07-17
related_adrs: []
related_enhs: ["ENH-006"]
notes: "Request captured only; docs files, format, and sync strategy deferred to implementation scoping."
---

# ENH-050: Document Trigger Keywords Tied to Each Command/Skill in User-Facing Docs

**Local ID:** ENH-050 | **GitHub Issue:** #181

## Problem Statement

User-facing command documentation (e.g. `docs/reference/command-guide.md`, `docs/reference/commands.md`, or wherever commands are documented for end users) does not surface which trigger keywords/phrases cause a command's associated skill(s) to auto-fire. This mapping — command ↔ skill ↔ trigger keywords — currently exists only scattered across individual `SKILL.md` files and `hooks/hooks.json`, and is invisible to someone reading the user-facing docs.

A user reading the docs can see *what a command does*, but not *what phrases/triggers cause its associated skill to fire automatically*. That gap makes the auto-invocation behavior feel opaque or unpredictable from the documentation alone.

## Scope Note

**This spec captures the request only.** The following are explicitly deferred to implementation scoping and are NOT decided here:

- Which specific docs files need updating
- The exact keyword list/content to surface for each command/skill
- The format/presentation of the keyword-to-command mapping in the docs
- How this mapping is kept in sync as skills and hooks change over time (manual update vs. generated from source)

## Goals

1. Surface the command ↔ skill ↔ trigger-keyword mapping somewhere in user-facing documentation, so readers understand not just what a command does but what causes its associated skill to auto-fire.

## Related

- **ENH-006:** Sequential Prompts, Decoupled Decisions, and Skill Trigger Gaps — related subsystem (skill triggers), but distinct scope. ENH-006 addresses a specific ROADMAP/CHANGELOG sync-gate trigger mechanism; this ENH is about documenting trigger keywords in user-facing docs for readability/discoverability. Linked, not merged.
- `docs/reference/command-guide.md`/`commands.md` hotspot: also touched by
  [issue-41](../../issues/issue-41/issue-41-description.md) and
  [ENH-034](../ENH-034/ENH-034-specification.md) (which already cross-links
  [ENH-042](../ENH-042/ENH-042-specification.md)) — same docs surface as this ENH's
  trigger-keyword documentation goal, FYI.

## Out of Scope

- Designing the actual documentation format
- Deciding which specific keywords/phrases to list
- Deciding which docs files to update
- Sync/automation strategy for keeping docs in sync with skill/hook changes
