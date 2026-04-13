---
title: "Platform-Agnostic Rule Timing via triggers.md"
created: 2026-04-12T15:49:04.066Z
updated: 2026-04-12T15:49:04.066Z
author: technomensch
git:
  branch: v0.3.7
  commit: 68f81d92f7d6e9a7012486be2bf41b4fa35adc0b
tags: [triggers-md, rules-md, platform-portability, timing, plan-protocol, parallelism-analysis, cross-platform]
category: architecture
---
## Problem

Rules in `~/.kmgraph/rules.md` (e.g., Parallelism Analysis under Plan Protocol) were not being applied at the right moment during plan writing. The rules existed in the correct file, and CLAUDE.md pointed to the file, but there was no signal indicating *when* each rule should fire. Platform-specific mechanisms (hooks, skills) were not appropriate because the rules need to work across Claude, Gemini, Cursor, and future platforms.

## Solution

Introduce `triggers.md` as a companion file to `rules.md` that maps workflow phases to rule references. Each phase section (e.g., "After writing an implementation plan") lists which rules from `rules.md` to apply at that moment. Platform configs are updated once to say "read both files." Additionally, inline `When:` annotations are added to rules in `rules.md` as a human-readable fallback for platforms reading only one file. Merge semantics: user-level triggers always apply; project-level entries extend, never replace.

## When to apply

- When a rule exists in `rules.md` but is consistently missed during a specific workflow phase
- When adding a new rule that only applies at a particular moment (post-plan, pre-commit, session start)
- When onboarding a new platform that reads `rules.md` but has no hook/skill system

## Context

Discovered during a plan-writing session where Parallelism Analysis (a required post-plan step) was missed because the rule had no timing signal. The fix is architectural — not platform-specific — ensuring the timing information travels with the rule file itself rather than being encoded in any one platform's config.