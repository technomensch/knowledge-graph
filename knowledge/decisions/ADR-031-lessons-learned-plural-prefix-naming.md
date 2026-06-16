---
title: 'ADR-031: Use Plural `Lessons_Learned_` Prefix for Lesson Filenames'
category:
  uri: uri-that-does-not-map-to-architecture
---

# ADR-031: Use Plural `Lessons_Learned_` Prefix for Lesson Filenames

**Date:** 2026-04-10
**Status:** Accepted
**Implements:** v0.2.1-beta (retroactive documentation)
**Related:** None

---

## Context

The `Lessons_Learned_` filename prefix was introduced in v0.2.1-beta when `kg_capture` was first built in `mcp-server/src/tools/capture.ts`. The naming decision was never documented — it was set during initial implementation with no recorded rationale. The question arose during v0.3.3 planning (Obsidian wiki link pass): should the prefix be singular (`Lesson_Learned_`) or plural (`Lessons_Learned_`)?

**Problem:**
- No ADR or decision document existed explaining why the plural form was chosen
- The question surfaced during v0.3.3 planning when scoping the wiki link Pattern 4 substitution
- Changing the prefix at this point would require a migration pass and a code change to `capture.ts`

**Scope:**
- In scope: the hardcoded prefix in `mcp-server/src/tools/capture.ts` `deriveFileName()`
- In scope: all lesson files created by the `kg_capture` MCP tool
- Out of scope: the 5 legacy lesson files created manually before the convention was enforced (they use kebab-case or date-prefixed names and are handled separately)
- Constraint: 33 files already carry the `Lessons_Learned_` prefix; any change is a breaking migration

---

## Decision

Keep the existing plural `Lessons_Learned_` prefix. No change to `capture.ts` or existing files.

### Core Components

1. **Prefix:** `Lessons_Learned_` (plural) — retained as-is
2. **Enforcement:** Hardcoded in `mcp-server/src/tools/capture.ts` `deriveFileName()` — applies to all lessons created via `kg_capture`
3. **Legacy exceptions:** 5 manually-created files with non-standard names are acknowledged as out-of-scope for automated tooling (e.g., Pattern 4 wiki link pass)

### Implementation Approach

No implementation required — this ADR retroactively documents the existing convention.

---

## Rationale

### Why This Approach

1. **Semantically correct English:** "Lessons Learned" is the standard English phrase for a retrospective collection of insights. As a category prefix applied to many files, the plural form is more accurate than the singular.
2. **Already enforced by code:** The prefix is hardcoded in `capture.ts` and has been in production since v0.2.1-beta. It is the de facto standard for 33 existing files.
3. **Migration cost outweighs benefit:** Renaming to singular would require updating 33 files, modifying `capture.ts`, and potentially breaking any downstream tooling or references. No functional difference exists between the two forms.

### Alternatives Considered

**Option A: Singular `Lesson_Learned_` prefix**
- Pros: Grammatically consistent with referring to an individual entry
- Cons: Non-standard English for a retrospective collection; requires migration of 33 files and a `capture.ts` change
- Rejected because: Migration cost is high; no functional benefit; "Lessons Learned" as a plural collection is the stronger English convention

**Option B: No prefix, kebab-case only (e.g., `issue-tracking-branch-guard.md`)**
- Pros: More human-readable filenames; shorter
- Cons: Loses the type-signal in the filename; harder to scope regex-based tooling (e.g., wiki link Pattern 4); already a minority convention in the KG (5 of 38 files)
- Rejected because: The underscore prefix is what makes Pattern 4 safe — it is categorically distinct from prose and eliminates false positives in automated wiki link substitution

### Trade-offs

**Benefits:**
- ✅ No migration required — 33 existing files remain valid
- ✅ Pattern 4 wiki link substitution can safely scope to `Lessons_Learned_*` (underscores never appear in prose)
- ✅ Semantically correct as a collection prefix
- ✅ System-enforced going forward via `capture.ts`

**Costs:**
- ❌ 5 legacy kebab-case lesson files are outside the automated tooling scope
- ❌ The naming inconsistency (plural category prefix vs. singular content) may occasionally confuse contributors

**Mitigation:**
- Legacy files are a bounded, known set — no new files will join them unless `kg_capture` is bypassed
- This ADR provides the documented rationale so future contributors do not re-litigate the decision

---

## Consequences

### Positive

1. **Wiki link Pattern 4 safety:** The v0.3.3 Obsidian wiki link pass can reliably scope Pattern 4 to `Lessons_Learned_*` filenames. Underscore-prefixed names never appear in normal prose, eliminating false-positive substitution risk.
2. **Convention is documented:** Future contributors and tooling authors have a recorded rationale rather than an unexplained convention.

### Negative

1. **Legacy file gap:** The 5 manually-created lesson files (`namespace-visibility-shadow-command-failure.md`, `2026-03-30-capture-router-auto-detect-type-and-location.md`, `claude-code-plugin-cache-stale-after-update.md`, `documentation-update-triggers-multibranchfeatures.md`, `local-marketplace-testing-workflow.md`) are not covered by Pattern 4 wiki link substitution in v0.3.3.

### Neutral

1. **No code change:** `capture.ts` `deriveFileName()` remains unchanged; this ADR is purely documentation.

---

## Implementation

**Timeline:** Retroactively documented — convention established in v0.2.1-beta (2026-03-27), formalized in v0.3.2-beta (2026-04-10).

**Affected Components:**
- `mcp-server/src/tools/capture.ts` — `deriveFileName()` function (read-only reference)
- All `knowledge/lessons-learned/**/*.md` files created via `kg_capture`

**Migration Path:**
Not applicable — no change made. If a future release decides to adopt kebab-case for all lesson files, a dedicated migration step in `/kmgraph:init` would be required, similar to the v0.3.0 `docs/ → knowledge/` migration.

---

## Validation

**Success Criteria:**
- All new lessons created via `kg_capture` continue to use the `Lessons_Learned_` prefix
- v0.3.3 Pattern 4 wiki link pass correctly scopes to `Lessons_Learned_*` files only
- No false-positive wiki link substitutions from Pattern 4

**Review Date:** Reassess if a future release standardizes all lesson files to a single naming convention.

---

## Related Decisions

None directly. This decision informs the Pattern 4 implementation scope in the v0.3.3 Obsidian wiki link pass.

---

## Related Documentation

**Implementation:**
- `mcp-server/src/tools/capture.ts` — `deriveFileName()` function, lines 65-95

**Plans:**
- `docs/plans/v0.3.3-beta-obsidian-wiki-links.md` — Pattern 4 scope uses this naming convention

---

## Future Considerations

1. **Kebab-case unification:** A future release could migrate legacy kebab-case files and enforce `Lessons_Learned_` everywhere, giving Pattern 4 complete coverage.
2. **Date-prefixed lessons:** The file `2026-03-30-capture-router-auto-detect-type-and-location.md` uses a date prefix instead of the type prefix — this may warrant its own convention decision if date-based naming is intentional.

---

**Decision Made:** 2026-04-10
**Last Updated:** 2026-04-10
**Status:** Accepted
