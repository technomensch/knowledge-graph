---
id: ENH-020
title: Preventive Cascade Template + Profile Ecosystem Docs
status: deferred
priority: medium
created: 2026-05-28
branch: v0.5.9.1-review-audit-protocol
extends: ENH-015
---

# ENH-020: Preventive Cascade Template + Profile Ecosystem Docs

## Summary

Add a preventive cascade evaluation step that fires _before_ implementation begins, complementing ENH-015's post-decision cascade rules. Includes a canonical reference document for the profile file ecosystem (what each file is, where it lives, which platforms use it).

## Status: Deferred

Requires a dedicated brainstorm session before implementation. This spec captures scope decisions made during 2026-05-27/28 session.

## Problem

ENH-015 cascade rules fire post-decision (after the user says "proceed"), not pre-implementation. There is no gate that asks "does this change affect initialization scripts, user profile files, or existing graphs?" before implementation starts.

The profile file ecosystem (me.md, rules.md, triggers.md, governance-rules.md, plan-rules.md, plugin.json, CLAUDE.md, etc.) lacks a canonical reference document. Contributors and AI assistants must infer the ecosystem from scattered examples.

## Scope

### Cascade Check Trigger

- Fires when: a plan is approved, or "fix now" is selected during a review audit
- Prompt questions:
  - Does this change affect initialization scripts, user profile files, or existing graphs?
  - Is this user-local or project-wide?
  - Which tiers / platforms does this affect?
- Output: go/no-go decision with scope classification

### Profile File Ecosystem Reference

- Canonical doc listing all profile files: path, owner (user-local vs project), platform(s), purpose
- Initialization impact matrix: which files are written/read during `kg init`, `kg upgrade`, `kg migrate`
- "Is this user-local or project-wide?" decision tree

### Scope Boundary Prompt

- Standardized prompt template for scope classification
- Integrates with ENH-015 cascade framework
- Available as a cascade check stub (implemented minimally in v0.5.9.1 review-audit-protocol rule)

## Related ENHs

- [[ENH-015]] - Decision Governance Protocol (this extends, does not replace)
- Review Audit Protocol (`core/rules-registry/review-audit-protocol.md`) references this ENH as the cascade check authority once implemented

## Known Gap (v0.5.9.1)

The review-audit-protocol rule in v0.5.9.1 includes a cascade check _stub_ that defers to ENH-015 and "ENH-020 when complete." Until ENH-020 is implemented, the stub provides partial coverage only.
