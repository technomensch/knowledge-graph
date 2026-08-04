
# update-knowledge-graph

Extract structured insights from lessons-learned documents and sync them to the knowledge graph, creating a quick-reference index while preserving full narrative context.

---

## Description

Delegates to the `knowledge-extractor` agent (KG Entry Extraction Mode) to read lessons, extract structured entries, create/update KG entries with bidirectional links, and preserve git metadata. When governance-worthy content is detected, flags it in output for capture at session wrap.

**When to use:**
- After creating/updating lesson-learned documents
- When discovering new patterns or best practices
- Before completing complex work sessions
- When onboarding patterns to the knowledge base

---

## Usage

```bash
/kmgraph:kmg-update-graph
/kmgraph:kmg-update-graph --lesson=Pattern_Discovery.md
/kmgraph:kmg-update-graph --auto
/kmgraph:kmg-update-graph --category=architecture
/kmgraph:kmg-update-graph --sync-all
```

**Parameters:**
- `--lesson` (optional): Specific lesson file to extract from
- `--auto` (optional): Auto-detect and update without prompting. When called from capture-lesson workflow, returns structured quality feedback instead of silent execution
- `--edit-entry` (optional): Opens generated KG entry for user review/edit before saving
- `--category` (optional): Filter by knowledge category (patterns, architecture, workflow, debugging)
- `--sync-all` (optional): Check all lessons for missing knowledge entries
- `--show-updates` (optional): Display before/after diffs

**Examples:**
```bash
/kmgraph:kmg-update-graph
/kmgraph:kmg-update-graph --lesson=Three_Tier_Sync_Pattern.md
/kmgraph:kmg-update-graph --auto --sync-all
/kmgraph:kmg-update-graph --lesson=Pattern.md --edit-entry  # Review before saving
/kmgraph:kmg-update-graph --lesson=Pattern.md --auto        # Called from capture-lesson
```

---

## Execution

### Step 1: Parse Flags

Detect which flags the user passed:

| Flag | Behavior |
|------|----------|
| (none) | Interactive mode — process recent lessons with prompts |
| `--lesson=X` | Process specific lesson file |
| `--auto` | Skip all confirmations |
| `--edit-entry` | Present draft for review before saving |
| `--category=X` | Filter by category |
| `--sync-all` | Check all lessons for missing entries |
| `--show-updates` | Display before/after diffs |

### Step 2: Delegate to knowledge-extractor (KG Entry Extraction Mode)

Spawn the `knowledge-extractor` agent in KG Entry Extraction Mode with parsed flags:

```
Agent: agents/knowledge-extractor.md
Mode: KG Entry Extraction Mode
Parameters:
  lesson: [value from --lesson or null]
  auto: [true/false based on --auto flag]
  edit_entry: [true/false based on --edit-entry flag]
  category: [value from --category or null]
  sync_all: [true/false based on --sync-all flag]
  show_updates: [true/false based on --show-updates flag]
```

The agent executes the full extraction pipeline:
1. Resolve target graph via `kg_resolve` (cwd-derived; no separate "active" pointer or CWD-mismatch check — ADR-067)
2. Identify new or modified lessons
3. Extract key elements (title, problem, solution, triggers, category)
4. Check existing knowledge graph for duplicates
5. Create or update knowledge entries
6. Update cross-references (bidirectional links)
7. Verify entry quality
8. Flag governance-worthy content in output

### Step 3: Display Results

The agent returns results in the appropriate format based on flags used.

**Standalone `--auto`:**
```
Updated [count] entries
```

**With `--lesson` (from capture-lesson workflow):**
```
KG entry created: patterns.md -> "Pattern Name"

Quality Assessment (knowledge-reviewer):
- Clarity: Good
- Completeness: Good
- Links: Bidirectional
- Category: Correct (patterns)

Files updated:
- knowledge/patterns.md
- lessons-learned/category/Pattern.md (Related Resources)
```

**With `--sync-all`:**
```
Synchronized: [list]
Broken links: [list]
Orphaned lessons: [list]
Suggested new entries: [list]
```

Display the output exactly as returned by the agent. Do not reformat.

---

## Key Principle

Knowledge entries LEVERAGE lessons, not REPLACE them:
- **Knowledge Graph** = Quick index (5-10 seconds)
- **Lesson-Learned** = Deep understanding (5-10 minutes)
- **Session wrap** = Governance capture point (rules-capture + triggers)
- Together = Efficient onboarding + comprehensive learning

---

## Related Commands

- `/kmgraph:kmg-capture-lesson` - Document new lessons learned
- `/kmgraph:kmg-recall` - Search across all KG systems
- `/kmgraph:kmg-sync-all` - Full knowledge sync pipeline (calls this command)
- `/kmgraph:kmg-update-issue-plan` - Sync KG -> plan -> issue -> GitHub

---

**Created:** 2026-02-12
**Version:** 3.0 (Refactored to thin dispatcher + knowledge-extractor KG Entry Extraction Mode)
**Purpose:** Keep knowledge graph synchronized with lessons-learned via extraction and linking
**Architecture:** LEVERAGE lessons (not replace) - quick ref + deep dive + persistent context together
**Success Criteria:** All recent lessons have corresponding quick-reference knowledge entries with valid bidirectional links. Governance-worthy lessons are flagged in output for capture at session wrap.
