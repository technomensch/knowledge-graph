# Knowledge Graph - Architecture

Quick-reference architectural decisions and system design patterns.

---

## Architecture Entry Template

Copy this template for each new architecture entry:

```markdown
## Architecture Component

**Quick Reference:**
- **Purpose:** [What this component does]
- **Design:** [How it's structured]
- **Trade-offs:** [Key decisions and alternatives considered]

**Integration:**
- **Depends on:** [Components this relies on]
- **Used by:** [Components that use this]

**Evidence:**
[Link to ADR](../../decisions/ADR-XXX.md) — [Decision rationale]
[Link to lesson learned](../../lessons-learned/architecture/lesson-file.md) — [Implementation insights]

**See Also:** [Related architecture entries, patterns, concepts]
```

---

## Instructions

1. **System perspective:** Focus on how components fit together
2. **Design rationale:** Explain why this architecture was chosen
3. **Trade-offs:** Document what was gained/lost with this approach
4. **Link to ADRs:** Reference architecture decision records
5. **Evolution:** Note if architecture has changed over time

---

## Plugin Component Classification

**Quick Reference:**
- **Purpose:** Distinguish different types of plugin components and their responsibilities
- **Design:** Four-part component system (commands, skills, MCP server, hooks)
- **Trade-offs:** Separate components require more coordination but enable modularity

**Integration:**
- **Depends on:** Claude Code SDK, MCP protocol, plugin.json manifest
- **Used by:** All plugin features; each feature combines multiple component types

**Components:**
- **Commands** (`commands/`): Direct task execution; flat, imperative
- **Skills** (`skills/`): Guided workflows; hierarchical, progressive disclosure
- **MCP Server** (`mcp-server/`): Data operations; platform-agnostic
- **Hooks** (`hooks/`): Event-driven automation; validation and detection

**Evidence:**
[ADR-002: Commands vs Skills Architecture](../../decisions/ADR-002-commands-vs-skills-architecture.md)

**See Also:** Commands vs Skills, Delegated vs Inline concepts

---

## Multi-KG Routing Logic

**Quick Reference:**
- **Purpose:** Direct KG operations to correct graph in multi-KG environment
- **Design:** Active pointer pattern with path resolution at command invocation
- **Trade-offs:** Routing layer adds complexity but enables seamless multi-KG support

**Integration:**
- **Depends on:** Centralized config (`~/.claude/kg-config.json`), active KG pointer
- **Used by:** All KG write operations (`update-graph`, `capture-lesson`, `create-adr`)

**Routing Steps:**
1. Check active KG from config
2. Resolve active KG path
3. Route operation to correct graph directory
4. Validate path exists (recovery on failure)

**Evidence:**
[ADR-001: Centralized Multi-KG Configuration](../../decisions/ADR-001-centralized-multi-kg-configuration.md)
[ADR-006: Delegated vs Inline KG Updates](../../decisions/ADR-006-delegated-vs-inline-kg-updates.md)

---

## MCP Server Design

**Quick Reference:**
- **Purpose:** Provide platform-independent access to core data operations
- **Design:** 7 tools + 2 resources as standalone MCP server
- **Trade-offs:** Standalone operation enables Tier 2/3 use but requires separate deployment

**Integration:**
- **Depends on:** MCP protocol, Python/Node runtime
- **Used by:** Tier 2 (MCP IDEs), Tier 3 (template-only), plus Claude Code plugin

**Features:**
- **Tools:** CRUD operations for lessons, ADRs, KG entries, config management
- **Resources:** KG search, session recall
- **Standalone mode:** Can run without Claude Code plugin

**Evidence:**
[ADR-009: Three-Tier Installation Architecture](../../decisions/ADR-009-three-tier-installation-architecture.md)
MCP as Universal Data Layer concept

**See Also:** Three-Tier Installation, Platform-Agnostic Core

---

## Knowledge Graph File Structure

**Quick Reference:**
- **Purpose:** Organize captured knowledge into distinct, searchable categories
- **Design:** 5 files with different structures (patterns, gotchas, concepts, architecture, workflows)
- **Trade-offs:** More files means more navigation but better organization than monolithic file

**Integration:**
- **Depends on:** Lessons learned, architecture decisions
- **Used by:** `/kg-sis:recall` search, knowledge review workflows, onboarding

**Structure:**
- **patterns.md**: Reusable solution patterns
- **gotchas.md**: Pitfalls and prevention strategies
- **concepts.md**: Architectural concepts and terminology
- **architecture.md**: System design and component relationships
- **workflows.md**: Standard operating procedures and automation

**Organization:**
- Each file searchable independently or via master index
- Cross-references enable navigation between files
- Bidirectional links connect KG entries to ADRs and lessons

**Evidence:**
Phase 4 Knowledge Graph Population

---

## Plugin Distribution Architecture

**Quick Reference:**
- **Purpose:** Control what gets distributed to users at each deployment stage
- **Design:** Git source → npm allowlist → marketplace distribution
- **Trade-offs:** Allowlist adds configuration but prevents accidental shipping of sensitive files

**Integration:**
- **Depends on:** Git source, npm packaging, Claude marketplace
- **Used by:** Release pipeline, installation (all three tiers)

**Stages:**
1. **Git source** (`/`): Full development repo with tests, plans, backup files
2. **npm allowlist** (`package.json`): Explicit files for distribution
3. **Marketplace** (v0.0.8.3+): Claude marketplace gets packaged npm content

**Safety Features:**
- Prevents .git, node_modules, backup files, sensitive data from shipping
- Explicit allowlist (whitelist approach) safer than blacklist

**Evidence:**
[ADR-007: Distribution Hygiene Files Allowlist](../../decisions/ADR-007-distribution-hygiene-files-allowlist.md)
v0.0.6-alpha introduced package.json allowlist control

---

## Documentation Hierarchy

**Quick Reference:**
- **Purpose:** Organize documentation by audience and use case
- **Design:** README → user docs → developer docs → contributor docs
- **Trade-offs:** Multiple documentation files requires coordination but serves different audiences

**Integration:**
- **Depends on:** Third-person language standards, Section 508 compliance
- **Used by:** All user interactions with plugin docs

**Layers:**
- **README.md**: Project overview, quick start for all users
- **User Docs** (COMMAND-GUIDE.md, CHEAT-SHEET.md, etc.): How to use plugin
- **Developer Docs** (ARCHITECTURE.md, dev guides): Internal structure
- **Contributor Docs** (CONTRIBUTING.md): How to contribute

**Standards Applied:**
- Third-person language (MEMORY.md requirement from v0.0.7)
- Section 508 accessibility compliance
- Bidirectional linking to knowledge graph
- Progressive disclosure pattern

**Evidence:**
[ADR-008: Third-Person Language Standard](../../decisions/ADR-008-third-person-language-standard.md)
v0.0.7-alpha documentation consolidation established hierarchy

