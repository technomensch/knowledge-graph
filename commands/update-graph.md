---
description: Extract structured insights from lessons-learned and sync to knowledge graph with git metadata preservation
---

# update-knowledge-graph

Extract structured insights from lessons-learned documents and sync them to the knowledge graph, creating a quick-reference index while preserving full narrative context.

---

## Description

This skill keeps the knowledge graph synchronized with lessons-learned by:

1. **Reading** recently created or updated lesson-learned documents
2. **Extracting** key patterns, decisions, and insights
3. **Cross-referencing** with existing knowledge graph entries
4. **Creating or updating** knowledge entries that link back to full lessons
5. **Maintaining bidirectional links** between lessons and knowledge graph
6. **Preserving git metadata** from YAML frontmatter
7. **Syncing to MEMORY.md** when governance criteria met (Step 7)

**Architecture:**
- **Lessons-Learned:** Full narrative (problem → solution → replication details)
- **Knowledge Graph:** Quick-reference index (pattern name → link to lesson)
- **MEMORY.md:** Persistent governance context (loaded in system prompt each session)
- **Relationship:** Knowledge entries LEVERAGE lessons, not REPLACE them

**Purpose:** Enable fast lookups ("What's this pattern?") while preserving detailed learning context ("How did we discover this?").

**When to use:**
- After creating/updating lesson-learned documents
- When discovering new patterns or best practices
- Before completing complex work sessions
- When onboarding patterns to the knowledge base

---

## Usage

```bash
/knowledge:update-graph
/knowledge:update-graph --lesson=Pattern_Discovery.md
/knowledge:update-graph --auto
/knowledge:update-graph --category=architecture
/knowledge:update-graph --sync-all
```

**Parameters:**
- `--lesson` (optional): Specific lesson file to extract from
- `--auto` (optional): Auto-detect and update without prompting
- `--category` (optional): Filter by knowledge category (patterns, architecture, workflow, debugging)
- `--sync-all` (optional): Check all lessons for missing knowledge entries
- `--show-updates` (optional): Display before/after diffs

**Examples:**
```bash
/knowledge:update-graph
/knowledge:update-graph --lesson=Three_Tier_Sync_Pattern.md
/knowledge:update-graph --auto --sync-all
```

---

## Understanding the Relationship

### Lessons-Learned (Full Narrative)

**Purpose:** Document the complete journey of discovery and solution

**Structure:**
```markdown
---
title: "Lesson: [Topic]"
created: YYYY-MM-DDTHH:MM:SSZ
author: [Name]
git:
  branch: [branch]
  commit: [hash]
  pr: [number or null]
  issue: [number or null]
category: [architecture|process|patterns|debugging]
---

# Lesson: [Topic]

## Problem Discovered
[What went wrong, symptoms, initial confusion]

## Root Cause Analysis
[Why it happened, underlying assumptions, architecture misunderstanding]

## Solution Implemented
[How we fixed it, steps taken, verification]

## Replication Details
[How to reproduce, test cases, edge cases]

## Lessons Learned
[Key takeaways, patterns for future, preventive measures]

## Related Resources
[Links to ADRs, code changes, issues]
```

**Example:** `Three_Tier_Sync_Pattern.md` (1000+ lines)
- Problem: Implementation incomplete, interface still showing old patterns
- Root Cause: Different interfaces read from different sources, incomplete sync
- Solution: Fixed config synchronization, verified all three tiers
- Lessons: Multi-tier sync is bidirectional; verification must be comprehensive

### Knowledge Graph (Quick Reference)

**Purpose:** Enable fast lookups and connections between concepts

**Structure:**
```markdown
### [Pattern/Concept Name]

**Problem:** [One sentence - what problem does this solve?]
**Solution:** [One sentence - what's the approach?]
**When to use:** [Bullet list of triggers]

**Quick Reference:**
[2-3 key points in scannable format]

**Source:** [Lesson title] (Branch: {branch}, PR: #{pr})
**See:** [Link to full lesson learned]
**Related:** [Links to other patterns]
```

**Example:** In `{active_kg_path}/knowledge/patterns.md`
- Three-Tier Sync Pattern (pattern)
- Problem: Updating modular files in isolation risks incomplete sync
- Solution: Three-tier synchronization with comprehensive verification
- Quick Reference: Module → Config Master → Entrypoint
- Source: Three_Tier_Sync_Pattern lesson (Branch: v2.3, PR: #[PR_ID])
- See: Three_Tier_Sync_Pattern.md (full lesson learned)

### Relationship: LEVERAGE, Don't REPLACE

```
Workflow:

User searches for "Three-Tier Sync"
        ↓
Knowledge Graph: "Three-Tier Sync Pattern - See: Three_Tier_Sync_Pattern.md"
        ↓
User clicks link
        ↓
Full Lesson Learned: Complete narrative with root cause, solution, replication steps
        ↓
User understands not just WHAT but WHY and HOW to apply it
```

**Key Principle:**
- Knowledge Graph = Quick index (5-10 seconds)
- Lesson-Learned = Deep understanding (5-10 minutes)
- Together = Efficient onboarding + comprehensive learning

---

## Extraction Process

### Step 0: Get Active KG Path

```bash
# Read ~/.claude/kg-config.json
# Find "active" field
# Get path from graphs[active].path
# Store as {active_kg_path}
```

### Step 1: Identify New or Modified Lessons

**Detect recently changed lessons:**

```bash
# Find lessons updated in last session
find {active_kg_path}/lessons-learned -name "*.md" -mtime -1

# Or check specific file
git log --oneline {active_kg_path}/lessons-learned/architecture/Pattern.md | head -1
```

**Typical sources:**
- Just created during `/knowledge:capture-lesson` skill
- Modified as part of documentation updates
- Referenced in recent session summary

### Step 2: Extract Key Elements

**For each lesson file, extract:**

1. **Title/Topic Name**
   ```markdown
   # Lesson: Three-Tier Sync Pattern (v2.3)
   └─ Extract as: "Three-Tier Sync Pattern"
   ```
   Or from YAML frontmatter: `title: "Lesson: Three-Tier Sync Pattern"`

2. **Problem Statement**
   ```markdown
   ## Problem Discovered
   Modularizing core config risks breaking the config master source of truth
   └─ Extract as: "Updating modular files in isolation risks incomplete sync"
   ```

3. **Solution Approach**
   ```markdown
   ## Solution Implemented
   Keep core logic in config master but wrap in references; modules mirror structure
   └─ Extract as: "Three-tier synchronization: Module → Config Master → Entrypoint"
   ```

4. **When to Use Triggers**
   ```markdown
   ## Lessons Learned / When to Apply
   - Before committing changes to config-modules/
   - When updating PROJECT-CONFIG.md
   - After modifying configuration rules
   └─ Extract as: Trigger list
   ```

5. **Category Classification**
   - Architecture decisions → `architecture/`
   - Debugging solutions → `debugging/`
   - Process improvements → `process/`
   - Pattern discoveries → `patterns/`
   - Other → `general/`

6. **Related Concepts**
   ```markdown
   **Related:** ADR-004, Config Sync pattern, Issue #56
   └─ Extract cross-references
   ```

7. **External Sources** (from YAML frontmatter)
   ```yaml
   sources:
     - url: "https://..."
       title: "..."
       context: "..."
   ```
   └─ Preserve for **External References:** section in KG entry

8. **Git Metadata** (from YAML frontmatter)
   ```yaml
   git:
     branch: v2.3
     commit: abc123
     pr: 45
     issue: 42
   ```
   └─ Preserve for **Source:** line in KG entry

### Step 3: Check Existing Knowledge Graph

**Verify if entry already exists:**

```bash
# Search for existing entry
grep -i "three-tier sync\|config sync" {active_kg_path}/knowledge/patterns.md

# Results:
# ✅ Found - Update with new information (preserve git metadata)
# ❌ Not found - Create new entry
```

### Step 4: Create or Update Knowledge Entry

**Format for new entries:**

```markdown
### [Pattern/Concept Name]

**Problem:** [One sentence problem description]
**Solution:** [One sentence solution approach]
**When to use:** [Bullet list of triggers]

**Quick Reference:**
- [Key point 1]
- [Key point 2]
- [Key point 3]

**External References:** (if sources exist in lesson)
- [Source Title](URL) — Context: [Brief note]
- [Source Title](URL) — Context: [Brief note]

**Source:** [Lesson title] (Branch: {branch}, PR: #{pr})
**See:** [Link to full lesson: {active_kg_path}/lessons-learned/category/Lesson_Name.md]
**Related:** [Link to related patterns/ADRs]
```

**Example Output:**

```markdown
### Three-Tier Sync Pattern

**Problem:** Updating modular files in isolation risks incomplete synchronization across different interfaces
**Solution:** Enforce three-tier synchronization: Module → Config Master → Entrypoint
**When to use:**
- Before committing changes to config-modules/
- When updating PROJECT-CONFIG.md
- After modifying configuration rules
- Before marking features as "complete"

**Quick Reference:**
- **Module** (`config-modules/*/`): Source of truth, authoritative rules
- **Config Master** (`PROJECT-CONFIG.md`): Complete synchronized copy (used by primary interface)
- **Entrypoint** (`Project-Entrypoint.md`): Token-efficient version with modular references
- Verification requires comprehensive search for ALL variations (exact, lowercase, snake_case, camelCase)
- Different interfaces read from different sources - test with ACTUAL interface, not assumptions

**Source:** Three-Tier Sync Pattern lesson (Branch: v2.3, PR: #[PR_ID])
**See:** [Three_Tier_Sync_Pattern.md]({active_kg_path}/lessons-learned/architecture/Three_Tier_Sync_Pattern.md)
**Related:** [Config Integrity](#config-integrity) - Preserving config master consistency
```

**Git metadata preservation:**
- Include source branch and PR in **Source:** line
- Helps track which work session/context discovered this pattern
- Links pattern back to implementation history

### Step 5: Update Cross-References

**Add bidirectional links:**

**In lesson-learned:**
```markdown
## Related Resources

- **Knowledge Graph:** [patterns.md - Three-Tier Sync Pattern]({active_kg_path}/knowledge/patterns.md#three-tier-sync-pattern)
- **ADRs:** ADR-004 - Multi-Tier Configuration
- **Session:** 2026-01-16 - v2.3 Config Sync Completion
```

**In knowledge graph:**
```markdown
**See:** [Three_Tier_Sync_Pattern.md]({active_kg_path}/lessons-learned/architecture/Three_Tier_Sync_Pattern.md)
**Related:** [Config Integrity](#config-integrity) pattern
```

### Step 6: Verify Entry Quality

**Checklist for each new/updated entry:**

- [ ] **Quick Reference is scannable** (5-10 seconds to understand pattern)
- [ ] **Link to lesson is correct** (path exists, file present)
- [ ] **Related patterns are cross-linked** (bidirectional)
- [ ] **"When to use" is actionable** (someone can decide if it applies)
- [ ] **Problem/Solution are clear** (non-technical person could understand)
- [ ] **Correct category** (patterns/architecture/debugging/process)
- [ ] **Consistent formatting** (matches other entries in same file)
- [ ] **No orphaned references** (all links valid)
- [ ] **Git metadata preserved** (if available in source lesson)

---

## Step 7: Check Project Memory Sync Requirements

After each entry is successfully created or updated, determine if project memory (MEMORY.md) should be updated:

### 7.1 Memory Update Triggers

Update `~/.claude/projects/[project]/memory/MEMORY.md` when newly discovered patterns match these criteria:

- **New Gotcha Pattern**: Common pitfall/failure mode discovered
- **New Best Practice**: Proven technique or workflow improvement
- **New Common Failure Pattern**: Repeated error with documented fix
- **Workflow Enhancement**: Change to existing skill/process
- **Architecture Decision**: New structural decision affecting governance

**Do NOT update memory for:** One-time project-specific patterns, informational concepts without process impact, domain-specific patterns that don't affect workflow

### 7.2 Memory Update Categories

Update the appropriate MEMORY.md section:

| Discovery | Memory Section | Update Type |
|-----------|---|---|
| New failure pattern | Common Failure Patterns & Fixes | Add table row |
| New best practice | Best Practices | Add checklist item |
| New workflow skill | Workflow Skills & Their Purpose | Add table row |
| New process pattern | Core Governance Patterns | Add subsection with pattern |
| Architecture insight | Project Structure & Patterns | Update relevant section |

### 7.3 Implementation Steps

1. **Read** the relevant MEMORY.md section
2. **Identify** the correct subsection for the new pattern
3. **Update** with consistent formatting (tables, checklists, cross-references)
4. **Link** back to knowledge graph entry and lesson-learned source
5. **Verify** line count (total should stay under ~250 lines, link to detail files for 200+)
6. **Stage** the memory update along with KG entry for single commit

### 7.4 Example: Project Memory Update for New Pattern

**Discovery:** New pattern found - "Knowledge Graph ↔ Memory Bidirectional Sync"

**Memory Update Location:** `~/.claude/projects/[project]/memory/MEMORY.md` → Workflow Skills section

**Original Entry:**
```markdown
| `/knowledge:update-graph` | Extract structured insights from lessons learned | update-knowledge-graph.md |
```

**Updated Entry:**
```markdown
| `/knowledge:update-graph` | Extract structured insights & sync to memory (Step 7) | update-knowledge-graph.md |
```

**Additional note in "Core Governance Patterns":**
```markdown
### Knowledge Graph ↔ Memory Synchronization
- When new patterns/gotchas/best practices discovered → update BOTH KG AND memory
- Memory provides persistent governance context (loaded in system prompt)
- KG provides quick-reference discovery mechanism
- Bidirectional sync prevents knowledge drift between sessions

**Implementation**: Step 7 of `/knowledge:update-graph` skill checks if MEMORY.md needs updating when entries are created.

**See**: [ADR-011: Knowledge Graph ↔ Memory Sync]({active_kg_path}/decisions/ADR-011-knowledge-graph-memory-sync.md)
```

### 7.5 Verification

```bash
# 1. Verify MEMORY.md was updated
git diff ~/.claude/projects/.../memory/MEMORY.md

# 2. Verify knowledge graph entry exists
grep -n "Knowledge Graph.*Memory\|Memory.*Knowledge Graph" {active_kg_path}/knowledge/patterns.md

# 3. Verify bidirectional links
# - Knowledge graph entry should reference MEMORY.md via "See:" section
# - MEMORY.md should reference knowledge graph pattern

# 4. Verify line count remains reasonable
wc -l ~/.claude/projects/.../memory/MEMORY.md  # Should stay under 300 lines
```

---

## Knowledge Graph Organization

### Category Structure

**{active_kg_path}/knowledge/patterns.md** - Design and implementation patterns
```markdown
- Dual-Format Strategy
- Surgical Updates
- Template-Driven Docs
- Three-Tier Sync Pattern ← NEW/UPDATED
- Config Integrity
... (other patterns)
```

**{active_kg_path}/knowledge/concepts.md** - Foundational ideas and mental models
```markdown
- Memory Systems
- Cross-Referencing
- Template-Driven Consistency
... (concepts)
```

**{active_kg_path}/knowledge/gotchas.md** - Common pitfalls and anti-patterns
```markdown
- Agent Governance Drift
- Plan File Location Confusion
- Vibe-Coding Drift
... (gotchas)
```

**{active_kg_path}/knowledge/architecture.md** (if created) - System design decisions
```markdown
- ID-Based Architecture
- Modular Documentation Strategy
- Multi-Tier Configuration
... (architecture concepts)
```

**{active_kg_path}/knowledge/workflows.md** (if created) - Process and methodology patterns
```markdown
- Governance Lifecycle
- Functional Directory Structure
- Session Documentation
... (workflow patterns)
```

### Entry Placement Logic

**Classify each extracted concept:**

| Category | Indicators |
|----------|-----------|
| **patterns.md** | Reusable design, applicable across projects, proven approach |
| **concepts.md** | Foundational understanding, mental model, definition |
| **gotchas.md** | Common mistake, anti-pattern, pitfall to avoid |
| **architecture.md** | System design, structural decisions, layers/components |
| **workflows.md** | Process, methodology, step-by-step procedures |

---

## Workflow Integration

### Typical Flow

```
1. Create/Update Lesson (via /knowledge:capture-lesson)
   ↓
2. Skill suggests: "Update knowledge graph?"
   ↓
3. Run /knowledge:update-graph --lesson=[file]
   ↓
4. Review extracted entry, approve or edit
   ↓
5. Entry added to knowledge graph
   ↓
6. Check MEMORY.md sync requirements (Step 7)
   ↓
7. Update MEMORY.md if pattern meets governance criteria
   ↓
8. Bidirectional links created (lesson ↔ KG ↔ MEMORY)
   ↓
9. All files committed together (single commit)
```

### Automatic Sync (--sync-all)

```bash
/knowledge:update-graph --sync-all

# Checks:
# 1. All lessons with "Related Resources:" links
# 2. All ADRs with "Related:" references
# 3. All knowledge entries pointing to valid files
# 4. Missing entries that should exist
#
# Reports:
# ✅ Synchronized: [list]
# ⚠️ Broken links: [list]
# ❌ Orphaned lessons: [list]
# 💡 Suggested new entries: [list]
```

---

## Example: Three-Tier Sync Pattern Update

### Input: Lesson-Learned File

**File:** `{active_kg_path}/lessons-learned/architecture/Three_Tier_Sync_Pattern.md`

```markdown
---
title: "Lesson: Three-Tier Sync Pattern - v2.3"
created: 2026-01-16T10:00:00Z
author: Developer Name
email: dev@example.com
git:
  branch: v2.3
  commit: abc123
  pr: 45
  issue: 42
tags: [architecture, synchronization, configuration]
category: architecture
---

# Lesson: Three-Tier Sync Pattern - v2.3

## Problem Discovered
Modularizing core configuration risks breaking the "Config Master" source of truth.
When files are updated in isolation, synchronization across different interfaces
becomes incomplete, causing user-visible bugs.

## Root Cause Analysis
Different interfaces read from different configuration sources:
- Primary Interface: PROJECT-CONFIG.md (Config Master)
- Development Interface: Inline config in source files
- Alternative Tools: Separate config files

When only some sources are updated, inconsistency results.

## Solution Implemented
Three-tier synchronization:
1. **MODULE** (config-modules/*/): Source of truth
2. **CONFIG MASTER** (PROJECT-CONFIG.md): Synchronized copy
3. **ENTRYPOINT** (Project-Entrypoint.md): References

Comprehensive verification searches for all terminology variations before
declaring update complete.

## When to Apply
- Before committing changes to config-modules/
- When updating PROJECT-CONFIG.md
- After modifying configuration rules
- Before marking features as "complete"
```

### Processing Step

```bash
/knowledge:update-graph --lesson=Three_Tier_Sync_Pattern.md
```

### Output: Knowledge Graph Entry

**Added to:** `{active_kg_path}/knowledge/patterns.md`

```markdown
### Three-Tier Sync Pattern

**Problem:** Updating modular files in isolation risks incomplete synchronization across different interfaces
**Solution:** Enforce three-tier synchronization: Module → Config Master → Entrypoint
**When to use:**
- Before committing changes to config-modules/
- When updating PROJECT-CONFIG.md
- After modifying configuration rules
- Before marking features as "complete"

**Quick Reference:**
- **Module** (`config-modules/*/`): Source of truth, authoritative rules
- **Config Master** (`PROJECT-CONFIG.md`): Complete synchronized copy (used by primary interface)
- **Entrypoint** (`Project-Entrypoint.md`): Token-efficient version with modular references
- Verification requires comprehensive search for ALL terminology variations (exact, lowercase, snake_case, camelCase)
- Different interfaces read from different sources - test with ACTUAL interface, not assumptions

**External References:**
- [Configuration Best Practices](https://example.com/config-guide) — Context: Multi-tier sync pattern principles
- [Synchronization Patterns](https://docs.example.com/patterns) — Context: Validation strategies for configuration consistency

**Source:** Three-Tier Sync Pattern lesson (Branch: v2.3, PR: #[PR_ID])
**See:** [Three_Tier_Sync_Pattern.md]({active_kg_path}/lessons-learned/architecture/Three_Tier_Sync_Pattern.md)
**Related:** [Config Integrity](#config-integrity) - Preserving config master consistency
```

**Updated in:** `{active_kg_path}/lessons-learned/architecture/Three_Tier_Sync_Pattern.md`

```markdown
## Related Resources

- **Knowledge Graph Entry:** [patterns.md → Three-Tier Sync Pattern]({active_kg_path}/knowledge/patterns.md#three-tier-sync-pattern)
- **Related Skill:** `/knowledge:update-graph`
- **Session Summary:** [2026-01-16 v2.3 Config Sync Completion]({active_kg_path}/sessions/2026-01/2026-01-16_v2.3-config-sync-completion.md)
- **GitHub Issue:** [ISSUE_ID] - Configuration Synchronization Enhancement
```

### Result

Both files now have bidirectional links:
```
User searches → Knowledge Graph (fast lookup) → Full Lesson (deep dive)
                    ↓
            Related Patterns → Other Concepts → MEMORY.md (persistent governance)
```

---

## Benefits of Leveraging (Not Replacing)

### Why This Architecture Works

**Quick Lookups (Knowledge Graph):**
- Fast to scan (5-10 seconds)
- Easy to remember pattern names
- Quick cross-reference to related concepts
- Ideal for decision-making: "Do I need Three-Tier Sync here?"

**Deep Learning (Lessons-Learned):**
- Full narrative and context (5-10 minutes)
- Root cause analysis and debugging journey
- Replication steps and test cases
- Ideal for understanding: "Why did this fail?" and "How do I prevent it?"

**Persistent Context (MEMORY.md):**
- Loaded in system prompt each session
- Governance patterns and failure modes
- Best practices and workflow enhancements
- Ideal for: "What should I always remember?"

**Together:**
```
Quick lookup problem: "Should I apply Three-Tier Sync?"
    ↓
Knowledge Graph: "YES - whenever you update config-modules/"
    ↓
Need deeper understanding: "Why is this pattern important?"
    ↓
Click link to Lesson: Read full v2.2 failure story, root cause, prevention
    ↓
Governance reminder: MEMORY.md references pattern in "Best Practices" section
    ↓
Future developer: Understands not just WHAT to do but WHY and HOW
```

### What Doesn't Work: Replacing Lessons with Knowledge Graph

❌ **Bad Approach:**
```markdown
### Three-Tier Sync Pattern
Enforce three-tier sync when updating modular files. See docs for details.
```
- Too brief, no context for understanding
- Reader doesn't understand WHY this matters
- No debugging guidance when something goes wrong
- Difficult to onboard new developers on complex concepts

---

## Maintenance

### Regular Sync (Recommended Monthly)

```bash
# Check for orphaned or broken entries
/knowledge:update-graph --sync-all --show-updates

# Review and fix any broken links
```

### When to Add New Entries

**Automatically suggested when:**
- New lesson-learned created without existing knowledge entry
- ADR formalizes a pattern not yet in knowledge graph
- Session summary identifies recurring pattern

**Manual triggers:**
- Repeating question or confusion across sessions
- New tool/skill/process adopted
- Architecture decision with broad impact

---

## Integration with Other Skills

**Creates entries from:**
- `/knowledge:capture-lesson` - Automatically suggests knowledge graph update
- `/knowledge:sync-all` - Calls this skill as part of automated pipeline
- `/knowledge:session-summary` - Auto-identifies patterns and suggests KG addition

**Feeds into:**
- `/knowledge:recall` - Uses knowledge graph to find related lessons
- `/knowledge:update-issue-plan` - Links KG insights to plans and issues
- Documentation updates - Knowledge entries get cited in decision docs

---

## Troubleshooting

### Problem: Links Are Broken

**Symptom:**
```
⚠️ Broken link: [Three_Tier_Sync_Pattern.md]({active_kg_path}/lessons-learned/architecture/Three_Tier_Sync_Pattern.md)
   File not found at: {active_kg_path}/lessons-learned/architecture/Three_Tier_Sync_Pattern.md
```

**Solution:**
```bash
# Verify file exists
find {active_kg_path} -name "Three_Tier_Sync_Pattern.md"

# Update path in knowledge entry if needed
# Or create missing lesson file
```

### Problem: Duplicate Entries

**Symptom:**
```
Three-Tier Sync Pattern appears in both patterns.md and architecture.md
```

**Solution:**
```bash
# Consolidate to primary location (usually patterns.md)
# Remove from secondary location
# Update cross-references
# Run: /knowledge:update-graph --sync-all
```

### Problem: Entry Is Too Generic

**Symptom:**
```
Quick Reference section is 50+ lines, not scannable
```

**Solution:**
```bash
# Extract overly detailed content to lesson-learned instead
# Keep knowledge entry to: problem, solution, when to use, 3-4 key points
# Link to lesson for detailed explanation
```

### Problem: MEMORY.md Exceeds Line Limit

**Symptom:**
```
MEMORY.md is 320 lines (limit: 300)
```

**Solution:**
```bash
# Move detailed patterns to separate topic files
# Link from MEMORY.md to topic files
# Keep only high-level governance patterns in MEMORY.md
# See auto memory system guidelines
```

---

## Related Commands

- `/knowledge:capture-lesson` - Document new lessons learned
- `/knowledge:recall` - Search across all KG systems
- `/knowledge:sync-all` - Full knowledge sync pipeline (calls this skill)
- `/knowledge:update-issue-plan` - Sync KG → plan → issue → GitHub

---

**Created:** 2026-02-12
**Version:** 2.0 (Plugin version - multi-KG + git metadata + MEMORY.md sync)
**Purpose:** Keep knowledge graph synchronized with lessons-learned via extraction and linking
**Architecture:** LEVERAGE lessons (not replace) - quick ref + deep dive + persistent context together
**Success Criteria:** All recent lessons have corresponding quick-reference knowledge entries with valid bidirectional links + MEMORY.md updates when governance criteria met
