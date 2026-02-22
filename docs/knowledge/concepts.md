# Knowledge Graph - Concepts

Quick-reference architectural concepts and terminology.

---

## Concept Template

Copy this template for each new concept:

```markdown
## Concept Name

**Quick Reference:**
- **Definition:** [One-sentence definition]
- **Purpose:** [Why this concept exists]
- **Key Components:** [Main parts or aspects]

**Usage:**
- [Where this concept is used]
- [How it relates to other concepts]

**Evidence:**
[Link to lesson learned](../../lessons-learned/category/lesson-file.md) — [Context]
[Link to ADR](../../decisions/ADR-XXX.md) — [Decision context]

**See Also:** [Related concepts, patterns, decisions]
```

---

## Instructions

1. **Clear definitions:** Use simple language, avoid jargon
2. **Show relationships:** Connect concepts to each other
3. **Link to decisions:** Reference ADRs where concepts were chosen
4. **Practical examples:** Show where the concept is used in practice
5. **Evolution:** Note if concept has evolved over time

---

## Three-Tier Installation

**Quick Reference:**
- **Definition:** Three distinct deployment paths for different user environments
- **Purpose:** Support Claude Code users, MCP IDE users, and template-only users from single codebase
- **Key Components:**
  - Tier 1 (Claude Code): Full plugin with all commands, auto-update via marketplace
  - Tier 2 (MCP IDEs): Core features via MCP server, manual update
  - Tier 3 (Template-only): Minimal setup via template files, fully manual

**Usage:**
- Tier 1: Primary deployment for Claude Code users
- Tier 2: Cursor, VS Code, Windsurf users with MCP support
- Tier 3: Users on systems without IDE integration

**Evidence:**
[ADR-009: Three-Tier Installation Architecture](../../decisions/ADR-009-three-tier-installation-architecture.md)

**See Also:** MCP as Universal Data Layer

---

## Multi-KG System

**Quick Reference:**
- **Definition:** Support for multiple independent knowledge graphs, each serving different purposes
- **Purpose:** Allow users to maintain project-local, personal, and shared KGs simultaneously
- **Key Components:**
  - Project-local: Specific to single project
  - Personal/Global: Individual user knowledge
  - Cowork: Shared team knowledge
  - Custom: User-defined paths

**Usage:**
- Switch between KGs via `/kg-sis:switch`
- Only one "active" KG at a time
- Each KG maintains separate lessons, decisions, and knowledge entries

**Evidence:**
[ADR-001: Centralized Multi-KG Configuration](../../decisions/ADR-001-centralized-multi-kg-configuration.md)
[Multi-KG Configuration Pattern](patterns.md#multi-kg-configuration-pattern)

---

## Active KG Pointer

**Quick Reference:**
- **Definition:** Single active knowledge graph selected from configured options
- **Purpose:** Enable multi-KG support without requiring user to specify KG on every command
- **Mechanism:** Stored in `~/.claude/kg-config.json` under `"active"` field

**Usage:**
- All `/kg-sis:` commands operate on active KG
- Use `/kg-sis:switch <name>` to change active KG
- New KGs default to active when initialized

**Evidence:**
[ADR-001: Centralized Multi-KG Configuration](../../decisions/ADR-001-centralized-multi-kg-configuration.md)

**See Also:** Multi-KG System concept

---

## Commands vs Skills

**Quick Reference:**
- **Definition:** Two complementary command architectures serving different purposes
- **Purpose:** Commands for immediate task execution; skills for guided, progressive disclosure
- **Key Components:**
  - Commands: Flat, direct, single-step operations (e.g., `/kg-sis:status`)
  - Skills: Hierarchical, guidance-oriented, multi-step workflows (e.g., `/kg-sis:help`)

**Usage:**
- Commands for experienced users who know exactly what they want
- Skills for new users needing context and guidance
- Both can solve same problem; different approach

**Evidence:**
[ADR-002: Commands vs Skills Architecture](../../decisions/ADR-002-commands-vs-skills-architecture.md)
[Commands vs Skills Classification Pattern](patterns.md#commands-vs-skills-classification)

---

## Delegated vs Inline Architecture

**Quick Reference:**
- **Definition:** Two approaches to performing operations—inline (same file/process) vs delegated (separate command)
- **Purpose:** Inline simple/local operations; delegate complex/multi-KG operations
- **Trade-off:** Inline is faster but hardcoded; delegated is routable but requires extra hop

**Usage:**
- Inline: Single command doing its own work (acceptable for simple cases)
- Delegated: Routing to separate command that can handle multiple contexts

**Evidence:**
[ADR-006: Delegated vs Inline KG Updates](../../decisions/ADR-006-delegated-vs-inline-kg-updates.md)
[Delegated Command Architecture Pattern](patterns.md#delegated-command-architecture)

**See Also:** Multi-KG System (why delegation necessary for multi-KG)

---

## Progressive Disclosure

**Quick Reference:**
- **Definition:** Show only essential information first; additional details on demand
- **Purpose:** Reduce cognitive load for new users while supporting experienced users
- **Implementation:** Quick reference → detailed docs → advanced configuration

**Usage:**
- `/kg-sis:help` shows quick command overview
- Each command docs link to deeper references
- COMMAND-GUIDE provides full details for those who need it

**Evidence:**
v0.0.7 documentation consolidation applies this principle across all user docs

**Principle Source:** Nielsen Norman Group (information architecture research)

---

## INSTALL.md Standard

**Quick Reference:**
- **Definition:** Standard format for installation instructions following Mintlify conventions
- **Purpose:** LLM-executable installation guide compatible with AI-assisted setup
- **Key Components:** Platform detection, tier selection, prerequisite checks, step-by-step instructions

**Usage:**
- Users follow INSTALL.md instructions for their platform
- `/kg-sis:setup-platform` generates platform-specific instructions
- Tier selection enables branching to appropriate installation path

**Evidence:**
[ADR-009: Three-Tier Installation Architecture](../../decisions/ADR-009-three-tier-installation-architecture.md)
v0.0.8-alpha introduced universal INSTALL.md

---

## MCP as Universal Data Layer

**Quick Reference:**
- **Definition:** Model Context Protocol server providing ~60% of plugin functionality platform-independently
- **Purpose:** Enable core features across multiple IDEs without rewriting for each platform
- **Key Components:** 7 MCP tools + 2 MCP resources providing data operations

**Usage:**
- Tier 2/3 installations use MCP for core features
- Tier 1 (Claude Code) uses MCP + Claude Code plugin layer
- Decouples data operations from IDE-specific features

**Evidence:**
[ADR-009: Three-Tier Installation Architecture](../../decisions/ADR-009-three-tier-installation-architecture.md)
MCP-First Core Architecture pattern

---

## Platform-Agnostic Core

**Quick Reference:**
- **Definition:** Plugin components that work across multiple platforms vs IDE-specific layers
- **Purpose:** Enable single codebase to run on Claude Code, Cursor, VS Code, and other IDEs
- **Structure:** Core/ directory (platform-agnostic), commands/ (Claude Code only), integrations/ (IDE-specific)

**Usage:**
- Core features in `/core/` work anywhere with Python/Node
- IDE-specific features in `/commands/` only on Claude Code
- MCP server bridges gap across platforms

**Evidence:**
[ADR-009: Three-Tier Installation Architecture](../../decisions/ADR-009-three-tier-installation-architecture.md)
Three-Tier Installation pattern

---

## Token-Based Size Limits

**Quick Reference:**
- **Definition:** Measure code/content size using tokens instead of lines; formula: `tokens = word_count × 1.3`
- **Purpose:** Accurate capacity planning for LLM-based systems
- **Limits:**
  - Soft limit: 1,500 tokens (warning issued)
  - Hard limit: 2,000 tokens (blocks updates)

**Usage:**
- MEMORY.md uses token limits for persistent context
- Plan estimates use tokens, not lines
- Consistently apply throughout project

**Evidence:**
[ADR-004: Token-Based MEMORY.md Size Limits](../../decisions/ADR-004-token-based-memory-size-limits.md)
[Line vs Token Metrics Gotcha](gotchas.md#line-vs-token-metrics-inconsistency)

