# Architecture Snapshot — 2026-05-28

**Version:** 0.5.9.1 | **MCP server:** 0.3.10

---

## Directory Structure

```
knowledge-graph/
  agents/                  # 11 subagent definitions — heavy-lift task handlers
  commands/                # 26 slash commands (PROTECTED — do not modify)
  core/                    # Platform-agnostic templates (PROTECTED — do not modify)
    templates/
      knowledge/           # Seeds new KG instances
        rules.md           # Default rules for new graph deployments (ADR-037)
        triggers.md        # Default triggers
  docs/                    # MkDocs Material documentation site
    guides/                # How-to guides
    pillars/               # Four pillars: capturing, recalling, governing, tailoring
    plans/                 # Working copies of active plans (gitignored; local only)
    reference/             # Commands, skills, agents reference
  docs-updates/            # Docs-only release feed (MDX posts)
  handoff-packages/        # Handoff docs (this directory)
  hooks/
    hooks.json             # SessionStart automation configuration
  knowledge/               # Project's own KMGraph knowledge base
    concepts/              # patterns.md, gotchas.md, concepts.md, workflows.md
    decisions/             # 51 ADRs + README index
    enhancements/          # ENH-001 through ENH-020
    issues/                # Local issue tracking (issue-1 through issue-7)
    lessons-learned/       # 52 lessons across architecture/, debugging/, patterns/, process/
    sessions/              # Session summaries by month
    templates/             # Knowledge templates (ADR-040)
  mcp-server/              # TypeScript/Node.js MCP server (versioned independently)
    package.json           # version 0.3.10
  scripts/                 # Lifecycle hook scripts
    pre-skill-rules-inject.sh    # PreToolUse injection (ADR-043)
    post-plan-validate-checklist.sh  # Advisory post-plan validation (issue-6)
    stop-plan-gate.sh            # Stop plan gate
    test-decision-governance.sh  # Governance test suite
  skills/                  # 15 auto-triggered context providers
  tests/                   # Test suites
  .claude-plugin/
    plugin.json            # Claude Code plugin manifest (version 0.5.9.1)
  CHANGELOG.md             # Code release history only (ADR-023)
  CLAUDE.md                # Project Claude Code instructions
  GEMINI.md                # Gemini platform configuration
  INSTALL.md               # Installation guide
  package.json             # Root version (0.5.9.1), npm scripts
  README.md                # Project overview
  ROADMAP.md               # Feature roadmap
  sidebars.js              # Docusaurus/MkDocs sidebar config
```

---

## Architectural Principles

### Four-Layer Architecture (ADR-017)

1. **Context layer** — CLAUDE.md, GEMINI.md, platform config files (what the AI sees)
2. **Logic layer** — Commands (thin dispatchers) and skills (auto-triggered context)
3. **Lifecycle layer** — Hooks (hooks.json + scripts/) for automated capture
4. **Data layer** — Knowledge files (lessons, ADRs, concepts, sessions)

Commands are thin dispatchers — they call agents, not implement logic themselves.

### Platform-Agnostic Source of Truth (ADR-028)

`me.md` and `rules.md` are platform-agnostic; platform-specific directives live in the platform config file for that platform (CLAUDE.md, GEMINI.md, etc.). Cross-project rules live in `~/.kmgraph/`; project rules live in `knowledge/`.

### Triggers as Rule Timing (ADR-033)

`triggers.md` declares *when* rules from `rules.md` apply. A rule without a trigger is incomplete. The pair (`rules.md` + `triggers.md`) is a coupled unit.

### Hook Security Model (ADR-012)

Hooks are read-only by default. The `pre-skill-rules-inject.sh` injects rules into the context via PreToolUse — it does not modify files.

### Three-Tier Installation Architecture (ADR-009)

- Tier 1: Core plugin (commands, skills, agents)
- Tier 2: MCP server (TypeScript, independently versioned)
- Tier 3: User knowledge graph (initialized per project via `/kmgraph:init`)

### Write Guard (ADR-019)

Agent instructions (agents/*.md) are source of truth. Data layer files (KG content) are mutable. Never treat agent instruction files as data to be overwritten.

### Delegated vs Inline KG Updates (ADR-006)

Heavy file operations are delegated to subagents (knowledge-extractor, session-documenter) to keep main context clean. Main context does analysis; agents do I/O.

### Graceful Fallback (ADR-016)

All MCP tool calls must have graceful fallbacks when tools are unavailable. kg_* tools are optional; commands must work without them.

---

## Recent ADRs (ADR-045 through ADR-049)

### ADR-045 — Profile Update as Skill, Not Command (Accepted)

**Date:** 2026-04-23 | **Branch:** v0.5.3-hotfix-extract-chat-history | **Commit:** b3dea47f

Profile update functionality implemented as `update-profile` skill rather than a command. Skills are platform-agnostic and auto-triggered; a command would require explicit invocation on every platform.

### ADR-046 — Concept+Setup Hybrid Page Type (Accepted)

**Date:** 2026-04-28 | **Branch:** docs-update-command-guide-formatting | **Commit:** 35bcf156

Introduces a concept+setup hybrid page type for docs where a concept and its setup steps are tightly coupled. Separate from narrative guides. Follows Diataxis taxonomy.

### ADR-047 — Profile Auto-Load: Routing Layer Only (Accepted)

**Date:** 2026-04-28 | **Branch:** v0.5.4-profile-autoload | **Commit:** ecc9d7b9 | **PR:** #104

Profile auto-load injects only the routing layer (`me.md` + `triggers.md`), not `rules.md`. This prevents rule injection at session start from becoming a context-consuming full rules dump.

**Related:** ADR-028, ADR-033, ADR-020, ADR-045

### ADR-048 — Governance Capture Routing (Accepted)

**Date:** 2026-05-05 | **Commit:** d9b0e523

`update-graph` Step 8 detects governance-worthy content but emits a plain-language flag only — no file writes. `session-wrap` is the action point for governance capture. `rules-capture` skill must check whether a new rule also needs a trigger entry.

### ADR-049 — Review Audit Protocol (Accepted)

**Date:** 2026-05-28 | **Branch:** v0.5.9.1-review-audit-protocol | **Status:** Untracked (not yet committed)

Post-plan/pre-push review governance. Establishes the mandatory review audit protocol that must be applied as a pre-execution gate on all implementation plans. Referenced by ENH-015 Gap, ENH-020 (pending), and issue-6 (#125).

**Related:** ADR-043, ADR-033

---

## Naming Conventions

### Branch Format

| Change Type | Format | Example |
|-------------|--------|---------|
| Feature | `v{ver}-{description}` | `v0.5.9-decision-governance` |
| Bug fix | `v{ver}-fix-{description}` | `v0.5.9.2-fix-gh-issue-create` |
| Docs only | `docs-update-{description}` | `docs-update-command-guide` |

### Commit Format (Conventional)

`type(scope): subject` — include `Closes #N` in body.

Types: `feat` | `fix` | `docs` | `refactor` | `chore` | `perf` | `style` | `test` | `build` | `ci` | `revert`

Scope: auto-detected from changed file paths.

### ADR Naming

`ADR-{NNN}-{kebab-case-title}.md` — sequential, zero-padded to 3 digits.

### ENH Naming

`ENH-{NNN}/ENH-{NNN}-specification.md` — sequential, zero-padded to 3 digits.

### Issue Naming (local)

`knowledge/issues/issue-{N}/` — maps to GitHub issue number via frontmatter `github-issue:` field.

### Version Strategy

- `package.json` and `plugin.json` must be in sync at all times before any push
- `mcp-server/package.json` is versioned independently (currently 0.3.10 while plugin is 0.5.9.1)
- Version bump is a mandatory step in every implementation plan

---

## Code Protection Rules

- `commands/` — PROTECTED: never modify without explicit user permission
- `core/templates/` — PROTECTED: never modify without explicit user permission
- Any change to either requires an explicit plan step and user "Proceed" confirmation
- Skills auto-trigger; never modify SKILL.md to add hard-coded behaviors without an ADR

---

## Key Architectural Decisions by Category

| Category | ADRs |
|----------|------|
| Multi-KG configuration | ADR-001 |
| Commands vs skills | ADR-002, ADR-045 |
| Hook architecture | ADR-012, ADR-020, ADR-043 |
| Documentation standards | ADR-013, ADR-021, ADR-023, ADR-027, ADR-046 |
| Platform portability | ADR-018, ADR-028, ADR-032, ADR-033, ADR-037 |
| Governance | ADR-015 (ENH-015), ADR-048, ADR-049 |
| Agent architecture | ADR-006, ADR-017, ADR-019, ADR-034 |
| Knowledge structure | ADR-031, ADR-040, ADR-044 |
| Tier system | ADR-038, ADR-041 |
| Branch/plan rules | ADR-014, ADR-022, ADR-029 |
