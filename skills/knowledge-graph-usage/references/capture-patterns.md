---
title: Detailed Capture Patterns for Knowledge Graph
version: 1.0.0
last_updated: 2026-02-16
---

# Detailed Capture Patterns

Comprehensive guide to recognizing, structuring, and documenting different types of knowledge in the knowledge graph system.

## Table of Contents

1. [Problem-Solution Patterns](#problem-solution-patterns)
2. [Architectural Decision Patterns](#architectural-decision-patterns)
3. [Meta-Issue Patterns](#meta-issue-patterns)
4. [Process Improvement Patterns](#process-improvement-patterns)
5. [Code Pattern Documentation](#code-pattern-documentation)
6. [Quality Checklist](#quality-checklist)
7. [Anti-Patterns](#anti-patterns)
8. [Edge Cases](#edge-cases)

## Problem-Solution Patterns

### Debugging Sessions

**Recognition Signals:**
- Multi-hour debugging session
- Non-obvious root cause discovered
- Solution required experimentation or deep investigation
- Error message was misleading or unclear
- Multiple false starts before finding real issue

**Template Structure:**

```markdown
# [Descriptive Title of Problem]

## Problem

**Symptom**: What was observed? What broke?
**Impact**: How severe? Who was affected?
**First Noticed**: When did this start occurring?

## Environment

**Platform**: OS, runtime version, dependencies
**Configuration**: Relevant config files or settings
**Data State**: Database state, cache state, file system state
**Concurrency**: Single vs multi-user, load conditions

## Investigation

**Initial Hypothesis**: What did we think was wrong?
**Tests Performed**: What debugging steps were taken?
**False Leads**: What turned out not to be the issue?
**Breakthrough**: What led to discovering the real cause?

## Root Cause

**Technical Explanation**: Why did this happen?
**Underlying Issue**: What assumption was wrong? What was overlooked?
**Contributing Factors**: What conditions allowed this to occur?

## Solution

**Immediate Fix**: What was changed to resolve it?
**Code Changes**: Specific files and modifications
**Testing**: How was the fix verified?
**Rollout**: How was the fix deployed?

## Prevention

**Early Detection**: How to catch this earlier?
**Monitoring**: What metrics or alerts would help?
**Code Practices**: What coding patterns prevent this?
**Documentation**: What needs to be documented?
**Testing**: What tests should be added?

## Related

**Similar Issues**: Links to related problems
**References**: External docs or discussions
**Tags**: #debugging #[component] #[technology]
```

**Example Scenarios:**

1. **Memory Leak Investigation**
   - Multi-day debugging of gradual memory increase
   - Multiple profiling sessions with different tools
   - Root cause: Circular reference in event listeners
   - Prevention: Weak references pattern, automated memory testing

2. **Race Condition in Concurrent System**
   - Intermittent failures under load
   - Reproduced only in specific timing conditions
   - Root cause: Missing synchronization in shared state
   - Prevention: Lock-free algorithms, immutable data structures

3. **Configuration Cascade Failure**
   - System worked in dev, failed in production
   - Root cause: Environment variable precedence
   - Prevention: Configuration validation script, explicit defaults

### Error Resolution

**Recognition Signals:**
- Cryptic error message requiring research
- Error that occurs intermittently
- Error with multiple possible causes
- Error requiring specific version combinations
- Error not documented in official sources

**Template Structure:**

```markdown
# [Error Message or Description]

## Error Details

**Message**: Exact error text
**Stack Trace**: Full stack trace if available
**Occurrence**: Consistent vs intermittent
**Version**: Software versions involved

## Context

**Operation**: What was being attempted?
**Input**: What data or commands triggered it?
**State**: System state when error occurred
**Environment**: OS, runtime, dependencies

## Resolution

**Root Cause**: Why the error occurred
**Fix**: Exact steps to resolve
**Verification**: How to confirm it's fixed

## Prevention

**Detection**: How to catch this error earlier
**Validation**: Input validation or checks to add
**Documentation**: Notes for future reference

## References

- Official docs: [links]
- Related issues: [links]
- Stack Overflow: [links]
```

**Example Scenarios:**

1. **npm Install Fails with EACCES**
   - Error: Permission denied on global packages
   - Cause: Wrong directory ownership
   - Fix: Reconfigure npm prefix, fix permissions
   - Prevention: Document proper npm setup

2. **Database Connection Timeout**
   - Error: Connection pool exhausted
   - Cause: Connections not being released
   - Fix: Ensure connection.close() in finally blocks
   - Prevention: Connection leak detection, monitoring

### Performance Optimization

**Recognition Signals:**
- Significant performance improvement achieved
- Non-obvious bottleneck discovered
- Counter-intuitive optimization worked
- Trade-off between different metrics
- Required profiling or benchmarking to identify

**Template Structure:**

```markdown
# [Performance Optimization Description]

## Performance Problem

**Metric**: What was slow? (latency, throughput, memory, etc.)
**Baseline**: Original performance numbers
**Impact**: User experience effect, business impact
**Scope**: Specific operation, overall system, edge cases

## Analysis

**Profiling**: Tools used, findings
**Bottleneck**: Where was time/resources being spent?
**Hypothesis**: What was expected to be the issue?
**Surprise**: What was unexpected?

## Optimization

**Approach**: What optimization was tried?
**Implementation**: Code changes made
**Testing**: How was improvement measured?
**Results**: New performance numbers

## Trade-offs

**Benefits**: What improved?
**Costs**: What got worse? (complexity, memory, etc.)
**Decision**: Why this trade-off was acceptable

## Lessons

**Insights**: What did we learn about performance?
**Patterns**: What optimization patterns were effective?
**Tools**: What profiling tools were valuable?
**Anti-patterns**: What should be avoided?

## References

- Profiling data: [links to reports]
- Benchmarks: [before/after comparisons]
- Related optimizations: [links]
```

**Example Scenarios:**

1. **Database Query Optimization**
   - 3s query reduced to 50ms
   - Added covering index
   - Trade-off: Increased storage, slower writes
   - Lesson: Profile before optimizing

2. **Frontend Bundle Size Reduction**
   - 2MB bundle reduced to 500KB
   - Code splitting, tree shaking, compression
   - Trade-off: More HTTP requests, initial complexity
   - Lesson: Dynamic imports for optional features

## Architectural Decision Patterns

### Technology Selection

**Recognition Signals:**
- Choosing between multiple viable technologies
- Evaluating frameworks, libraries, or platforms
- Considering long-term maintenance implications
- Trade-offs between feature set and complexity
- Team expertise considerations

**Template Structure:**

```markdown
# [Technology Decision Title]

## Context

**Problem**: What need drove this decision?
**Requirements**: What must the solution provide?
**Constraints**: What limits our options?
**Timeline**: When does this need to be decided?

## Options Considered

### Option 1: [Technology Name]

**Pros:**
- Advantage 1
- Advantage 2

**Cons:**
- Disadvantage 1
- Disadvantage 2

**Evaluation:**
- Feature comparison
- Performance characteristics
- Community support
- Learning curve
- Long-term viability

### Option 2: [Technology Name]

[Same structure as Option 1]

## Decision

**Selected**: [Chosen technology]
**Rationale**: Why this option?
**Key Factors**: What was most important?
**Acceptable Trade-offs**: What compromises were made?

## Implementation

**Migration Path**: If replacing existing technology
**Integration**: How it fits with current stack
**Team Training**: What learning is needed?
**Timeline**: Rollout plan

## Review Criteria

**Success Metrics**: How to measure if this was the right choice?
**Review Date**: When to reassess this decision?
**Exit Strategy**: How to change course if needed?

## References

- Technology docs: [links]
- Comparison articles: [links]
- Community discussions: [links]
```

**Example Scenarios:**

1. **State Management Library Selection**
   - Redux vs MobX vs Zustand vs Context API
   - Chosen: Zustand for simplicity and bundle size
   - Trade-off: Less ecosystem than Redux
   - Review: After 3 months, check developer satisfaction

2. **Database Technology for New Service**
   - PostgreSQL vs MongoDB vs DynamoDB
   - Chosen: PostgreSQL for ACID guarantees
   - Trade-off: More complex scaling
   - Review: When traffic reaches 10k req/s

### Design Pattern Selection

**Recognition Signals:**
- Implementing significant new feature
- Refactoring major component
- Solving cross-cutting concern
- Multiple valid implementation approaches
- Long-term maintainability considerations

**Template Structure:**

```markdown
# [Design Pattern Decision]

## Problem

**Context**: What system or feature?
**Requirements**: What must be achieved?
**Constraints**: Technical or business limits

## Pattern Options

### Pattern 1: [Name]

**Description**: How this pattern works
**Application**: How it applies to our problem
**Benefits**: Why this pattern is good here
**Drawbacks**: Why this pattern might not be ideal

### Pattern 2: [Name]

[Same structure as Pattern 1]

## Decision

**Selected Pattern**: [Chosen pattern]
**Justification**: Why this pattern fits best
**Implementation Notes**: Key considerations

## Implementation

**Structure**: High-level architecture
**Components**: Main building blocks
**Interactions**: How components communicate
**Example**: Code snippet or diagram

## Consequences

**Positive**: What becomes easier?
**Negative**: What becomes harder?
**Future Flexibility**: How does this affect future changes?

## Related Decisions

- Similar patterns used elsewhere: [links]
- Alternative approaches considered: [links]
```

**Example Scenarios:**

1. **Event Sourcing for Audit Trail**
   - Pattern: Event Sourcing + CQRS
   - Benefit: Complete audit history
   - Trade-off: Increased complexity
   - Alternative: Simple audit log table

2. **Microservice Communication Pattern**
   - Pattern: Event-driven with message bus
   - Benefit: Loose coupling, async processing
   - Trade-off: Eventual consistency challenges
   - Alternative: Synchronous REST calls

## Meta-Issue Patterns

### Complex Recurring Problems

**Recognition Signals:**
- Same issue encountered 3+ times
- No single clear solution
- Requires investigation across multiple layers
- Different manifestations of root issue
- Previous attempts failed or only partially worked

**Template Structure:**

```markdown
# Meta-Issue: [Problem Title]

## Issue Reference

**GitHub Issue**: #123
**Status**: Active | Investigating | Resolved
**Priority**: High | Medium | Low
**Started**: [Date]

## Pattern Description

**What Recurs**: Core problem that keeps appearing
**Manifestations**: Different ways this shows up
**Frequency**: How often does this occur?
**Impact**: Business or user impact

## Investigation History

### Attempt 1 ([Date])

**Hypothesis**: What we thought was wrong
**Approach**: What was tried
**Outcome**: Did it work? Why/why not?
**Learning**: What did we discover?

### Attempt 2 ([Date])

[Same structure as Attempt 1]

### Attempt N ([Date])

[Same structure as Attempt 1]

## Current Understanding

**Root Causes**: What we believe is actually happening
**Contributing Factors**: What makes this worse?
**Unknown Factors**: What are we still unclear about?

## Solution Candidates

### Candidate 1

**Approach**: What to try
**Pros**: Why this might work
**Cons**: Risks or downsides
**Effort**: Implementation complexity
**Confidence**: Low | Medium | High

### Candidate 2

[Same structure as Candidate 1]

## Next Steps

**Immediate Actions**: What to do next?
**Investigation**: What data to gather?
**Timeline**: When to attempt solution?
**Success Criteria**: How to know if it worked?

## Related

**Similar Issues**: [Links to related meta-issues]
**Lessons Learned**: [Links to relevant lessons]
**External References**: [Links to discussions, docs]

## Resolution (when closed)

**Final Solution**: What ultimately worked
**Why It Worked**: Root cause and fix explanation
**Prevention**: How to avoid in future
**Lessons**: Key takeaways
```

**Example Scenarios:**

1. **Intermittent Test Failures**
   - Attempts: Increased timeouts, retry logic, test isolation
   - Root cause: Shared test database state
   - Solution: Per-test database transactions
   - Prevention: Database fixture management

2. **Production Deployment Issues**
   - Attempts: Better rollback, staging testing, gradual rollout
   - Root cause: Configuration drift between environments
   - Solution: Infrastructure as Code, immutable deployments
   - Prevention: Environment parity validation

## Process Improvement Patterns

### Workflow Optimization

**Recognition Signals:**
- Repetitive manual process identified
- Automation opportunity discovered
- Bottleneck in development workflow
- Quality improvement through process change
- Time-consuming task with clear steps

**Template Structure:**

```markdown
# [Process Improvement Title]

## Previous Process

**Steps**: What was being done manually?
**Time Cost**: How long did this take?
**Pain Points**: What was frustrating?
**Error Prone**: What went wrong?

## Improvement

**New Process**: What changed?
**Automation**: What was automated?
**Tools**: What tools were added?
**Simplification**: What was removed?

## Implementation

**Setup**: How to configure new process
**Training**: What team needs to learn
**Rollout**: How change was introduced
**Adoption**: How to encourage usage

## Results

**Time Savings**: Quantified improvement
**Quality Impact**: Errors reduced, consistency improved
**Team Feedback**: Developer satisfaction
**Unexpected Benefits**: Bonus improvements

## Lessons

**Keys to Success**: What made this work?
**Challenges**: What was difficult?
**Recommendations**: Advice for similar improvements

## References

- Process docs: [links]
- Tools: [links]
- Related improvements: [links]
```

**Example Scenarios:**

1. **Automated Code Review Checks**
   - Previous: Manual style reviews
   - New: Pre-commit hooks + CI checks
   - Time saved: 30 mins/PR → 2 mins/PR
   - Quality: Consistent style enforcement

2. **Deployment Pipeline Improvement**
   - Previous: Manual deployment steps
   - New: One-click deployment with rollback
   - Time saved: 1 hour → 5 minutes
   - Quality: Fewer deployment errors

## Code Pattern Documentation

### Reusable Patterns

**Recognition Signals:**
- Clever solution to common problem
- Pattern not in standard libraries
- Approach that worked well multiple times
- Non-obvious usage of technology
- Pattern worth standardizing across codebase

**Template Structure:**

```markdown
# [Pattern Name]

## Problem

**Scenario**: When is this pattern needed?
**Challenges**: What makes this difficult?
**Requirements**: What must the solution provide?

## Solution

**Approach**: High-level description
**Implementation**: Code example with explanation
**Variations**: Different ways to apply pattern

## Usage

**When to Use**: Appropriate scenarios
**When Not to Use**: Inappropriate scenarios
**Trade-offs**: Pros and cons

## Examples

### Example 1: [Scenario]

**Context**: Specific use case
**Code**: Implementation example
**Explanation**: How it works

### Example 2: [Scenario]

[Same structure as Example 1]

## Related Patterns

- Similar patterns: [links]
- Complementary patterns: [links]
- Alternative approaches: [links]
```

**Example Scenarios:**

1. **Retry with Exponential Backoff**
   - Pattern: Retry failed operations with increasing delays
   - Use when: Network calls, external API integrations
   - Trade-off: Increased latency vs resilience

2. **Circuit Breaker Pattern**
   - Pattern: Stop calling failing service temporarily
   - Use when: Microservice communication
   - Trade-off: Availability vs cascading failures

## Quality Checklist

### Before Capturing Knowledge

- [ ] Is this non-obvious or would it surprise someone?
- [ ] Would future-me benefit from reading this?
- [ ] Does it contain specific, actionable information?
- [ ] Is the solution verified as working?
- [ ] Is it more than just following official docs?
- [ ] Will this apply to future similar situations?
- [ ] Can I explain the "why" not just the "what"?

### During Documentation

- [ ] Title is descriptive and searchable
- [ ] Problem/context is clearly stated
- [ ] Solution is explained with specifics
- [ ] Root cause is identified (not just symptoms)
- [ ] Prevention strategies are included
- [ ] Code examples are complete and tested
- [ ] Related issues are linked
- [ ] Appropriate tags are added

### After Documentation

- [ ] No sensitive information included (API keys, passwords, etc.)
- [ ] Company-private information handled appropriately
- [ ] Git metadata is captured correctly
- [ ] Lesson is categorized properly
- [ ] References are valid and accessible
- [ ] Content is clear to someone unfamiliar with context

## Anti-Patterns

### What Not to Document

**1. Trivial Fixes**
- Obvious solutions anyone would find quickly
- Simple typos or missing semicolons
- Standard error messages with clear resolution
- Example: "Fixed syntax error" - too basic

**2. Incomplete Solutions**
- Workarounds still being tested
- Temporary hacks not intended to last
- Solutions with known flaws
- Example: "Added sleep(1000) to fix race condition" - not a real solution

**3. Environment-Specific Quirks**
- Issues unique to individual developer's machine
- Problems caused by outdated local software
- Configuration specific to one person
- Example: "Works on my machine" situations

**4. Duplicate Information**
- Content readily available in official docs
- Information already in codebase comments
- Lessons that duplicate existing captures
- Example: Copying framework documentation

**5. Speculation and Theories**
- Unverified hypotheses
- Solutions that seem like they might work
- Assumptions without testing
- Example: "This probably happens because..."

### Red Flags

If your documentation includes these phrases, reconsider:

- "I think this might be..."
- "This works on my machine"
- "I'm not sure why but..."
- "Temporary workaround"
- "Quick hack until we fix properly"
- "Just follow the docs"

## Edge Cases

### Complex Multi-Component Issues

When problem spans multiple systems:

**Approach:**
1. Create single lesson for overall issue
2. Create separate lessons for component-specific details
3. Link lessons together
4. Tag with all affected components

**Example**: Authentication failure spanning frontend, API gateway, and auth service

### Knowledge Gaps

When solution works but why is unclear:

**Approach:**
1. Document what was tried and what worked
2. Explicitly state what's not understood
3. Add "TODO: investigate why" notes
4. Mark for future deep-dive

**Example**: "This config change fixed it, but root cause unclear"

### Partial Solutions

When solution helps but doesn't fully resolve:

**Approach:**
1. Document what was improved
2. Clearly state remaining issues
3. Link to meta-issue for full tracking
4. Indicate this is partial solution

**Example**: "Reduced occurrence from 10x/day to 1x/week, investigating remaining cases"

### Time-Sensitive Knowledge

When solution may become obsolete:

**Approach:**
1. Document current state with date
2. Note what might change (versions, APIs, etc.)
3. Add review date
4. Plan for updating or archiving

**Example**: "As of 2026-02, this workaround is needed for Node 18. May be fixed in Node 20."

### Team vs Personal Knowledge

When deciding private vs committed:

**Team-Shareable:**
- Architectural decisions
- Verified solutions to real problems
- Process improvements
- Reusable patterns

**Personal/Private:**
- Debugging notes during investigation
- Personal preferences or shortcuts
- Incomplete explorations
- Sensitive company information

Use selective git strategy to commit team-shareable, gitignore personal.

---

## Summary

Effective knowledge capture requires:

1. **Recognition**: Identify knowledge worth preserving
2. **Judgment**: Assess quality and relevance
3. **Structure**: Use appropriate template
4. **Detail**: Include specifics and context
5. **Quality**: Meet checklist criteria
6. **Organization**: Tag and categorize properly

Focus on non-obvious, actionable, specific, reusable, and verified knowledge that will genuinely help future work.
