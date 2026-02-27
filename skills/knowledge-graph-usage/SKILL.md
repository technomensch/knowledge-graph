---
name: Knowledge Graph Usage
description: This skill should be used when the user mentions "documenting lessons", "capturing knowledge", "remembering this for later", "we solved this before", "institutional memory", "project memory", "track decisions", or when Claude detects recurring problems, repeated patterns, valuable insights worth preserving, situations after completing /kmgraph:capture-lesson (suggest KG extraction), after git commits with fix/debug/pattern keywords (suggest lesson capture within 30min), or when user describes familiar problems (suggest searching existing lessons first).
version: 1.0.1
---

# Knowledge Graph Usage Guidance

## Purpose

Provide autonomous guidance for recognizing knowledge capture opportunities and using the Knowledge Management Graph effectively. Enable Claude to proactively suggest capturing valuable insights, lessons learned, and decisions without explicit user requests.

## Core Principles

### When to Capture Knowledge

Recognize these signals that indicate knowledge worth preserving:

**Problem-Solution Patterns**
- Debugging session that took significant time and revealed non-obvious root cause
- Error or bug that required multiple attempts to resolve
- Configuration issue with unclear documentation
- Performance optimization that required experimentation
- Security vulnerability discovered and mitigated

**Architectural Decisions**
- Technology choice between multiple viable options
- Design pattern selected after weighing trade-offs
- Migration strategy that affected system structure
- Integration approach that addressed specific constraints
- Refactoring decision with long-term implications

**Process Improvements**
- Workflow optimization that saves time
- Team communication pattern that improved coordination
- Testing strategy that caught important bugs
- Deployment procedure that reduced errors
- Review process that improved code quality

**Meta-Issues (Recurring Problems)**
- Same problem encountered 3+ times
- Issue that requires complex multi-step investigation
- Problem with unclear solution requiring iteration
- Situation where previous attempts failed
- Pattern that spans multiple features or components

**Valuable Patterns**
- Reusable code pattern worth documenting
- API usage pattern not in official docs
- Configuration template that works well
- Testing approach for specific scenarios
- Error handling strategy for edge cases

### Quality Standards

Capture knowledge that meets these criteria:

**Non-Obvious**: Not easily found in official documentation or standard tutorials
**Actionable**: Provides clear steps or guidance for future reference
**Specific**: Concrete examples and context rather than vague principles
**Reusable**: Applicable to future similar situations
**Verified**: Based on working solution, not speculation

Avoid capturing:
- Information readily available in official docs
- Temporary workarounds for known bugs
- User-specific environment quirks
- Incomplete solutions still being tested
- Trivial fixes with obvious causes

### Duplicate Detection <!-- v0.0.3 Change -->

**Before capturing a new lesson, search for similar existing lessons to avoid duplication:**

**Search strategy:**
1. Extract key terms from the topic (problem domain, technology, pattern name)
2. Use `/kmgraph:recall "key terms"` to search existing lessons
3. Review search results for similar content

**If similar lesson found:**
- **Merge option**: Update existing lesson (use `/kmgraph:capture-lesson update <filename>`)
- **Related option**: Create new lesson with explicit "Related:" link to similar lesson
- **Proceed option**: Create new lesson if genuinely different (different root cause, different context, or significantly different solution)

**When to merge vs create new:**
- **Merge**: Same problem domain, updates/extends existing knowledge
- **Create new with link**: Different angle on same topic, complementary insight
- **Create new**: Different problem even if similar keywords

**Benefits of duplicate detection:**
- Prevents knowledge fragmentation
- Improves searchability (one comprehensive source better than multiple partial sources)
- Reduces cognitive load during recall
- Maintains single source of truth for each pattern

**Example workflow:**
```
User: "I want to capture a lesson about API error handling"
Assistant: "Before capturing, let me search existing lessons..."
          → Runs /kmgraph:recall "API error handling"
          → Finds: "Lessons_Learned_Error_Handling_Patterns.md"
          → "I found a similar lesson. Would you like to:"
            1. Update existing lesson (merge new findings)
            2. Create new lesson with reference to existing
            3. Proceed with new lesson (if significantly different)
```

## Command Reference

### Primary Capture Commands

**`/kmgraph:capture-lesson [title]`**
- Document lessons learned with git metadata tracking
- Use after resolving significant problems or making important discoveries
- Captures current git branch, commit, author, date
- Categories: architecture, debugging, patterns, process, governance

**`/kmgraph:meta-issue [issue-number]`**
- Initialize tracking for complex recurring problems
- Use when same issue encountered multiple times
- Links attempts, tracks solutions, maintains context
- Integrates with GitHub issues for team visibility

**`/kmgraph:link-issue [lesson-id] [issue-number]`**
- Create bidirectional links between lessons and GitHub issues
- Use to connect documented knowledge with tracked work
- Enables traceability and context preservation

### Search and Recall Commands

**`/kmgraph:recall "query"`**
- Search across all knowledge: lessons, decisions, sessions, graph
- Use when facing familiar problem or needing past context
- Semantic search finds relevant content even with different terms

**`/kmgraph:status`**
- Display active KG info, stats, quick command reference
- Use to understand current KG setup and available categories
- Shows recent activity and configuration

### Organization Commands

**`/kmgraph:update-graph`**
- Extract structured insights from lessons into knowledge graph
- Use after capturing multiple lessons to consolidate learnings
- Preserves git metadata, creates topic-based organization

**`/kmgraph:session-summary`**
- Create summary of current chat session
- Use at end of productive sessions to preserve context
- Documents what was accomplished and key decisions made

**`/kmgraph:sync-all`**
- Automated orchestrator: extract chat → capture lessons → update graph
- Use for complete knowledge pipeline in one command
- Replaces manual 4-step workflow

### Advanced Commands

**`/kmgraph:init [name]`**
- Initialize new knowledge graph with wizard setup
- Use for first-time setup or creating new topic-based KGs
- Configures categories, git strategy, directory structure

**`/kmgraph:switch [name]`**
- Change active knowledge graph
- Use when working across multiple projects or topics
- Subsequent commands operate on selected KG

**`/kmgraph:configure-sanitization`**
- Set up pre-commit hooks for sensitive data detection
- Use before pushing knowledge to public repos
- Interactive wizard configures patterns and actions

**`/kmgraph:check-sensitive`**
- Scan active KG for potentially sensitive information
- Use before public sharing or team distribution
- Reports matches with file locations for review

## Workflow Patterns

### Quick Reference by Scenario

**After debugging session:**
```
1. /kmgraph:capture-lesson debugging-session-title
2. Document problem, root cause, solution, prevention
3. Tag with relevant categories
```

**During recurring problem:**
```
1. /kmgraph:meta-issue 123
2. Document current attempt and findings
3. Update issue plan as investigation progresses
```

**End of productive session:**
```
1. /kmgraph:session-summary
2. Review and refine generated summary
3. Links to lessons captured during session
```

**When facing familiar problem:**
```
1. /kmgraph:recall "problem description"
2. Review relevant lessons and decisions
3. Apply documented solution or adapt approach
```

**Periodic knowledge consolidation:**
```
1. /kmgraph:sync-all
   - Extracts recent chats
   - Captures lessons from extracted content
   - Updates knowledge graph with insights
2. Review generated content for quality
```

**After lesson capture (NEW - v0.0.3):**
```
Context: User just completed /kmgraph:capture-lesson

Proactive suggestion:
"✅ Lesson captured! Extract insights to Knowledge Graph?"
- Recommended: /kmgraph:update-graph (extracts patterns/gotchas/concepts)
- Full pipeline: /kmgraph:sync-all (extraction + MEMORY.md + GitHub)
- Later: Skip for now, run manually later

Why now: Fresh context enables better extraction. The knowledge-reviewer
agent will assess quality automatically.
```

**After significant commits (NEW - v0.0.3):**
```
Context: Git commit completed with keywords (fix|debug|implement|refactor|pattern|architecture)

Proactive suggestion:
"💡 Lesson-worthy commit detected: [hash] - [message]

This looks like knowledge worth capturing. Consider:
- /kmgraph:capture-lesson — Document while context is fresh
- Within 30 minutes is optimal for quality

Keywords detected: [fix/debug/pattern/etc]"

Why now: 30-minute window is critical — after that, context fades and
quality suffers. Commits are natural knowledge boundaries.
```

**Before starting problem-solving (NEW - v0.0.3):**
```
Context: User describes a problem; sounds familiar or recurring

Proactive suggestion:
"Before solving, check if we've seen this before:
- /kmgraph:recall \"[extracted keywords]\"
- Might save time if similar pattern exists

Would you like me to search existing lessons first?"

Why now: Prevents re-solving known problems. Search takes 10 seconds,
solving from scratch takes hours. Always search first.
```

**After archiving entries (NEW - v0.0.4):**
```
Context: User ran /kmgraph:archive-memory to free token budget
Context: User asks about a topic that was recently archived
Context: User needs to reference archived knowledge for current work

Restoration workflow:
1. Check if entry is in archive: "/kmgraph:restore-memory --list"
2. Restore by name: "/kmgraph:restore-memory \"Entry Name\""
3. Restore by ID: "/kmgraph:restore-memory --id=5"
4. Preview before writing: All restorations show preview + token impact

Decision criteria:
- Restore if: Currently working on related problem, need context for active task
- Keep archived if: Historical reference only, not currently relevant
- Token budget: Only restore if < 1,500 tokens in MEMORY.md

Why now: Restoration should be need-driven. Archive freed space for active
knowledge; only restore when archived context becomes active again.
```

For detailed workflow patterns with timing, command combinations, and optimization strategies, see **`references/command-workflows.md`**.

## Capture Patterns

### Problem-Solution Template

When documenting debugging or problem-solving:

**Problem**: What broke? What was the symptom?
**Context**: Environment, configuration, relevant details
**Root Cause**: Why did it break? What was the underlying issue?
**Solution**: How was it fixed? What steps were taken?
**Prevention**: How to avoid this in the future?

### Architectural Decision Template

When documenting design choices:

**Decision**: What was chosen?
**Context**: What problem was being solved?
**Alternatives**: What other options were considered?
**Trade-offs**: What are the pros/cons of each option?
**Rationale**: Why was this option selected?
**Consequences**: What are the implications?

### Meta-Issue Template

When tracking recurring complex problems:

**Issue**: GitHub issue number and link
**Pattern**: What keeps recurring?
**Attempts**: Chronological log of investigation attempts
**Findings**: What has been learned so far
**Current Status**: Where investigation stands
**Next Steps**: What to try next

For comprehensive capture patterns including quality checklists, edge cases, and advanced techniques, see **`references/capture-patterns.md`**.

## Integration with Development Workflow

### Git Integration

Knowledge commands automatically capture git metadata:
- Current branch
- Latest commit hash
- Author information
- Timestamp

This enables:
- Traceability to specific code versions
- Linking lessons to actual changes
- Historical context preservation
- Team attribution

### GitHub Integration

Link lessons to tracked work:
- Use `/kmgraph:link-issue` for bidirectional references
- Use `/kmgraph:meta-issue` for complex recurring issues
- Track investigation progress within issue context
- Enable team visibility into problem-solving process

### IDE Integration

Knowledge commands work within Claude Code:
- Invoke from command palette
- Operate on current project context
- Access current git state
- Use relative paths for portability

## Autonomous Triggering

### When to Suggest Capture (Proactive)

Recognize these patterns during conversation and suggest appropriate commands:

**After complex debugging:**
- User statement: "Finally figured it out", "That was tricky", "Took me hours"
- Suggest: `/kmgraph:capture-lesson debugging-[topic]`

**During recurring issue discussion:**
- User statement: "This keeps happening", "Same problem again", "Third time this week"
- Suggest: `/kmgraph:meta-issue [number]` if tracked, or capture-lesson if not

**End of productive session:**
- Multiple problems solved in one session
- Significant progress on complex feature
- Important decisions made
- Suggest: `/kmgraph:session-summary`

**When user references past work:**
- User statement: "We solved this before", "Remember when we fixed...", "Last time we..."
- Suggest: `/kmgraph:recall "query"` to find previous solution

**Architecture or design discussion:**
- Multiple options discussed with trade-offs
- Important technology choice made
- System design decision finalized
- Suggest: Document decision in lessons-learned/architecture/

### When to Search Knowledge (Proactive)

Before solving problems, check if knowledge already exists:

**Familiar-sounding problem:**
- Search KG before starting fresh investigation
- Use `/kmgraph:recall` to find relevant lessons
- Present existing solutions or patterns

**User mentions past work:**
- When user says "we did something similar"
- Search for related lessons or decisions
- Provide context from previous work

**Recurring patterns:**
- Detect similar problems across sessions
- Surface relevant meta-issues or lessons
- Connect current work to documented patterns

## Additional Resources

### Reference Files

For comprehensive guidance on specific topics:

- **`references/capture-patterns.md`** - Detailed capture patterns, quality checklists, examples for different knowledge types, edge case handling, and advanced techniques for documenting lessons, decisions, and meta-issues
- **`references/command-workflows.md`** - Ten detailed workflow patterns with timing recommendations, command combinations, optimization strategies, and scenario-specific guidance for daily development, complex investigation, team coordination, and knowledge consolidation

### Command Documentation

For detailed command syntax and options:
- Use `/kmgraph:status` for quick reference and current KG info
- Check README.md for complete command documentation
- See examples/ directory for real-world usage patterns

## Best Practices

### Do:
- Capture knowledge immediately after solving problems (context is fresh)
- Use specific, descriptive titles for lessons
- Include concrete examples and code snippets
- Tag lessons with appropriate categories
- Link lessons to GitHub issues when relevant
- Review and refine generated content
- Update knowledge graph periodically to consolidate learnings

### Don't:
- Capture trivial fixes or obvious solutions
- Document temporary workarounds as permanent solutions
- Include sensitive information (API keys, passwords, private data)
- Duplicate information already in official documentation
- Write vague or generic lessons without specifics
- Let lessons accumulate without periodic consolidation

### Privacy and Security

Before sharing knowledge:
- Run `/kmgraph:check-sensitive` to scan for sensitive data
- Configure sanitization hooks with `/kmgraph:configure-sanitization`
- Review lessons for company-private information
- Use selective git strategy to keep personal notes private
- Remove or redact sensitive details before committing

## Summary

Use this skill to:
1. **Recognize** when valuable knowledge should be captured
2. **Select** appropriate commands for the situation
3. **Guide** users through knowledge capture workflows
4. **Suggest** proactive knowledge capture opportunities
5. **Search** existing knowledge before solving problems
6. **Maintain** high-quality, actionable knowledge base

Focus on capturing non-obvious, actionable, specific, reusable, and verified knowledge that will benefit future work. Integrate knowledge capture naturally into development workflow rather than treating it as separate documentation task.
