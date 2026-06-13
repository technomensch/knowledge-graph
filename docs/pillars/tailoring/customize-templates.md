---
id: customize-templates
title: Customize Templates
sidebar_label: Customize Templates
description: How to modify the lesson, ADR, session, and other templates to match project conventions
---

# Customize Templates

> "The default templates don't match my team's conventions. How do I change them?"

Edit the bundled templates to add required fields, remove unused ones, or change the default structure for lessons, ADRs, and session summaries. At `/kmgraph:init`, starter templates (lesson, ADR, session, entry) are seeded to `knowledge/templates/` in your live knowledge graph; content structure templates (patterns, gotchas, concepts, architecture, workflows) go to `knowledge/templates/` as well.

## Default templates vs your live knowledge files

Two directories look similar but serve different roles:

| Directory | Role | Editable? |
|---|---|---|
| `core/default-templates/` | Frozen out-of-box source — ships inside the plugin, seeded into your project at `/kmgraph:init` time | PROTECTED — do not edit directly |
| `knowledge/decisions/`, `knowledge/lessons-learned/`, `knowledge/sessions/`, `knowledge/concepts/` | Your live, editable knowledge files — created from the defaults at init, then yours to modify freely | Yes |

`core/default-templates/` is the distribution source. After `/kmgraph:init` runs, the files you work with every day live under `knowledge/` — they are copies, not the originals. Editing `core/default-templates/` changes what future `/init` runs produce; it does not affect your existing `knowledge/` files.

## How templates work

All templates live in `core/default-templates/`. When the MCP server or a command creates a new entry, it reads the template from that directory. Editing files in `core/default-templates/` changes all future entries of that type.

:::warning
`core/default-templates/` is a PROTECTED directory. Per project conventions, do not commit changes to `core/default-templates/` without explicit team review. Keep customizations in `docs/templates/` for project-local overrides.
:::

## Available templates

| Template | File | Used by |
|---|---|---|
| Lesson learned | `core/default-templates/lessons-learned/lesson-template.md` | `/kmgraph:capture-lesson` |
| Architecture Decision Record | `core/default-templates/decisions/ADR-template.md` | `/kmgraph:create-adr` |
| Session summary | `core/default-templates/sessions/session-template.md` | `/kmgraph:session-summary` |
| MEMORY.md | `core/default-templates/MEMORY-template.md` | `/kmgraph:init` |
| Knowledge entry | `core/default-templates/concepts/entry-template.md` | `/kmgraph:update-graph` |
| Meta-issue | `core/default-templates/meta-issue/meta-issue-template.md` | `/kmgraph:start-issue-tracking` |

## Copy the template

```bash
cp core/default-templates/lessons-learned/lesson-template.md docs/templates/my-lesson-template.md
```

## Edit the template

Open the copy and add, remove, or rename fields. The YAML frontmatter fields are recognized by KMGraph. Custom fields in the body are preserved but not indexed.

## Use the custom template

```bash
/kmgraph:capture-lesson --template docs/templates/my-lesson-template.md
```

Confirm by running a capture command — the custom fields should appear in the output file.

## Set as default

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

## Related

- [Customize hooks](./customize-hooks.md) — automate template selection based on context
- [Custom rules](./custom-rules.md) — define how templates apply to different content types
