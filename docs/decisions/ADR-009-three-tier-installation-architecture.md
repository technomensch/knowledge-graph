---
title: "ADR-009: Three-Tier Installation Architecture"
status: Accepted
date: 2026-02-20
deciders: technomensch, Claude Opus 4.6
---

# ADR-009: Three-Tier Installation Architecture

## Status

**Accepted** - 2026-02-20

## Context

The plugin aims to serve users across different platforms and installation preferences. Early versions assumed Claude Code was the only target platform, but the knowledge graph pattern has universal applicability. v0.0.8 required formalizing support for three distinct user archetypes with different installation paths and capabilities.

### Problem

1. **Platform diversity:** Claude Code, MCP IDEs (Cursor, Windsurf, etc.), generic template users
2. **Capability gaps:** Tier 2/3 users lack automatic updates and full feature access
3. **Installation complexity:** Different paths for different user types
4. **Documentation unclear:** Which installation path for which users?

### Scope

- Define three installation tiers with explicit feature matrix
- Establish INSTALL.md as authoritative source (Mintlify standard)
- Implement platform detection in setup prompts
- Address limitations of each tier transparently

---

## Decision

Three-tier installation with explicit trade-offs:

### Tier 1: Claude Code (Full Feature Set)

**Characteristics:**
- Installation: Claude Code marketplace → `claude plugin install`
- Platform: Claude Code IDE only
- Update path: Automatic via `claude plugin update`
- Features: ✅ All commands, ✅ All skills, ✅ All MCP tools, ✅ Auto-updates

**Who:** Primary Claude Code users wanting full integration

### Tier 2: MCP IDEs (Limited Auto-Update)

**Characteristics:**
- Platforms: Cursor, Windsurf, Continue.dev, JetBrains, VS Code
- Installation: Local clone + MCP server registration
- Update path: Manual (`git pull` in local clone)
- Features: ✅ MCP tools, ✅ Direct command execution via stdin, ❌ No plugin auto-discovery

**Who:** Users on non-Claude Code platforms wanting core functionality

### Tier 3: Template-Only (Minimal/Manual)

**Characteristics:**
- Platforms: Any IDE or tool with file support
- Installation: Clone repo or download template files manually
- Update path: Manual file copying
- Features: ✅ Core INSTALL.md wizard, ✅ Executable templates, ❌ No MCP server, ❌ No IDE integration

**Who:** Users wanting portable, platform-agnostic knowledge graph base

---

## Rationale

### Why This Approach

1. **Honest about limitations:** Each tier explicitly states what's included/excluded
2. **Right-sized:** Users choose tier matching their platform and needs
3. **Clear upgrade path:** Users understand what they gain by moving tiers
4. **Sustainable:** Three tiers easier to maintain than attempting one-size-fits-all
5. **Mintlify standard:** Follows established pattern for LLM-executable installation

### Alternatives Considered

**Option A: Single Implementation**
- Pros: Maintenance simplicity
- Cons: Doesn't serve non-Claude Code users; over-engineered for Tier 3
- Rejected: Abandons significant user base

**Option B: Many Tiers (5+)**
- Pros: More granular targeting
- Cons: Maintenance burden explodes; marginal benefit per tier
- Rejected: Too complex

**Option C: Separate Plugins per Tier**
- Pros: Each tier optimized independently
- Cons: Fragmented codebase; different versions diverge
- Rejected: Unsustainable

---

## Consequences

### Positive

1. ✅ Serves users across diverse platforms and preferences
2. ✅ Clear value ladder (Tier 1 > Tier 2 > Tier 3)
3. ✅ Transparent about limitations (no false expectations)
4. ✅ Foundation for future platform support

### Negative

1. ❌ More code paths to maintain (increased complexity)
2. ❌ Tier 2/3 users lack auto-update (manual maintenance)
3. ❌ Support scope potentially larger (3 tiers = 3× support surface)

### Neutral

1. Tier 1 is "home base" for development focus
2. Tiers 2/3 require less frequent release cycles

---

## Implementation

**Timeline:** v0.0.8-alpha (2026-02-20)

**Affected Components:**
- INSTALL.md — Single authoritative source for all three tiers
- `mcp-server/` — Tier 2 support
- `core/templates/` — Tier 3 support
- Setup wizards — Platform detection to recommend tier
- Deployment documentation — Tier-specific guidance

**INSTALL.md Structure:**
```
1. Platform Detection Wizard
   - "What IDE are you using?"
   - Recommends appropriate tier

2. Tier 1: Claude Code Marketplace
   - Steps to install and verify

3. Tier 2: MCP IDEs
   - Steps to clone, configure MCP server

4. Tier 3: Template-Only
   - Steps to extract key files, customize
```

**Feature Matrix:**
| Feature | Tier 1 | Tier 2 | Tier 3 |
|---------|--------|--------|--------|
| All commands | ✅ | ❌ | ❌ |
| MCP tools | ✅ | ✅ | ❌ |
| Auto-updates | ✅ | ❌ | ❌ |
| Multi-KG support | ✅ | ✅ | ✅ |
| Offline-first | ✅ | ✅ | ✅ |

---

## Validation

**Success Criteria:**
- Installation succeeds for all three tier workflows
- Feature matrix matches documented capabilities
- Tier-appropriate users understand which to choose
- Support requests clearly identify user's tier

**Metrics:**
- Marketplace installs (Tier 1): Target 100+ by v0.0.8 release
- GitHub clones (Tier 2): Trackable via GitHub
- Documentation clarity: User feedback on tier selection

**Review Date:** After v0.0.8 marketplace release; track which tiers are used

---

## Related Decisions

- **[ADR-001: Centralized Multi-KG Configuration](ADR-001-centralized-multi-kg-configuration.md)** — Multi-KG supported across all tiers
- **[ADR-011: Defer Update Notifications](ADR-011-defer-update-notifications.md)** — Tier 2/3 update discovery gap

---

## Related Documentation

**Lessons Learned:**
- [Three-Tier Installation Architecture](../lessons-learned/process/Lessons_Learned_Three_Tier_Installation.md) — Design process and trade-off analysis

**References:**
- Mintlify INSTALL.md Standard
- Platform-specific MCP server setup guides (Cursor, Windsurf, etc.)

---

## Future Considerations

1. **Tier 2 auto-update:** GitHub Actions-driven deployment (v1.0 feature)
2. **Tier 3 wizard:** Interactive setup for template-only users
3. **Platform expansion:** New platforms might need intermediate tiers
4. **Metrics collection:** Track adoption per tier to guide prioritization

---

**Decision Made:** 2026-02-20
**Last Updated:** 2026-02-22
**Status:** Accepted
