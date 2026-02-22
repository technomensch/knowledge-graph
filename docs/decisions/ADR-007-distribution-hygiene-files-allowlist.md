---
title: "ADR-007: Distribution Hygiene via package.json Files Allowlist"
status: Accepted
date: 2026-02-17
deciders: technomensch, Claude Sonnet 4.5
---

# ADR-007: Distribution Hygiene via package.json Files Allowlist

## Status

**Accepted** - 2026-02-17

## Context

The plugin distributes via multiple channels: npm marketplace, local clone, templates. Each channel has different requirements for what files should be included. Without explicit controls, unnecessary files (build artifacts, development scripts, personal notes) end up in distributed packages, bloating size and confusing users.

### Problem

1. **Bloat:** `.git/`, node_modules, build artifacts included unnecessarily
2. **Security:** Development scripts or local configs could leak sensitive data
3. **Confusion:** Users see internal development files (e.g., .claude/plans/)
4. **Inconsistency:** Different platforms have different cleanup needs

### Scope

- Define what files must/should/must-not be included in distribution
- Implement allowlist in `package.json` to control npm publishing
- Establish `.npmignore` or `.gitignore` patterns for marketplace

---

## Decision

Implement explicit allowlist via `package.json` with three tiers:

### Essential (Must Include)

```json
{
  "files": [
    "plugin.json",
    "commands/",
    "skills/",
    "mcp-server/dist/",
    "core/templates/",
    "docs/COMMAND-GUIDE.md",
    "docs/GETTING-STARTED.md"
  ]
}
```

### Accepted (Should Include)

- `core/examples/` — Reference content (debatable, see ADR-002)
- `README.md` — Top-level documentation
- `LICENSE` — License file

### Excluded (Must Not Include)

- `.git/`, `.git/**` — Version control history
- `node_modules/`, `dist/` (build) — Build artifacts
- `.claude/` — Plugin local configuration
- `docs/plans/` — Implementation plans (gitignored)
- `.env`, `.env.local` — Credentials
- `docs/chat-history/` — Session transcripts

### Implementation Approach

1. **package.json files field:** Explicit allowlist controls what npm includes
2. **Gitignore:** Repository tracks what git tracks
3. **.npmignore:** Additional overrides for npm if needed
4. **Marketplace metadata:** Clarify what users receive on each installation tier

---

## Rationale

### Why This Approach

1. **Explicit over implicit:** Allowlist approach: "Include only what's listed" (safer than blocklist)
2. **Single source of truth:** `package.json` is already used by npm
3. **Platform-agnostic:** Works regardless of how plugin is distributed
4. **Documentation:** The list itself documents what's essential

### Alternatives Considered

**Option A: Blocklist (gitignore only)**
- Pros: Simpler initially
- Cons: Fragile; new files must be explicitly ignored
- Rejected: Too easy to accidentally ship something sensitive

**Option B: No Controls**
- Pros: Zero maintenance
- Cons: Bloat, security risk, user confusion
- Rejected: Unacceptable for production plugin

---

## Consequences

### Positive

1. ✅ Smaller distributions (faster downloads, less storage)
2. ✅ No accidental credential leaks
3. ✅ Cleaner user experience (no confusing internal files)
4. ✅ Future-proof (new internal files don't automatically ship)

### Negative

1. ❌ Requires maintenance when new essential files are added
2. ❌ Can't ship build artifacts without explicit allow

### Neutral

1. Development workflow unchanged
2. Git repository stays complete

---

## Implementation

**Timeline:** v0.0.6-alpha (2026-02-17)

**Affected Components:**
- `package.json` — Add/refine `files` field
- `.npmignore` — Optional overrides if needed
- `.gitignore` — Separate tracking from publishing

**package.json files field:**
```json
{
  "files": [
    "plugin.json",
    "commands/",
    "skills/",
    "mcp-server/dist/",
    "mcp-server/package.json",
    "core/templates/",
    "core/examples/",
    "docs/COMMAND-GUIDE.md",
    "docs/GETTING-STARTED.md",
    "docs/CHEAT-SHEET.md",
    "docs/CONCEPTS.md",
    "docs/FAQ.md",
    "README.md",
    "LICENSE"
  ]
}
```

**Gitignore (remains as-is):**
- `.claude/` — Plugin local config
- `docs/plans/` — Implementation plans
- `docs/chat-history/` — Session transcripts
- `.env` — Credentials

---

## Validation

**Success Criteria:**
- npm package size < 500KB (excluding optional docs)
- No `.git/` or `node_modules/` in distributed package
- All essential files present in marketplace distribution
- Users report clean, minimal distribution

**Metrics:**
- Package size before: (measure current)
- Package size after: <500KB
- Download time: <2 seconds on typical connection

**Review Date:** After first v0.0.6 marketplace release

---

## Related Decisions

- **[ADR-002: Commands vs Skills Architecture](ADR-002-commands-vs-skills-architecture.md)** — Determines what command/skill files to include

---

## Related Documentation

**Lessons Learned:**
- [Distribution Cleanliness During Marketplace Release](../lessons-learned/process/lesson-distribution-cleanliness.md) — Practical insights

---

## Future Considerations

1. **Build optimization:** Pre-compiled templates to reduce size
2. **Optional packages:** Separate examples from core distribution
3. **CI integration:** Automated size checks on release
4. **Multiple channels:** Different allowlists for npm vs marketplace vs GitHub releases

---

**Decision Made:** 2026-02-17
**Last Updated:** 2026-02-22
**Status:** Accepted
