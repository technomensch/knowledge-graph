---
kmgraph_schema: 2
---

# Rules — [Project Name]

<!-- Why/Source evidence backlink pattern -->
<!-- Each rule section can optionally end with two trailing lines: -->
<!--   - Why: one sentence explaining the backstory (enough for an LLM to decide whether to look deeper) -->
<!--   - Source: a relative markdown link to the lesson or ADR that created the rule -->
<!-- Rules with no incident history omit both lines. Their absence signals "pure convention." -->

> Quick navigation: [Version & Release](#version--release) · [Git Workflow](#git-workflow) · [Plan Protocol](#plan-protocol) · [Development Workflow](#development-workflow) · [Knowledge Capture](#knowledge-capture) · [Code Protection](#code-protection) · [Communication & Approval Gates](#communication--approval-gates) · [Tool Preferences](#tool-preferences) · [File Paths & Directory Map](#file-paths--directory-map)

---

## Version & Release

### Version Files

<!-- List version files that must stay in sync across all releases. -->
<!-- Example: "Sync package.json, plugin.json, and mcp-server/package.json before every push." -->

- Version files to keep in sync: ...

### Changelog

<!-- How is the changelog maintained? Separate code vs docs feeds? -->
<!-- Example: "CHANGELOG.md for code releases only; docs-updates/ feed for docs-only branches." -->

- ...

---

## Git Workflow

### Branch Naming

<!-- Naming conventions for feature, bugfix, and docs branches. -->
<!-- Example: "Feature: v{ver}-{description} | Bug fix: v{ver}-fix-{description} | Docs-only: docs-update-{description}" -->

- Feature: ...
- Bug fix: ...
- Docs only: ...

### Branch Hierarchy & Chaining

<!-- Rules for chained branches (branch from parent, not main). -->

- ...

### Commits

<!-- Commit message format. -->
<!-- Example: "type(scope): subject — include Closes #N in body." -->

- Format: ...

### PR Policy

<!-- What happens after push? Who merges? Auto-merge allowed? -->
<!-- Example: "Push branches, await user review — never auto-merge." -->

- ...

---

## Plan Protocol

### File Location

<!-- Where plan files live and whether they are committed. -->
<!-- Example: "Plans are local-only. Write to ~/.claude/plans/ first, then copy to docs/plans/ for working reference. Never commit plan files." -->

- Plan location: write to `~/.claude/plans/` first, copy to `docs/plans/` for working reference — never commit plan files
- Plan file routing override: if a `### Plan File Routing` section exists in this `rules.md` or the active project's `rules.md`, that routing takes precedence over `docs/plans/` for any plan with a matching parent artifact (ENH, issue, etc.)
- Plan language: use "Create" for new files, "Update" for existing files — never use "Update" for files that don't exist yet
- Skill overrides: `superpowers:writing-plans` defaults to `docs/superpowers/plans/` and `superpowers:brainstorming` defaults to `docs/superpowers/specs/`. Always override these:
  - Plans → `docs/plans/` (never `docs/superpowers/plans/`)
  - Specs → `docs/specs/` (never `docs/superpowers/specs/`)

### Plan File Routing

<!-- Optional: define project-specific plan locations for plans linked to KG artifacts. -->
<!-- If defined here, these paths override the default docs/plans/ location.            -->
<!-- Leave blank or remove this section entirely if all plans use docs/plans/.          -->

<!-- Example (uncomment and adapt):
- ENH parent  → `knowledge/ENH-NNN/vX-plan.md`
- Issue / bug → `knowledge/issues/issue-NNN/vX-plan.md`
- Misc        → `knowledge/plans/vX-plan.md`
-->

### Execution Mode Decision

After `superpowers:writing-plans` produces the plan, **do not present the "Subagent-Driven or Inline?" choice interactively**. Apply `§ Parallelism Analysis` immediately and produce the per-task execution mode table. Present it as a recommendation — user confirms or adjusts, not chooses from scratch.

### Required Steps

<!-- Steps every implementation plan must include. -->
<!-- Example: 1. Create branch. 2. Copy plan. 3. Implementation. 4. Commit, push, PR, merge. -->

Every implementation plan must include these steps:
1. ...

### Parallelism Analysis

> **When:** After writing a plan, before executing or implementing it

Analyze task dependencies and output a concrete execution mode recommendation. Pre-decides the mode so execution is a confirmation, not a fresh decision.

| Task | Mode | Model | Notes |
|------|------|-------|-------|
| Task 1: [name] | Subagent | standard-tier | |
| Task 2: [name] | Inline | fast-tier | Simple mechanical step |

Follow the table with one line: **Overall strategy:** [why this mix was chosen]

**Assignment heuristics:**
- Tasks depending on prior task output → Inline (unless context-mode is active)
- Self-contained, reversible tasks → Subagent candidates
- Final integration, commit, and verification steps → Inline

**Tier heuristics (for the Model column — resolved via `me.md` `tier_map` at invocation time, per ADR-041):**
- **fast-tier** — mechanical/structured: scaffolding, boilerplate, templates, search/lookup, simple CRUD, KG write ops (ADRs, lessons, session summaries)
- **standard-tier** — judgment-required: non-trivial logic, code review, analysis, refactoring, debugging, pattern matching, integration tasks
- **powerful-tier** — high-context/architectural: tasks that depend on output from multiple prior tasks, novel architectural decisions, conflict resolution across complex subsystems
- **Default:** standard-tier for implementation tasks; powerful-tier only when synthesizing large prior context or making novel architectural decisions

### Capture Checkpoints

- Add a `/kmgraph:capture-lesson` or `/kmgraph:create-adr` step after each phase that produces a decision or learning
- Tick plan checkboxes after each phase completes, not at the end

---

## Development Workflow

<!-- Project-specific development procedures — local testing, cache invalidation, tool quirks. -->

- ...

---

## Knowledge Capture

<!-- Rules for maintaining the knowledge graph: when to capture, when to update, and what to search before creating. -->

**Standing rules (apply to all contributors):**

1. Always update the plan before executing, not after. If work is done without a plan entry, add it retroactively and note that it was added after the fact.

2. Before capturing a new lesson via `/kmgraph:capture-lesson`, search the graph for similar existing lessons. Update an existing lesson rather than creating a duplicate.

<!-- Additional project-specific rules: -->

- ADR trigger: ...
- Lesson trigger: ...
- Review cadence: ...

---

## Code Protection

### Protected Paths

<!-- Paths that must not be modified without explicit user permission. -->
<!-- Example: commands/ and core/templates/ are PROTECTED. -->

Protected paths (do not modify without explicit permission):
- ...

---

## Communication & Approval Gates

### Output Style

<!-- Response style preferences. -->
<!-- Example: "Concise, no emojis unless requested, markdown headers for structure." -->

- Output style: ...

### Approval Gates

<!-- When to stop and wait for confirmation. -->
<!-- Example: "Stop after every 'Next Steps' summary. Never start a new branch without explicit 'Proceed'." -->

- Approval gates: ...
- Do not: interrupt findings with mid-analysis approval prompts — present fully, then ask
- Escalation: if blocked or uncertain after investigation, ask — don't retry blindly

---

## Tool Preferences

<!-- Tool-specific preferences belong in the platform's native config file:             -->
<!-- Claude Code → CLAUDE.md, Gemini CLI → GEMINI.md, Cursor → .cursorrules             -->
<!--                                                                                      -->
<!-- This section should contain ONLY platform-agnostic preferences:                     -->
<!--   - Parallel calls strategy (independent searches in parallel)                      -->
<!--   - Context budget policies (avoid bulk output)                                     -->
<!--   - Caching or batching conventions                                                  -->
<!--                                                                                      -->
<!-- Do NOT put tool names here (Glob, Grep, Bash, Read, Edit, rg, WebFetch, etc.) —    -->
<!-- those are platform-specific and belong in the platform's native config file.         -->

- Parallel calls: always run independent searches/reads in parallel
- Avoid bulk output: limit single operations that produce large output — use targeted queries instead

---

## File Paths & Directory Map

<!-- Where things live in this project. Call out gitignored paths so the assistant knows what not to commit. -->
<!-- Example: "docs/plans/ is gitignored — plan files are local-only. commands/ is PROTECTED — do not modify without permission." -->

| Path | Purpose | Committed? |
|------|---------|------------|
| `src/` | ... | yes |
| `docs/plans/` | local plan files | no (gitignored) |
| `CLAUDE.md` | Claude Code platform config (tool directives, platform preferences) | yes |
| `...` | ... | ... |
