# ENH-016: Rules File Auto-Split Recommendation

**Status:** In Progress
**Version:** v0.5.9.1
**Created:** 2026-05-25

## Problem

`~/.kmgraph/rules.md` grows unbounded over time. It currently mixes two distinct concern domains at different edit cadences:

- **Behavioral rules** — commit format, branch naming, lesson capture, comment style; stable, rarely changes
- **Plan protocol rules** — required steps, parallelism analysis, execution gating, docs impact scanning, post-plan validation; actively evolving, changes frequently

No mechanism exists to recommend reorganization when the file outgrows a single-file structure. Injecting the full file into every skill invocation becomes increasingly noisy as unrelated rules appear in the wrong context (e.g., commit-format rules injected during brainstorming).

## Solution

A recommendation trigger — not a forced structure. When `~/.kmgraph/rules.md` crosses a threshold, the system surfaces: "Your rules.md is getting large and has distinct domains. Consider splitting into separate focused files. See /kmgraph:rules-split for guidance."

The split itself is user-initiated and user-defined. New users start with a single file. Power users split when it makes sense to them.

## Trigger Signals

### Quantitative (either condition sufficient)
- Line count > 120
- Two or more top-level `##` sections each with 5+ subsections

### Qualitative (advisory only)
- User explicitly says "this is getting long" or similar
- Two clearly separable logical domains are identifiable

## Trigger Locations

### 1. SessionStart hook (`scripts/hooks-master.sh`)
Already reads `~/.kmgraph/rules.md` for staleness checks. Add line-count check:
- If > 120 lines AND contains 2+ separable `##` domains → output recommendation once per week (suppress with a flag file `~/.kmgraph/.split-dismissed-{date}`)

### 2. Post-rules-capture (`/kmgraph:rules-capture` or `rules-capture` skill)
After writing a new rule, check line count. If threshold crossed → surface recommendation inline.

## Split Targets (examples, not prescriptive)

| New file | Content |
|---|---|
| `~/.kmgraph/plan-rules.md` | Plan Protocol section and all subsections |
| `~/.kmgraph/rules.md` | Behavioral rules only (commit, branch, capture, comment) |

User defines the split. These are examples.

## Naming Schema

Use **`-rules` suffix** (domain first, type second):

- `plan-rules.md` — plan protocol rules
- `behavioral-rules.md` — git, commits, approval gates, knowledge capture
- `governance-rules.md` — architectural proposals, model selection, review protocol

**Rationale:** lookup pattern is domain-first. The hook injects "plan rules" not "rules of type plan." Natural English: "plan rules," "behavioral rules." `rules.md` remains the master/catch-all file; domain-specific files are scoped extensions.

## Split Implementation Strategy

**Copy content verbatim — do not rewrite.**

When performing the split:
1. Read source `~/.kmgraph/rules.md`
2. Create new file(s) with the relevant sections copied exactly as-is
3. Remove those sections from `~/.kmgraph/rules.md`
4. Update all reference files (see Required Reference Updates section)

Rewriting wastes tokens and introduces drift from the user's intended wording. Copy-paste is the correct operation.

## Required Reference Updates When Splitting

When a user splits their rules file, ALL of the following must be updated (verified by grep as of 2026-05-25):

**Platform Config Files:**
- `~/.claude/CLAUDE.md` — Read order section references `~/.kmgraph/rules.md`; add new file(s) to the ordered list
- `~/.claude/projects/-Users-mkaplan-GitHub-knowledge-graph/memory/MEMORY.md` — cross-project baseline rules reference section
- `~/.claude/projects/-Users-mkaplan-GitHub-career-prism/memory/MEMORY.md` — cross-project baseline rules reference section
- `~/.claude/skills/gov-capture-routing.md` — rules-capture routing skill references the path
- `~/.claude/skills/gov-execute-plan.md` — execution plan skill references rules injection

**Project Repository Files:**
- `/Users/mkaplan/GitHub/knowledge-graph/.claude/settings.local.json` — local project settings may reference rules
- `/Users/mkaplan/GitHub/knowledge-graph/CLAUDE.md` — project-specific instructions reference rules read order
- `/Users/mkaplan/GitHub/knowledge-graph/agents/recall-agent.md` — agent documentation references rules structure
- `/Users/mkaplan/GitHub/knowledge-graph/agents/rules-capture-agent.md` — agent documentation references rules targets
- `/Users/mkaplan/GitHub/knowledge-graph/scripts/hooks-master.sh` — SessionStart hook reads `~/.kmgraph/rules.md` for staleness checks
- `/Users/mkaplan/GitHub/knowledge-graph/scripts/pre-skill-rules-inject.sh` — pre-skill hook reads and injects `~/.kmgraph/rules.md` (or branch-specific split files)
- `/Users/mkaplan/GitHub/knowledge-graph/knowledge/decisions/ADR-028-me-and-rules-as-platform-agnostic-source-of-truth.md` — architecture decision documenting the two-level hierarchy
- `/Users/mkaplan/GitHub/knowledge-graph/knowledge/lessons-learned/architecture/Lessons_Learned_Architecture_Platform_Agnostic_Rule_Timing_Via_Triggers.md` — lessons documentation
- `/Users/mkaplan/GitHub/knowledge-graph/knowledge/lessons-learned/patterns/Lessons_Learned_Two_Level_Identity_Rules_Hierarchy.md` — lessons documentation
- `/Users/mkaplan/GitHub/knowledge-graph/knowledge/enhancements/ENH-010/edge-cases.md` — enhancement specification that may reference split targets
- `/Users/mkaplan/GitHub/knowledge-graph/knowledge/enhancements/ENH-014/ENH-014-specification.md` — related enhancement specification
- `/Users/mkaplan/GitHub/knowledge-graph/skills/rules-capture/SKILL.md` — skill documentation for rule capture workflow
- `/Users/mkaplan/GitHub/knowledge-graph/skills/gov-plan-gate/SKILL.md` — skill referencing plan-rules execution
- `/Users/mkaplan/GitHub/knowledge-graph/skills/stuck-work-escalation/SKILL.md` — escalation skill may reference rules structure
- `/Users/mkaplan/GitHub/knowledge-graph/skills/knowledge-graph-usage/SKILL.md` — usage documentation

**Documentation and Plan Files:**
- `/Users/mkaplan/GitHub/knowledge-graph/docs/design/platform-detection.md` — platform detection design may reference rules
- `/Users/mkaplan/GitHub/knowledge-graph/docs/reference/command-guide.md` — command guide references rules setup
- `/Users/mkaplan/GitHub/knowledge-graph/docs/reference/commands.md` — reference documentation for commands
- `/Users/mkaplan/GitHub/knowledge-graph/docs/pillars/organizing/personal-vs-project.md` — conceptual documentation on rules organization
- `/Users/mkaplan/GitHub/knowledge-graph/docs/GLOSSARY.md` — glossary may define terms related to rules
- `/Users/mkaplan/GitHub/knowledge-graph/docs/plans/v0.5.8-fix-plan-rules-injection.md` — related plan documentation
- `/Users/mkaplan/GitHub/knowledge-graph/README.md` — main project README

**Local Plan Files (in `~/.claude/plans/`):**
- `/Users/mkaplan/.claude/plans/v0.5.4-profile-autoload.md` — local plan referencing rules
- `/Users/mkaplan/.claude/plans/v0.5.7-fix-plan-rules.md` — local plan for rules-related feature
- `/Users/mkaplan/.claude/plans/v0.5.8-fix-plan-rules-injection.md` — local plan for rules injection
- `/Users/mkaplan/.claude/plans/v0.5.9-decision-governance.md` — current development plan with ENH-016 reference section
- `/Users/mkaplan/.claude/plans/2026-04-29-issue-4-session-flag-fix.md` — local plan referencing rules
- `/Users/mkaplan/.claude/plans/v1.2.1-shared-dedup-module.md` — local plan referencing rules

**Update Strategy:**
1. Start with platform config files (`.claude/CLAUDE.md`, project MEMORY.md, skills)
2. Update core implementation files (hooks, scripts)
3. Update knowledge graph files (ADRs, lessons, enhancements, skills)
4. Update documentation and guides
5. Run `/kmgraph:platform-sync-agent` to propagate changes to other platform files (GEMINI.md, .cursorrules, etc.)
6. Test rules injection by running the hook verification tests

## New Surface (optional)

`/kmgraph:rules-split` — a guided command that:
1. Reads current `~/.kmgraph/rules.md`
2. Proposes a split based on detected logical sections
3. User confirms or adjusts
4. Writes new files, updates all reference files automatically
5. Runs `platform-sync-agent` to propagate changes

## Hook Integration

The pre-skill-rules-inject.sh hook already branches by skill type. After a split:
- `superpowers:writing-plans` branch → inject `~/.kmgraph/plan-rules.md`
- `superpowers:brainstorming` branch → inject `~/.kmgraph/plan-rules.md` (has docs-impact rule)
- `superpowers:executing-plans` branch → inject `~/.kmgraph/rules.md` (behavioral)
- Default branch → inject both (or most-relevant)

## Shipping Constraint: Fallback Logic Required

The shipped hook (`scripts/pre-skill-rules-inject.sh`) must use fallback logic — not hardcoded paths — for split files:

```bash
[ -f "$HOME/.kmgraph/plan-rules.md" ] || KMGRAPH_PLAN_RULES="$HOME/.kmgraph/rules.md"
[ -f "$HOME/.kmgraph/governance-rules.md" ] || KMGRAPH_GOVERNANCE_RULES="$HOME/.kmgraph/rules.md"
```

**Why:** split files only exist for users who have explicitly run the split. Fresh installs have only `~/.kmgraph/rules.md`. Hardcoding split file paths in the shipped hook breaks injection for all non-split users — sections silently fail to load.

Same pattern applies to `scripts/hooks-master.sh` staleness checks — use a loop that skips non-existent files rather than unconditionally checking all three paths.

This is a required constraint for any ENH-016 implementation, not an optional optimization.

### rules-capture Sub-File Routing (v0.5.10 planned)

When `personal-rule` routing is selected, scan `~/.kmgraph/` for `*rules*.md` files. Route by content keyword match against filename stems. Fallback to `~/.kmgraph/rules.md` when no match.

**Implementation:** Tracked in `v0.5.10-ux-session-handoff` plan as Task 15.

## Not In Scope

- Forcing a split at install time
- Seeding `~/.kmgraph/plan-rules.md` during `/kmgraph:init`
- Defining a canonical split structure — user defines their own

## Related

- issue-8: Docs Update Enforcement Meta-Issue (ENH-016 multi-file fallback pattern required by issue-8 fix)
