# Rules — [Project Name]

<!-- Why/Source evidence backlink pattern -->
<!-- Each rule section can optionally end with two trailing lines: -->
<!--   - Why: one sentence explaining the backstory (enough for an LLM to decide whether to look deeper) -->
<!--   - Source: a relative markdown link to the lesson or ADR that created the rule -->
<!-- Rules with no incident history omit both lines. Their absence signals "pure convention." -->

## Project Conventions

<!-- Naming patterns, branching strategy, commit format, and other project-wide standards. -->
<!-- Sections WITH incident history end with Why: and Source: lines. Example: -->
<!--                                                                           -->
<!--   ## Branch Naming                                                        -->
<!--   - Feature development: `v{ver}-{description}`                           -->
<!--   - Bug fix: `v{ver}-fix-{description}`                                   -->
<!--   - Docs only: `docs-update-{description}`                                -->
<!--   - Why: switching branches mid-implementation orphaned two weeks of work  -->
<!--   - Source: [Issue Tracking Branch Guard](lessons-learned/process/Lessons_Learned_Issue_Tracking_Branch_Guard.md) -->
<!--                                                                           -->
<!-- Sections with no incident history omit both lines. Example:              -->
<!--                                                                           -->
<!--   ## Commit Format                                                        -->
<!--   - Use Conventional Commits: `type(scope): subject`                      -->
<!--   - Allowed types: feat | fix | docs | refactor | chore | perf | style | test | build | ci | revert -->
<!--   (No Why/Source — pure convention, no incident history.)                 -->

- Branch naming: ...
- Commit format: ...
- Version files to keep in sync: ...
- PR policy: ...

## Always / Never Rules

<!-- Hard constraints that apply on every task, no exceptions. -->
<!-- Example: "Always update both CHANGELOGs when cutting a release. Never auto-merge — push branches and await user review." -->
<!-- The Why/Source evidence backlink pattern applies here too. Add Why:/Source: after any rule that came from an incident. -->

Always:
- ...

Never:
- ...

## File Paths and Directory Map

<!-- Where things live in this project. Call out gitignored paths so the assistant knows what not to commit. -->
<!-- Example: "docs/plans/ is gitignored — plan files are local-only. commands/ is PROTECTED — do not modify without permission." -->

| Path | Purpose | Committed? |
|------|---------|------------|
| `src/` | ... | yes |
| `docs/plans/` | local plan files | no (gitignored) |
| `...` | ... | ... |

Protected paths (do not modify without explicit permission):
- ...

## Tool Preferences

<!-- How should the assistant search, read, and execute in this project? -->
<!-- Example: "Prefer Read/Grep/Glob over Bash equivalents. Use parallel tool calls for independent searches. Avoid large Bash output — use context-mode tools instead." -->

- File search: ...
- Content search: ...
- Parallel calls: ...
- Avoid: ...

## Plan Protocol

<!-- Where plans live, what language to use when writing them, and checkpoint rules. -->
<!-- Example: "Plans are local-only. Write to ~/.claude/plans/ first, then copy to docs/plans/ for working reference. Use 'Create' for new files, 'Update' for existing ones — never ambiguous language." -->

- Plan location: ...
- Plan language: use "Create" for new files, "Update" for existing files — never use "Update" for files that don't exist yet
- Capture checkpoints: add a `/kmgraph:capture-lesson` or `/kmgraph:create-adr` step after each phase that produces a decision or learning
- Acceptance criteria: tick plan checkboxes after each phase completes, not at the end

## Communication

<!-- Response style, approval gates, and escalation behavior. -->
<!-- Example: "Present full findings before prompting for approval. Never interrupt analysis mid-way to ask 'should I continue?'" -->

- Output style: ...
- Approval gates: ...
- Escalation: ...
- Do not: interrupt findings with mid-analysis approval prompts — present fully, then ask

## Knowledge Capture

<!-- Rules for maintaining the knowledge graph: when to capture, when to update, and what to search before creating. -->

**Standing rules (apply to all contributors):**

1. Always update the plan before executing, not after. If work is done without a plan entry, add it retroactively and note that it was added after the fact.

2. Before capturing a new lesson via `/kmgraph:capture-lesson`, search the graph for similar existing lessons. Update an existing lesson rather than creating a duplicate.

<!-- Additional project-specific rules: -->
<!-- Example: "Create an ADR for any decision that changes a public interface or deployment method." -->

- ADR trigger: ...
- Lesson trigger: ...
- Review cadence: ...
