# Design Patterns Catalog

<!-- THIS IS AN EXAMPLE — Replace with your project's patterns -->

**Last Updated:** 2026-02-13
**Entries:** 12

This file contains example patterns from a real project, generalized for demonstration purposes. Use these as templates for documenting your own project's patterns.

---

## Quick Navigation

- [Multi-Tier Synchronization](#multi-tier-synchronization) - Three-tier modular synchronization protocol
- [Bidirectional Memory Sync](#bidirectional-memory-sync) - Automated memory updates during knowledge discovery
- [Smart Defaults](#smart-defaults) - Auto-detect context to replace multiple prompts
- [Automated Orchestrator](#automated-orchestrator) - Replacing multi-step manual processes with single-command pipelines
- [Meta-Issue Tracking](#meta-issue-tracking) - Structured documentation for complex multi-attempt problems
- [Four-Pillar Memory](#four-pillar-memory) - Multi-system knowledge capture architecture
- [Project Memory System](#project-memory-system) - Persistent governance memory for AI agents
- [Category Auto-Detection](#category-auto-detection) - Keyword-based organization
- [Template-Driven Docs](#template-driven-docs) - Standardized document creation
- [Identifier Decoupling](#identifier-decoupling) - Mapping local persistence to platform drift
- [Positive Constraint Framing](#positive-constraint-framing) - Avoiding Pink Elephant Problem via affirmative commands
- [Functional Directory Structure](#functional-directory-structure) - Intent-based directory naming

---

## Documentation & Synchronization Patterns

### Multi-Tier Synchronization

**Problem:** Updating modular files in isolation risks incomplete synchronization across different interfaces

**Solution:** Verify three-tier synchronization is complete: Module ↔ Gold Master ↔ Optimized Entrypoint (works in any direction)

**When to use:** Before committing changes to modular config files, master documentation, or optimized entry points for different platforms

**Quick Reference:**
- **Module** (`config-modules/*/`): Source of truth, authoritative rules
- **Gold Master** (`PROJECT-CONFIG.md`): Complete synchronized copy (used for full system context)
- **Optimized Entrypoint** (`Platform-Specific-Config.md`): Token-efficient version with modular references

**Verification Checklist (works regardless of which tier was edited first):**
1. Identify which file(s) changed (MODULAR, GOLD MASTER, or OPTIMIZED ENTRYPOINT)
2. Verify MODULE and GOLD MASTER have identical rule logic
3. Verify OPTIMIZED ENTRYPOINT correctly references or mirrors GOLD MASTER
4. Search for ALL terminology variations (exact, lowercase, snake_case, camelCase) across all three tiers
5. Test with ACTUAL interface (not just assumption) to confirm changes propagate

**Why It Matters:**
- Different interfaces read from different prompt sources
- Incomplete sync across tiers causes user-visible bugs
- Platform-specific implementations may use different config sources

**Cross-References:**
- **Related:** [[Template-Driven Docs](#template-driven-docs)]
- **Pattern Type:** Synchronization, Documentation

---

### Bidirectional Memory Sync

**Problem:** Knowledge graph entries become stale or out of sync with project memory/context files

**Solution:** Automated memory updates during knowledge discovery - when KG entries change, project memory is automatically updated

**When to use:** Any project with persistent cross-session context (MEMORY.md, project context files, etc.)

**Quick Reference:**
- When lesson is created → Update KG → Update MEMORY.md
- Bidirectional flow ensures both systems stay synchronized
- Automation prevents manual drift
- Keeps persistent context fresh across sessions

**Implementation Notes:**
- Trigger sync on KG entry creation/update
- Update memory sections related to new knowledge
- Maintain links between KG and memory entries
- Single command pipeline eliminates manual steps

**Cross-References:**
- **Related:** [[Four-Pillar Memory](#four-pillar-memory)]
- **Pattern Type:** Automation, Knowledge Management

---

## Workflow Automation Patterns

### Smart Defaults

**Problem:** Multiple confirmation prompts slow down focused work

**Solution:** Auto-detect context to replace multiple prompts with single confirmation

**When to use:** Automating workflows with predictable defaults (file paths, categorization, commit messages)

**Quick Reference:**
- **Before:** 5 prompts (category? path? commit? link? sync?)
- **After:** 1 confirmation (auto-detected context, user confirms entire operation)
- Reduces cognitive load during active development
- Preserves user control with single gate

**Implementation Pattern:**
```
1. Auto-detect session type from git context
2. Infer category from keywords in description
3. Propose complete operation with all defaults shown
4. Single user confirmation
5. Execute full pipeline
```

**Cross-References:**
- **Related:** [[Automated Orchestrator](#automated-orchestrator)]
- **Pattern Type:** UX, Automation

---

### Automated Orchestrator

**Problem:** Multi-step manual processes are tedious and error-prone

**Solution:** Replace manual pipeline with single-command automation

**When to use:** Repetitive workflows requiring multiple sequential steps (knowledge sync, deployment, validation pipelines)

**Quick Reference:**
```
Manual (4 steps):
1. /capture-lesson
2. /update-graph  
3. /update-issue-plan
4. git commit + update MEMORY.md

Automated (1 step):
/kmgraph:sync-all
  → Runs all 4 steps with single confirmation
```

**Benefits:**
- Reduces 4-step workflow to 1 command
- Ensures no steps are skipped
- Atomic operation (all or nothing)
- Single confirmation point

**Cross-References:**
- **Related:** [[Smart Defaults](#smart-defaults)]
- **Pattern Type:** Automation, Workflow

---

### Meta-Issue Tracking

**Problem:** Complex problems span multiple versions and require 3+ solution attempts with evolving understanding. Single-issue tracking doesn't capture root cause evolution or cross-attempt patterns.

**Solution:** Create structured meta-issue directory with core files (README, description, implementation-log, test-cases) and numbered attempt folders

**When to use:** 
- Problem requires 3+ solution attempts
- Root cause understanding evolves across attempts
- Need to track "what we tried" and "what we learned"
- Standard issue tracking feels insufficient

**Quick Reference:**
```
meta-issue/
├── README.md              # Navigation hub
├── description.md         # Living document (updated as understanding evolves)
├── implementation-log.md  # Timeline of all attempts
├── test-cases.md          # Validation criteria
└── attempts/
    ├── 001-baseline/
    │   ├── solution-approach.md
    │   └── attempt-results.md
    ├── 002-caching/
    │   ├── solution-approach.md
    │   └── attempt-results.md
    └── 003-pooling/
        ├── solution-approach.md
        └── attempt-results.md
```

**Cross-References:**
- **Related:** [[Four-Pillar Memory](#four-pillar-memory)]
- **Pattern Type:** Documentation, Problem-Solving

---

## Memory & Knowledge Management Patterns

### Four-Pillar Memory

**Problem:** Knowledge loss across sessions and difficulty retrieving previously-solved problems

**Solution:** Four complementary systems for different knowledge types

**When to use:** Any project requiring persistent knowledge across sessions

**Quick Reference:**
1. **Lessons Learned** - Detailed problem-solving journeys (narrative)
2. **ADRs** - Formal architectural decisions (structured)
3. **Knowledge Graph** - Quick-reference concepts/patterns (scannable)
4. **Session Summaries** - Work context snapshots (historical)

**The LEVERAGE Principle:**
- KG = Quick reference (5-10 seconds to understand "what")
- Lessons = Deep dive (5-10 minutes to understand "how" and "why")
- KG links to lessons for context
- Lessons extract to KG for future quick access

**Cross-References:**
- **Related:** [[Project Memory System](#project-memory-system)]
- **Pattern Type:** Architecture, Knowledge Management

---

### Project Memory System

**Problem:** AI agents lose context across sessions, requiring repeated explanations

**Solution:** Persistent governance memory integrated with platform memory systems (e.g., Claude Code MEMORY.md)

**When to use:** Projects with AI-assisted development requiring consistent context

**Quick Reference:**
- Structured memory file in platform-specific location
- Sections for: Architecture, Patterns, Gotchas, Current State
- Bidirectionally synced with Knowledge Graph
- Auto-updated during knowledge pipeline execution
- Survives session restarts

**Implementation Notes:**
- Platform-specific paths (e.g., `~/.claude/projects/[hash]/memory/MEMORY.md`)
- Discovery mechanism to locate existing memory
- Fallback creation if not found
- Integration with sync pipeline

**Cross-References:**
- **Related:** [[Four-Pillar Memory](#four-pillar-memory)], [[Bidirectional Memory Sync](#bidirectional-memory-sync)]
- **Pattern Type:** Architecture, Persistence

---

## Organization & Structure Patterns

### Category Auto-Detection

**Problem:** Manual categorization is tedious and error-prone

**Solution:** Keyword-based mapping with user confirmation

**When to use:** Creating lessons learned, organizing content, filing documentation

**Quick Reference:**
```
Keywords → Category:
"architecture", "design" → architecture/
"bug", "debug", "error" → debugging/
"workflow", "process"   → process/
"pattern", "template"   → patterns/
```

**Implementation:**
1. Scan title/description for keywords
2. Map to category via keyword dictionary
3. Propose category to user
4. User confirms or overrides
5. File in correct location

**Cross-References:**
- **Related:** [[Smart Defaults](#smart-defaults)]
- **Pattern Type:** Automation, Organization

---

### Template-Driven Docs

**Problem:** Inconsistent structure and missing sections in documentation

**Solution:** Standard templates for recurring document types

**When to use:** Any recurring document type requiring consistent structure (ADRs, lessons, sessions, issues)

**Quick Reference:**
- Reduces cognitive load (familiar structure)
- Ensures completeness (no missing sections)
- Accelerates creation (fill-in-the-blank)
- Templates in `templates/` directory
- Scaffolding commands create from templates

**Standard Templates:**
- `lesson-template.md` - Problem → Root Cause → Solution → Replication
- `ADR-template.md` - Context → Options → Decision → Consequences
- `session-template.md` - Overview → Built → Decided → Learned
- `issue-template.md` - Description → Acceptance Criteria → Plan

**Cross-References:**
- **Related:** [[Multi-Tier Synchronization](#multi-tier-synchronization)]
- **Pattern Type:** Documentation, Standardization

---

### Identifier Decoupling

**Problem:** Local context (folders/branches) drifts from platform serial numbering (GitHub Issues), causing confusing renames

**Solution:** Map local persistent IDs to platform serial IDs instead of attempting to align them

**When to use:** Project management across local and cloud platforms

**Quick Reference:**
- **Local ID:** `issue-85` (Logical, persistent, used for file paths/branches)
- **Platform ID:** `[ISSUE_ID]` (Serial, drifts, used for tracking)
- **Policy:** Never rename local assets to match platform drift. Always maintain a mapping matrix in metadata.

**Why This Matters:**
- Platform IDs can change (deleted issues, issue number reuse)
- Local paths need stability (git branches, file references)
- Mapping preserves both without coupling

**Cross-References:**
- **Related:** [[Project Memory System](#project-memory-system)]
- **Pattern Type:** Architecture, Data Management

---

## Prompt Engineering & AI Patterns

### Positive Constraint Framing

**Problem:** Negative instructions ("Don't do X", "Never skip Y") can prime the model to do the opposite behavior (Pink Elephant Problem)

**Solution:** Reframe all constraints as affirmative commands

**When to use:** Writing any instructions for AI agents, system prompts, or behavioral requirements

**Quick Reference:**
- **❌ Instead of:** "DO NOT output items in wrong order"
- **✅ Use:** "All items MUST be in chronological order"
- **❌ Instead of:** "NEVER skip the validation step"
- **✅ Use:** "Validation step MUST appear before output"

**Why It Works:**
- Negative language primes opposite behavior (research-backed)
- Positive framing improves compliance measurably
- LLMs process affirmative instructions more reliably
- Applies to all instruction layers

**Cross-References:**
- **Related:** [[Smart Defaults](#smart-defaults)]
- **Pattern Type:** Prompt Engineering, LLM Constraints

---

### Functional Directory Structure

**Problem:** Generic named directories (e.g., "shared", "misc") obscure intent and lead to dumping ground behavior

**Solution:** Name directories by their functional phase or role in the pipeline

**When to use:** Organizing project structure, refactoring for clarity

**Quick Reference:**
- **Bad:** `/shared/` (ambiguous, mixed concerns)
- **Good:** `/pipelines/` (explicit functional role)
- **Bad:** `/utils/` (vague, becomes a junk drawer)
- **Good:** `/validators/` or `/transformers/` (clear purpose)
- **Rule:** If you have to ask "what goes here?", the name is wrong

**Examples:**
```
Before:                     After:
shared/                     pipelines/
  validation.py               validation-pipeline.py
  helpers.py                  orchestrator.py
  utils.py                  
utils/                      transformers/
  format.py                   output-formatter.py
misc/                       validators/
  check.py                    schema-validator.py
```

**Cross-References:**
- **Related:** [[Template-Driven Docs](#template-driven-docs)]
- **Pattern Type:** Architecture, Organization

---

## Usage Patterns

### When to Create Each Document Type

**Lesson Learned:**
- After solving non-trivial problem
- When discovering surprising behavior
- To document complex troubleshooting journey
- Template: Narrative, problem → solution → replication

**ADR:**
- Before making significant architectural decision
- To formalize decision from lesson learned
- When choosing between technologies/patterns
- Template: Context → options → decision → consequences

**Knowledge Entry:**
- Extract quick-reference from lessons/ADRs
- Define core concept for project
- Document common gotcha
- Template: Summary → details → cross-refs

**Session Summary:**
- Before context limits
- After completing major feature
- At end of debugging session
- Template: Overview → built → decided → learned

**Cross-References:**
- **Pattern Type:** Workflow, Best Practices
