---
title: triggers.md — Platform-Agnostic Rule Timing Companion File
---
## Status

Accepted

## Context

Rules in `rules.md` are organized by topic, which is good for search and reference. But topic organization gives no signal about *when* a rule fires. Previously, all rules defaulted to "at session start" — leading to rules being read but not applied at the right moment. This was discovered during a plan-writing session where Parallelism Analysis (a required post-plan step) was missed because the rule had no timing signal.

Platform-specific hooks and skills were considered as a solution and rejected: they are Claude-only mechanisms that defeat the cross-platform architecture requirement (Claude, Gemini, Cursor, and future platforms).

## Decision

Add `triggers.md` as a standard companion to `rules.md` in both `~/.kmgraph/` (user KG, first-class) and `knowledge/` (project KG, optional stub). The file maps workflow phases to rule section references. Merge semantics: user-level triggers always apply; project-level entries extend, never replace.

Platform configs are updated once to reference both files. Rules in `rules.md` also receive inline `When:` annotations as a human-readable fallback for platforms that read only one file.

## Alternatives Considered

- **Platform-specific hooks/skills:** Rejected — Claude-only, defeats cross-platform goal.
- **Add timing to CLAUDE.md:** Rejected — defeats the lightweight config architecture; CLAUDE.md is a platform pointer, not a rule store.
- **Restructure rules.md by phase:** Rejected — breaks existing anchors, hurts topic search.
- **triggers.md + inline When: annotations:** Chosen — clean separation of concerns, no duplication, graceful fallback for single-file readers.

## Consequences

- `init-personal-kg` scaffolds `triggers.md` as a first-class user KG file alongside `rules.md` and `me.md`
- `init` creates an optional stub `triggers.md` for project KGs
- Platform config pointers (CLAUDE.md, .gemini/GEMINI.md, etc.) updated once to reference both files
- `triggers.md` ships with Parallelism Analysis as the canonical example phase entry
- Rules remain topic-organized in `rules.md`; timing lives in `triggers.md`
