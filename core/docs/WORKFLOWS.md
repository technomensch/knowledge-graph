# Manual Workflows

**Navigation**: [Home](../../README.md) > [Getting Started](../../docs/GETTING-STARTED.md) > Manual Workflows

**For users without Claude Code (or any automation platform)**

This guide provides step-by-step workflows for using the knowledge graph system manually. Each workflow includes the exact commands to run and what to fill in at each step.

> **💡 New to knowledge graphs?**
>
> This guide assumes you've completed initial setup. If not:
> - Start with [Getting Started](../../docs/GETTING-STARTED.md#manual-setup)
> - Read [Concepts Guide](../../docs/CONCEPTS.md) for term definitions
> - Review [templates](../templates/) to understand structure

> **Using Claude Code?** Most of these workflows have a single command equivalent. See [COMMAND-GUIDE.md](../../docs/COMMAND-GUIDE.md).

---

## Table of Contents

**Quick Start (first-time setup)**
1. [Setup](#setup)

**Daily Workflows (regular use)**
2. [Workflow 1: Create Lesson Learned](#workflow-1-create-lesson-learned)
3. [Workflow 2: Create Architecture Decision Record (ADR)](#workflow-2-create-architecture-decision-record-adr)
4. [Workflow 3: Extract Chat History](#workflow-3-extract-chat-history)
5. [Workflow 4: Search Knowledge Base](#workflow-4-search-knowledge-base)
6. [Workflow 5: Create Session Summary](#workflow-5-create-session-summary)

**Advanced Workflows (as needed)**
7. [Workflow 6: Create Meta-Issue](#workflow-6-create-meta-issue)
8. [Workflow 7: Extract Patterns to Knowledge Graph](#workflow-7-extract-patterns-to-knowledge-graph)

**Maintenance (monthly/quarterly)**
9. [Workflow 8: Review and Maintain](#workflow-8-review-and-maintain)
10. [Workflow 9: Manage MEMORY.md](#workflow-9-manage-memorymd)

11. [Tips and Shortcuts](#tips-and-shortcuts)

---

## Setup

### 1. Initialize Directory Structure

```bash
# Create knowledge graph directories
mkdir -p docs/{lessons-learned/{architecture,debugging,process,patterns},decisions,knowledge,sessions}

# Create placeholder READMEs
for dir in docs/lessons-learned/*/; do
  echo -e "# Category\n\nLessons in this category:\n\n<!-- Add links as you create lessons -->" > "$dir/README.md"
done

# Create main knowledge graph files
touch docs/knowledge/{patterns.md,concepts.md,gotchas.md}

# Add to git
git add docs/
git commit -m "docs: initialize knowledge graph structure"
```

### 2. Copy Templates

```bash
# Copy all templates to your project
cp -r core/templates/. docs/templates/
```

Templates available after copying:
- `docs/templates/lessons-learned/lesson-template.md` — For problems solved
- `docs/templates/decisions/ADR-template.md` — For important decisions
- `docs/templates/knowledge/entry-template.md` — For patterns and concepts
- `docs/templates/sessions/session-template.md` — For work session summaries

> **What are templates?** See [Template](../../docs/CONCEPTS.md#template) in the Concepts Guide.

---

## Workflow 1: Create Lesson Learned

**When:** Solved a non-trivial problem and want to document the solution for future reference.

**Claude Code equivalent:** `/knowledge:capture-lesson`

### Step-by-Step

**1. Choose a category** based on problem type:

| Category | Use for |
|---|---|
| `architecture/` | System design, component structure |
| `debugging/` | Troubleshooting, bug fixes |
| `process/` | Workflow improvements, tools |
| `patterns/` | Reusable design patterns |

**2. Copy template with a meaningful filename:**

```bash
cp docs/templates/lessons-learned/lesson-template.md \
   docs/lessons-learned/process/Database_Connection_Pooling.md
```

**3. Fill in the template** — open the file and fill in `[MANUAL]` fields:

```yaml
---
title: "Lesson: Database Connection Pooling"  # [MANUAL]
category: process                              # [MANUAL]
tags: [database, performance, pooling]         # [MANUAL]
# [AUTO] fields (created, author, git.*) filled by command; leave blank manually
---
```

Then write the body — answer these four questions:
- **Problem:** What went wrong?
- **Root Cause:** Why did it happen?
- **Solution:** What fixed it (step by step)?
- **Prevention:** How to avoid this in the future?

**4. Update the category README** — open `docs/lessons-learned/process/README.md` and add a link:

```markdown
- [Database Connection Pooling](./Database_Connection_Pooling.md) - Fixing connection exhaustion
```

**5. (Optional) Extract reusable pattern** to knowledge graph — see [Workflow 7](#workflow-7-extract-patterns-to-knowledge-graph).

**6. Commit:**

```bash
git add docs/lessons-learned/process/Database_Connection_Pooling.md
git add docs/lessons-learned/process/README.md
git commit -m "docs: add lesson on database connection pooling"
```

> **Why document immediately?** Details are freshest right after solving the problem. Documenting later means forgetting the root cause and key steps.

---

## Workflow 2: Create Architecture Decision Record (ADR)

**When:** Making an architectural decision that affects multiple people or components — something a future team member might ask "why did the team do it this way?"

**Claude Code equivalent:** `/knowledge:capture-lesson` (with ADR category)

> **What is an ADR?** See [ADR](../../docs/CONCEPTS.md#adr-architecture-decision-record) in the Concepts Guide.

### Step-by-Step

**1. Find the next ADR number:**

```bash
ls docs/decisions/ | grep "ADR-"
# Example: ADR-001-dual-format-docs.md, ADR-002-skills-architecture.md
# → Next number: ADR-003
```

**2. Copy template with numbered filename:**

```bash
cp docs/templates/decisions/ADR-template.md \
   docs/decisions/ADR-003-connection-pooling.md
```

**3. Fill in the template** — focus on these four sections:
- **Context:** Why was this decision needed?
- **Options:** What alternatives were considered? (list 2–4 options)
- **Decision:** What was chosen and why?
- **Consequences:** What are the expected positive and negative outcomes?

**4. Update ADR index** — open `docs/decisions/README.md` and add:

```markdown
- [ADR-003: Connection Pooling Strategy](./ADR-003-connection-pooling.md) - Accepted
```

**5. Link from related lessons** (optional) — in the lesson file's Cross-References section:

```markdown
- **ADR:** [[../../decisions/ADR-003-connection-pooling.md]]
```

**6. Commit:**

```bash
git add docs/decisions/ADR-003-connection-pooling.md
git commit -m "docs(adr): ADR-003 connection pooling strategy"
```

---

## Workflow 3: Extract Chat History

**When:** A productive AI conversation contains insights worth preserving in the knowledge graph.

**Platform:** Claude Code or Gemini/Antigravity

### Run Extraction Script

**Claude Code:**

```bash
python3 core/scripts/extract_claude.py
# Output: chat-history/YYYY-MM/YYYY-MM-DD-claude.md
```

**Gemini/Antigravity:**

```bash
python3 core/scripts/extract_gemini.py
# Output: chat-history/YYYY-MM/YYYY-MM-DD-gemini.md
```

### Review and Extract Knowledge

Read the extracted chat and identify content to preserve:

| Found in chat | Action |
|---|---|
| Problem-solving session | → Create Lesson Learned (Workflow 1) |
| Architectural discussion | → Create ADR (Workflow 2) |
| Reusable pattern discovered | → Update Knowledge Graph (Workflow 7) |

When creating a lesson from a chat, reference the source:

```markdown
**Source:** chat-history/2024-10/2024-10-15-claude.md
```

---

## Workflow 4: Search Knowledge Base

**When:** Looking for a previously documented solution, pattern, or decision.

**Claude Code equivalent:** `/knowledge:recall`

### Search All Knowledge

```bash
# Search across all docs
grep -r "connection pool" docs/

# Search with context (3 lines before/after match)
grep -r -C 3 "connection pool" docs/
```

### Search by Category or Tag

```bash
# Find all architecture lessons
ls docs/lessons-learned/architecture/

# Find all lessons tagged #performance
grep -r "#performance" docs/lessons-learned/
```

### Search Knowledge Graph Files

```bash
# Browse all patterns (section headers)
grep -A 5 "^## " docs/knowledge/patterns.md

# Find specific pattern
grep -A 10 "Connection Pooling" docs/knowledge/patterns.md

# All gotchas
grep -A 5 "^## " docs/knowledge/gotchas.md
```

---

## Workflow 5: Create Session Summary

**When:** End of a significant work session — major debugging, architecture discussion, or sprint.

**Claude Code equivalent:** `/knowledge:session-summary`

> **What is a session summary?** See [Session Summary](../../docs/CONCEPTS.md#session-summary) in the Concepts Guide.

### Step-by-Step

**1. Create session file organized by month:**

```bash
mkdir -p docs/sessions/2024-10
cp docs/templates/sessions/session-template.md \
   docs/sessions/2024-10/session-2024-10-15.md
```

**2. Fill in the four main sections:**

```markdown
## Overview
[1-2 sentences: what did this session accomplish?]

## Built
- [Concrete deliverable 1]
- [Concrete deliverable 2]

## Decided
- [Key decision] (see ADR-003)

## Learned
- [Insight that changes future approach]

## Next
- [First concrete next action]
```

**3. Commit:**

```bash
git add docs/sessions/2024-10/session-2024-10-15.md
git commit -m "docs(session): session summary for 2024-10-15"
```

---

## Workflow 6: Create Meta-Issue

**When:** A complex problem has required multiple solution attempts with evolving understanding — the problem is not yet resolved or just resolved after several attempts.

**Claude Code equivalent:** `/knowledge:meta-issue`

> **What is a meta-issue?** See [Meta-Issue](../../docs/CONCEPTS.md#meta-issue) in the Concepts Guide.

### Step-by-Step

**1. Create the meta-issue directory structure:**

```bash
mkdir -p docs/meta-issues/performance-degradation/{attempts,analysis}
```

**2. Copy core files from templates:**

```bash
cp core/templates/meta-issue/README-template.md \
   docs/meta-issues/performance-degradation/README.md
cp core/templates/meta-issue/description-template.md \
   docs/meta-issues/performance-degradation/description.md
cp core/templates/meta-issue/implementation-log-template.md \
   docs/meta-issues/performance-degradation/implementation-log.md
cp core/templates/meta-issue/test-cases-template.md \
   docs/meta-issues/performance-degradation/test-cases.md
```

**3. Create first attempt directory:**

```bash
mkdir docs/meta-issues/performance-degradation/attempts/001-caching
cp core/templates/meta-issue/solution-approach-template.md \
   docs/meta-issues/performance-degradation/attempts/001-caching/solution-approach.md
cp core/templates/meta-issue/attempt-results-template.md \
   docs/meta-issues/performance-degradation/attempts/001-caching/attempt-results.md
```

**4. Document as the investigation progresses:**

| Stage | Action |
|---|---|
| Before attempt | Fill in `solution-approach.md` |
| During attempt | Update `implementation-log.md` with daily progress |
| After attempt | Fill in `attempt-results.md` with outcome |
| If failed | Create next attempt directory (`002-*`) |
| When resolved | Update `description.md` with final understanding |

**5. Extract lesson when resolved:**

```bash
cp docs/templates/lessons-learned/lesson-template.md \
   docs/lessons-learned/debugging/Performance_Degradation_Resolution.md
```

Add cross-reference to the lesson:
```markdown
**Meta-Issue:** [[../meta-issues/performance-degradation/README.md]]
```

See [META-ISSUE-GUIDE.md](./META-ISSUE-GUIDE.md) for a detailed guide.

---

## Workflow 7: Extract Patterns to Knowledge Graph

**When:** A lesson contains a reusable pattern, concept, or common pitfall worth preserving as a quick-reference entry.

**Claude Code equivalent:** `/knowledge:update-graph`

### Extract a Pattern

**1. Identify the reusable element** in the lesson:

```markdown
# In the lesson body:
## Solution
Implemented connection pooling with: pool size 20, idle timeout 30s, max wait 10s.
```

**2. Add to `docs/knowledge/patterns.md`:**

```markdown
## Connection Pooling Pattern

**Problem:** Per-request connections don't scale under load

**Solution:** Maintain a pool of reusable connections

**Quick Reference:**
- Pool size: 10–20 per instance
- Idle timeout: 30–60s
- Max wait: 5–10s
- Monitor: utilization, wait time, errors

**When to use:** High throughput (>100 req/sec), when connection overhead is noticeable

**Cross-References:**
- **Lesson:** [[lessons-learned/process/Database_Connection_Pooling.md]]
- **ADR:** [[decisions/ADR-003-connection-pooling.md]]
```

### Extract a Gotcha

If the lesson reveals a common pitfall, add it to `docs/knowledge/gotchas.md`:

```markdown
## CI Connection Exhaustion

**Symptom:** Tests pass locally, fail in CI with "too many connections"

**Root Cause:** CI runs tests in parallel; local runs sequentially. Parallel execution
multiplies connection usage.

**Fix:** Increase pool size for CI environment specifically

**Cross-References:**
- **Lesson:** [[lessons-learned/debugging/CI_Connection_Issues.md]]
```

---

## Workflow 8: Review and Maintain

**Frequency:** Monthly or quarterly

### Check for Stale Content

```bash
# Find lessons not modified in over a year
find docs/lessons-learned -name "*.md" -mtime +365
```

For each stale lesson, ask:
- Is the solution still accurate?
- Is it still the recommended approach?
- Should it be updated or archived?

### Consolidate Duplicates

```bash
# Search for similar topics
grep -r "connection pool" docs/lessons-learned/
```

If multiple lessons cover the same topic, either consolidate into one comprehensive lesson or keep both and cross-reference them.

### Archive Old Sessions

```bash
# Move old sessions to archive
mkdir -p docs/sessions/archive
mv docs/sessions/2022-* docs/sessions/archive/
```

---

## Workflow 9: Manage MEMORY.md

**When:** MEMORY.md is approaching the token budget limit (~1,500 tokens / ~200 lines) or archived knowledge needs to be retrieved.

**Claude Code equivalent:** `/knowledge:archive-memory` and `/knowledge:restore-memory`

> **What is MEMORY.md?** See [MEMORY.md](../../docs/CONCEPTS.md#memorymd) in the Concepts Guide.

### Part A: Archive Stale Entries

**1. Check current size:**

```bash
MEMORY_PATH="$HOME/.claude/projects/$(basename $(pwd))/memory/MEMORY.md"
words=$(wc -w < "$MEMORY_PATH")
echo "Current size: ~$((words * 13 / 10)) tokens (target: <1,500)"
```

**2. Identify entries to archive** — look for:
- Entries last referenced more than 90 days ago
- Historical context no longer relevant to active work

**3. Move stale entries:**
- Copy the full section (heading + content) from MEMORY.md to `MEMORY-archive.md`
- Remove the section from MEMORY.md
- Add an archive log entry noting what was archived and when

**4. Commit both files:**

```bash
git add memory/MEMORY*.md
git commit -m "docs(memory): archive stale entries (~X tokens freed)"
```

### Part B: Restore Archived Entries

**1. View archived entries:**

```bash
grep "^### " memory/MEMORY-archive.md
```

**2. Copy the needed entry** back to the appropriate section of MEMORY.md.

**3. Mark the restoration** in the archive log and commit both files.

### Decision Guide

| Situation | Action |
|---|---|
| MEMORY.md > 1,500 tokens | Archive oldest entries |
| Working on a related problem | Restore relevant archived entry |
| Entry > 90 days old, not needed | Leave archived |

---

## Tips and Shortcuts

### Shell Aliases

Add to `~/.bashrc` or `~/.zshrc`:

```bash
alias lesson='cp docs/templates/lessons-learned/lesson-template.md'
alias kg-search='grep -r'
alias kg-patterns='cat docs/knowledge/patterns.md'
alias last-adr='ls docs/decisions/ | grep ADR | tail -1'
```

### Editor Template Shortcuts

**Vim** (`~/.vimrc`): `command! Lesson r ~/.templates/lesson-template.md`

**VSCode:** Create file snippets in `settings.json` to insert template content with a keyword shortcut.

---

## Related Documentation

- **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md) — How the system is designed
- **Patterns Guide:** [PATTERNS-GUIDE.md](./PATTERNS-GUIDE.md) — Writing effective entries
- **Concepts:** [CONCEPTS.md](../../docs/CONCEPTS.md) — Plain-English term definitions
- **Examples:** [../examples/](../examples/) — Real-world samples to study
- **Templates:** [../templates/](../templates/) — Starting scaffolds
- **Command Guide:** [COMMAND-GUIDE.md](../../docs/COMMAND-GUIDE.md) — All commands (Claude Code users)
