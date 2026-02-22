---
title: "Lesson: Both LLM Models Missed Directory Structure Change"
created: 2026-02-16T00:00:00Z
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: main
  commit: 37f7e544e5b3b2f1c9a7d5e3f1b9a7c5e3f1b9a7
  pr: null
  issue: null
sources: []
tags: [patterns, llm-assistance, ai-limitations, code-review]
category: patterns
---

# Lesson Learned: Both LLM Models Missed Directory Structure Change

**Date:** 2026-02-16
**Category:** patterns
**Version:** 1.0

---

## Problem

A significant directory structure refactoring was planned (moving files from one location to another). Both Claude Sonnet 4.5 and Claude Opus 4.6 failed to recognize this change in initial code generation proposals. The models produced code referencing old paths despite being shown the new structure.

**Context:**
- Project: Knowledge Graph plugin v0.0.1-v0.0.2 refactoring
- Change: Directory reorganization
- Models: Claude Sonnet 4.5 and Claude Opus 4.6 (both concurrent sessions)
- Result: Both generated code with outdated path references

---

## Root Cause

LLMs operate with stateless context windows. Even when shown directory structure diagrams or file listings:
1. Models don't maintain state across long conversations
2. Context pruning during long sessions loses early structural details
3. Code generation happens from learned patterns, not always from current context
4. Both Sonnet and Opus share similar underlying training, so systematic biases affect both equally

**Technical Detail:**
- When files from multiple directories are in context, models still generate patterns from training data
- Training data may include old directory structures or patterns
- Without continuous reinforcement in context, models revert to learned patterns

---

## Solution Implemented

**Multi-Layer Validation:**

1. **Before code generation:**
   - Provide complete, explicit directory listing
   - Ask model to acknowledge specific file paths
   - Have model restate directory structure

2. **After code generation:**
   - Review all file paths in proposals
   - Run `grep` to find path references
   - Cross-check against actual repository structure
   - Do NOT assume correctness

3. **Documentation:**
   - Maintain `.claude/project-structure.md` with canonical paths
   - Reference this file in prompts for code generation

---

## Evidence

**Observation:** When both concurrent models (working independently) make the same systematic error, it indicates:
- Shared training data influencing both equally
- Learned pattern stronger than context guidance
- Need for explicit validation rather than trust

---

## Replication Pattern

**For AI-Assisted Code Generation:**

1. **Don't assume understanding:** Even if you show the structure, ask the model to confirm
2. **Validate output:** Always check file paths, imports, references against reality
3. **Iterate if needed:** If model's output has path errors, provide corrected paths and ask for regeneration
4. **Plan for this:** Budget time for review/correction of AI-generated code

**Prevention:**
- Keep project structure file updated and reference it prominently
- Add step in code generation prompts: "Confirm these exact paths exist..."
- Create pre-commit hook to validate imports/paths match repository

---

## Lessons & Takeaways

**Key Insights:**
1. LLMs don't truly "understand" directory structure; they pattern-match
2. Both models trained on similar data, so systematic errors often occur together
3. AI-generated code requires structural validation, not just logical review

**What Didn't Work:**
- Showing diagrams and assuming models understood them
- Trusting that context-provided paths would be used over learned patterns
- Not validating output before trusting it

**If We Had to Do It Again:**
- Provide canonical structure doc BEFORE asking for any code generation
- Ask model to explicitly acknowledge each path before generating code
- Have model generate a checklist of files it will create/modify before writing code

---

## Related ADRs

- [ADR-001: Centralized Multi-KG Configuration](../../decisions/ADR-001-centralized-multi-kg-configuration.md) — Directory structure decisions
- [ADR-002: Commands vs Skills Architecture](../../decisions/ADR-002-commands-vs-skills-architecture.md) — File organization pattern

---

**Version:** 1.0
**Created:** 2026-02-16
**Last Updated:** 2026-02-22
