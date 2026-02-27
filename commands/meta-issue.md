---
description: Initialize and manage meta-issue tracking for complex multi-attempt problems
---

# Meta-Issue Tracking

Initialize and manage meta-issue tracking for complex, multi-attempt problems that evolve understanding over time.

**Based on:** ADR-008 Meta-Issue Tracking Pattern

---

## Usage

```bash
/kmgraph:meta-issue "Problem Title"
/kmgraph:meta-issue --add-attempt 003 "Try connection pooling"
/kmgraph:meta-issue --update-understanding "Root cause is network latency"
/kmgraph:meta-issue --status
```

---

## When to Use Meta-Issue Tracking

**Decision Criteria (SOP 0):**

Create a meta-issue when a problem meets **2 or more** of these criteria:

1. **Multiple Attempts:** 3+ solution attempts already tried or expected
2. **Evolving Understanding:** Root cause understanding has shifted 2+ times
3. **Cross-Version:** Problem spans multiple project versions
4. **High Complexity:** Requires coordination across multiple systems/components
5. **Learning Value:** Insights will benefit future similar problems

**Examples:**
- Performance investigation across v2.x (multiple optimization attempts)
- Data migration with evolving schema understanding
- Complex bug requiring multiple hypothesis tests
- System redesign with iterative prototypes

**Anti-patterns (do NOT use meta-issue for):**
- Simple bugs with single fix
- Standard feature implementation
- One-off debugging sessions

---

## Meta-Issue Structure

**Directory:** `{active_kg_path}/issues/[meta-issue-name]/`

```
meta-issue-name/
├── README.md                    # Navigation hub
├── description.md               # Living document (problem, status, current understanding)
├── implementation-log.md        # All attempts with plan references
├── test-cases.md                # Validation scenarios and success criteria
├── related-issues/
│   └── github-links.md          # GitHub issue/PR references
├── attempts/
│   ├── 001-baseline/
│   │   ├── solution-approach.md
│   │   ├── attempt-results.md
│   │   └── plan-reference.md
│   ├── 002-caching/
│   │   ├── solution-approach.md
│   │   ├── attempt-results.md
│   │   └── plan-reference.md
│   └── ...
└── analysis/
    ├── root-cause-evolution.md  # How understanding changed over time
    ├── timeline.md               # Chronological history
    └── lessons-learned.md        # Reusable insights
```

---

## Command: Initialize Meta-Issue

**Syntax:** `/kmgraph:meta-issue "Problem Title"`

### Step 1: Prompt for Metadata

**Interactive prompts:**

```
**Problem Title:** [user input or from command]
**Domain:** [architecture | performance | data | debugging | other]
**Scope:** [version-range or "ongoing"]
**Severity:** [critical | high | medium | low]
**Expected Attempts:** [estimated number]
```

### Step 2: Generate Directory Name

**Naming convention:**
```
Format: [version-range]-[domain]-saga/ OR [domain]-investigation/
Examples:
- v2.x-performance-investigation/
- data-migration-saga/
- authentication-redesign/
```

### Step 3: Create Directory Structure

**Get active KG path:**
```bash
active_kg=$(jq -r '.active' ~/.claude/kg-config.json)
kg_path=$(jq -r ".graphs[\"$active_kg\"].path" ~/.claude/kg-config.json)
```

**Create directories:**
```bash
meta_dir="${kg_path}/issues/${meta_issue_name}"
mkdir -p "$meta_dir"/{related-issues,attempts,analysis}
```

### Step 4: Populate Core Files from Templates

**Copy and customize templates from plugin:**

```bash
# Core files
for file in README description implementation-log test-cases; do
  cp "${CLAUDE_PLUGIN_ROOT}/core/templates/meta-issue/${file}.md" \
     "$meta_dir/${file}.md"
  # Customize with metadata
done

# Analysis files
for file in root-cause-evolution timeline lessons-learned; do
  cp "${CLAUDE_PLUGIN_ROOT}/core/templates/meta-issue/analysis/${file}.md" \
     "$meta_dir/analysis/${file}.md"
done

# Related issues
cp "${CLAUDE_PLUGIN_ROOT}/core/templates/meta-issue/related-issues/github-links.md" \
   "$meta_dir/related-issues/github-links.md"
```

**Customization:** Replace placeholder tokens in templates:
- `{{META_ISSUE_TITLE}}` → user-provided title
- `{{DOMAIN}}` → selected domain
- `{{CREATED_DATE}}` → current date
- `{{SCOPE}}` → version range or "ongoing"
- `{{SEVERITY}}` → severity level

### Step 5: Create First Attempt Folder (Optional)

**If user wants to document initial attempt:**

```bash
mkdir -p "$meta_dir/attempts/001-baseline"
cp "${CLAUDE_PLUGIN_ROOT}/core/templates/meta-issue/attempt-template/"* \
   "$meta_dir/attempts/001-baseline/"
```

### Step 6: Link to Knowledge Graph

**Update {active_kg_path}/knowledge/meta-issues.md:**

```markdown
## Active Meta-Issues

### [Problem Title](../issues/meta-issue-name/README.md)
- **Domain:** Performance
- **Created:** 2026-02-12
- **Attempts:** 1
- **Status:** Investigating
- **Current Understanding:** Initial hypothesis - network latency
```

### Step 7: Output Summary

```markdown
✅ **Meta-issue initialized:**
{active_kg_path}/issues/v2.x-performance-investigation/

**Structure created:**
- 4 core files (README, description, implementation-log, test-cases)
- 3 analysis files (root-cause-evolution, timeline, lessons-learned)
- 1 attempt folder (001-baseline) — ready for documentation

**Next steps:**
1. Document initial attempt: {meta_dir}/attempts/001-baseline/solution-approach.md
2. Update description with problem context
3. Define test cases in test-cases.md
4. Link to active plan if exists
```

---

## Command: Add New Attempt

**Syntax:** `/kmgraph:meta-issue --add-attempt 003 "Try connection pooling"`

### SOP 1: Creating New Attempt Folder

**Steps:**
1. Determine next attempt number (auto-increment from last)
2. Create folder: `attempts/[NNN]-[slug]/`
3. Copy attempt template files
4. Update implementation-log.md with new attempt entry
5. Link to plan if exists

**Example:**
```bash
# Create attempt 003
mkdir -p "${meta_dir}/attempts/003-connection-pooling"

# Copy templates
cp "${CLAUDE_PLUGIN_ROOT}/core/templates/meta-issue/attempt-template/"* \
   "${meta_dir}/attempts/003-connection-pooling/"

# Update implementation-log.md
echo "## Attempt 003: Connection Pooling (2026-02-12)" >> "${meta_dir}/implementation-log.md"
echo "**Status:** In Progress" >> "${meta_dir}/implementation-log.md"
echo "**Plan:** [v2.3.1](../../plans/v2.3.1-connection-pooling.md)" >> "${meta_dir}/implementation-log.md"
```

---

## Command: Update Root Cause Understanding

**Syntax:** `/kmgraph:meta-issue --update-understanding "Root cause is network latency"`

### SOP 2: Documenting Root Cause Evolution

**Steps:**
1. Read current `analysis/root-cause-evolution.md`
2. Append new understanding with timestamp
3. Link to evidence (attempt results, KG patterns)
4. Update `description.md` with current best understanding
5. Sync to knowledge graph

**Template entry:**
```markdown
## Belief Shift #[ID] (2026-02-12)

**Previous Understanding:**
Query optimization was bottleneck (from Attempt 001-002)

**New Understanding:**
Root cause is network latency, not query speed

**Evidence:**
- [Attempt 003 Results](../attempts/003-connection-pooling/attempt-results.md)
- Profiling showed 80% time in network I/O
- Database queries fast (<50ms), but network RTT 200-500ms

**Impact:**
Changed strategy from query optimization to connection pooling/caching
```

---

## Command: Meta-Issue Status

**Syntax:** `/kmgraph:meta-issue --status`

**Output:**
```
Meta-Issues in Active KG: {active_kg_path}/issues/

## v2.x-performance-investigation/
- **Domain:** Performance
- **Created:** 2026-01-15
- **Attempts:** 3 (2 failed, 1 in progress)
- **Status:** Investigating
- **Current Understanding:** Root cause is network latency (Belief Shift #[ID])
- **Last Updated:** 2026-02-12
- **KG Links:** 2 patterns referenced

## data-migration-saga/
- **Domain:** Data
- **Created:** 2026-02-01
- **Attempts:** 5 (4 completed, 1 pending)
- **Status:** Resolved
- **Current Understanding:** Schema versioning required
- **Last Updated:** 2026-02-10
- **KG Links:** 1 lesson learned
```

---

## Knowledge Graph Integration (SOP 3)

### Bidirectional Sync

**Meta-Issue → KG:**
When a pattern/lesson is discovered in meta-issue:
1. Extract to appropriate KG file (patterns.md, gotchas.md, etc.)
2. Include evidence link to specific attempt
3. Cross-reference from meta-issue to KG entry

**KG → Meta-Issue:**
When KG entry updates with meta-issue evidence:
1. Link back to meta-issue analysis
2. Reference specific attempt numbers
3. Maintain traceability chain

**Example:**
```markdown
<!-- In knowledge/patterns.md -->
## Connection Pooling for Latency Reduction

**Quick Reference:**
- **Problem:** High network latency between services
- **Solution:** Connection pooling with keep-alive
- **When to Use:** Network RTT >100ms, frequent small requests

**Evidence:**
[v2.x Performance Investigation](../issues/v2.x-performance-investigation/) — Attempt 003
- Network profiling showed 80% time in connection overhead
- Pooling reduced latency by 60% (500ms → 200ms)

**See Lesson:** [Connection Pooling Implementation](../lessons-learned/architecture/connection-pooling.md)
```

---

## Integration with Other Skills

**With /kmgraph:capture-lesson:**
```
After resolving meta-issue → Create lesson from analysis/lessons-learned.md
Link lesson back to meta-issue for evidence
```

**With /kmgraph:update-graph:**
```
Extract patterns from meta-issue attempts
Auto-detect when meta-issue has reusable insights
Suggest KG sync when 3+ belief shifts documented
```

**With /kmgraph:session-summary:**
```
Session summaries reference meta-issue progress
Meta-issue timeline includes session links
Bidirectional documentation
```

---

## Multi-KG Support

When multiple knowledge graphs are configured:
- Meta-issues stored in active KG: `{active_kg_path}/issues/`
- Use `/kmgraph:switch` to change active KG before creating meta-issue
- Each KG can track its own domain-specific meta-issues

---

## Troubleshooting (SOP 4)

### When debugging a meta-issue problem:

1. **Check description.md:** Current understanding and status
2. **Read implementation-log.md:** All attempts chronologically
3. **Review root-cause-evolution.md:** How understanding changed
4. **Find relevant attempt:** `attempts/[NNN]-[name]/attempt-results.md`
5. **Link to KG:** Check knowledge graph for related patterns

**Example workflow:**
```bash
# User hits same issue again
User: "Performance still slow after connection pooling"

# Check meta-issue
cd ${kg_path}/issues/v2.x-performance-investigation/

# Read current understanding
cat description.md

# Check latest attempt
cat attempts/003-connection-pooling/attempt-results.md

# Review evolution
cat analysis/root-cause-evolution.md

# Suggest next attempt based on pattern
/kmgraph:recall "performance latency"
```

---

## Examples

### Example 1: Initialize new meta-issue

```bash
/kmgraph:meta-issue "Authentication Redesign"
```

**Output:**
```
**Problem Title:** Authentication Redesign
**Domain:** architecture
**Scope:** v3.x
**Severity:** high
**Expected Attempts:** 4

✅ Meta-issue initialized: {active_kg_path}/issues/v3.x-authentication-redesign/

Created:
- README.md, description.md, implementation-log.md, test-cases.md
- analysis/ (root-cause-evolution, timeline, lessons-learned)
- related-issues/ (github-links)
```

### Example 2: Add attempt

```bash
/kmgraph:meta-issue --add-attempt 002 "OAuth2 with JWT"
```

**Output:**
```
✅ Attempt 002 added: attempts/002-oauth2-jwt/

Created:
- solution-approach.md (document approach)
- attempt-results.md (document outcome)
- plan-reference.md (link to implementation plan)

Updated: implementation-log.md (new entry)
```

### Example 3: Update understanding

```bash
/kmgraph:meta-issue --update-understanding "Token expiry logic flawed, not session management"
```

**Output:**
```
✅ Root cause evolution updated: analysis/root-cause-evolution.md

Belief Shift #[ID] added:
- Previous: Session management issue
- New: Token expiry logic flawed
- Evidence: Attempt 002 results

Updated: description.md (current understanding section)
```

---

**Created:** 2026-02-12
**Version:** 1.0 (Plugin version)
**Based On:** ADR-008 Meta-Issue Tracking Pattern
**Related Skills:** /kmgraph:capture-lesson, /kmgraph:update-graph, /kmgraph:session-summary
