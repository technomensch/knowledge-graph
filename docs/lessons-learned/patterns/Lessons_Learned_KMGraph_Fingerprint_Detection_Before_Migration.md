---
title: "Lesson: KMGraph Fingerprint Detection Before Migration"

created: 2026-04-09T00:00:00Z

author: technomensch

email: 917847+technomensch@users.noreply.github.com

git:
  branch: v0.3.0-beta
  commit: a6aa52f96da7318e1395ac6c02e686f3a7006700
  pr: null
  issue: null

tags: [migration, detection, fingerprint, init, false-positive, docs-folder, patterns]

category: patterns
---

# Lesson Learned: KMGraph Fingerprint Detection Before Migration

**Date:** 2026-04-09
**Category:** patterns
**Version:** 1.0

---

## Problem

When detecting whether an existing `docs/` folder should trigger a migration prompt, checking that the path ends in `/docs` is insufficient. Any project with a Docusaurus, MkDocs, or similar documentation site matches the pattern. The trigger fires on non-KMGraph docs folders, causing a confusing and incorrect migration prompt for users who have no KMGraph data to migrate.

**Context:**
- Migration detection logic in `commands/init.md` (v0.3.0-beta Step 1f.1)
- Triggered when the configured KG path ends in `/docs` or `/docs/`
- Affected any project that uses a standard docs folder for its documentation site

**Impact:**
- Users with Docusaurus/MkDocs/static site `docs/` folders see a misleading migration prompt
- False positive rate is high - virtually any modern project has a `docs/` directory
- Severity: high — incorrect prompts erode user trust and cause confusion on first run

---

## Root Cause

Path pattern matching alone (`ends in /docs`) cannot distinguish KMGraph-managed data from general documentation. A project's `docs/` folder typically contains only HTML, MDX, static assets, and configuration files — not KMGraph-specific subdirectories.

**Analysis:**
1. The detection heuristic was purely name-based: "if the path ends in `/docs`, assume it might be KMGraph data"
2. No identity check was performed to confirm the folder was actually initialized by `kmgraph:init`
3. Standard documentation sites (`docs/`, `doc/`, `documentation/`) are common folder names with no special semantics

**Evidence:**
- Real-world blocker: the 2026-02-17 init session showed that `knowledge/` already existing with non-KMGraph content was a real problem (edge cases E2/E16)
- A docs site like MkDocs Material will have `docs/index.md`, `docs/assets/`, etc. but never `docs/lessons-learned/` or `docs/decisions/`

---

## Solution

Use the presence of KMGraph-specific subdirectories as an identity fingerprint before evaluating migration trigger conditions.

### Implementation

**Approach:**
Before triggering a migration prompt, verify that at least one KMGraph-owned subdirectory exists at the configured path. These subdirectories are created exclusively by `kmgraph:init` and do not appear in standard documentation sites.

**Full trigger conditions (all must be true):**
1. KG type is `project-local`
2. Configured path ends in `/docs` or `/docs/`
3. `docs/lessons-learned/` OR `docs/decisions/` exists at that path

**Key Components:**
1. Check KG type is `project-local` - rules out personal KGs
2. Check path suffix - narrows to the ambiguous `/docs` case
3. Check for fingerprint subdirectory - confirms KMGraph ownership before acting

---

## Verification

**Test Cases:**
1. Project with MkDocs site at `docs/` but no KMGraph init - no migration prompt fires
2. Project with `docs/lessons-learned/` present - migration prompt fires correctly
3. Project with `docs/decisions/` only (lessons dir absent) - migration prompt fires correctly
4. Non-docs path (e.g., `knowledge/`) - unaffected, uses existing path checks

**Results:**
- False positive eliminated: standard docs folders no longer trigger migration
- True positive preserved: initialized KMGraph projects still trigger correctly

---

## Prevention System

**Immediate Prevention:**
- Always check for at least one KMGraph-specific subdirectory before acting on folder name alone
- Document the three-condition trigger rule in `commands/init.md` inline comments

**Systematic Prevention:**
- Apply the fingerprint pattern to any future migration or detection logic in KMGraph commands
- Add the fingerprint check to the init command's pre-flight validation checklist

---

## Replication Pattern

This is a **fingerprint detection pattern** - use domain-specific markers to identify managed data before taking action. Avoids false positives from name collisions.

### For Other Projects

**When to Apply:**
- Any migration or detection step that must identify "is this our data?"
- When folder or file names alone are ambiguous (common names like `docs/`, `config/`, `data/`)
- Before any destructive or prompting action that could confuse users with unrelated content

**Universal Pattern:**
1. Define one or more sentinel markers that are unique to your tool (subdirectories, config files, schema entries)
2. Check for at least one sentinel before triggering any migration, prompt, or destructive operation
3. If no sentinel found, treat the path as unmanaged and skip the action

**Customization Points:**
- Which sentinels to use (subdirectories vs. sentinel files vs. config entries)
- Whether OR logic (any sentinel) or AND logic (all sentinels) is appropriate
- Whether to surface a diagnostic message when sentinels are absent

### Example Application

**Scenario:** A CLI tool needs to detect if a `data/` directory was created by the tool vs. user-created

**Implementation:**
```bash
# Weak check — name collision prone
if [[ -d "./data" ]]; then
  trigger_migration
fi

# Strong check — fingerprint-based
if [[ -d "./data" && (-d "./data/managed-subdir" || -f "./data/.tool-sentinel") ]]; then
  trigger_migration
fi
```

---

## Related Documentation

**Architecture Decisions:**
- ADR-029 — v0.3.0-beta migration architecture

**Other Lessons:**
- [Git Presence Gate in Commands](./Lessons_Learned_Patterns_Git_Presence_Gate_In_Commands.md) — Related pattern: use environmental signals to gate command behavior

**Session Reference:**
- docs/sessions/2026-04/2026-04-09-v0.3.0-beta-implementation-snapshot.md — Implementation context

---

## Lessons & Takeaways

**Key Insights:**
1. Folder names are not identifiers — any tool or convention can use the same name
2. Always define and check domain-specific sentinels before acting on path heuristics
3. The fingerprint pattern is broadly applicable: migration, upgrade, detection, and validation logic all benefit from it

**What Worked:**
- Using subdirectories created exclusively by `kmgraph:init` as the fingerprint
- Requiring all three conditions (type + path suffix + fingerprint) rather than just one

**What Didn't Work:**
- Path suffix matching alone (`ends in /docs`) — too broad, matches any documentation site

**If We Had to Do It Again:**
- Define fingerprint sentinels at tool design time, not as a retrofit
- Document the sentinel contract so future contributors know not to rename or remove these directories

---

**Version:** 1.0
**Created:** 2026-04-09
**Last Updated:** 2026-04-09
