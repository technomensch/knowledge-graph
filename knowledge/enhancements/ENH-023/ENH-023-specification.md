---
title: 'ENH-023: Extend pre-skill-rules-inject.sh to Cover Official Marketplace Skills'
---

# ENH-023: Extend pre-skill-rules-inject.sh to Cover Official Marketplace Skills

## Problem

Official marketplace skills (e.g., `code-review:code-review` from `claude-plugins-official`) bypass project governance when invoked via the Skill tool. The PreToolUse hook in `pre-skill-rules-inject.sh` (ADR-043) only handles `superpowers:*` skills. When `code-review:code-review` executes:

1. `~/.kmgraph/rules.md` and `~/.kmgraph/triggers.md` are not read
2. PROTECTED file status (`commands/`, `core/templates/`) is unknown to the skill
3. ADR-049 Review Audit Protocol is not invoked
4. The skill produces findings against protected files with no gating or user confirmation

**Observed instance (2026-06-07):** `/code-review ultra` fallback ran a local max-effort review that found 13 bugs in `commands/` (PROTECTED). The review was correct but had no awareness that all `commands/` fixes require explicit user permission before implementation.

## Root Cause

ADR-043's case statement is scoped to `superpowers:*` by name. The fallback branch exits 0 (no injection) for all unrecognized skill names. Official marketplace skills from other namespaces are structurally identical in their bypass behavior but are not in scope.

## Proposed Fix

Add a `code-review` branch to the `pre-skill-rules-inject.sh` case statement that injects:

1. **Protected files guard** — inline list of PROTECTED paths from CLAUDE.md (`commands/`, `core/templates/`): "Findings in these paths require explicit user permission before any edit. Surface findings but do not implement."
2. **ADR-049 gate** — inject the Review Audit Protocol reminder: "Before dispatching implementation from review findings, invoke `kmgraph:recall` on the modified file paths."
3. **Rules.md injection** — same pattern as the `brainstorming` branch in ADR-043.

## Scope

- `scripts/pre-skill-rules-inject.sh` — add `code-review` case branch
- `~/.kmgraph/hooks/pre-skill-rules-inject.sh` — mirror the change (two-script maintenance per ADR-043 Consequences)
- `hooks/hooks.json` — verify matcher covers `code-review:code-review` skill name (may already work if matcher is `Skill` tool)

## Out of Scope

- Modifying `code-review` skill content directly (same constraint as superpowers — third-party, not modifiable)
- Covering all possible future marketplace skills (address case-by-case)

## Open Questions

1. Does the existing `Skill` tool matcher in `hooks/hooks.json` already capture `code-review:code-review`, or does it only fire on `superpowers:*` names?
2. Should we add a generic "unknown marketplace skill" fallback that injects protected-files guard for ANY unrecognized skill with a namespace prefix?

## Related

- ADR-043: the fix pattern this ENH extends
- ENH-015: drove ADR-043's expansion to 7 branches
- ADR-049: the review protocol the code-review skill should respect
