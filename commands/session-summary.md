---
description: Create a summary of the current active chat session
---

# session-summary

Automatically document the current Claude Code session before context limits or at major milestones.

---

## Description

This skill analyzes the current chat context to extract and document:
- What was built or modified
- Decisions made and why
- Problems solved
- Lessons learned
- Files touched
- Commits created

**Purpose:** Preserve session context for future reference and onboarding.

**When to use:**
- Before hitting context limits (~190K tokens)
- After completing major features
- At end of significant debugging sessions
- When switching between unrelated tasks

---

## Usage

```bash
/kmgraph:session-summary
/kmgraph:session-summary --title="Custom Title"
/kmgraph:session-summary --auto
```

**Parameters:**
- `--title` (optional): Custom title for session (default: auto-generated)
- `--auto` (optional): Skip confirmation, auto-generate and save

**Examples:**
```bash
/kmgraph:session-summary
/kmgraph:session-summary --title="Memory System Design"
/kmgraph:session-summary --auto
```

---

## Smart Defaults

**Before (3 prompts):**
```
Prompt 1: "Which session to summarize?"
Prompt 2: "Include git history?"
Prompt 3: "Update knowledge graph?"
```

**After (1 prompt):**
```
Auto-detect current session from .claude/sessions/
Auto-include git since last summary
Single prompt: "Summarize session with 3 commits, sync KG? (y/n)"
```

**Auto-Detection Logic:**
- **Session scope:** All conversation context since last `/kmgraph:session-summary`
- **Git history:** `git log --since="[last session]" --oneline` (auto-included)
- **KG sync:** If new patterns discovered → auto-suggest sync
- **Conflict resolution:** Auto-detect existing file for today → offer append
- **Override:** User can provide `--title` for custom naming

---

## Execution Steps

### Step 1: Analyze Chat Context

**Extract from conversation:**

1. **Files modified/created:**
   - Look for Read/Edit/Write tool calls
   - Track: file paths, operation type (create/modify/read)
   - Count total modifications vs reads

2. **Git operations:**
   - Look for Bash tool calls with git commands
   - Extract: commits (hash + message), branches, pushes
   - Track current branch

3. **Problems discussed:**
   - Identify issue descriptions from user messages
   - Extract problem statements and symptoms

4. **Solutions implemented:**
   - Track resolution approaches mentioned
   - Code changes made
   - Tools/scripts created

5. **Decisions made:**
   - Extract architectural choices from conversation
   - Look for "decision", "chose", "selected" keywords
   - Capture rationale when provided

6. **Questions answered:**
   - Note clarifications provided by user
   - Track requirements gathered

**Context window analysis:**
```
Current tokens: ~150K / 200K
Recommendation: Create summary now? [y/n]
```

### Step 2: Auto-Detect Session Type

**Classification logic:**

| Type | Indicators |
|------|-----------|
| **Feature Development** | New files created, significant code additions, feature branch |
| **Bug Fix** | "bug", "fix", "error" in messages, specific issue resolution |
| **Refactoring** | Code modifications without behavior change, "refactor" keyword |
| **Planning** | Read-only mode, no code changes, planning documents created |
| **Documentation** | Only .md files modified, docs/ directory updates |

**Default:** Feature Development (if mixed indicators)

### Step 3: Generate Summary Structure

**Auto-generate based on type:**

**Action:**
Read and use the following template

```markdown
# Session: [Auto-Generated Title]

**Date:** YYYY-MM-DD
**Type:** [Feature | Bug Fix | Refactoring | Planning | Documentation]
**Duration:** ~X hours (based on timestamps)
**Status:** [In Progress | Completed | Paused]

---

## Session Overview

[2-3 sentence auto-generated summary]

## What We Built

[List of artifacts created/modified]

## Decisions Made

[Extracted decisions with rationale]

## Problems Solved

[Problem → Solution pairs]

## Files Touched

**Modified:** [list]
**Read:** [list]

## Commits Created

[commit hashes and messages]

## Lessons Learned

[Key takeaways]

## Next Steps

[Inferred or ask user]

## Related Resources

[Auto-link to ADRs, lessons, plans]

---

**Session Stats:**
- Files modified: X
- Files read: Y
- Commits: Z
- Tokens used: ~XXK
```


### Step 4: Present Draft to User

**Interactive confirmation (unless --auto):**

```markdown
I've analyzed this session and generated the following summary:

**Session Title:** Memory System Design & Planning
**Type:** Planning
**Duration:** ~2 hours (based on timestamps)
**Files Touched:** 15+ files read, 16 created (Phase 1)

**What We Built:**
- Comprehensive Local Memory & Learning System design
- Four-pillar architecture (lessons, decisions, knowledge, sessions)
- 16 files created (1,085 lines) - directory structure and templates

**Decisions Made:**
1. Use categorized lessons-learned structure (architecture/debugging/process/patterns)
2. Implement ADRs with sequential numbering (001-999)
3. Knowledge graph as quick-reference, not full graph database
4. Month-based session organization (YYYY-MM/ directories)

**Problems Solved:**
- How to make knowledge searchable across systems
- Integration with existing workflows
- Balancing simplicity vs. comprehensive features

**Lessons Learned:**
- Existing patterns (dual-format, surgical updates) should guide design
- Skills are global-only, reference docs in .claude/skills/
- Simple grep-based search is sufficient for small-medium projects

**Commits Created:**
```bash
9c02a74 - feat(v1.0): Phase 1 - Memory System Foundation
318414b - docs(lessons): create Memory System Phase 1 Foundation
```

**Next Steps:**
- Phase 2: Implement skills (/kmgraph:recall, /kmgraph:session-summary, enhanced /kmgraph:capture-lesson)
- Phase 3: Create initial ADRs and populate knowledge graph
- Phase 4-5: Complete knowledge graph and integrate with workflows

---

**Save this summary?** [y/n]
**Custom title?** [press enter to use: "Memory System Design"]
**Edit before saving?** [y/n]
```

### Step 5: Determine Filename & Conflict Resolution

**Auto-generated naming:**

```
Format: YYYY-MM-DD_[short-description].md
Example: 2026-01-02_memory-system-design.md
```

**Conflict Check Logic:**

Get active KG path from config:
```bash
active_kg=$(jq -r '.active' ~/.claude/kg-config.json)
kg_path=$(jq -r ".graphs[\"$active_kg\"].path" ~/.claude/kg-config.json)
```

1.  **Scan:** Check `${kg_path}/sessions/[YYYY-MM]/` for any files starting with the current date `YYYY-MM-DD`.
2.  **Conflict Detected:** IF one or more files exist for today:
    -   Display the list of matching files.
    -   **Ask User:** "I found an existing session summary for today: [filename]. Would you like to:"
        -   `[u]` **Update/Append** to the existing summary? (Surgical insert of new work/decisions)
        -   `[n]` Create a **New** summary with a different topic/suffix?
3.  **Topic/Suffix Generation (if New):**
    -   Append a sequence number or unique slug (e.g., `2026-01-02_02_new-topic.md`).

**Short description generation (for New files):**
1. Extract key nouns from session (max 4 words)
2. Convert to kebab-case
3. Truncate to <50 chars total
4. Remove common words (the, a, an, etc.)

**User confirmation:**
```
[No Conflict] Generated filename: 2026-01-02_memory-system-design.md
[Conflict] I found [existing-file]. Append [u] or New [n]?
```

### Step 6: Create Directory Structure

**Auto-create month directory if needed:**

```bash
# Current month directory
MONTH_DIR="${kg_path}/sessions/$(date +%Y-%m)"

# Create if doesn't exist
mkdir -p "$MONTH_DIR"

# Verify
ls -d "$MONTH_DIR"
```

**Month directory naming:**
- Format: `YYYY-MM/`
- Examples: `2026-01/`, `2025-12/`
- Automatic archiving by year/month

### Step 7: Save or Update Summary

**IF New File:**
- Write content using the template structure from Step 3.

**IF Update/Append:**
1.  **Read** the existing file.
2.  **Surgically Insert** the new content:
    -   Append new artifacts to "What We Built".
    -   Append new choices to "Decisions Made".
    -   Update "Status" and "Next Steps".
    -   Append new commits to "Commits Created".
3.  **Maintain History:** Do not delete previous session content in the same file; separate by horizontal rules (`---`) or timestamped sub-headers if necessary.

**Write to file:**
```bash
# Target file
FILE="${kg_path}/sessions/2026-01/2026-01-02_memory-system-design.md"
```

### Step 8: Update Sessions Index

**Auto-update {active_kg_path}/sessions/README.md:**

**Read current index:**
```bash
# Read existing README
cat ${kg_path}/sessions/README.md
```

**Add entry to appropriate month section:**

```markdown
## 2026-01 (3 sessions)

- [2026-01-02 - Memory System Design](2026-01/2026-01-02_memory-system-design.md) - Planning session for local memory system
- [2026-01-02 - Job History Updates](2026-01/2026-01-02_job-history-updates.md) - Added v1.1 with new features
- [2026-01-01 - New Year Setup](2026-01/2026-01-01_new-year-setup.md) - Repository cleanup
```

**Update header stats:**
```markdown
**Total Sessions:** 3
**Last Session:** 2026-01-02
**Last Updated:** 2026-01-02
```

### Step 9: Suggest Related Actions

**After saving, suggest:**

```markdown
✅ **Session summary saved:**
{active_kg_path}/sessions/2026-01/2026-01-02_memory-system-design.md

**Suggested next actions:**

1. **Create ADR (if architectural decisions made):**
   - Decision: "Four-pillar memory architecture"
   - Command: Create ADR-005 documenting this choice

2. **Create lesson learned (if significant pattern discovered):**
   - Pattern: "Template-driven knowledge capture"
   - Command: /kmgraph:capture-lesson

3. **Update knowledge graph (if new concepts emerged):**
   - Add to {active_kg_path}/knowledge/patterns.md
   - Add to {active_kg_path}/knowledge/concepts.md

4. **Commit summary:**
   ```bash
   git add ${kg_path}/sessions/
   git commit -m "docs(session): add memory system design summary"
   ```
```

---

## Integration with Workflows

**Before /patch:**
```
Patch created → Suggests: /kmgraph:session-summary to document the work
```

**Before context limits:**
```
Warning: Token usage 180K/200K
Recommendation: Run /kmgraph:session-summary before compaction
```

**After /doc-update:**
```
Documentation updated → Auto-include in session summary
```

**Integration points:**
```
User completes work → /kmgraph:session-summary
  ↓
Creates session doc → Suggests related docs (ADR, lesson)
  ↓
User creates ADR/lesson → Session links to them
  ↓
Future /kmgraph:recall finds all related docs
```

---

## Multi-KG Support

When multiple knowledge graphs are configured:
- Operates on the **active** KG from `~/.claude/kg-config.json`
- Sessions stored in `{active_kg_path}/sessions/`
- Use `/kmgraph:switch` to change active KG before creating summary
- Each KG maintains its own session history

---

## Advanced Features (Future)

**Auto-detect trigger:**
- Monitor token usage
- Suggest summary at 180K tokens
- Automatic background summary at 190K

**Link extraction:**
- Auto-link to commits by hash
- Auto-link to PRs if GitHub
- Auto-link to files mentioned

**Template customization:**
- Per-project session templates
- Custom fields for specific domains
- Template selection by type

**Export formats:**
- Markdown (default)
- JSON (for tooling)
- Plain text (for archive)

---

## Troubleshooting

### Problem: Directory creation fails

**Solution:**
```bash
# Check permissions
ls -ld ${kg_path}/sessions/

# Create manually if needed
mkdir -p ${kg_path}/sessions/2026-01/
```

### Problem: Summary too long

**Solution:**
- Use `--condensed` flag (future enhancement)
- Manually edit generated summary
- Focus on key points only

### Problem: Can't detect session type

**Solution:**
- Manual override: `/kmgraph:session-summary --type=feature`
- Will prompt user if ambiguous
- Default to "Feature Development" if unclear

### Problem: Missing information in summary

**Solution:**
- Edit generated summary before saving
- Add details user provides during confirmation
- Use template as guide for complete sections

---

## Examples

### Example 1: After feature completion

```
User: "I just finished implementing Phase 1 of the memory system"
User: /kmgraph:session-summary
```

**Output:**
```markdown
I've analyzed this session and generated a summary:

**Session Title:** Memory System Phase 1 Implementation
**Type:** Feature Development
**Duration:** ~3 hours
**Files Created:** 16 files (1,085 lines)

[Full summary shown...]

**Save this summary?** [y/n] y
**Custom title?** [press enter to use default]
**Edit before saving?** [y/n] n

✅ Session summary saved: {active_kg_path}/sessions/2026-01/2026-01-02_memory-system-phase-1.md
```

### Example 2: Quick save with custom title

```
User: /kmgraph:session-summary --title="Bug Fix: Validation Script"
```

**Output:**
```markdown
[Auto-generates summary...]

✅ Session summary saved: {active_kg_path}/sessions/2026-01/2026-01-02_bug-fix-validation-script.md

Session documented automatically (--auto mode not used, but title provided).
```

### Example 3: Auto mode (no confirmation)

```
User: /kmgraph:session-summary --auto
```

**Output:**
```markdown
Analyzing session...
✅ Auto-saved: {active_kg_path}/sessions/2026-01/2026-01-02_current-work.md

**What was captured:**
- 3 files modified
- 2 commits created
- 1 major decision
- Planning session type

Use /kmgraph:recall to find this session later.
```

---

## Technical Details

**Context analysis:** Uses conversation history via internal API
**File detection:** Parses tool call logs for Read/Edit/Write operations
**Git detection:** Parses Bash tool calls for git commands
**Auto-linking:** Searches for file paths in known documentation directories
**Timestamp extraction:** Uses message timestamps for duration calculation
**Token counting:** Accesses internal token counter

**Performance:**
- Analysis: <5 seconds
- File write: <1 second
- Index update: <1 second
- Total: <10 seconds for complete workflow

---

**Created:** 2026-02-12
**Version:** 1.0 (Plugin version)
**Integration:** Works with /patch, /doc-update, context management
**Related Skills:** /kmgraph:capture-lesson, /kmgraph:recall
