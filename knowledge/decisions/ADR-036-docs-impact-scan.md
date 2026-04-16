---
title: "ADR-036: docs-impact-scan Skill — Pre-PR Docs Discovery Layer"
number: 036
created: 2026-04-16T00:00:00Z
status: Proposed
author: mkaplan
email: mkitact@gmail.com
git:
  branch: TBD
  commit: TBD
  pr: null
  issue: null
implements: null
related:
  adrs: []
  lessons: []
  kg_entries: []
tags: [docs, release-process, skills, update-doc, pre-pr, discovery]
category: process
---

# ADR-036: docs-impact-scan Skill — Pre-PR Docs Discovery Layer

**Date:** 2026-04-16
**Status:** Proposed

---

## Context

When a release ships, user-facing documentation is inconsistently updated. The AI execution layer does not reliably identify all affected docs — obvious files like README.md and INSTALL.md are regularly missed. The user discovers gaps post-PR after trusting the automated process to have handled docs correctly.

The existing `/kmgraph:update-doc --user-facing` wizard and `doc-update-router` skill handle individual doc updates correctly once invoked. The gap is upstream: there is no structured discovery step that identifies *which* docs need updating before the wizard runs.

**Why a static checklist doesn't work:** The docs structure evolves. A hardcoded list goes stale.

**Why scanning all `.md` files doesn't work:** The KG, chat-history, and plan files would flood the scan with irrelevant matches.

---

## Decision

Add a new `docs-impact-scan` skill to the plugin that acts as the discovery layer feeding the existing update-doc workflow.

### Scan Scope

- All `.md` files in project root
- All `.md` files in `docs/` — excluding `docs/plans/`, `docs/superpowers/`, `docs/design/`
- Always includes obvious files regardless of grep hits: README.md, INSTALL.md, CHANGELOG.md, COMMAND-GUIDE.md

### Workflow

1. Read `git diff main...HEAD` — extract changed identifiers (command names, feature names, flag names, skill names); cap at 20 if diff is very large
2. Grep scan scope for references to extracted identifiers
3. Add obvious files to list regardless of grep hits
4. Check KG patterns for learned corrections matching changed identifiers
5. Present combined list to user with source labels for validation
6. User confirms/adjusts list (add or remove files)
7. For each file user added that scan missed — offer to save a KG pattern entry
8. Call `/kmgraph:update-doc --user-facing` for each confirmed file in sequence
9. Display summary of files updated

### Trigger Phrases

"push to origin", "push and merge", "push and merge with admin", "open PR", "create PR", "finishing up", "ready to push" — and as a named step in every plan's final task.

### KG Pattern Learning

When users manually add files the scan missed, the skill offers to save a KG pattern: "when [identifier] changes, also check [file]." Patterns are stored in the active KG and used in future scans. Stale pattern cleanup deferred to a future release.

### Placement

`skills/docs-impact-scan/SKILL.md` — ships with the plugin, project-agnostic.

---

## Rationale

### Why a skill (not a command or hook)

Skills auto-trigger on natural language signals — "push to origin", "create PR" — without requiring explicit invocation. Commands require the user to remember to run them. Hooks fire on shell events, which are too low-level to reliably detect "about to open a PR."

### Why feed the existing update-doc wizard rather than do raw edits

The wizard enforces language standards and changelog requirements. Bypassing it for docs updates would produce inconsistent output.

### Why ship with the plugin (not as a personal skill)

The `update-doc` command ships with the plugin — the scan that feeds it is its natural companion. Every plugin user has this gap. Keeping it as a personal skill would fragment the workflow across two installation layers.

### Why user validation before any update runs

The scan quality is bounded by how well identifiers appear verbatim in docs. Validation turns an imperfect scan into a human-confirmed list. It also handles edge cases (unusual doc locations) without requiring configuration.

### Alternatives Considered

**Option A: Static checklist per project**
- Rejected: goes stale as docs structure evolves

**Option B: Scan all .md files broadly**
- Rejected: KG, chat-history, and plan files flood context with irrelevant matches

**Option C: Docs coverage map (manually maintained)**
- Rejected as standalone: high maintenance burden, can itself go stale. Incorporated as KG pattern learning instead — the map builds incrementally through real corrections.

**Option D: Personal skill (not shipped with plugin)**
- Rejected: disconnects the discovery layer from the update-doc command it feeds; all users share the gap

---

## Consequences

### Positive

1. **Gap closed:** Obvious files are always surfaced; scan catches non-obvious ones
2. **Human-in-the-loop:** Validation prompt makes quality imperfection acceptable
3. **Gets smarter over time:** KG patterns improve scan accuracy with each release
4. **Consistent with existing workflow:** Feeds update-doc wizard rather than bypassing it

### Negative

1. **Scan quality bounded by identifier verbatim matching:** Docs that describe a feature without naming it won't be caught by grep
2. **KG patterns can go stale:** Deferred cleanup means stale patterns may eventually cause false positives

### Neutral

1. **Adds a step to the release workflow:** Named in every plan's final task — expected overhead, not surprise friction

---

## Implementation

**Branch:** TBD (separate from ADR-035 / stuck-work-escalation)

**Affected Components:**
- `skills/docs-impact-scan/SKILL.md` (new)

**Migration Path:** None. Additive new skill.

---

## Validation

**Success Criteria:**
- Skill triggers on all listed trigger phrases
- Scan correctly excludes `docs/plans/`, `docs/superpowers/`, `docs/design/`
- Obvious files always appear regardless of grep results
- Validation prompt allows add/remove before any update runs
- KG correction capture offered for each manually added file
- `/kmgraph:update-doc --user-facing` called for each confirmed file in sequence

**Review Date:** After first real usage in a release cycle

---

## Related Documentation

**Design Spec:**
- `docs/superpowers/specs/2026-04-16-docs-impact-scan-design.md`

---

**Decision Made:** 2026-04-16
**Last Updated:** 2026-04-16
**Status:** Proposed
