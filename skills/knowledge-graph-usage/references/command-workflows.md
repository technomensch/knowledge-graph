---
title: Command Workflows for Knowledge Management Graph
version: 1.0.0
last_updated: 2026-02-16
---

# Command Workflows

Detailed workflow patterns for different knowledge graph usage scenarios, with command combinations, timing recommendations, and optimization strategies.

## Table of Contents

1. [First-Time Setup Workflow](#first-time-setup-workflow)
2. [Daily Development Workflow](#daily-development-workflow)
3. [End-of-Session Workflow](#end-of-session-workflow)
4. [Problem-Solving Workflow](#problem-solving-workflow)
5. [Complex Investigation Workflow](#complex-investigation-workflow)
6. [Periodic Consolidation Workflow](#periodic-consolidation-workflow)
7. [Knowledge Search Workflow](#knowledge-search-workflow)
8. [Team Collaboration Workflow](#team-collaboration-workflow)
9. [Project Onboarding Workflow](#project-onboarding-workflow)
10. [Knowledge Review and Maintenance Workflow](#knowledge-review-and-maintenance-workflow)

---

## 1. First-Time Setup Workflow

**When to use:** Installing Knowledge Management Graph for the first time on a project.

**Duration:** 10-15 minutes

**Frequency:** Once per project

### Step-by-Step Process

#### Step 1: Initialize Knowledge Graph

```bash
/kmgraph:init my-project
```

**Interactive Wizard:**
1. **Location**: Choose project-local (`./docs/`)
2. **Categories**: Select default (architecture, process, patterns) + add any custom
3. **Git Strategy**: Choose selective for team projects, all-commit for open source
4. **Category Git Rules**: Commit shareable (architecture, patterns), gitignore personal (debugging)

**Outcome:**
- Directory structure created in `./docs/`
- Templates copied (lesson-template.md, ADR-template.md, etc.)
- Config entry added to `~/.claude/kg-config.json`
- KG set as active

#### Step 2: Verify Structure

```bash
ls -R docs/
```

**Expected Structure:**
```
docs/
├── knowledge/
│   ├── patterns.md
│   ├── gotchas.md
│   ├── concepts.md
│   ├── architecture.md
│   ├── workflows.md
│   └── index.md
├── lessons-learned/
│   ├── README.md
│   ├── lesson-template.md
│   ├── architecture/
│   ├── process/
│   └── patterns/
├── decisions/
│   ├── README.md
│   └── ADR-template.md
├── sessions/
│   └── session-template.md
└── chat-history/
```

#### Step 3: Configure Gitignore (if needed)

```bash
# Check current .gitignore
cat .gitignore | grep docs/

# Add KG gitignore rules if not present
cat >> .gitignore <<EOF

# Knowledge Graph - selective strategy
docs/lessons-learned/debugging/
docs/sessions/
docs/chat-history/
EOF
```

#### Step 4: Test Basic Commands

```bash
# View status
/kmgraph:status

# Expected output:
# ✅ Active KG: my-project
# 📍 Location: ./docs/
# 📂 Categories: architecture, process, patterns
# 📝 Lessons: 0 | Decisions: 0 | Sessions: 0
```

#### Step 5: Capture First Lesson

```bash
/kmgraph:capture-lesson initial-setup
```

**Document:**
- Why this KG was created
- What categories were selected and why
- Git strategy rationale
- Team conventions

**Benefit:** Creates baseline documentation, validates workflow.

### Optimization Tips

- **Pre-plan categories**: Think about project needs before running init
- **Review git strategy**: Consider what should be team-shareable vs private
- **Document conventions**: Capture team agreements about knowledge capture
- **Test immediately**: Validate workflow before accumulating issues

### Common Pitfalls

- ❌ Forgetting to configure .gitignore for selective strategy
- ❌ Accepting defaults without considering project needs
- ❌ Not documenting why categories were chosen
- ❌ Skipping verification step

---

## 2. Daily Development Workflow

**When to use:** Regular development work with occasional knowledge capture.

**Duration:** 5-30 minutes per capture

**Frequency:** 1-3 times per day

### Workflow Overview

**Proactive Capture Pattern:**
1. Encounter problem or make decision
2. Solve problem or finalize decision
3. Immediately capture knowledge while fresh
4. Continue development

**Timing is Critical:** Capture within 30 minutes of resolution for best quality.

### Scenario A: Debugging Session

**Situation:** Spent 2+ hours debugging an issue with non-obvious root cause.

```bash
# After resolving the bug
/kmgraph:capture-lesson debugging-session-title

# Document while fresh:
# - What was the symptom?
# - What did we try?
# - What was the root cause?
# - How was it fixed?
# - How to prevent in future?
```

**Timing:** Capture immediately after fix, before context switch.

**Git Workflow:**
```bash
# Commit the code fix
git add [fixed-files]
git commit -m "fix: resolve issue description"

# Capture the lesson (automatically records commit hash)
/kmgraph:capture-lesson debugging-issue-name

# Lesson now has git metadata linking to the fix commit
```

**Benefit:** Git metadata links lesson to specific code changes, enabling traceability.

### Scenario B: Architectural Decision

**Situation:** Chose between technology options for new feature.

```bash
# After decision is made and initial implementation started
/kmgraph:capture-lesson architecture-decision-title

# Document:
# - What options were considered?
# - What trade-offs were evaluated?
# - Why was this option selected?
# - What are the consequences?
```

**Category:** Place in `lessons-learned/architecture/`

**Timing:** Capture after decision but before full implementation (context is clearest).

### Scenario C: Quick Win Pattern

**Situation:** Discovered useful code pattern or technique.

```bash
# When pattern is working and tested
/kmgraph:capture-lesson pattern-name

# Document:
# - What problem does this solve?
# - How does it work?
# - When to use this pattern?
# - Example code
```

**Category:** Place in `lessons-learned/patterns/`

**Timing:** Capture after pattern is verified working.

### Daily Best Practices

**Do:**
- Capture immediately after resolution
- Use descriptive, searchable titles
- Include specific code examples
- Link to related GitHub issues
- Tag with appropriate categories

**Don't:**
- Wait until end of day (context fades)
- Capture everything (be selective)
- Skip prevention strategies
- Forget to commit valuable lessons

### Time Management

**Quick Captures (5-10 min):**
- Simple bug fixes with clear cause
- Small patterns or techniques
- Minor optimizations

**Medium Captures (15-20 min):**
- Complex debugging sessions
- Architectural decisions
- Process improvements

**Deep Captures (30+ min):**
- Multi-day investigations
- Meta-issues requiring context
- Complex architectural changes

---

## 3. End-of-Session Workflow

**When to use:** At the end of productive coding sessions.

**Duration:** 5-10 minutes

**Frequency:** 1-2 times per day

### Step-by-Step Process

#### Step 1: Review Session Accomplishments

Mental checklist:
- What problems were solved?
- What decisions were made?
- What was learned?
- What progress was made?
- Any blockers encountered?

#### Step 2: Create Session Summary

```bash
/kmgraph:session-summary
```

**Generated Summary Includes:**
- Session duration and timestamp
- Problems solved (with links to lessons)
- Decisions made
- Progress on features/tasks
- Blockers or open questions
- Next steps

#### Step 3: Review and Refine

**Edit Generated Summary:**
- Add context that Claude might have missed
- Clarify ambiguous points
- Add personal notes or reflections
- Link to relevant issues or PRs

#### Step 4: Link to Lessons

**Check if lessons were captured:**
```bash
/kmgraph:status

# If lessons were captured during session, they'll be linked automatically
# If not, consider capturing significant learnings now
```

### When to Use Session Summaries

**Good Sessions for Summarizing:**
- Multiple problems solved
- Significant progress on complex feature
- Important decisions made
- Complex investigation with findings
- Productive pairing or collaboration

**Skip Session Summary:**
- Routine maintenance work
- Simple bug fixes with no new learning
- Short sessions (<1 hour)
- Interrupted sessions with little progress

### Integration with Other Tools

**Link to Jira/Linear/GitHub:**
```bash
# In session summary, reference:
- Completed tasks: #PROJ-123, #PROJ-124
- In progress: #PROJ-125
- Blocked: #PROJ-126 (waiting for API)
```

**Link to PRs:**
```bash
# In session summary, mention:
- Opened PR #45 (feature X)
- Reviewed PR #42 (bug fix Y)
```

### Benefits of Session Summaries

- **Context Preservation**: Future sessions can reference past work
- **Progress Tracking**: Clear record of what was accomplished
- **Knowledge Consolidation**: Connects lessons to broader work context
- **Team Communication**: Shareable summary of work done
- **Personal Log**: Track learning and growth over time

---

## 4. Problem-Solving Workflow

**When to use:** Facing specific problem that needs investigation.

**Duration:** Varies (15 minutes - several hours)

**Frequency:** As needed

### Step-by-Step Process

#### Step 1: Search Existing Knowledge First

**Before starting fresh investigation:**

```bash
/kmgraph:recall "problem description"

# Search for:
# - Similar problems solved before
# - Related lessons or patterns
# - Documented gotchas or workarounds
```

**If Relevant Knowledge Found:**
- Review documented solution
- Adapt to current situation
- Update lesson if approach changed

**If No Relevant Knowledge:**
- Proceed with investigation
- Plan to capture findings

#### Step 2: Investigate Problem

**Standard Debugging Process:**
1. Reproduce the issue consistently
2. Form hypothesis about cause
3. Test hypothesis
4. Iterate until root cause found
5. Implement fix
6. Verify solution

**Track Investigation:**
- Note what was tried
- Record false leads
- Document breakthrough moments
- Capture root cause analysis

#### Step 3: Capture the Lesson

```bash
# After solution is verified
/kmgraph:capture-lesson problem-description

# Include:
# - Problem and symptoms
# - Investigation process
# - Root cause
# - Solution
# - Prevention strategies
```

#### Step 4: Link to Issue (if applicable)

```bash
# If tracked in GitHub
/kmgraph:link-issue lesson-id issue-number

# Creates bidirectional link:
# - Lesson references GitHub issue
# - Issue can reference lesson for context
```

### Problem Complexity Levels

#### Level 1: Simple Problem (15-30 min)

**Characteristics:**
- Single component
- Clear error message
- Standard resolution

**Workflow:**
- Quick search
- Standard debugging
- Brief lesson capture

**Example:** Missing dependency, configuration typo

#### Level 2: Moderate Problem (1-2 hours)

**Characteristics:**
- Multiple components
- Non-obvious cause
- Requires experimentation

**Workflow:**
- Thorough search
- Systematic debugging
- Detailed lesson capture

**Example:** Race condition, API interaction issue

#### Level 3: Complex Problem (multiple hours/days)

**Characteristics:**
- System-wide issue
- Multiple possible causes
- Requires deep investigation

**Workflow:**
- Comprehensive search
- Meta-issue tracking
- Extensive documentation

**Example:** Performance degradation, security vulnerability

### Escalation to Meta-Issue

**When problem is recurring or complex:**

```bash
# Create meta-issue for tracking
/kmgraph:meta-issue 123

# Document in meta-issue:
# - Pattern description
# - Investigation history
# - Attempted solutions
# - Current understanding
# - Next steps
```

**See Complex Investigation Workflow for details.**

---

## 5. Complex Investigation Workflow

**When to use:** Multi-attempt problems requiring extensive investigation.

**Duration:** Multiple sessions over days/weeks

**Frequency:** 1-2 times per month

### Step-by-Step Process

#### Step 1: Create Meta-Issue

```bash
# When problem recurs or initial attempts fail
/kmgraph:meta-issue 123

# GitHub issue #123 is now tracked as meta-issue
```

**Initial Meta-Issue Content:**
- Problem description
- Frequency and impact
- Why this is complex
- What's been tried so far

#### Step 2: Document Each Attempt

**After each investigation attempt:**

```markdown
### Attempt N ([Date])

**Hypothesis**: What we thought
**Approach**: What we tried
**Outcome**: What happened
**Learning**: What we discovered
**Next**: What to try next
```

**Update meta-issue file with each attempt.**

#### Step 3: Update Understanding

**As investigation progresses:**

```markdown
## Current Understanding

**Root Causes**: Best current theory
**Contributing Factors**: What makes it worse
**Unknown Factors**: What's still unclear
```

**Keep this section current.**

#### Step 4: Evaluate Solution Candidates

```markdown
## Solution Candidates

### Candidate 1: [Approach]

**Pros**: Why this might work
**Cons**: Risks or downsides
**Effort**: Implementation cost
**Confidence**: Low | Medium | High
```

**Add candidates as they emerge.**

#### Step 5: Test Promising Solution

```bash
# Implement and test candidate solution
# Document results in meta-issue

# If successful:
# - Mark meta-issue as resolved
# - Capture detailed lesson
# - Update prevention strategies
```

#### Step 6: Capture Comprehensive Lesson

```bash
# Once resolved
/kmgraph:capture-lesson meta-issue-resolution

# Include:
# - Full investigation history
# - All attempts and learnings
# - Final solution
# - Why it worked
# - How to prevent
```

### Meta-Issue Best Practices

**Do:**
- Document each attempt immediately
- Update understanding section regularly
- Link related lessons and issues
- Track solution candidates systematically
- Review pattern across attempts

**Don't:**
- Let documentation lag behind work
- Forget to capture failed attempts
- Skip documenting why solutions didn't work
- Give up without comprehensive documentation

### Benefit of Meta-Issue Tracking

- **Context Preservation**: Full history available
- **Pattern Recognition**: See relationships between attempts
- **Team Collaboration**: Shared investigation state
- **Learning Capture**: Value from failed attempts
- **Future Prevention**: Comprehensive analysis enables prevention

---

## 6. Periodic Consolidation Workflow

**When to use:** Regular knowledge graph maintenance and consolidation.

**Duration:** 30-60 minutes

**Frequency:** Weekly or bi-weekly

### Step-by-Step Process

#### Step 1: Extract Recent Chats

```bash
# Extract chat history from recent sessions
/kmgraph:extract-chat

# Processes:
# - Claude chat logs (if available)
# - Gemini conversation logs
# - Saves to docs/chat-history/
```

**Timing:** Run this after significant coding sessions.

#### Step 2: Review Extracted Content

```bash
# Check what was extracted
ls docs/chat-history/

# Review for:
# - Uncaptured lessons
# - Important decisions
# - Useful patterns
```

#### Step 3: Capture Missing Lessons

```bash
# For each significant learning not yet captured
/kmgraph:capture-lesson topic-from-chat

# Fill in:
# - Context from chat
# - Final solution
# - Prevention strategies
```

#### Step 4: Update Knowledge Graph

```bash
# Consolidate lessons into knowledge graph
/kmgraph:update-graph

# Processes lessons-learned/:
# - Extracts patterns
# - Updates docs/knowledge/patterns.md
# - Updates docs/knowledge/gotchas.md
# - Updates docs/knowledge/architecture.md
# - Preserves git metadata
```

#### Step 5: Review Generated Content

**Check knowledge graph files:**

```bash
# Review what was consolidated
cat docs/knowledge/patterns.md
cat docs/knowledge/gotchas.md
cat docs/knowledge/architecture.md
```

**Edit for:**
- Clarity and organization
- Remove duplicates
- Add cross-references
- Improve categorization

#### Step 6: One-Command Alternative

**Use consolidated workflow:**

```bash
# Single command for complete pipeline
/kmgraph:sync-all

# Equivalent to:
# 1. /kmgraph:extract-chat
# 2. Auto-capture lessons from chats
# 3. /kmgraph:update-graph
# 4. Generate session summaries
```

**Benefit:** Automated end-to-end knowledge consolidation.

### Consolidation Checklist

**Before Consolidation:**
- [ ] Recent chats extracted
- [ ] Significant lessons captured
- [ ] Meta-issues updated
- [ ] Links to issues verified

**During Consolidation:**
- [ ] Knowledge graph updated
- [ ] Duplicates removed
- [ ] Cross-references added
- [ ] Organization improved

**After Consolidation:**
- [ ] Review generated content
- [ ] Edit for clarity
- [ ] Commit valuable changes
- [ ] Plan next consolidation

### Benefits of Regular Consolidation

- **Pattern Recognition**: See connections across lessons
- **Knowledge Organization**: Structured, searchable content
- **Reduced Duplication**: Consolidate similar learnings
- **Team Sharing**: Polished knowledge graph for team
- **Long-term Value**: Accumulated wisdom accessible

---

## 7. Knowledge Search Workflow

**When to use:** Need to find previously documented knowledge.

**Duration:** 2-10 minutes

**Frequency:** Multiple times per day

### Search Strategies

#### Strategy 1: Direct Recall

**For specific problems:**

```bash
/kmgraph:recall "specific problem description"

# Examples:
/kmgraph:recall "database connection timeout"
/kmgraph:recall "React useEffect infinite loop"
/kmgraph:recall "Docker build cache"
```

**Search Scope:**
- lessons-learned/ (all categories)
- decisions/ (architectural decisions)
- knowledge/ (consolidated patterns)
- sessions/ (session summaries)

**Results:** Ranked by relevance, showing title, excerpt, file location.

#### Strategy 2: Category Browse

**For exploring specific topic:**

```bash
# View lessons in category
ls docs/lessons-learned/architecture/
ls docs/lessons-learned/debugging/
ls docs/lessons-learned/patterns/

# Read specific lesson
cat docs/lessons-learned/debugging/issue-name.md
```

#### Strategy 3: Knowledge Graph Browse

**For high-level patterns:**

```bash
# View consolidated patterns
cat docs/knowledge/patterns.md

# View known gotchas
cat docs/knowledge/gotchas.md

# View architecture decisions
cat docs/knowledge/architecture.md

# View concept definitions
cat docs/knowledge/concepts.md
```

#### Strategy 4: Status Overview

**For quick reference:**

```bash
/kmgraph:status

# Shows:
# - Active KG info
# - Stats (lesson count, etc.)
# - Recent lessons
# - Quick command reference
```

### Search Tips

**Effective Search Queries:**
- Use specific technical terms
- Include error messages or symptoms
- Mention technologies involved
- Reference component names

**Examples:**
```bash
# Good queries:
/kmgraph:recall "PostgreSQL connection pool exhausted"
/kmgraph:recall "Next.js SSR hydration mismatch"
/kmgraph:recall "AWS Lambda cold start optimization"

# Vague queries (less effective):
/kmgraph:recall "database problem"
/kmgraph:recall "React issue"
/kmgraph:recall "deployment"
```

### When Search Returns Nothing

**If no results found:**

1. **Try broader search:**
   ```bash
   # From: "PostgreSQL JSONB index performance"
   # To: "PostgreSQL index" or "database performance"
   ```

2. **Browse category:**
   ```bash
   ls docs/lessons-learned/patterns/
   ```

3. **Check knowledge graph:**
   ```bash
   cat docs/knowledge/patterns.md | grep -i "relevant term"
   ```

4. **Document after solving:**
   - This is knowledge worth capturing!
   - Search failure = documentation opportunity

---

## 8. Team Collaboration Workflow

**When to use:** Sharing knowledge with team members.

**Duration:** Varies

**Frequency:** Continuous

### Workflow for Team Knowledge Sharing

#### Step 1: Configure Selective Git Strategy

**During KG initialization:**

```bash
/kmgraph:init team-project

# Git strategy: Selective
# - Commit: architecture, patterns, process
# - Gitignore: debugging (personal notes)
```

#### Step 2: Capture Team-Shareable Lessons

**Focus on:**
- Architectural decisions affecting team
- Process improvements for workflow
- Reusable patterns and techniques
- Bug resolutions relevant to team
- Configuration and setup guides

**Avoid:**
- Personal debugging notes
- Work-in-progress investigations
- Environment-specific quirks
- Temporary workarounds

#### Step 3: Review Before Committing

```bash
# Check what will be committed
git status

# Review lessons for:
# - Clarity for team members
# - Removal of personal notes
# - Sensitive information
# - Completeness
```

#### Step 4: Commit and Push

```bash
# Commit shareable knowledge
git add docs/lessons-learned/architecture/
git add docs/lessons-learned/patterns/
git add docs/knowledge/

git commit -m "docs: add lessons from [topic] investigation"
git push
```

#### Step 5: Link to Pull Requests

**In PR description:**

```markdown
## Related Knowledge

This PR implements the approach documented in:
- [Lesson: API Design Pattern](docs/lessons-learned/architecture/api-design.md)

## Decisions Made

Architectural decisions documented in:
- [Decision: Database Schema](docs/lessons-learned/architecture/db-schema.md)
```

### Team Collaboration Best Practices

**Do:**
- Write lessons for team audience
- Use clear, professional language
- Include context for those unfamiliar
- Link to issues and PRs
- Review before committing

**Don't:**
- Commit personal debugging notes
- Include sensitive information
- Use team member names without permission
- Commit incomplete investigations
- Skip peer review for major lessons

### Team Onboarding Workflow

**For new team members:**

```bash
# Set up local KG
git clone [repo]
/kmgraph:switch team-project

# Browse knowledge graph
cat docs/knowledge/index.md
cat docs/knowledge/architecture.md
cat docs/knowledge/patterns.md

# Search for specific topics
/kmgraph:recall "getting started"
/kmgraph:recall "local development setup"
```

---

## 9. Project Onboarding Workflow

**When to use:** Starting work on existing project with knowledge graph.

**Duration:** 30-60 minutes

**Frequency:** Once per project

### Step-by-Step Process

#### Step 1: Clone and Activate

```bash
# Clone project
git clone [repo-url]
cd [project]

# Switch to project KG
/kmgraph:switch [project-name]

# Verify activation
/kmgraph:status
```

#### Step 2: Read Knowledge Graph Index

```bash
# Start with index
cat docs/knowledge/index.md

# Provides:
# - Overview of knowledge structure
# - Key architectural decisions
# - Important patterns
# - Known gotchas
# - Where to find specific info
```

#### Step 3: Review Architecture

```bash
# Read architecture decisions
cat docs/knowledge/architecture.md

# Understand:
# - System design
# - Technology choices
# - Design patterns used
# - Integration points
```

#### Step 4: Study Common Patterns

```bash
# Read patterns documentation
cat docs/knowledge/patterns.md

# Learn:
# - Code patterns used
# - Testing approaches
# - Configuration patterns
# - Best practices
```

#### Step 5: Check Known Gotchas

```bash
# Read gotchas
cat docs/knowledge/gotchas.md

# Avoid:
# - Known pitfalls
# - Common mistakes
# - Tricky edge cases
# - Configuration issues
```

#### Step 6: Search for Specific Topics

```bash
# As questions arise
/kmgraph:recall "how to deploy"
/kmgraph:recall "local database setup"
/kmgraph:recall "running tests"
```

### Onboarding Checklist

**Essential Reading:**
- [ ] docs/knowledge/index.md
- [ ] docs/knowledge/architecture.md
- [ ] docs/knowledge/patterns.md
- [ ] docs/knowledge/gotchas.md
- [ ] README.md (project overview)

**Setup Validation:**
- [ ] KG activated with `/kmgraph:status`
- [ ] Can search knowledge with `/kmgraph:recall`
- [ ] Local development environment working
- [ ] Tests passing

**First Contributions:**
- [ ] Find first good issue to work on
- [ ] Search knowledge for related context
- [ ] Capture lessons from first task
- [ ] Ask questions about unclear documentation

---

## 10. Knowledge Review and Maintenance Workflow

**When to use:** Periodic review of knowledge quality and relevance.

**Duration:** 1-2 hours

**Frequency:** Monthly or quarterly

### Step-by-Step Process

#### Step 1: Review Statistics

```bash
/kmgraph:status

# Check:
# - Total lessons count
# - Lessons per category
# - Recent activity
# - Last consolidation date
```

#### Step 2: Identify Stale Content

```bash
# Find old lessons
find docs/lessons-learned -name "*.md" -mtime +180

# Review for:
# - Outdated information
# - Deprecated technologies
# - No longer relevant
# - Needs updating
```

#### Step 3: Check for Sensitive Data

```bash
# Scan for sensitive information
/kmgraph:check-sensitive

# Review matches for:
# - API keys or tokens
# - Internal URLs or IPs
# - Employee names or emails
# - Proprietary information
```

#### Step 4: Consolidate Duplicates

```bash
# Look for similar lessons
/kmgraph:recall "similar topic"

# Check for:
# - Duplicate content
# - Overlapping lessons
# - Content that should merge
```

#### Step 5: Update Knowledge Graph

```bash
# Re-consolidate lessons
/kmgraph:update-graph

# Review generated:
# - docs/knowledge/patterns.md
# - docs/knowledge/gotchas.md
# - docs/knowledge/architecture.md
```

#### Step 6: Archive or Remove Obsolete

```bash
# For truly obsolete content
mv docs/lessons-learned/obsolete-lesson.md archive/

# Or delete if no historical value
rm docs/lessons-learned/obsolete-lesson.md
```

### Maintenance Checklist

**Quality Review:**
- [ ] Lessons are clear and actionable
- [ ] No sensitive information
- [ ] Links are valid
- [ ] Examples are current
- [ ] Tags are accurate

**Organization Review:**
- [ ] Categories make sense
- [ ] No duplicates
- [ ] Cross-references are correct
- [ ] Knowledge graph is up-to-date

**Team Review:**
- [ ] New members can onboard easily
- [ ] Documentation is discoverable
- [ ] Feedback is incorporated
- [ ] Gaps are identified

### Continuous Improvement

**Metrics to Track:**
- Lesson capture rate (per week/month)
- Search usage (how often `/kmgraph:recall` used)
- Knowledge reuse (citations in code/PRs)
- Team satisfaction (developer surveys)

**Improvement Actions:**
- Add missing categories
- Create index pages for navigation
- Write guides for common scenarios
- Conduct knowledge sharing sessions
- Refine capture processes

---

## Summary of All Workflows

| Workflow | When | Duration | Frequency | Key Commands |
|----------|------|----------|-----------|--------------|
| First-Time Setup | New project | 10-15 min | Once | `/kmgraph:init` |
| Daily Development | Regular coding | 5-30 min | 1-3x/day | `/kmgraph:capture-lesson` |
| End-of-Session | After productive sessions | 5-10 min | 1-2x/day | `/kmgraph:session-summary` |
| Problem-Solving | Facing specific problem | Varies | As needed | `/kmgraph:recall`, `/kmgraph:capture-lesson` |
| Complex Investigation | Multi-attempt problems | Multiple sessions | 1-2x/month | `/kmgraph:meta-issue` |
| Periodic Consolidation | Knowledge maintenance | 30-60 min | Weekly/bi-weekly | `/kmgraph:sync-all` |
| Knowledge Search | Finding past knowledge | 2-10 min | Multiple/day | `/kmgraph:recall` |
| Team Collaboration | Sharing with team | Continuous | Continuous | Selective git strategy |
| Project Onboarding | Starting on project | 30-60 min | Once | `/kmgraph:switch`, read knowledge graph |
| Review & Maintenance | Quality assurance | 1-2 hours | Monthly/quarterly | `/kmgraph:check-sensitive`, review stats |

## Quick Reference by Situation

**"I just solved a complex bug"**
→ `/kmgraph:capture-lesson debugging-[issue]`

**"Made an architectural decision"**
→ `/kmgraph:capture-lesson architecture-[decision]`

**"End of productive day"**
→ `/kmgraph:session-summary`

**"Facing familiar problem"**
→ `/kmgraph:recall "[problem description]"`

**"Same issue third time"**
→ `/kmgraph:meta-issue [number]`

**"Weekly review time"**
→ `/kmgraph:sync-all`

**"New project setup"**
→ `/kmgraph:init [name]`

**"Joining existing project"**
→ Read `docs/knowledge/index.md`

**"Need to share knowledge"**
→ Commit architecture/patterns/, gitignore debugging/

**"Monthly maintenance"**
→ `/kmgraph:check-sensitive`, review stats

---

## Optimization Strategies

### Time Optimization

**Quick Captures (5 min):**
- Use brief templates
- Focus on essentials
- Skip extensive context
- Good for simple problems

**Batch Processing:**
- Consolidate weekly
- Review multiple lessons at once
- Update knowledge graph in batches
- More efficient than constant updates

**Automation:**
- Use `/kmgraph:sync-all` for full pipeline
- Configure git hooks for validation
- Automate sensitive data checks
- Schedule periodic reviews

### Quality Optimization

**Immediate Capture:**
- Best quality when context is fresh
- Capture within 30 minutes of resolution
- Don't wait until end of day

**Peer Review:**
- Have teammates review lessons
- Improves clarity and completeness
- Catches errors or omissions

**Regular Consolidation:**
- Identifies patterns across lessons
- Removes duplicates
- Improves organization

### Team Optimization

**Shared Standards:**
- Agree on categories
- Define quality criteria
- Establish naming conventions
- Document capture process

**Knowledge Champions:**
- Designate knowledge owners per domain
- Review and maintain their areas
- Guide others in captures

**Integration:**
- Link to PRs and issues
- Reference in code reviews
- Include in onboarding
- Celebrate knowledge sharing

---

Use these workflows as starting points and adapt to your team's needs and project requirements. Focus on sustainable practices that provide long-term value without excessive overhead.
