---
id: customize-templates
title: Customize Templates
sidebar_label: Customize Templates
description: How to modify the lesson, ADR, session, and other templates to match project conventions
---

# Customize Knowledge Entry Templates

## Goal

Adapt the bundled templates to match team conventions — add required fields, remove unused ones, or change the default structure for lessons, ADRs, and session summaries.

## Prerequisites

- KMGraph installed
- Templates copied to `docs/templates/` (auto-copied at init, or manually: `cp -r core/templates/. docs/templates/`)

## How templates work

All templates live in `core/templates/`. When the MCP server or a command creates a new entry, it reads the template from that directory. Editing files in `core/templates/` changes all future entries of that type.

:::warning
`core/templates/` is a PROTECTED directory. Per project conventions, do not commit changes to `core/templates/` without explicit team review. Keep customizations in `docs/templates/` for project-local overrides.
:::

## Available templates

| Template | File | Used by |
|---|---|---|
| Lesson learned | `core/templates/lessons-learned/lesson-template.md` | `/kmgraph:capture-lesson` |
| Architecture Decision Record | `core/templates/decisions/ADR-template.md` | `/kmgraph:create-adr` |
| Session summary | `core/templates/sessions/session-template.md` | `/kmgraph:session-summary` |
| MEMORY.md | `core/templates/MEMORY-template.md` | `/kmgraph:init` |
| Knowledge entry | `core/templates/knowledge/entry-template.md` | `/kmgraph:update-graph` |
| Meta-issue | `core/templates/meta-issue/meta-issue-template.md` | `/kmgraph:start-issue-tracking` |

## Steps

### 1. Copy the template to a working location

```bash
cp core/templates/lessons-learned/lesson-template.md docs/templates/my-lesson-template.md
```

### 2. Edit the template

Open the copy and add, remove, or rename fields. The YAML frontmatter fields are recognized by KMGraph. Custom fields in the body are preserved but not indexed.

### 3. Point the command to the custom template

```bash
/kmgraph:capture-lesson --template docs/templates/my-lesson-template.md
```

### 4. Make it the default (optional)

In `kg-config.json`, add a `templateOverrides` block:

```json
{
  "templateOverrides": {
    "lesson": "docs/templates/my-lesson-template.md"
  }
}
```

## Common customizations

- **Add a "Team" field** to tag entries by squad or domain
- **Add a "Severity" field** to lessons for triage prioritization
- **Remove unused frontmatter** (e.g., `sprint`, `project`) to reduce noise
- **Change the default category** from `debugging` to a project-specific category

## Verify

Run a capture command and confirm the custom fields appear in the output file.

## Next steps

- [Reference — Templates](/reference/templates) — full template catalog (Phase 6)
- [Customize hooks](/guides/customize-hooks) — automate template selection based on context
