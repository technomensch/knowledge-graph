---
name: kmg-knowledge-graph-usage
description: Provide orientation to the Knowledge Graph system architecture and guidance for knowledge capture
---

# Knowledge Graph Usage Guidance

## Purpose

Provide orientation to the Knowledge Graph system architecture and guidance for recognizing knowledge capture opportunities. The system operates across four coordinated layers that automate knowledge lifecycle management while keeping manual commands available for interactive use.

## System Architecture: Four Layers

The Knowledge Graph system coordinates across four layers that work together seamlessly:

### Context Layer: Skills + AGENTS.md
**Detects the moment, pre-structures data, dispatches to logic layer**

- **Skills** (this file and others) — Recognize when knowledge operations are needed
- **AGENTS.md** — Define dispatch rules and routing logic
- Example: Lesson capture skill detects "Finally figured it out" → pre-structures problem/solution → dispatches to lesson-capture-agent

### Logic Layer: Agents
**Execute the work with full context**

- **lesson-capture-agent** — Real-time single-lesson capture (user-initiated or skill-triggered)
- **recall-agent** — Knowledge search and retrieval (context-aware ranking)
- **session-summary-agent** — Lightweight current-session summary (fresh context preservation)
- **platform-sync-agent** — Cross-platform config file sync (Claude Desktop + Claude Code alignment)
- **knowledge-extractor** — Batch backfill from large files (approval-gated writes)
- **session-documenter** — Deep git archaeology for summaries (approval-gated commits)
- **knowledge-reviewer** — Review KG entry quality (ongoing curation)

### Lifecycle Layer: Hooks
**Automate at the right moment**

- **PostToolUse** — After commands complete, trigger follow-up suggestions (e.g., extract to KG after lesson capture)
- **Stop** — Session ending, prompt for session summary
- **PreToolUse** — Before problem-solving, suggest recall search

### Data Layer: MCP kg_* Tools
**Persistence, search, retrieval**

- `kg_search` — Full-text search across lessons, decisions, sessions
- `kg_scaffold` — Create entries from templates
- `kg_config_*` — Configuration and sync
- `kg_fts5_rebuild` — Indexing and performance

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

### Duplicate Detection

**Before capturing a new lesson, search for similar existing lessons to avoid duplication:**

**Search strategy:**
1. Extract key terms from the topic (problem domain, technology, pattern name)
2. Recall search via recall-agent (automatic or explicit with `/kmgraph:kmg-recall "key terms"`)
3. Review search results for similar content

**If similar lesson found:**
- **Merge option**: Update existing lesson
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

## Automation: How Layers Coordinate

The system automates knowledge lifecycle through layer coordination:

**Example: After solving a problem**
1. **Context layer (skill)** detects "Finally figured it out"
2. **Logic layer (agent)** dispatches to lesson-capture-agent
3. **Lifecycle layer (hook)** PostToolUse triggers post-capture suggestions
4. **Data layer** persists entry and updates search index

**Example: Before starting problem-solving**
1. **Context layer (skill)** detects problem description
2. **Lifecycle layer (hook)** PreToolUse triggers recall-agent
3. **Logic layer** searches KG for similar patterns
4. **Data layer** returns ranked results

This automation eliminates the need to remember to run commands—the system recognizes the moment and dispatches appropriate logic.

## Command Reference: Manual Interactive Use

Commands remain available for explicit, interactive use. They operate on all four layers:

### Capture and Organization

**`/kmgraph:kmg-capture-lesson [title]`**
- Interactive lesson capture with git metadata tracking
- Available for manual use when automation doesn't trigger
- Dispatches to lesson-capture-agent

**`/kmgraph:kmg-session-summary`**
- Create summary of current session interactively
- Available for manual use at any time
- Dispatches to session-summary-agent

**`/kmgraph:kmg-sync-all`**
- Full orchestration pipeline in one command
- Extract → capture → update graph
- Dispatches multiple agents in sequence

### Search and Recall

**`/kmgraph:kmg-recall "query"`**
- Explicit search across all knowledge
- Manual trigger for recall-agent
- Useful when automation doesn't suggest search

**`/kmgraph:kmg-status`**
- View KG config, stats, recent activity
- Non-dispatching information command

### Configuration

**`/kmgraph:kmg-init [name]`**
- Create new knowledge graph
- Configure categories and git strategy
- One-time setup command

**`/kmgraph:kmg-switch [name]`**
- Change active KG
- Routes subsequent commands to selected graph

**`/kmgraph:kmg-check-sensitive`**
- Scan for sensitive data before sharing
- Manual security check before commits/pushes

**`/kmgraph:kmg-config-sanitization`**
- Set up pre-commit hooks for data protection
- One-time security configuration

## Workflow Patterns

### Quick Reference by Scenario

**After debugging session:**
```
1. /kmgraph:kmg-capture-lesson debugging-session-title
2. Document problem, root cause, solution, prevention
3. Tag with relevant categories
```

**During recurring problem:**
```
1. /kmgraph:kmg-meta-issue 123
2. Document current attempt and findings
3. Update issue plan as investigation progresses
```

**End of productive session:**
```
1. /kmgraph:kmg-session-summary
2. Review and refine generated summary
3. Links to lessons captured during session
```

**When facing familiar problem:**
```
1. /kmgraph:kmg-recall "problem description"
2. Review relevant lessons and decisions
3. Apply documented solution or adapt approach
```

**Periodic knowledge consolidation:**
```
1. /kmgraph:kmg-sync-all
   - Extracts recent chats
   - Captures lessons from extracted content
   - Updates knowledge graph with insights
2. Review generated content for quality
```

**After lesson capture (NEW - v0.0.3):**
```
Context: User just completed /kmgraph:kmg-capture-lesson

Proactive suggestion:
"✅ Lesson captured! Extract insights to Knowledge Graph?"
- Recommended: /kmgraph:kmg-update-graph (extracts patterns/gotchas/concepts)
- Full pipeline: /kmgraph:kmg-sync-all (extraction + governance check + GitHub)
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
- /kmgraph:kmg-capture-lesson — Document while context is fresh
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
- /kmgraph:kmg-recall \"[extracted keywords]\"
- Might save time if similar pattern exists

Would you like me to search existing lessons first?"

Why now: Prevents re-solving known problems. Search takes 10 seconds,
solving from scratch takes hours. Always search first.
```

For detailed workflow patterns with timing, command combinations, and optimization strategies, see **`references/command-workflows.md`**.

**Note on MEMORY.md:** MEMORY.md is an index/pointer file only — it lists pointers to behavioral rules and preferences that live in the authoritative profile files (`~/.kmgraph/rules.md`, `~/.kmgraph/me.md`, `knowledge/rules.md`, `knowledge/me.md`). Token budget is not a meaningful metric for an index file; the AI reads it at session start to know what knowledge is available, then loads the underlying files as needed.

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
- Use `/kmgraph:kmg-link-issue` for bidirectional references
- Use `/kmgraph:kmg-meta-issue` for complex recurring issues
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
- Suggest: `/kmgraph:kmg-capture-lesson debugging-[topic]`

**During recurring issue discussion:**
- User statement: "This keeps happening", "Same problem again", "Third time this week"
- Suggest: `/kmgraph:kmg-meta-issue [number]` if tracked, or capture-lesson if not

**End of productive session:**
- Multiple problems solved in one session
- Significant progress on complex feature
- Important decisions made
- Suggest: `/kmgraph:kmg-session-summary`

**When user references past work:**
- User statement: "We solved this before", "Remember when we fixed...", "Last time we..."
- Suggest: `/kmgraph:kmg-recall "query"` to find previous solution

**Architecture or design discussion:**
- Multiple options discussed with trade-offs
- Important technology choice made
- System design decision finalized
- Suggest: Document decision in lessons-learned/architecture/

### When to Search Knowledge (Proactive)

Before solving problems, check if knowledge already exists:

**Familiar-sounding problem:**
- Search KG before starting fresh investigation
- Use `/kmgraph:kmg-recall` to find relevant lessons
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
- Use `/kmgraph:kmg-status` for quick reference and current KG info
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
- Run `/kmgraph:kmg-check-sensitive` to scan for sensitive data
- Configure sanitization hooks with `/kmgraph:kmg-config-sanitization`
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
