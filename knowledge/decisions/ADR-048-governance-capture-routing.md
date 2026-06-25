---
id: ADR-048
title: Governance Capture Routing — update-graph flag-only, session-wrap as action point
status: Accepted
date: 2026-05-05
implements: "d9b0e523 — feat(agents): replace Step 8 MEMORY.md write with governance flag output"
---

# ADR-048: Governance Capture Routing

## Context

`update-graph` (via `knowledge-extractor` Step 8) previously wrote governance-worthy
content from lessons directly to `MEMORY.md`. This was the original persistent
governance store. The governance store has since migrated to a three-file profile
bundle (`rules.md`, `me.md`, `triggers.md`). `MEMORY.md` remains valid as Claude's
auto-memory index but is no longer a governance write target.

Two additional gaps were identified:
1. `rules-capture` skill did not check whether a new rule also needed a trigger entry
   (`rules.md` + `triggers.md` are a coupled pair — a rule without a trigger is incomplete).
2. `session-wrap` used technical file-name language in its governance signal, which
   is not appropriate for non-technical users.

## Decision

1. **update-graph Step 8** detects governance-worthy content but emits a plain-language
   flag in output only — no file writes. Token limit logic removed.

2. **session-wrap** is the action point for governance capture. It surfaces a
   plain-language reminder when governance signals were flagged or rules were captured.

3. **rules-capture** checks for trigger pairing after writing a rule: phase-specific
   rules (containing "before/after/when/at/during" language) prompt the user in plain
   language; unconditional rules ("always/never") skip the prompt silently. Matched
   trigger entries are written to `triggers.md` at the same level (project/user) as
   the rule.

4. All stale governance-role `MEMORY.md` references in commands are audited and
   replaced with language reflecting the current model.

5. No user-facing prompt exposes file names (`rules.md`, `triggers.md`, `MEMORY.md`).
   All user-facing language describes behavior and situations only.

## Consequences

- `update-graph` is simpler and more focused (KG entries only).
- Governance capture requires deliberate user action at session end rather than
  automatic mid-session writes.
- `rules` + `trigger` pairs are captured together in the same flow, reducing orphaned
  rules without corresponding trigger conditions.
- Non-technical users experience plain-language prompts without internal file name
  exposure.
- `MEMORY.md` staleness checks in `status.md` are preserved — the file still exists
  as Claude's auto-memory index.
