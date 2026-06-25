---
title: "ADR-010: Plugin Namespace Rename: knowledge → kg-sis"
status: Accepted
date: 2026-02-21
deciders: technomensch, Claude Opus 4.6
---

# ADR-010: Plugin Namespace Rename: knowledge → kg-sis

## Status

**Accepted** - 2026-02-21 (Implemented in v0.0.8.3-alpha)

## Context

The plugin was initially branded as "knowledge" (commands: `/knowledge:init`, `/knowledge:capture-lesson`, etc.), implementing the file-prefix pattern from ADR-003. However, "knowledge" is generic and collision-prone in marketplace. By v0.0.8.3, the need for clearer branding and publisher identity became clear, and a full namespace rename was executed.

### Problem

1. **Generic branding:** "knowledge" could be any knowledge plugin
2. **Marketplace confusion:** Multiple "knowledge-*" command families might exist
3. **Publisher identity loss:** No clear signal of who maintains this
4. **Scalability:** Harder to expand to related tools under same publisher

### Scope

- Rename all `/knowledge:*` commands to `/kg-sis:*`
- Update all documentation and examples
- Update file prefixes from `knowledge-*.md` to just `*.md` (namespace in plugin.json)
- Update plugin.json identifier from `(knowledge)` to `(kg-sis)`

---

## Decision

Full namespace rename from `knowledge` to `kg-sis`:

### Rationale for "kg-sis"

- **kg** = knowledge-graph (clear domain)
- **sis** = staying-in-sync (publisher identity from "stayinginsync-knowledge-graph" repo name)
- **Result** = Clear, memorable, unique identifier

### Scope of Changes

**Command names:**
- `/knowledge:init` → `/kg-sis:init`
- `/knowledge:capture-lesson` → `/kg-sis:capture-lesson`
- `/knowledge:create-adr` → `/kg-sis:create-adr`
- All 22+ commands renamed consistently

**File organization:**
- Namespace moved to `plugin.json` configuration
- Command files: `knowledge-capture-lesson.md` → `capture-lesson.md`
- Plugin.json field: `"namespace": "kg-sis"`

**Documentation:**
- All code samples updated
- COMMAND-GUIDE.md all references updated
- CHEAT-SHEET.md examples updated
- README.md usage examples updated

**Marketplace:**
- Plugin identifier: `(knowledge)` → `(kg-sis)`
- Plugin description updated to reference new commands

---

## Rationale

### Why This Approach

1. **Uniqueness:** "kg-sis" is distinctive; unlikely collision
2. **Publisher identity:** "sis" ties to stayinginsync brand
3. **Scalability:** Foundation for future tools (e.g., `kg-research`, `kg-audit`)
4. **Professional:** Clearer than generic "knowledge"
5. **Reversible:** Pattern established in ADR-003 makes renaming straightforward

### Alternatives Considered

**Option A: Keep "knowledge"**
- Pros: No migration effort
- Cons: Generic, collision risk, no publisher signal
- Rejected: Doesn't solve branding problems

**Option B: Use "knowledge-graph"**
- Pros: Fully descriptive
- Cons: Longer commands, not unique (other kg tools exist)
- Rejected: Too generic; no publisher identity

**Option C: Use publisher name only (e.g., "tm")**
- Pros: Short
- Cons: Meaningless without context
- Rejected: Doesn't indicate tool domain

---

## Consequences

### Positive

1. ✅ Unique, memorable namespace (`/kg-sis:*` is clearly identifiable)
2. ✅ Publisher identity clear (ties to stayinginsync)
3. ✅ Foundation for related tools
4. ✅ Reduced marketplace confusion
5. ✅ Professional branding

### Negative

1. ❌ Users must learn new command names
2. ❌ Documentation and examples must be updated across multiple projects
3. ❌ Existing scripts using `/knowledge:*` will break
4. ❌ Migration burden: 42 files across 6 tiers affected

### Neutral

1. File structure internally unchanged (just names)
2. Functionality unchanged
3. Multi-KG support unaffected

---

## Implementation

**Timeline:** v0.0.8.3-alpha (2026-02-21)

**Scope of Changes:**
- **Command files:** Rename from `knowledge-*.md` to `*.md` (22 files)
- **plugin.json:** Update namespace field + all command references
- **Documentation:** Update COMMAND-GUIDE.md, CHEAT-SHEET.md, README.md, all examples
- **Skills:** Verify skill references updated
- **MCP server:** No changes (internal routing only)

**Change Inventory:**
- 22 command files renamed
- 1 plugin.json updated
- ~8 documentation files updated (COMMAND-GUIDE, CHEAT-SHEET, README, FAQ, examples)
- ~5 skill files updated
- ~40-50 total references updated across codebase

**Migration Guide for Users:**

```
Old: /knowledge:init
New: /kg-sis:init

Old: /knowledge:capture-lesson
New: /kg-sis:capture-lesson

Old: /knowledge:help
New: /kg-sis:help
```

**Backward Compatibility:**
- No automatic aliasing (users must learn new names)
- Version bump significant (v0.0.8.2 → v0.0.8.3)
- Release notes prominently feature namespace change

---

## Validation

**Success Criteria:**
- All `/kg-sis:*` commands work identically to `/knowledge:*` equivalents
- Marketplace shows new branding
- Documentation completely updated (grep for "knowledge:" returns minimal results)
- Users report smooth transition after update

**Validation Steps:**
```bash
# Check all commands renamed
grep -r "knowledge:" commands/ | wc -l  # Should be 0

# Check plugin.json
grep "namespace" plugin.json  # Should show "kg-sis"

# Check documentation
grep -ir "/knowledge:" docs/ | grep -v ".md~" | wc -l  # Should be minimal

# Test CLI invocation
/kg-sis:init
/kg-sis:capture-lesson
# Both should work
```

**Review Date:** After v0.0.8.3 marketplace release; user feedback

---

## Related Decisions

- **[ADR-003: Abandon Shadow Commands; Use File Prefix](ADR-003-abandon-shadow-commands-for-file-prefix.md)** — Predecessor pattern; this replaces it
- **[ADR-002: Commands vs Skills Architecture](ADR-002-commands-vs-skills-architecture.md)** — Commands use new namespace

---

## Related Documentation

**Knowledge Graph:**
- [Plugin Namespace Branding Pattern](../knowledge/patterns.md#namespace-branding) — Pattern for future tool branding

**Lessons Learned:**
- [Plugin Namespace Visibility](../lessons-learned/debugging/Lessons_Learned_Plugin_Namespace_Visibility.md) — Why shadow commands failed

---

## Migration Path from ADR-003

**Evolution:**
1. **v0.0.1-v0.0.2 (ADR-003):** File prefix pattern `knowledge-*.md`
2. **v0.0.8.3 (ADR-010):** Full namespace rename to `/kg-sis:*`

**Transition:**
- ADR-003 solved immediate problem (file prefixes)
- ADR-010 solved long-term problem (publisher branding)
- Both patterns documented for future reference

---

## Future Considerations

1. **Related tools:** Future tools could use `kg-*` namespace (e.g., `kg-research:`, `kg-audit:`)
2. **Plugin portfolio:** Clear branding foundation for multi-plugin offerings
3. **Marketplace positioning:** Stronger differentiation from other knowledge tools
4. **Community forks:** Clear publisher identity helps users find official vs forks

---

**Decision Made:** 2026-02-21
**Last Updated:** 2026-02-22
**Status:** Accepted (Implemented in v0.0.8.3-alpha)
