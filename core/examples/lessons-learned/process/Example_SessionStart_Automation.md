---
title: "Lesson: Hook-Based Session Automation"
created: 2026-01-03T11:00:00Z
author: "Example User"
git:
  branch: null
  commit: null
  pr: null
  issue: null
sources:
  - url: "https://git-scm.com/docs/githooks"
    title: "Git Hooks Documentation"
    accessed: "2026-01-03"
    context: "Reference for implementing post-commit trigger logic"
tags: ["#automation", "#hooks", "#workflow", "#knowledge-management"]
category: process
---

# Lesson Learned: Hook-Based Session Automation

**Date:** 2026-01-03
**Category:** Process
**Tags:** #automation #hooks #workflow #knowledge-management

---

## Problem

After implementing a knowledge management system with documentation skills (capture-lesson, create-adr, recall, session-summary), a critical usability gap remained: **all documentation required manual triggering**.

- Skills required users to remember when to invoke them
- No automated context loading at session start
- No reminders about uncommitted work or recent activity
- Risk of forgetting to document significant work before context limits
- No connection between git commits and documentation suggestions

**Impact:**
- Cognitive overhead remembering to document
- Inconsistent documentation capture
- Valuable lessons potentially lost
- Team members unaware of when to use documentation skills

**The irony:** A system designed to preserve knowledge depended on human memory to function.

---

## Root Cause

### Why Manual Triggering Creates Overhead

1. **Cognitive Load:** Users must remember *when* to document, not just *what* to document
2. **No Temporal Boundaries:** No natural triggers in the development workflow for documentation
3. **Git Workflow Disconnect:** Commits happen independently of documentation consideration

### The Insight

Automation should operate at **decision boundaries** (session start, commit time) to *suggest* actions, not execute them. This preserves human judgment about what deserves documentation while removing the burden of remembering when.

---

## Solution Implemented

### Three-Layer Hook-Based Automation

#### Layer 1: Session Start Hook (Context Loading)

Runs automatically when a development session starts:

```bash
#!/bin/bash
# session-start-context.sh
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR" || exit 1

# Detect session context
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
LAST_COMMIT=$(git log -1 --pretty=format:'%h - %s (%cr)' 2>/dev/null || echo "No commits")
UNCOMMITTED=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
RECENT_COMMITS=$(git log --since="1 week ago" --oneline 2>/dev/null | wc -l | tr -d ' ')

cat <<EOF
## Session Context

**Branch:** $CURRENT_BRANCH
**Last Commit:** $LAST_COMMIT
**Uncommitted Changes:** $UNCOMMITTED files
**Recent Activity:** $RECENT_COMMITS commits (past week)

### Suggested Actions
EOF

# Branch-aware suggestions
if [[ "$CURRENT_BRANCH" == *"feature"* ]]; then
    echo "- Review implementation patterns for this feature"
elif [[ "$CURRENT_BRANCH" == *"fix"* ]]; then
    echo "- Check debugging lessons for related issues"
fi

# Activity-based reminders
if [ "$RECENT_COMMITS" -gt 10 ]; then
    echo ""
    echo "⚠️ **$RECENT_COMMITS commits in past week** — Consider a session summary"
fi

if [ "$UNCOMMITTED" -gt 0 ]; then
    echo ""
    echo "📝 **$UNCOMMITTED uncommitted files** — Document changes after commit"
fi
```

**What it does:**
- Loads current git state (branch, commits, uncommitted files)
- Suggests queries based on branch naming patterns
- Warns about high activity (session-summary opportunity)
- Reminds about uncommitted files worth documenting

#### Layer 2: Git Commit Hook (Keyword-Based Suggestions)

Runs after every `git commit`, analyzing the message for documentation triggers:

```bash
#!/bin/bash
# post-commit-suggest.sh
COMMIT_MSG=$(git log -1 --pretty=%B)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📚 Documentation Suggestion"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

LESSON_KEYWORDS="fix|solved|debug|implement|refactor|pattern|architecture"
ADR_KEYWORDS="architecture|design|decision|pattern"
GOTCHA_KEYWORDS="gotcha|pitfall|surprising|unexpected|workaround"

if echo "$COMMIT_MSG" | grep -iEq "$LESSON_KEYWORDS"; then
    echo "💡 Lesson-worthy commit detected"
    echo "   Consider: capture-lesson"
fi

if echo "$COMMIT_MSG" | grep -iEq "$ADR_KEYWORDS"; then
    echo "🏛️  Architecture commit detected"
    echo "   Consider: Create ADR in docs/decisions/"
fi

if echo "$COMMIT_MSG" | grep -iEq "$GOTCHA_KEYWORDS"; then
    echo "⚠️  Gotcha detected"
    echo "   Consider: Update knowledge/gotchas"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

**What it does:**
- Analyzes commit message for documentation keywords
- Suggests lesson capture for problem-solving commits
- Suggests ADR creation for architectural decisions
- Suggests gotcha documentation for surprising behavior

#### Layer 3: Documentation Layer

Document the automation pattern itself in the knowledge graph, creating a self-reinforcing system.

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Trigger type | Keyword-based | Commit message keywords reflect user intent; metric-based (file/line counts) creates noise |
| Verbosity | Moderate (3-5 lines) | Enough context to be actionable; not overwhelming |
| Execution | Suggestion-only | Preserves human judgment; hooks suggest, don't force |
| Distribution | Committed to repo | Team-wide consistency; version-controlled |
| Git hooks | Template + installer | Version-controlled templates, manual install to `.git/hooks/` |

---

## Results

**Before:**
- ❌ Manual memory required to invoke documentation skills
- ❌ No context about recent work at session start
- ❌ Easy to forget documentation before context limits
- ❌ No connection between commits and documentation

**After:**
- ✅ Automatic context summary at every session start
- ✅ Smart suggestions based on branch name
- ✅ Proactive warnings about high commit volume
- ✅ Post-commit suggestions for lesson-worthy work

---

## Replication Steps

1. **Create session start hook:**
   - Script that loads git state and suggests queries
   - Register with your platform's hook system
   - Make executable, commit to repo

2. **Create post-commit hook:**
   - Define keyword patterns for your domain
   - Create template in `hooks/post-commit.template`
   - Create installer script: `hooks/install-hooks.sh`

3. **Document the pattern:**
   - Add to knowledge graph
   - Create this lesson for replication

4. **Distribute to team:**
   - Session hooks: committed to repo (load automatically)
   - Git hooks: `./hooks/install-hooks.sh` (manual install)

---

## Lessons Learned

### What Worked Well
- **Boundary-based automation:** Session start and commit time are natural decision points
- **Semi-automatic > fully automatic:** Suggest actions, don't execute them
- **Keyword > metric triggers:** Intent-based signals (commit message) beat indirect metrics (file counts)

### What Didn't Work
- **Full automation of knowledge extraction:** Auto-detecting lessons was too noisy
- **Metric-based triggers:** File/line count thresholds triggered on routine changes

### Common Pitfalls

1. **Auto-invoking skills:** Platform skills are text-based instructions, not callable functions — hooks must *suggest*, not invoke
2. **Metric sensitivity:** Triggering on "3+ files changed" creates noise from routine refactoring
3. **Hook reload timing:** Most platforms load hooks at startup only — changes require restart
4. **Overwhelming suggestions:** Keep to 3-5 lines per suggestion to avoid terminal clutter
5. **Missing git hook install:** Git doesn't commit `.git/hooks/` — team needs to run installer script

---

## External References

Sources consulted while solving this problem:

- **[Git Hooks Documentation](https://git-scm.com/docs/githooks)** — Accessed: 2026-01-03
  - Context: Understanding the lifecycle of git events for automated documentation triggers.
  - Key insight: `post-commit` is the optimal boundary for suggesting documentation capture without interrupting the commit flow.

- **[Shell Scripting Best Practices (Google)](https://google.github.io/styleguide/shellguide.html)** — Accessed: 2026-01-03
  - Context: Ensuring hook scripts are robust and cross-platform compatible.

## Related Documentation

**Knowledge Graph:**
- [Automated Orchestrator](../../knowledge/patterns.md#automated-orchestrator) — The design pattern used for hook execution.
- [Smart Defaults](../../knowledge/patterns.md#smart-defaults) — Philosophy behind making documentation the easiest path.
- [Automation Strategy](../../knowledge/concepts.md#automation-strategy) — High-level goals for project-wide automation.

---

**Version:** 1.0
**Created:** 2026-01-03
**Last Updated:** 2026-02-13
