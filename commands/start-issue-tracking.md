---
description: Initialize issue tracking for a specific problem or enhancement with structured documentation and Git branch creation
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# Start Issue Tracking

**Purpose:** Initialize issue tracking for a specific problem or enhancement, creating structured documentation under the active knowledge graph and a dedicated Git branch.

---

## Command Syntax

```
/kg-sis:start-issue-tracking
/kg-sis:start-issue-tracking <brief-description>
```

**Examples:**
- `/kg-sis:start-issue-tracking`
- `/kg-sis:start-issue-tracking CLI flag parsing fails on quoted args`
- `/kg-sis:start-issue-tracking Add token usage display`

---

## Smart Defaults

**Before (3-5 prompts):**
```
Prompt 1: "Which parent branch?"
Prompt 2: "Version increment path?"
Prompt 3: "Issue type?"
Prompt 4: "Link to issue #?"
Prompt 5: "Push to remote?"
```

**After (1 prompt):**
```
Auto-detect parent from git branch history
Auto-detect version from branch naming pattern
Auto-detect issue type from description keywords
Single prompt: "Create issue/5-slug from main as [Bug/Enhancement], push? (y/n)"
```

**Auto-Detection Logic:**
- **Parent branch:** `git branch --show-current` → find default branch (main/develop)
- **Version:** Read latest tag via `git describe --tags --abbrev=0`
- **Issue type:** Keywords "bug/fix/broken" → Bug; "add/new/enhance" → Enhancement
- **Issue number:** Next sequential from `ls {active_kg_path}/issues/ | sort -V | tail -1`
- **Override:** User can always override any auto-detected value in the single confirmation

---

## When to Use This Command

Use `/kg-sis:start-issue-tracking` when:
- You've identified a bug that needs to be fixed
- You're planning a new feature or enhancement
- You want to document a problem before solving it
- You need to create a handoff for another developer
- You're starting work on a complex issue that needs tracking

**CRITICAL RULE:**
- When creating the GitHub Issue, you **MUST** use the `--body-file` flag to populate the description with your detailed `solution-approach.md`. Never use a manual summary.

**Do NOT use for:**
- Simple typo fixes or trivial changes
- Work that's already complete (use `/kg-sis:capture-lesson` instead)
- General documentation updates (use standard Git workflow)

---

## Step 0: Discourse Capture & Behavior Lock (PRE-FLIGHT)

**Mode: READ-ONLY ANALYSIS.** 

1. **proposal_capture:** Scan the preceding chat history for the "Would you like me to..." proposal. Extract the Logic, Affected Files, and Target Outcome automatically.
2. **behavior_lock:** Explicitly state: *"Establishing safety locks. I will capture your recent proposal into documentation and stop cold before implementation."*
3. **stop_on_error:** Confirm that you will stop after every documentation step to show its work and will NOT proceed to implementation without explicit approval.

---

## Step 1: Verification & Versioning Gate (INTERACTIVE)

### 1.0: Git Authority Check
Run these commands BEFORE asking the user questions:
```bash
git branch -a
git log -n 5
```
**RULE:** The Git branch history is the source of truth for versioning. Ignore stale versioning strings in file headers if they conflict with the branch naming schema.

### 1.1: Versioning Decision
Based on the Git check, ask the user:
```markdown
I detect existing work on [Branch Name]. Is this:

1. [ ] A **New Feature**? (vX.[Minor].0 - New Issue)
2. [ ] A **Patch** to Merged Work? (vX.X.[Patch] - Bug/Correction to Main)
3. [ ] A **WIP Update**? (Continue on existing branch, update existing plan)
4. [ ] A **Hotfix**? (vX.X.X.[Hotfix] - Critical fix to a patch)

Please select the version increment path (1-4):
```

### 1.2: Issue Type
```
6. [ ] 🔧 Refactor - Code restructuring without behavior change
7. [ ] 🛡️ Hardening - Strengthening existing guardrails or validation logic

What type of issue is this?
```

### 1.3: Issue Details
*(Pre-filled from Discourse Capture)*
```
... [same as before] ...
```

**WAIT FOR USER INPUT** before proceeding to Step 2.

---

## Step 2: Determine Issue Number

### 2.1: Check Existing Issues
First resolve the active KG path:
```bash
# Read active KG path from config
KG_PATH=$(python3 -c "import json; d=json.load(open('$HOME/.claude/kg-config.json')); print(d['graphs'][d['active']]['path'])" 2>/dev/null || echo ".")

# List existing issue documentation files
ls -1 "$KG_PATH/issues/" 2>/dev/null | grep -E '^issue-[0-9]+' | sort -V

# OR check enhancement tracker if it exists
ls -1 "$KG_PATH/enhancements/" 2>/dev/null | grep -E '^ENH-[0-9]+' | sort -V
```

### 2.2: Assign Next Number

**POLICY: Identifier Decoupling (Dual-ID Policy)**
- **Local ID (Logical):** `issue-N` or `ENH-NNN`. A sequential count of internal project tasks/folders. This is the **Source of Truth** for the local file system and branch names.
- **GitHub ID (Platform):** `#N`. The serial ID assigned by GitHub.
- **Alignment Rule:** Identity is NOT required (GitHub IDs drift due to PRs/Discussions). **Mapping IS MANDATORY.**
- **Persistence:** The Local ID must be recorded in the GitHub Issue body. The GitHub ID must be recorded in local issue descriptions.

**Confirm with user:**
```
I'll create this as Local ID [Local-ID] (Mapped to GitHub Issue #[N]).
Branch/Plan will follow Local ID: v[Version]-[Local-ID]-[slug]
GitHub Issue Title: [Type] Descriptive Title

Is this mapping correct? (y/n)
```

---

## Step 3: Create Directory Structure

### 3.1: For Bugs/Issues
```bash
# {active_kg_path} = value resolved from ~/.claude/kg-config.json
mkdir -p {active_kg_path}/issues/issue-N/

# Issue will contain:
# - issue-N-description.md (main documentation)
# - solution-approach.md (proposed fixes)
# - test-cases.md (how to test)
# - implementation-log.md (work log)
```

### 3.2: For Enhancements
```bash
# Create enhancement directory for supporting docs
mkdir -p {active_kg_path}/enhancements/ENH-NNN/

# Enhancement supporting docs will contain:
# - ENH-NNN-specification.md (requirements)
# - solution-approach.md (proposed implementation)
# - test-cases.md (acceptance criteria)
# - progress-log.md (work log)

# Main implementation plan will be:
# {active_kg_path}/plans/vX.Y.Z-ENH-NNN-{slug}.md
```

---

## Step 4: Generate Issue Documentation

### 4.1: Implementation Plan Template

Every generated plan MUST include this **Safety Header** and **Atomic Approval Protocol**:

```markdown
# Implementation Plan: [Version]-[ID]-[Slug]

**STATUS:** 🔴 STOPPED (Waiting for Manual Approval of Step 1)
**GOVERNANCE:** Atomic Approval Required (Step-by-Step)
**BEHAVIOR LOCKS:** 
- [x] Zero-Deviation Execution
- [x] Stop-on-Confusion (Interactive Gate)
- [x] Visible Result Validation (Post-Step Tables)

## Execution Protocol
1. **Present Logic:** Before every tool call, state the intended change and logic.
2. **Wait:** Request explicit "YES" to proceed.
3. **Execute:** Run the tool.
4. **Validate:** Display the Validation Check table (see below).

## Recursive Logic Reconciliation (If Applicable)
| Step | Action | Character Budget | Word Budget | Conceptual Redundancy | Status |
|------|--------|------------------|-------------|-----------------------|--------|
| X.Y  | [Task] | 100-210? [ ]     | 350-500? [ ]| No 3+ word repeats? [ ]| [ ]    |
```

---

## Step 5: Git Integration

### 5.1: Create Feature Branch

Create the branch with a descriptive name derived from the issue number and slug:

```bash
git checkout main   # or the project's default branch
git pull
git checkout -b issue/{N}-{slug}
```

**Example:**
```bash
git checkout -b issue/5-cli-flag-parsing
```

### 5.2: Verify Branch Creation

```bash
git branch --show-current
# Expected: issue/5-cli-flag-parsing
```

Optionally create a draft PR on GitHub:
```bash
gh pr create --draft --title "[Bug] Brief descriptive title" \
  --body-file {active_kg_path}/issues/issue-N/solution-approach.md
```

---

## Step 6: Update Issue Tracker & Knowledge Capture

### 6.1: Master Issue Tracker
Add entry to `docs/issue-tracker.md`. 

### 6.2: Knowledge Capture Integration (Delegation)
**Mandatory Question:** *"We just identified [the problem]. Should I run **`/kg-sis:capture-lesson`** now to sync this pattern to the Knowledge Graph before we start the fix?"*

If yes, run it. If no, ensure a task is added to the plan to update the KG after implementation.

### 6.3: Link Solution Approach
The `solution-approach.md` MUST link to the resulting lesson or updated entry in the Knowledge Graph. Use `/kg-sis:link-issue` to create bidirectional references.

### 6.4: Release Documentation Hook
**Mandatory Question:** *"Would you like me to run **`/kg-sis:update-issue-plan`** now to synchronize the ROADMAP and CHANGELOG before I stage and push these initialization files?"*

---

## Step 7: The "Freeze & Document" Termination

**Present summary to user:**

```markdown
✅ **Issue Tracking Initialized**
✅ **Implementation Freeze Engaged**

**Local Issue #N: [Type] Descriptive Title**
- Status: 🔴 ACTIVE (LOCKED)
- Branch: v[Major.Minor.Patch]-[issue N]-brief-slug
- GitHub Issue: #[N] (Reopened/Created)

**Files Created:**
- {active_kg_path}/issues/issue-N/issue-N-description.md
- {active_kg_path}/plans/vX.X.X-issue-N-slug.md

**Logic Sync:**
- [x] Git Authority Validated
- [x] Knowledge Graph Lesson Initialized
```

**CRITICAL TERMINATION:**
*"DOCUMENTATION COMPLETE. I have ENGAGED the implementation freeze. Read the plan at [path] and say 'Execute Step 1' when you have reviewed and approved the logic. I will not proceed until then."*

**STOP.**

---

## Workflow Integration

### For Solo Developers
```
User identifies issue
  ↓
/start-issue-tracking
  ↓
Documentation created in Git
  ↓
Work on fix in feature branch
  ↓
Commit with issue reference
  ↓
Merge to main when complete
```

### For Team Handoffs
```
User identifies issue
  ↓
/kg-sis:start-issue-tracking (creates docs)
  ↓
Docs committed to Git in feature branch
  ↓
Collaborator clones branch
  ↓
Reads issue docs from Git
  ↓
Implements solution with Git commits
  ↓
Updates progress in issue docs
```

---

## Examples

### Example 1: Bug Report

**Input:**
```
/kg-sis:start-issue-tracking CLI flag parsing fails on quoted args
```

**Output:**
- Creates `{active_kg_path}/issues/issue-7/` (supporting docs)
- Creates `{active_kg_path}/plans/v1.2.3-issue-7-cli-flag-parsing.md` (main implementation plan)
- Git branch: `issue/7-cli-flag-parsing`
- Commits and pushes documentation

### Example 2: Enhancement

**Input:**
```
/kg-sis:start-issue-tracking Add token usage display
```

**Output:**
- Creates `{active_kg_path}/enhancements/ENH-001/` (supporting docs)
- Creates `{active_kg_path}/plans/v1.2.3-ENH-001-token-tracking.md` (main implementation plan)
- Git branch: `issue/ENH-001-token-tracking`
- Commits and pushes documentation

---

## Integration with Other Commands

**Before starting work:**
- `/kg-sis:start-issue-tracking` ← Initialize tracking

**During work:**
- `/kg-sis:update-issue-plan` ← Sync plan progress and update GitHub issue
- `/kg-sis:link-issue` ← Link lessons or ADRs to the issue
- Standard Git commits referencing issue number

**After completion:**
- `/kg-sis:capture-lesson` ← Document what was learned
- `/kg-sis:meta-issue` ← Escalate to meta-issue if problem recurs
- Update issue status to ✅ RESOLVED

---

## Troubleshooting

### Problem: Issue number already exists
**Solution:**
```bash
# Check existing issues (replace with your KG path)
ls {active_kg_path}/issues/ | sort -V

# Use next sequential number
```

### Problem: Not sure if this is an issue or enhancement
**Solution:**
- Bug = Something broken
- Enhancement = New feature/improvement
- When in doubt, choose Enhancement

### Problem: Git branch creation fails
**Solution:**
```bash
# Check current branch
git branch

# Make sure you're on main/develop
git checkout main

# Try again
git checkout -b fix/issue-N-description
```

---

## Best Practices

1. **Be Specific:** Issue titles should be clear and descriptive
2. **Document Early:** Create issue docs as soon as problem is identified
3. **Use Branches:** Always create feature branch for issue work
4. **Reference Issues:** Include issue number in all related commits
5. **Update Progress:** Keep issue docs current as work progresses
6. **Link Related:** Connect related issues and enhancements
7. **Test Thoroughly:** Define test cases before implementing solution
8. **Avoiding Interactive Prompts:** Always use `--repo` or push first to ensure `gh` commands don't hang in automated environments.

---

## File Naming Conventions

**Issues:**
- `issue-N-{slug}.md` (e.g., issue-7-json-truncation.md)
- `solution-approach.md`
- `test-cases.md`
- `implementation-log.md`

**Enhancements (supporting docs in {active_kg_path}/enhancements/ENH-NNN/):**
- `ENH-NNN-specification.md` (e.g., ENH-001-specification.md)
- `solution-approach.md`
- `test-cases.md`
- `progress-log.md`

**Main Implementation Plan:**
- `{active_kg_path}/plans/vX.Y.Z-ENH-NNN-{slug}.md`

**Branch Names:**
- For issues: `issue/{N}-{slug}` (e.g., issue/7-cli-flag-parsing)
- For enhancements: `issue/ENH-{NNN}-{slug}` (e.g., issue/ENH-001-token-tracking)

**Main Implementation Plan:**
- For issues: `{active_kg_path}/plans/vX.Y.Z-issue-N-{slug}.md`
- For enhancements: `{active_kg_path}/plans/vX.Y.Z-ENH-NNN-{slug}.md`

---

**Usage:** Type `/kg-sis:start-issue-tracking` when you identify a bug or want to plan an enhancement
**Integration:** Works with `/kg-sis:update-issue-plan`, `/kg-sis:capture-lesson`, `/kg-sis:link-issue`, and `/kg-sis:meta-issue`
