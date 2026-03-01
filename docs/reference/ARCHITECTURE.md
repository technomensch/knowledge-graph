# Knowledge Graph Architecture

**Platform-Agnostic Knowledge Management System**

This document describes the core architectural concepts behind the knowledge graph system.

---

## Core Concept: The Four-Pillar Memory

The knowledge graph uses **four complementary knowledge systems**, each optimized for different purposes:

```
┌─────────────────────────────────────────────────────────────┐
│                   FOUR-PILLAR MEMORY                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ Lessons Learned  │  │     ADRs         │               │
│  │ (Deep Dive)      │  │ (Formal)         │               │
│  │                  │  │                  │               │
│  │ • Problem        │  │ • Context        │               │
│  │ • Root Cause     │  │ • Options        │               │
│  │ • Solution       │  │ • Decision       │               │
│  │ • Replication    │  │ • Consequences   │               │
│  │ • Lessons        │  │                  │               │
│  │                  │  │                  │               │
│  │ 5-10 min read    │  │ 3-5 min read     │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ Knowledge Graph  │  │Session Summaries │               │
│  │ (Quick Ref)      │  │ (Historical)     │               │
│  │                  │  │                  │               │
│  │ • Patterns       │  │ • Overview       │               │
│  │ • Concepts       │  │ • Built          │               │
│  │ • Gotchas        │  │ • Decided        │               │
│  │                  │  │ • Learned        │               │
│  │ 5-10 sec scan    │  │ • Next           │               │
│  │                  │  │                  │               │
│  │ Links to lessons │  │ 2-3 min scan     │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### The LEVERAGE Principle

**Knowledge Graph** and **Lessons Learned** work together:

- **KG = Quick Reference** (5-10 seconds)
  - Scan while working
  - Quick answer to "what is this?"
  - Links to deeper dive

- **Lessons = Deep Dive** (5-10 minutes)
  - Read when needed
  - Full context and rationale
  - Replication steps

**Bidirectional relationship:**
- KG links to detailed lessons ("see lesson for full context")
- Lessons extract to KG entries ("key insights for quick reference")
- Start with KG, drill into Lessons as needed

---

## Information Flow

```
┌─────────────┐
│   WORK      │
│ (Problems,  │
│ Decisions,  │
│  Learning)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ CAPTURE             │
│                     │
│ • Lesson Learned    │  ← Detailed problem-solving journey
│ • ADR               │  ← Formal architectural decision
│ • Session Summary   │  ← Work session snapshot
└──────┬──────────────┘
       │
       │ (Extract key insights)
       ▼
┌─────────────────────┐
│ KNOWLEDGE GRAPH     │
│                     │
│ • Pattern           │  ← Extracted from lesson
│ • Concept           │  ← Distilled from ADR
│ • Gotcha            │  ← Common pitfall documented
└──────┬──────────────┘
       │
       │ (Bidirectional sync)
       ▼
┌─────────────────────┐
│ PROJECT MEMORY      │
│                     │
│ • MEMORY.md         │  ← Platform persistent context
│ • Git metadata      │  ← Commits, branches, issues
└─────────────────────┘
```

### Capture → Extract → Sync

1. **Capture:** Document problem-solving in Lessons Learned or ADRs
2. **Extract:** Pull key insights into Knowledge Graph for quick reference
3. **Sync:** Update project memory (MEMORY.md) with new knowledge

**Automation:** The `/kmgraph:sync-all` command orchestrates this entire flow.

---

## Directory Structure

```
project/
├── docs/
│   ├── lessons-learned/         # PILLAR 1: Detailed narratives
│   │   ├── architecture/        # System design lessons
│   │   ├── debugging/           # Troubleshooting journeys
│   │   ├── process/             # Workflow improvements
│   │   └── patterns/            # Design pattern discoveries
│   │
│   ├── decisions/               # PILLAR 2: Formal ADRs
│   │   ├── ADR-001.md           # Numbered decisions
│   │   ├── ADR-002.md
│   │   └── ...
│   │
│   ├── knowledge/               # PILLAR 3: Quick reference
│   │   ├── patterns.md          # Design patterns catalog
│   │   ├── concepts.md          # Core concepts definitions
│   │   └── gotchas.md           # Common pitfalls
│   │
│   └── sessions/                # PILLAR 4: Historical snapshots
│       └── 2024-12/
│           ├── session-001.md
│           └── session-002.md
│
└── MEMORY.md                    # Platform persistent context
```

### Why This Structure?

**Separation by purpose:**
- Lessons: "How we solved X" (narrative, chronological)
- ADRs: "Why we chose Y" (decision rationale, formal)
- Knowledge Graph: "Quick facts about Z" (reference, timeless)
- Sessions: "What happened when" (snapshots, historical)

**Different longevity:**
- Lessons & ADRs: Permanent (referenced years later)
- Knowledge Graph: Evolving (updated as understanding improves)
- Sessions: Historical (snapshot, not updated)

---

## Cross-Referencing

Knowledge artifacts reference each other to create a graph:

```markdown
# Example Lesson Learned

## Cross-References

- **Pattern:** [[patterns.md#multi-tier-synchronization]]
- **ADR:** [[ADR-007-dual-format-docs.md]]
- **Related Lesson:** [[architecture/Example_Three_Tier_Sync.md]]
- **Gotcha:** [[gotchas.md#absolute-path-regression]]
```

### Link Notation

- `[[filename.md]]` — Link to document
- `[[filename.md#section]]` — Link to specific section
- `[[category/filename.md]]` — Link with relative path

### Bidirectional Links

When creating a reference:
1. Link FROM new artifact TO existing artifacts
2. (Optional) Update existing artifacts to link back

Example:
```markdown
# In NEW lesson: lessons-learned/process/git-workflow.md
**Pattern:** [[patterns.md#branch-preservation]]

# In EXISTING pattern: knowledge/patterns.md
**Related Lesson:** [[lessons-learned/process/git-workflow.md]]
```

This creates a knowledge graph where:
- Patterns point to lessons that discovered them
- Lessons point to patterns they implement
- ADRs point to lessons that motivated decisions
- Gotchas point to lessons that solved them

---

## Metadata & Git Integration

### Git Metadata Tracking

Every lesson/ADR created via automation includes git context:

```markdown
**Branch:** v1.0.0-add-validation
**Commit:** a1b2c3d
**Issue:** #42
**Category:** process
```

**Why track git metadata?**
- Find relevant code changes (`git log --grep="[ISSUE_ID]"`)
- Understand what was being worked on
- Link documentation to implementation
- Historical context preservation

### Frontmatter (Optional)

For tools that support YAML frontmatter:

```markdown
---
title: "Three-Tier Configuration Sync"
date: 2024-08-15
category: architecture
tags: [synchronization, configuration, modularity]
related:
  - ADR-007
  - patterns.md#multi-tier-sync
---

# Lesson Content
...
```

---

## Knowledge Capture Workflow

### Manual (No Automation)

```bash
# 1. Copy template
cp core/templates/lessons-learned/lesson-template.md \
   docs/lessons-learned/process/my-lesson.md

# 2. Fill in sections
vim docs/lessons-learned/process/my-lesson.md

# 3. Update category README
vim docs/lessons-learned/process/README.md
# Add link to my-lesson.md

# 4. Extract to knowledge graph (manual)
vim docs/knowledge/patterns.md
# Add pattern extracted from lesson

# 5. Commit
git add docs/
git commit -m "docs: add lesson on my-topic"
```

### Automated (Claude Code)

```bash
# Single command does all steps
/kmgraph:capture-lesson

# Prompts for:
# - Topic
# - Category (auto-detected)
# - Content

# Automatically:
# - Creates from template
# - Adds git metadata
# - Updates category README
# - Commits with standard message
# - (Optional) Updates knowledge graph
```

### Full Pipeline (Sync-All)

```bash
/kmgraph:sync-all

# Orchestrates:
# 1. Capture lesson (if applicable)
# 2. Update knowledge graph
# 3. Update MEMORY.md
# 4. Create session summary
# 5. Commit everything with links
```

---

## Category Auto-Detection

Keywords map to categories automatically:

```javascript
const CATEGORY_KEYWORDS = {
  architecture: ['architecture', 'design', 'system', 'structure'],
  debugging: ['bug', 'debug', 'error', 'fix', 'troubleshoot'],
  process: ['workflow', 'process', 'automation', 'pipeline'],
  patterns: ['pattern', 'template', 'reusable', 'convention']
}

function detectCategory(title, description) {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => title.toLowerCase().includes(kw) || 
                            description.toLowerCase().includes(kw))) {
      return category
    }
  }
  return 'process' // default
}
```

User confirms or overrides auto-detection.

---

## Scalability

### Small Project (1-5 people)

- **Lessons:** 10-50 total
- **ADRs:** 5-15 total
- **KG entries:** 20-100 across patterns/concepts/gotchas
- **Management:** Manual browsing, grep search

### Medium Project (6-20 people)

- **Lessons:** 50-200 total
- **ADRs:** 15-50 total
- **KG entries:** 100-300
- **Management:** Category organization, search tools, curator role

### Large Project (20+ people)

- **Lessons:** 200+ total
- **ADRs:** 50+ total
- **KG entries:** 300+
- **Management:** Tag system, dedicated search, knowledge subteam

### Archival Strategy

For very large knowledge bases:

```
docs/
├── lessons-learned/
│   ├── 2024/           # Active year
│   └── archive/
│       ├── 2023/       # Previous years
│       └── 2022/
```

Archive lessons older than 2 years (still searchable, just organized).

---

## Privacy & Sanitization Architecture

### Layers of Protection

1. **Templates:** No sensitive data by default
2. **Examples:** All generalized, no real data
3. **Pre-commit Hook:** Scans for patterns before commit
4. **Sanitization Checklist:** Manual review before sharing

### What to Sanitize

- Personal information (emails, names, phone numbers)
- Authentication (API keys, passwords, tokens)
- Infrastructure (internal IPs, URLs, database strings)
- Company/customer-specific data

See [SANITIZATION-CHECKLIST.md](./SANITIZATION-CHECKLIST.md) for complete guide.

---

## Platform Integration

### Claude Code (Full Automation)

- Skills for all workflows
- SessionStart hooks auto-check
- Subagents for review
- MEMORY.md bidirectional sync

### Other Platforms (Manual + Core)

- Copy `core/` to project
- Use templates manually
- Follow workflows in `core/docs/WORKFLOWS.md`
- Optionally use MCP server

### MCP Server (Universal Access)

Expose knowledge graph as MCP resources:
- `resource://knowledge/patterns`
- `resource://knowledge/lessons`
- `tool://knowledge/search`

Any MCP-compatible platform can access.

---

## Design Rationale

### Why Markdown?

- Human-readable
- Version-controllable (git)
- Platform-agnostic
- Rich formatting support
- Grep-able

### Why Git Integration?

- Version history of knowledge
- Branching for experiments
- PR review of documentation
- Metadata linking (commit → lesson)

### Why Four Pillars?

Different knowledge types need different structures:
- Quick reference ≠ detailed narrative
- Formal decision ≠ informal learning
- Snapshot ≠ timeless knowledge

Forcing everything into one format loses value.

### Why Bidirectional Sync?

- KG stays current (updated from lessons)
- Lessons stay connected (linked from KG)
- Platform memory stays fresh (MEMORY.md)
- All systems reinforce each other

---

## Related

- **Patterns Guide:** [PATTERNS-GUIDE.md](./PATTERNS-GUIDE.md)
- **Workflows:** [WORKFLOWS.md](./WORKFLOWS.md)
- **Platform Adaptation:** [PLATFORM-ADAPTATION.md](./PLATFORM-ADAPTATION.md)
- **Examples:** [../examples/](../examples/)
