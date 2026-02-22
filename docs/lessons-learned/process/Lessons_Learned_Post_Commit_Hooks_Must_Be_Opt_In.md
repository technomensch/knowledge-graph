---
title: "Lesson: Post-Commit Hooks Must Be Opt-In for Alpha Releases"
created: 2026-02-16T00:00:00Z
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: main
  commit: 37f7e544e5b3b2f1c9a7d5e3f1b9a7c5e3f1b9a7
  pr: null
  issue: null
sources: []
tags: [process, plugin-design, hooks, ux, alpha]
category: process
---

# Lesson Learned: Post-Commit Hooks Must Be Opt-In for Alpha Releases

**Date:** 2026-02-16
**Category:** process
**Version:** 1.0

---

## Problem

The plugin included post-commit hooks that automatically triggered on certain commit patterns (e.g., commits containing "fix", "pattern", "refactor"). This seemed helpful initially: automatically suggest capturing lessons learned after solving a problem.

**Context:**
- v0.0.3-alpha included optional hooks in `core/examples-hooks/`
- Initial assumption: Hooks are "optional" → won't cause friction
- Reality: Users didn't know hooks existed; confusing "magic" behavior

---

## Root Cause

For alpha releases, **implicit automation is too opinionated**. Even if technically "optional", the presence of hooks in default installation suggests plugin expects them.

**User Impact:**
- Commits unexpectedly trigger suggestions
- No clear indication of why suggestions appear
- Feels magical/mysterious rather than helpful
- Creates maintenance burden (users wonder if hooks are enabled)

---

## Solution Implemented

**Explicit Opt-In Pattern:**

1. **Remove hooks from default installation**
   - Move from `core/examples-hooks/` to documentation only
   - Include setup instructions in INSTALL.md

2. **Provide setup wizard for users who want hooks**
   - `/kg-sis:init` prompts: "Enable post-commit hook suggestions?"
   - User explicitly confirms before installation

3. **Document what hooks do**
   - FAQ entry explaining post-commit behavior
   - CONTRIBUTING.md for developers

**Result:**
- No surprise behaviors
- Users opt in knowingly
- Feedback collected on usefulness before making default
- Clean path to making it default in later version if data supports it

---

## Evidence

**Key Finding:** Alpha releases should minimize surprising behaviors. Even well-intentioned features feel opinionated if implicit.

**Pattern:** Industry standard for alpha software is explicit user control, not implicit helpfulness.

---

## Replication Pattern

**For New Automation Features:**

1. **Opt-in for alpha:** Let users choose to enable
2. **Explicit prompts:** Tell users they're enabling something
3. **Collect feedback:** Track adoption; learn if users find it valuable
4. **Graduate to defaults:** Once proven valuable, make default in next stable release

**Benefits:**
- User trust and transparency
- Data on actual usage before committing
- Easier to disable/modify based on feedback
- Clear path for feature evolution

---

## Lessons & Takeaways

**Key Insights:**
1. Implicit automation feels magical (bad) rather than helpful (good) in alpha
2. Opt-in approach builds user trust
3. Automation should earn its place through usage, not assumption

**What Didn't Work:**
- Assuming "optional" = harmless
- Not considering user surprise/confusion factor
- Not getting explicit user consent

**If We Had to Do It Again:**
- Include hooks only if user explicitly requests during setup
- Make default behavior minimal and transparent
- Add telemetry/feedback mechanism before expanding

---

## Related ADRs

- [ADR-002: Commands vs Skills Architecture](../../decisions/ADR-002-commands-vs-skills-architecture.md) — Hooks architecture pattern

---

**Version:** 1.0
**Created:** 2026-02-16
**Last Updated:** 2026-02-22
