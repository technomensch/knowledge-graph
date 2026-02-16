# Manual Workflows

**For users without Claude Code (or any automation platform)**

This guide provides step-by-step manual workflows for using the knowledge graph system without automation.

---

## Setup

### 1. Initialize Directory Structure

```bash
# Create knowledge graph directories
mkdir -p docs/{lessons-learned/{architecture,debugging,process,patterns},decisions,knowledge,sessions}

# Create placeholder READMEs for each category
for dir in docs/lessons-learned/*/; do
  cat > "$dir/README.md" << 'EOF'
# Category

Lessons in this category:

<!-- Add links as you create lessons -->
EOF
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

# Templates now available at:
# docs/templates/lessons-learned/lesson-template.md
# docs/templates/decisions/ADR-template.md
# etc.
```

---

## Workflow 1: Create Lesson Learned

**When:** You solved a non-trivial problem and want to document it.

###Step-by-Step

**1. Choose category:**

Based on problem type:
- `architecture/` — System design, component structure
- `debugging/` — Troubleshooting, bug fixes
- `process/` — Workflow improvements, tools
- `patterns/` — Reusable design patterns

**2. Copy template:**

```bash
# Choose meaningful filename (use underscores)
cp docs/templates/lessons-learned/lesson-template.md \
   docs/lessons-learned/process/Database_Connection_Pooling.md
```

**3. Fill in template:**

```bash
vim docs/lessons-learned/process/Database_Connection_Pooling.md
```

Replace all `[placeholders]` with your content:

```markdown
# Lesson Learned: Database Connection Pooling

**Date:** 2024-10-15
**Category:** process
**Tags:** #database #performance #pooling

## Problem

Application was creating new database connection for every request,
causing high latency (>5s response time) and connection exhaustion.

[... fill in remaining sections ...]
```

**4. Update category README:**

```bash
vim docs/lessons-learned/process/README.md
```

Add link to new lesson:

```markdown
# Process Lessons

- [Database Connection Pooling](./Database_Connection_Pooling.md) - Fixing connection exhaustion
- [Existing Lesson](./Existing_Lesson.md)
```

**5. (Optional) Extract to knowledge graph:**

If lesson contains reusable pattern:

```bash
vim docs/knowledge/patterns.md
```

Add extracted pattern:

```markdown
## Connection Pooling Pattern

**Problem:** Creating connection per request doesn't scale

**Solution:** Maintain pool of reusable connections

**When to use:** High-throughput applications, connection overhead noticeable

**Cross-References:**
- **Lesson:** [[lessons-learned/process/Database_Connection_Pooling.md]]
```

**6. Commit:**

```bash
git add docs/lessons-learned/process/Database_Connection_Pooling.md
git add docs/lessons-learned/process/README.md
git add docs/knowledge/patterns.md  # if you updated it

git commit -m "docs: add lesson on database connection pooling

Documented solution to connection exhaustion issue.
Extracted connection pooling pattern to knowledge graph."
```

---

## Workflow 2: Create Architecture Decision Record (ADR)

**When:** Making an architectural decision that affects multiple people or components.

### Step-by-Step

**1. Find next ADR number:**

```bash
# List existing ADRs
ls docs/decisions/ | grep "ADR-"

# Example output:
# ADR-001-dual-format-docs.md
# ADR-002-skills-architecture.md

# Next number: ADR-003
```

**2. Copy template with number:**

```bash
cp docs/templates/decisions/ADR-template.md \
   docs/decisions/ADR-003-connection-pooling.md
```

**3. Fill in template:**

```bash
vim docs/decisions/ADR-003-connection-pooling.md
```

Focus on:
- **Context:** Why decision needed
- **Options:** What alternatives considered (2-4 options)
- **Decision:** What chosen and why
- **Consequences:** Positive and negative outcomes

**4. Update ADR index:**

If you have `docs/decisions/README.md`:

```markdown
# Architecture Decision Records

- [ADR-001: Dual-Format Documentation](./ADR-001-dual-format-docs.md) - Accepted
- [ADR-002: Skills Architecture](./ADR-002-skills-architecture.md) - Accepted
- [ADR-003: Connection Pooling Strategy](./ADR-003-connection-pooling.md) - Accepted
```

**5. Link from related lessons:**

If related lesson exists:

```bash
vim docs/lessons-learned/process/Database_Connection_Pooling.md
```

Add cross-reference:

```markdown
## Cross-References
- **ADR:** [[../../decisions/ADR-003-connection-pooling.md]]
```

**6. Commit:**

```bash
git add docs/decisions/ADR-003-connection-pooling.md
git commit -m "docs(adr): ADR-003 connection pooling strategy

Decided to use PgBouncer for centralized connection pooling.
Considered application-level pooling but chose proxy approach
for better resource utilization."
```

---

## Workflow 3: Extract Chat History

**Platform:** Claude Code or Gemini/Antigravity

### Claude Code

```bash
# Run extraction script
python3 core/scripts/extract_claude.py

# Output to chat-history/
# Organized by date: chat-history/2024-10/2024-10-15-claude.md
```

### Gemini/Antigravity

```bash
python3 core/scripts/extract_gemini.py

# Output to chat-history/
# Organized by date: chat-history/2024-10/2024-10-15-gemini.md
```

### Review and Extract Knowledge

**1. Read extracted chat:**

```bash
cat chat-history/2024-10/2024-10-15-claude.md
```

**2. Identify valuable content:**

Look for:
- Problem-solving sessions (→ Lesson Learned)
- Architectural discussions (→ ADR)
- Discovered patterns (→ Knowledge Graph)

**3. Create lesson from chat:**

```bash
# Copy relevant chat section to lesson template
cp docs/templates/lessons-learned/lesson-template.md \
   docs/lessons-learned/debugging/API_Timeout_Investigation.md

# Fill in using chat as source material
vim docs/lessons-learned/debugging/API_Timeout_Investigation.md

# Reference original chat
echo "**Source:** chat-history/2024-10/2024-10-15-claude.md" >> \
  docs/lessons-learned/debugging/API_Timeout_Investigation.md
```

---

## Workflow 4: Search Knowledge Base

**Manual search using grep:**

### Search all knowledge

```bash
# Search for keyword across all docs
grep -r "connection pool" docs/

# Search just lessons
grep -r "connection pool" docs/lessons-learned/

# Search with context (3 lines before/after)
grep -r -C 3 "connection pool" docs/
```

### Search by category

```bash
# Find all architecture lessons
ls docs/lessons-learned/architecture/

# Find all debugging lessons
ls docs/lessons-learned/debugging/
```

### Search by tag

```bash
# Find all lessons tagged #performance
grep -r "#performance" docs/lessons-learned/
```

### Search knowledge graph

```bash
# Quick patterns reference
grep -A 5 "^## " docs/knowledge/patterns.md

# Find specific pattern
grep -A 10 "Connection Pooling" docs/knowledge/patterns.md

# All gotchas
grep -A 5 "^## " docs/knowledge/gotchas.md
```

---

## Workflow 5: Create Session Summary

**When:** End of work session or major feature completion.

### Step-by-Step

**1. Create session file:**

```bash
# Organize by month
mkdir -p docs/sessions/2024-10

# Create summary
cp docs/templates/sessions/session-template.md \
   docs/sessions/2024-10/session-2024-10-15.md
```

**2. Fill in sections:**

```markdown
# Session Summary: 2024-10-15

## Overview
Implemented database connection pooling to fix performance issues.

## Built
- PgBouncer configuration
- Application connection pool settings
- Monitoring dashboard

## Decided
- Use PgBouncer over application-level pooling (see ADR-003)
- Transaction pooling mode (not session pooling)

## Learned
- CI needs higher pool size than local due to concurrency
- Monitor pool utilization, not just connection count

## Next
- Deploy to staging for load testing
- Create runbook for PgBouncer operations
```

**3. Commit:**

```bash
git add docs/sessions/2024-10/session-2024-10-15.md
git commit -m "docs(session): session summary for 2024-10-15"
```

---

## Workflow 6: Create Meta-Issue

**When:** Complex problem requiring multiple solution attempts.

### Step-by-Step

**1. Create meta-issue directory:**

```bash
mkdir -p docs/meta-issues/performance-degradation/{attempts,analysis}
```

**2. Create core files:**

```bash
# Navigation hub
cp core/templates/meta-issue/README-template.md \
   docs/meta-issues/performance-degradation/README.md

# Living description
cp core/templates/meta-issue/description-template.md \
   docs/meta-issues/performance-degradation/description.md

# Implementation log
cp core/templates/meta-issue/implementation-log-template.md \
   docs/meta-issues/performance-degradation/implementation-log.md

# Test cases
cp core/templates/meta-issue/test-cases-template.md \
   docs/meta-issues/performance-degradation/test-cases.md
```

**3. Create first attempt:**

```bash
mkdir docs/meta-issues/performance-degradation/attempts/001-caching

# Solution approach
cp core/templates/meta-issue/solution-approach-template.md \
   docs/meta-issues/performance-degradation/attempts/001-caching/solution-approach.md

# Results (create after attempt)
cp core/templates/meta-issue/attempt-results-template.md \
   docs/meta-issues/performance-degradation/attempts/001-caching/attempt-results.md
```

**4. Document as you go:**

- **Before attempt:** Fill in solution-approach.md
- **During attempt:** Update implementation-log.md with daily progress
- **After attempt:** Fill in attempt-results.md with outcome
- **If failed:** Create next attempt directory (002-*)
- **When resolved:** Update description.md with final understanding

**5. Extract lesson when resolved:**

```bash
cp docs/templates/lessons-learned/lesson-template.md \
   docs/lessons-learned/debugging/Performance_Degradation_Resolution.md

# Reference meta-issue in lesson
echo "**Meta-Issue:** [[../meta-issues/performance-degradation/README.md]]" >> \
  docs/lessons-learned/debugging/Performance_Degradation_Resolution.md
```

See [META-ISSUE-GUIDE.md](./META-ISSUE-GUIDE.md) for detailed guide.

---

## Workflow 7: Update Knowledge Graph from Lesson

**When:** Lesson contains reusable pattern/concept/gotcha.

### Extract Pattern

**1. Identify pattern in lesson:**

Read lesson, find reusable approach:

```markdown
# In lesson
## Solution
We implemented connection pooling with these settings:
- Pool size: 20 per instance
- Idle timeout: 30s
- Max wait: 10s
```

**2. Add to patterns.md:**

```bash
vim docs/knowledge/patterns.md
```

Add entry:

```markdown
## Connection Pooling Pattern

**Problem:** Per-request connections don't scale

**Solution:** Maintain pool of reusable connections

**Quick Reference:**
- Pool size: 10-20 per instance
- Idle timeout: 30-60s
- Max wait: 5-10s
- Monitor: utilization, wait time, errors

**When to use:**
- High throughput (>100 req/sec)
- Connection overhead noticeable
- Connection limits

**Cross-References:**
- **Lesson:** [[lessons-learned/process/Database_Connection_Pooling.md]]
- **ADR:** [[decisions/ADR-003-connection-pooling.md]]
```

### Extract Gotcha

If lesson reveals common pitfall:

```bash
vim docs/knowledge/gotchas.md
```

Add entry:

```markdown
## CI Connection Exhaustion

**Symptom:** Tests pass locally, fail in CI with "too many connections"

**Gotcha:** CI runs tests in parallel, local runs sequentially. Higher concurrency → more connections needed.

**Fix:** Increase pool size for CI environment (not local)

**Why:** Parallel execution multiplies connection usage

**Cross-References:**
- **Lesson:** [[lessons-learned/debugging/CI_Connection_Issues.md]]
```

---

## Workflow 8: Review and Maintain

**Frequency:** Monthly or quarterly

### Check for Stale Content

```bash
# Find lessons older than 1 year
find docs/lessons-learned -name "*.md" -mtime +365

# Review for relevance:
# - Still accurate?
# - Solution still recommended?
# - Update or archive?
```

### Consolidate Duplicates

```bash
# Search for similar topics
grep -r "connection pool" docs/lessons-learned/

# If multiple lessons on same topic:
# - Consolidate into one comprehensive lesson
# - Cross-reference others
# - Or: Keep both if different aspects
```

### Update Cross-References

```bash
# Find broken links
grep -r "\[\[.*\]\]" docs/ | while read line; do
  # Extract filename from [[filename]]
  # Check if exists
  # Report broken links
done
```

### Archive Old Content

```bash
# Move old sessions to archive
mkdir -p docs/sessions/archive
mv docs/sessions/2022-* docs/sessions/archive/

# Update knowledge graph
# (Remove patterns no longer used)
```

---

## Tips for Manual Workflows

### Use Shell Aliases

```bash
# Add to ~/.bashrc or ~/.zshrc

alias lesson='cp docs/templates/lessons-learned/lesson-template.md'
alias adr='ls docs/decisions/ | grep ADR | tail -1'  # Shows last ADR number
alias kg-search='grep -r'
alias kg-patterns='cat docs/knowledge/patterns.md'
```

Usage:

```bash
lesson docs/lessons-learned/process/my-lesson.md
adr  # Shows: ADR-005.md (so next is ADR-006)
kg-search "validation" docs/
kg-patterns | less
```

### Use Editor Templates

Configure your editor to insert templates:

**Vim:**

```vim
" In ~/.vimrc
command! Lesson r ~/.templates/lesson-template.md
command! ADR r ~/.templates/ADR-template.md
```

**VSCode:**

Create snippets in settings.json.

---

## Related

- **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- **Patterns Guide:** [PATTERNS-GUIDE.md](./PATTERNS-GUIDE.md) - Writing good entries
- **Examples:** [../examples/](../examples/) - Study these
- **Templates:** [../templates/](../templates/) - Start from these
