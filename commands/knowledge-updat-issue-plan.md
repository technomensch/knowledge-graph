---
description: Synchronize Knowledge Graph extraction with active plans and local/GitHub issue tracking
---

# Governance Synchronization Workflow

This workflow ensures that insights extracted from the Knowledge Graph are properly reflected in the current implementation plan and categorized correctly in local and GitHub issue trackers.

---

## Usage

```bash
/knowledge:update-issue-plan
/knowledge:update-issue-plan --auto           # Skip confirmation prompts
/knowledge:update-issue-plan --pr=<number>    # Sync to specific PR
```

**Parameters:**
- `--auto` (optional): Skip decision gates (use with caution)
- `--pr` (optional): Specify PR number for description update

---

## Step 1: Institutional Knowledge Extraction

1. **Trigger:** Run `/knowledge:update-graph`.
2. **Analysis:** Review the extracted patterns or lessons.
3. **Identification:** Identify the **Primary Lesson** that prompted this sync (e.g., "Active Enforcement Failure").

---

## Step 2: Active Plan Synchronization

1. **Locate Plan:** Open the currently "Active" or "Planning" document in `{active_kg_path}/plans/` (e.g., `v2.1-feature-implementation.md`).
2. **Update Metadata:** Ensure the `GitHub Continuations` and `Status` lines are current.
3. **Inject Insights:** Add a "Lessons Learned Integration" section to the plan, linking the specific Knowledge Graph entry to the proposed change.

**Example:**
```markdown
## Lessons Learned Integration

**From KG Entry:** [Three-Tier Sync Pattern](../knowledge/patterns.md#three-tier-sync)

**Relevance to v2.1:**
- Step 3 (Configuration Sync) directly applies to config management
- Prevents configuration drift between development and production
- See lesson: [Configuration Sync Implementation](../lessons-learned/architecture/config-sync.md)
```

---

## Step 3: Local Issue Management

1. **Audit:** Find the `Local Issue ID` defined in the active plan (e.g., `issue-42`).
2. **Update:** Open `{active_kg_path}/issues/[ID].md` and append progress, blocking issues, or new verification requirements discovered during knowledge extraction.
3. **Decision Gate:**
   - If the new insight represents a *separate* scope or a new bug:
     - **STOP:** Ask user: **"A new discovery has been made: [Description]. Should I create a new local issue for this, or continue updating [Current ID]?"**
     - If yes, initialize the new issue via `/knowledge:start-issue-tracking`.

**Update format:**
```markdown
## Progress Update: [Date]

**KG Insights:**
- Extracted: [Pattern Name] to patterns.md
- Linked lesson: [Lesson Title](path/to/lesson.md)
- Applicability: [How this impacts current implementation]

**Blocking Issues:** [None | Description]
**Verification Requirements:** [Updated test criteria]
```

---

## Step 4: GitHub Linkage & Sync

### 4.1: Map Local to Remote

1. **Identify Mapping:** Map the Local ID to the GitHub Issue number using the `{active_kg_path}/issue-tracker.md` or the `GitHub Continuations` metadata in the plan.
   - *Note: GitHub #[ISSUE_ID] might map to Local [LOCAL_ID]. Do not assume identical numbering.*
2. **Status Check:** Check the remote status of the linked GitHub issue(s).

### 4.2: Generate PR Description with Lessons

If a PR exists for the current branch:
1. **Scan lessons:** Find all lessons created/updated on this branch
   ```bash
   git log --name-only --pretty=format: origin/main..HEAD | grep "lessons-learned/" | sort -u
   ```
2. **Generate PR section:**
   ```markdown
   ## Related Lessons

   - [Configuration Sync Implementation](docs/lessons-learned/architecture/config-sync.md) - Three-tier sync pattern
   - [Error Handling Best Practices](docs/lessons-learned/process/error-handling.md) - Graceful degradation
   ```
3. **Update PR description:** Append section via `gh pr edit [number] --body-file -`

### 4.3: Update Remote Issue

1. **Generate summary:** Compile local progress and lessons learned
2. **Post comment:**
   ```bash
   gh issue comment [N] --body "$(cat <<'EOF'
   ## Knowledge Sync Update

   **Lessons Captured:**
   - [Lesson Title](link-to-file) - Brief description

   **KG Entries:**
   - [Pattern Name](link-to-kg-entry#section)

   **Plan Status:** v2.1 - Step 3 in progress

   **Local Issue:** [LOCAL_ID] (updated)
   EOF
   )"
   ```

### 4.4: Decision Gate

- If the local work has diverged or requires a new branch/issue on GitHub:
  - **STOP:** Ask user: **"The local implementation now addresses [Topic]. Should I initialize a new GitHub issue for this continuation?"**

---

## Step 5: Final Governance Audit

1. **Shadow Sync:** If project uses modular configuration sync, run project-specific governance tools to ensure configuration files acknowledge the new issue/plan status.
2. **Close Loop:** Output a **Governance Sync Summary Table**:

| Component | Target ID/File | Status |
| :--- | :--- | :--- |
| Knowledge | [Entry Name] | Linked |
| Plan | [vX.Y.Z] | Updated |
| Local | [LOCAL_ID] | Updated |
| GitHub | [#[ISSUE_ID]] | Commented |
| PR | [#[PR_ID]] | Description updated (if applicable) |

---

## PR Integration Features (Enhanced)

### Auto-Generate PR Descriptions

When creating a PR (or updating an existing one):
1. **Scan lessons** created on this branch
2. **Extract metadata** from lesson frontmatter (branch, commit, PR, issue)
3. **Generate "Related Lessons" section** with links to lesson files
4. **Append to PR description** automatically

**Example Output:**
```markdown
## Related Lessons

This PR implements patterns documented in the following lessons:

- [Three-Tier Sync Implementation](docs/lessons-learned/architecture/three-tier-sync.md) (PR #[PR_ID], Issue #[ISSUE_ID])
  - Category: architecture
  - Pattern: Multi-tier configuration synchronization

- [Error Handling Best Practices](docs/lessons-learned/process/error-handling.md) (PR #[PR_ID], Issue #[ISSUE_ID])
  - Category: process
  - Pattern: Graceful degradation with fallbacks
```

### Link PRs Back to Lessons

When a PR is merged:
1. **Update lesson metadata** with PR status: `pr_status: merged`
2. **Update KG entry** with PR reference
3. **Post final comment** to GitHub issue: "✅ Lesson documented in [link]"

---

## GitHub-Optional Mode

If GitHub CLI (`gh`) is not installed or no remote is configured:
- Steps 1-3 execute (local knowledge sync)
- Step 4 (GitHub linkage) is skipped with warning
- Step 5 governance audit still runs

**Graceful degradation:** The skill works fully for local-only or non-GitHub projects.

---

## Multi-KG Support

When multiple knowledge graphs are configured:
- Reads active KG from `~/.claude/kg-config.json`
- Plans and issues stored in `{active_kg_path}/plans/` and `{active_kg_path}/issues/`
- Use `/knowledge:switch` to change active KG before syncing

---

## Integration with Other Skills

- `/knowledge:update-graph` — Triggers Step 1 (knowledge extraction)
- `/knowledge:sync-all` — Calls this skill as part of full sync pipeline
- `/knowledge:capture-lesson` — Lessons sync here for plan integration
- `/knowledge:start-issue-tracking` — Creates new issues from decision gates

---

## Example Workflow

```bash
# 1. Extract insights from lesson
/knowledge:update-graph

# 2. Sync to plan and issues
/knowledge:update-issue-plan

# Output:
# Governance Sync Summary Table
# | Component | Target ID/File           | Status    |
# | Knowledge | Three-Tier Sync Pattern  | Linked    |
# | Plan      | v2.1                     | Updated   |
# | Local     | [LOCAL_ID]               | Updated   |
# | GitHub    | #[ISSUE_ID]              | Commented |
# | PR        | #[PR_ID]                 | Desc updated |
```

---

**Created:** 2026-02-12
**Version:** 1.0 (Plugin version with PR integration)
**Purpose:** Five-step governance loop for knowledge → plan → issue → GitHub synchronization
