
# Start Issue Tracking

**Purpose:** Initialize issue tracking for a specific problem or enhancement, creating structured documentation under the active knowledge graph and a dedicated Git branch.

---

## Command Syntax

```
/kmgraph:kmg-start-issue-tracking
/kmgraph:kmg-start-issue-tracking <brief-description>
```

**Examples:**
- `/kmgraph:kmg-start-issue-tracking`
- `/kmgraph:kmg-start-issue-tracking CLI flag parsing fails on quoted args`
- `/kmgraph:kmg-start-issue-tracking Add token usage display`

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

Use `/kmgraph:kmg-start-issue-tracking` when:
- You've identified a bug that needs to be fixed
- You're planning a new feature or enhancement
- You want to document a problem before solving it
- You need to create a handoff for another developer
- You're starting work on a complex issue that needs tracking

**CRITICAL RULE:**
- When creating the GitHub Issue, you **MUST** use the `--body-file` flag to populate the description with your detailed `solution-approach.md`. Never use a manual summary.

**Do NOT use for:**
- Simple typo fixes or trivial changes
- Work that's already complete (use `/kmgraph:kmg-capture-lesson` instead)
- General documentation updates (use standard Git workflow)

---

## Step 0: Discourse Capture & Behavior Lock (PRE-FLIGHT)

**Mode: READ-ONLY ANALYSIS.** 

1. **proposal_capture:** Scan the preceding chat history for the "Would you like me to..." proposal. Extract the Logic, Affected Files, and Target Outcome automatically.
2. **behavior_lock:** Explicitly state: *"Establishing safety locks. I will capture your recent proposal into documentation and stop cold before implementation."*
3. **stop_on_error:** Confirm that you will stop after every documentation step to show its work and will NOT proceed to implementation without explicit approval.

4. **Snapshot gate:** After behavior lock, ask:

   > "Before documenting this issue — want to run a session summary first?
   > This saves the current session state as a persistent summary and preserves context about what you were working on when you found this.
   >
   > [y] Run session summary   [n] Skip   [?] What does this do?"

   If `?`: explain that this runs `/kmgraph:kmg-session-summary` in snapshot mode — a lightweight variant that records what was worked on, open plan items, and file changes without requiring a full wrap-up. The result is written to disk and used to enrich the issue's context.

   If `y`: ask "Include git history? (adds ~5-15 sec) [y] Yes   [n] No — conversation + files only"

   Invoke `session-summary-agent --snapshot` (with `--git` if yes). When the agent returns, say:

   > "Session summary saved — I'll use that to fill in the issue's context and background."

   Then continue to Step 1.

   If `n`: proceed to Step 0.5.

---

## Step 0.5: Mode Selection Gate

After the snapshot gate, present this question and **wait for the user's answer** before proceeding:

> "Issue scope identified. Choose workflow:
>
> **[1] Track then Implement** *(default)*
> Creates issue docs + branch, then you implement.
> Best for: unknown scope, needs planning, multi-phase work.
>
> **[2] Implement then Track**
> Fix already exists or is trivial. Commits fix first, then generates docs retroactively referencing the fix commit.
> Best for: one-line fixes, hot patches, changes already in working tree.
>
> **[3] Track only** *(defer implementation)*
> Creates issue docs + GitHub issue. No branch created. Adds to backlog.
> Best for: deferred work, triage, reporting bugs you won't fix now."

Store `{workflow_mode}` = 1, 2, or 3.

- **Mode 1:** Continue to Step 0.6, then Step 1 as normal. At Step 7 exit, prompt "Proceed to implementation now? [y/N]" — if N, set `status: tracked-not-implemented` in issue frontmatter.
- **Mode 2:** Continue to Step 0.6 (pre-flight check is mandatory for this mode). After pre-flight, commit any existing implementation changes first, then generate docs retroactively with fix commit hash recorded.
- **Mode 3:** Skip Step 1.3 (branch strategy — no branch needed). At Step 7 exit, set `status: deferred` in issue frontmatter.

**WAIT FOR USER ANSWER before proceeding to Step 0.6.**

---

## Step 0.6: Pre-flight Working-Tree Check

**CONDITIONAL:** Only run if `{git_available} = true`. Skip entirely if no Git repo.

Run:
```bash
git status --porcelain
git diff --stat HEAD
```

If **no uncommitted changes exist:** proceed to Step 1.

If **uncommitted changes exist:**
- Display: "⚠️ Uncommitted changes detected in working tree."
- List the modified files
- Ask: "Do these changes relate to the issue being tracked?
  **[y]** Yes — commit as implementation before tracking
  **[n]** No — unrelated, continue
  **[?]** Not sure — show me the diff"

If `?`: show `git diff --stat HEAD` and re-ask.

If `y`: commit the changes with message `fix([scope]): [brief description] — implementation prior to tracking`, then proceed to Step 1.

If `n`: proceed to Step 1.

**MANDATORY GATE: Do not proceed to Step 1 until user responds. Silence is not a valid answer — wait.**

---

## Step 1: Verification & Versioning Gate (INTERACTIVE)

### 1.0: Git Authority Check
Run these commands BEFORE asking the user questions:
```bash
git rev-parse --is-inside-work-tree 2>/dev/null && echo "GIT_PRESENT" || echo "NO_GIT"
git branch -a
git log -n 5
```

**Git presence gate:** If the first command returns `NO_GIT`, store `{git_available} = false`. In this state:
- Skip all Git-related questions in Step 1.3 (branch strategy is irrelevant — skip or auto-answer "N/A")
- Skip Step 5 entirely
- Omit Git rows from the Step 7 summary

If Git is present, store `{git_available} = true` and proceed normally.

**RULE:** The Git branch history is the source of truth for versioning. Ignore stale versioning strings in file headers if they conflict with the branch naming schema.

**Active branch check:** After running git commands (when `{git_available} = true`), check if current branch is NOT `main` (or the project default). If so, display this notice **before** presenting the Step 1.1 versioning prompt — it primes the user before they make versioning decisions:

```
⚠️  You are currently on branch **[current_branch]**, not main.

This means you're likely mid-implementation on existing work.
The versioning and branch decisions below apply to the *new* issue, not [current_branch].

Keep in mind: you'll be asked at Step 5 whether to create a new branch now or document-only and stay on [current_branch].
```

Store `{active_work_guard_triggered} = true` if current branch ≠ main, for use in Step 6.2.

### 1.1: Type
Ask only this question and wait for the answer before proceeding:

> "What type of issue is this? Bug / Enhancement / Refactor / Hardening"

**WAIT FOR USER ANSWER. Do not ask 1.2 until answer is received.**

### 1.2: Version Impact
Ask only this question and wait for the answer before proceeding:

> "Version impact — what version increment does this require?
> - **New minor** (e.g., v0.5.x → v0.6.0) — a new feature or significant behavior change. Bumps the third segment, resets lower segments.
> - **Patch** (e.g., v0.5.8 → v0.5.9) — a small fix *or* a small enhancement on an already-released version. Bumps the patch segment. (Patch is not bug-only — enhancements that don't change major behavior also belong here.)
> - **WIP append** — folded into a version branch already in progress; no new version number is minted. Use when the work ships as part of an unreleased branch.
> - **Hotfix** (e.g., v0.5.8 → v0.5.8.1) — an urgent fix to an already-released version. Adds/bumps a fourth segment.
>
> (This project uses a pre-1.0 four-segment scheme — `major.minor.patch.hotfix`. There is no 'major' / v1.0.0 increment yet; if your change feels major, choose **New minor**.)"

**WAIT FOR USER ANSWER. Do not ask 1.3 until answer is received.**

### 1.3: Branch
Ask only this question and wait for the answer before proceeding:

> "Branch strategy? New branch / Stay on current / Defer branch creation"

**WAIT FOR USER ANSWER. Do not ask 1.4 until answer is received.**

### 1.4: Plan
Ask only this question and wait for the answer before proceeding:

> "Plan approach? New plan / Append to existing / Document-only"

**WAIT FOR USER ANSWER.**

### After All Four Answers Received
State your assumptions clearly based on all four answers, then ask:

> "Here's what I'll do: [summarize type, version path, branch strategy, plan approach]. Confirm? (y/n)"

Do not write any files or create any directories until the user confirms.

**WAIT FOR USER CONFIRMATION before proceeding to Step 2.**

---

## Step 2: Determine Issue Number

### 2.1: Check Existing Issues
First resolve the target graph (issue-41: this previously read
`d['graphs'][d['active']]['path']` via a raw `python3 -c` one-liner — a pre-ADR-067
pattern; against a real, correctly-migrated config this silently resolved into whatever
project `.active` happened to point at, not the current one, since the field no longer
tracks the current project at all):

```
kg_resolve
```

Take the returned `path` as `$KG_PATH` below.

```bash
# List existing issue documentation files
ls -1 "$KG_PATH/issues/" 2>/dev/null | grep -E '^issue-[0-9]+' | sort -V

# OR check enhancement tracker if it exists
ls -1 "$KG_PATH/enhancements/" 2>/dev/null | grep -E '^ENH-[0-9]+' | sort -V
```

### 2.2: Assign Next Number

**Cross-branch collision check:**

After calculating the next number from the directory listing, verify it is not already taken on any other branch:

For issues:
```bash
git log --all --oneline -- "issues/issue-{N}*" 2>/dev/null
```

For enhancements:
```bash
git log --all --oneline -- "enhancements/ENH-{NNN}*" 2>/dev/null
```

- If the command returns no output: number is clean — proceed.
- If the command returns results: another branch has already used that number. Increment by 1 and re-run the check. Repeat until a clean number is found.
- If git is unavailable: skip this check and proceed with the calculated number.

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
# {active_kg_path} = value resolved from ~/.kmgraph/kg-config.json
mkdir -p {active_kg_path}/issues/issue-N/

# Issue will contain:
# - issue-N-description.md (main documentation)
# - solution-approach.md (proposed fixes)
# - test-cases.md (how to test)
# - implementation-log.md (work log)
```

**Required frontmatter for `issue-N-description.md`:**
```yaml
---
id: issue-N
type: [Bug|Enhancement|Refactor|Hardening]
status: [tracked|in-progress|implemented|deferred|tracked-not-implemented]
github-issue: "#N"
branch: [branch-name or "none"]
created: YYYY-MM-DD
---
```

Set initial `status` based on `{workflow_mode}`:
- Mode 1: `tracked`
- Mode 2: `implemented`
- Mode 3: `deferred`

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

**STATUS:** 🔴 AWAITING APPROVAL (Waiting for Manual Approval of Step 1)
<!-- STATUS transitions happen only when kmg-execute-plan's 8-step protocol actually
     runs, i.e. Gemini/Antigravity sessions: its Step 1 rewrites this line to
     🟡 IN PROGRESS on approval, its Step 7 to ✅ COMPLETE on verified completion.
     Under Claude Code the skill's Platform Guard exits before Step 1, so a
     Claude Code-run plan gets NO automatic transition — update this line by hand. -->
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

**CONDITIONAL:** Only execute this step if `{git_available} = true`. If the project has no Git repository, skip this step entirely — no branch is needed and no Git commands should run.

### 5.0: Create GitHub Issue

After documentation is generated (Step 4), create the GitHub issue immediately so the
issue number can be captured and written to the spec frontmatter before branch creation.

Determine label based on `{issue_type}`:
- Bug → `--label bug`
- Enhancement → `--label enhancement`
- Refactor / Hardening → `--label enhancement`
- All other types → `--label enhancement` (default fallback)

```bash
ISSUE_URL=$(gh issue create \
  --title "[{issue_type}] {issue_title}" \
  --body-file {active_kg_path}/issues/issue-N/issue-N-description.md \
  --label {label})
[ -n "$ISSUE_URL" ] || { echo "ERROR: gh issue create failed — check gh auth and remote"; exit 1; }
GITHUB_ISSUE_NUM=$(basename "${ISSUE_URL}")
echo "GitHub Issue created: #${GITHUB_ISSUE_NUM} — ${ISSUE_URL}"
```

Write issue number back to spec frontmatter immediately:

For bugs/issues (`{active_kg_path}/issues/issue-N/issue-N-description.md`):
```bash
SPEC={active_kg_path}/issues/issue-N/issue-N-description.md
sed -i.bak -E "s/github-issue: (null|\"TBD\"|\"#N\")/github-issue: \"#${GITHUB_ISSUE_NUM}\"/" \
  "${SPEC}" && rm "${SPEC}.bak"
grep -E "github-issue: \"#[0-9]+\"" "${SPEC}" || \
  { echo "ERROR: write-back failed — issue #${GITHUB_ISSUE_NUM} created on GitHub. Update frontmatter manually."; exit 1; }
```

For enhancements (`{active_kg_path}/enhancements/ENH-NNN/ENH-NNN-specification.md`):
```bash
SPEC={active_kg_path}/enhancements/ENH-NNN/ENH-NNN-specification.md
sed -i.bak -E "s/github-issue: (null|\"TBD\"|\"#N\")/github-issue: \"#${GITHUB_ISSUE_NUM}\"/" \
  "${SPEC}" && rm "${SPEC}.bak"
grep -E "github-issue: \"#[0-9]+\"" "${SPEC}" || \
  { echo "ERROR: write-back failed — issue #${GITHUB_ISSUE_NUM} created on GitHub. Update frontmatter manually."; exit 1; }
```

Store `{github_issue_num}` for use in Step 5.2.

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
gh pr create --draft \
  --title "[{issue_type}] {issue_title}" \
  --body "$(cat {active_kg_path}/issues/issue-N/solution-approach.md)

Closes #{github_issue_num}"
```

---

## Step 6: Update Issue Tracker & Knowledge Capture

### 6.1: Master Issue Tracker

There is no single master tracker file in this repo (issue-26) — the real, already-maintained convention is the two per-type index files. Add one line to the correct index for `{issue_type}`:

- Issues → `{active_kg_path}/issues/README.md`
- Enhancements → `{active_kg_path}/enhancements/README.md`

Match the exact style of the most recent entry in that file (newest-first list):
```
- [{id}: {Title}]({folder}/{id}-description.md) — **Status:** {status-emoji} {Status} — {one-line summary}
```

If that README declares a "Total X" count, increment it too. 

### 6.2: Knowledge Capture Integration (Delegation)

**If `{active_work_guard_triggered}` is true** (issue identified during active implementation on a non-main branch):

> "This issue was identified during active implementation on **[current_branch]**. Capturing a lesson before starting is strongly recommended — it preserves the context of how you found this while it's fresh.
>
> Run `/kmgraph:kmg-capture-lesson` now? **(yes / defer to plan)**"

**MANDATORY GATE: Do not proceed to Step 7 until the user responds to this question. "yes" and "defer to plan" are both valid answers. Silence is not a valid answer — wait.**

If deferred: add a task to the implementation plan: "Capture lesson: [issue description] — identified during [current_branch] work."

**If `{active_work_guard_triggered}` is false** (issue identified from main or a clean state):

> "We just identified [the problem]. Should I run `/kmgraph:kmg-capture-lesson` now to sync this pattern to the Knowledge Graph before we start the fix? **(yes / no)**"

**MANDATORY GATE: Do not proceed to Step 7 until the user responds to this question. "yes" and "no" are both valid answers. Silence is not a valid answer — wait.**

If yes, run it. If no, ensure a task is added to the plan to update the KG after implementation.

### 6.3: Link Solution Approach
The `solution-approach.md` MUST link to the resulting lesson or updated entry in the Knowledge Graph. Use `/kmgraph:kmg-link-issue` to create bidirectional references.

### 6.4: Release Documentation Hook
**Mandatory Question:** Present this question and wait for a user response:

> "Would you like me to run **`/kmgraph:kmg-update-issue-plan`** now to synchronize the ROADMAP and CHANGELOG before I stage and push these initialization files? **(yes / no)**"

**MANDATORY GATE: Do not proceed to Step 7 until the user responds to this question. "yes" and "no" are both valid answers. Silence is not a valid answer — wait.**

---

## Step 7: The "Freeze & Document" Termination

**Present summary to user:**

```markdown
✅ **Issue Tracking Initialized**
✅ **Implementation Freeze Engaged**

**Local Issue #N: [Type] Descriptive Title**
- Status: 🔴 ACTIVE (LOCKED)
- Branch: v[Major.Minor.Patch]-[issue N]-brief-slug   ← omit if {git_available} = false
- GitHub Issue: #[N] — created at Step 5.0 (gh issue create)   ← omit if {git_available} = false

**Files Created:**
- {active_kg_path}/issues/issue-N/issue-N-description.md
- {active_kg_path}/plans/vX.X.X-issue-N-slug.md

**Logic Sync:**
- [x] Git Authority Validated   ← show as "N/A — no Git repo" if {git_available} = false
- [x] Knowledge Graph Lesson Initialized
```

**Mode-aware status and follow-through:**

- **Mode 1:** Ask: "Proceed to implementation now? [y/N]"
  - If `y`: set `status: in-progress` in issue frontmatter; hand off to implementation
  - If `n`: set `status: tracked-not-implemented` in issue frontmatter
- **Mode 2:** Set `status: implemented` (fix already committed)
- **Mode 3:** Set `status: deferred` (no branch, no implementation planned)

**Exit handoff banner** (always display after summary):

```
Next actions:
  → To implement now:     say "Execute Step 1" or start implementation
  → To update progress:   /kmgraph:kmg-update-issue-plan
  → To capture learning:  /kmgraph:kmg-capture-lesson
  → To defer:             issue is flagged status: deferred
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
/kmgraph:kmg-start-issue-tracking (creates docs)
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
/kmgraph:kmg-start-issue-tracking CLI flag parsing fails on quoted args
```

**Output:**
- Creates `{active_kg_path}/issues/issue-7/` (supporting docs)
- Creates `{active_kg_path}/plans/v1.2.3-issue-7-cli-flag-parsing.md` (main implementation plan)
- Git branch: `issue/7-cli-flag-parsing`
- Commits and pushes documentation

### Example 2: Enhancement

**Input:**
```
/kmgraph:kmg-start-issue-tracking Add token usage display
```

**Output:**
- Creates `{active_kg_path}/enhancements/ENH-001/` (supporting docs)
- Creates `{active_kg_path}/plans/v1.2.3-ENH-001-token-tracking.md` (main implementation plan)
- Git branch: `issue/ENH-001-token-tracking`
- Commits and pushes documentation

---

## Integration with Other Commands

**Before starting work:**
- `/kmgraph:kmg-start-issue-tracking` ← Initialize tracking

**During work:**
- `/kmgraph:kmg-update-issue-plan` ← Sync plan progress and update GitHub issue
- `/kmgraph:kmg-link-issue` ← Link lessons or ADRs to the issue
- Standard Git commits referencing issue number

**After completion:**
- `/kmgraph:kmg-capture-lesson` ← Document what was learned
- `/kmgraph:kmg-meta-issue` ← Escalate to meta-issue if problem recurs
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

**Usage:** Type `/kmgraph:kmg-start-issue-tracking` when you identify a bug or want to plan an enhancement
**Integration:** Works with `/kmgraph:kmg-update-issue-plan`, `/kmgraph:kmg-capture-lesson`, `/kmgraph:kmg-link-issue`, and `/kmgraph:kmg-meta-issue`
