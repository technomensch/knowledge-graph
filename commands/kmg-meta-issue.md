
# Meta-Issue Tracking

Initialize and manage meta-issue tracking for complex, multi-attempt problems that evolve understanding over time.

**Based on:** ADR-008 Meta-Issue Tracking Pattern

---

## Usage

```bash
/kmgraph:kmg-meta-issue "Problem Title"
/kmgraph:kmg-meta-issue --add-attempt 003 "Try connection pooling"
/kmgraph:kmg-meta-issue --log-attempt NNN "Hypothesis description"
/kmgraph:kmg-meta-issue --update-understanding "Root cause is network latency"
/kmgraph:kmg-meta-issue --status
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

## Stuck-Work Escalation (Auto-Trigger)

The meta-issue command is also invoked automatically by the `stuck-work-escalation` skill. When escalation triggers:

- **At 3 attempts (or 30 min):** Meta-issue is created automatically. powerful-tier reviews all logged attempts and provides fresh diagnosis. All future attempts must be logged here with a hypothesis before starting.
- **At 5 attempts:** Exit-path analysis is mandatory. The attempt template's exit-path section must be completed and presented to the user before any further work proceeds.
- **Escalation cap:** powerful-tier reviews a maximum of 3 rounds before forcing the exit-path decision regardless of attempt count.
- **Counter reset:** If diagnosis genuinely shifts (new root cause identified), attempt counter resets — note the reset in `analysis/root-cause-evolution.md`.
- **Scope:** Only applies to work with a definable success criterion (test passes, error gone, metric hit). Not exploratory or iterative work.

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

**Syntax:** `/kmgraph:kmg-meta-issue "Problem Title"`

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

**Resolve the target graph** (issue-41: this previously read `.active` and
`.graphs["$active_kg"].path` directly, a pre-ADR-067 pattern):

```
kg_resolve
```

Take the returned `path` as `$kg_path` below.

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
  cp "${CLAUDE_PLUGIN_ROOT}/core/default-templates/meta-issue/${file}.md" \
     "$meta_dir/${file}.md"
  # Customize with metadata
done

# Analysis files
for file in root-cause-evolution timeline lessons-learned; do
  cp "${CLAUDE_PLUGIN_ROOT}/core/default-templates/meta-issue/analysis/${file}.md" \
     "$meta_dir/analysis/${file}.md"
done

# Related issues
cp "${CLAUDE_PLUGIN_ROOT}/core/default-templates/meta-issue/related-issues/github-links.md" \
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
cp "${CLAUDE_PLUGIN_ROOT}/core/default-templates/meta-issue/attempt-template/"* \
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

**Syntax:** `/kmgraph:kmg-meta-issue --add-attempt 003 "Try connection pooling"`

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
cp "${CLAUDE_PLUGIN_ROOT}/core/default-templates/meta-issue/attempt-template/"* \
   "${meta_dir}/attempts/003-connection-pooling/"

# Update implementation-log.md
echo "## Attempt 003: Connection Pooling (2026-02-12)" >> "${meta_dir}/implementation-log.md"
echo "**Status:** In Progress" >> "${meta_dir}/implementation-log.md"
echo "**Plan:** [v2.3.1](../../plans/v2.3.1-connection-pooling.md)" >> "${meta_dir}/implementation-log.md"
```

---

## Command: Log Attempt with Hypothesis

**Syntax:** `/kmgraph:kmg-meta-issue --log-attempt 003 "JWT expiry logic is the root cause"`

Enforces that each attempt documents a distinct hypothesis before execution. Steps:

1. Create attempt folder (same as `--add-attempt`)
2. Pre-populate `solution-approach.md` hypothesis field with provided description
3. Require confirmation that this hypothesis is distinct from prior attempts
4. Update `implementation-log.md`
5. If attempt count ≥ 3: remind user to invoke `stuck-work-escalation` skill if not already active

---

## Attempt-Loop Workflow (Running the Next Attempt)

**Wired in 2026-09-05 (branch v0.7.8-preflight-gate-hardening, Commit 4)** — ENH-056's candidate attempt-loop prompt (revised 2026-07-30, previously documented but not adopted anywhere) plus ENH-058's diminishing-returns explain, folded into the same pass per ENH-058's own design.

When performing the next attempt in a meta-issue series — not just creating the attempt folder via `--add-attempt`/`--log-attempt`, but actually doing the troubleshooting/patching work for it — follow this process:

1. Before starting, use `/kmgraph:kmg-auto-recall` (or the underlying recall mechanism) if available, to establish broader context from the rest of the graph — related issues, ADRs, past decisions elsewhere in the KG — as a supplement to, not a replacement for, this meta-issue's own README/paperwork trail, which remains the isolated, authoritative record for this specific attempt.
2. Start the attempt via `/kmgraph:kmg-meta-issue --add-attempt NNN "short name"` (or `--log-attempt NNN "hypothesis"`) — do not hand-edit `implementation-log.md` directly.
3. Throughout every step of the current attempt, complete the paperwork explicitly required in the README.
4. This attempt is for patching and testing/validating the plan, not for running the patch as a separate, later production action. Also retest items flagged as passing in the previous attempt, to confirm they were not false positives.
5. If necessary, update the test cases, or add new ones, to validate any modifications made.
6. Use the `context-mode` plugin (`ctx_batch_execute`/`ctx_search`/`ctx_execute_file`) throughout, to keep large tool/file outputs out of this attempt's own context window rather than reading them in directly.
7. After patching the plan, ask the configured `powerful-tier` model for the active platform (per `~/.kmgraph/me.md`) for a review, which can include testing to validate, and recommendations to address any findings. It is not making any changes — it is a read-only test and review. It is also to check the existing test cases to ensure they are testing as expected, and recommend updates and/or additions if required.

   **Diminishing-returns explain (ENH-058), folded into this same review step:** for each test/item this review finds still failing that also failed in the immediately preceding independent-review round, compare the current finding against that prior round's stored finding and tag the comparison as one of three states — the reviewer decides this from the two data points, it is not a system judgment: `not actually fixed`, `same issue, new instance`, or `different sub-issue, same test`. Record the tag and a running per-test consecutive-failure count in this attempt's `implementation-log.md` entry (e.g. "**Test Comparisons:** Test 8 — same issue, new instance (2 consecutive)").

   If a test/item has now failed **2 consecutive independent-review rounds**, include a plain-English diminishing-returns note in this attempt's close-out summary: what the test is actually checking, what's still failing, and how narrow or broad the remaining gap looks, plus a recommendation — worth one more targeted round, or diminishing returns and worth considering as an accepted known risk. This is explanation plus a recommendation, never an automatic accept or a forced exit — a real, unfixed blocker still gets tagged `not actually fixed` and stays visibly blocking; the person decides whether to keep pursuing it.
8. Close out the attempt via the same `kmg-meta-issue` command, then stop.

**Known gap (issue-34, closed 2026-08-01):** step 1's recall assumption — that `kg_search`/FTS5 cover `knowledge/issues/` and `knowledge/enhancements/` — was previously unverified in practice; commit `50d839f8` on branch `v0.7.0` added both directories to the FTS5 index and search fallback. Confirmed pushed and merged as of this branch.

---

## Command: Update Root Cause Understanding

**Syntax:** `/kmgraph:kmg-meta-issue --update-understanding "Root cause is network latency"`

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

**Syntax:** `/kmgraph:kmg-meta-issue --status`

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

**With /kmgraph:kmg-capture-lesson:**
```
After resolving meta-issue → Create lesson from analysis/lessons-learned.md
Link lesson back to meta-issue for evidence
```

**With /kmgraph:kmg-session-summary:**
```
Session summaries reference meta-issue progress
Meta-issue timeline includes session links
Bidirectional documentation
```

**With stuck-work-escalation skill:**
Auto-invoked at 3 attempts. Supplies attempt log and root-cause evolution
to powerful-tier for diagnosis. Receives exit-path decision at 5 attempts.

---

## Multi-KG Support

When multiple knowledge graphs are configured:
- Meta-issues stored in the KG resolved from your current directory: `{active_kg_path}/issues/`
- To file against a different KG, run this command from that KG's project directory (or pass its name explicitly, if supported)
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
/kmgraph:kmg-recall "performance latency"
```

---

## Examples

### Example 1: Initialize new meta-issue

```bash
/kmgraph:kmg-meta-issue "Authentication Redesign"
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
/kmgraph:kmg-meta-issue --add-attempt 002 "OAuth2 with JWT"
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
/kmgraph:kmg-meta-issue --update-understanding "Token expiry logic flawed, not session management"
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
**Related Skills:** /kmgraph:kmg-capture-lesson, /kmgraph:kmg-session-summary
