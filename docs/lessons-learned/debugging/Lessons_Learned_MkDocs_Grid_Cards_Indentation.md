---
title: "Lesson: MkDocs Grid Cards Require 4-Space Indentation"
created: 2026-02-28T00:15:00Z
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: v0.0.10-docs-grid-cards-format
  commit: bdd8d4d0264b5b489a1ac3105b482a0048fe1220
  pr: 17
  issue: null
sources:
  - url: "https://squidfunk.github.io/mkdocs-material/reference/grids/"
    title: "Grids - Material for MkDocs"
    accessed: "2026-02-28"
    context: "Confirmed 4-space indentation requirement for card description text"
tags: [mkdocs, material-theme, grid-cards, css, indentation, markdown]
category: debugging
---

# Lesson Learned: MkDocs Grid Cards Require 4-Space Indentation

**Date:** 2026-02-28
**Category:** debugging
**Version:** 1.0

---

## Problem

Grid cards in Material for MkDocs documentation stopped rendering as visual cards and instead displayed as flat, unstyled text with bullet points. The `<div class="grid cards" markdown>` syntax was present in the markdown but produced no card layout in the rendered site.

**Context:**
- Knowledge Management Graph project documentation using MkDocs with Material theme (>=9.7.0)
- Grid cards used on the homepage (`index.md`) and in "Next Steps" sections across 5 documentation pages
- Cards had previously rendered correctly in earlier versions

**Impact:**
- All "Next Steps" navigation sections across documentation rendered as plain text
- Homepage "Why It Matters" and navigation cards lost visual distinction
- Reduced discoverability and user experience for documentation readers

---

## Root Cause

The description text in grid card list items used **2-space indentation** instead of the required **4-space indentation**.

**Analysis:**
1. Material for MkDocs processes `<div class="grid cards" markdown>` using the `md_in_html` markdown extension
2. The markdown processor determines whether continuation text belongs to a list item based on indentation depth
3. With 2-space indent, the processor treats the description as a new paragraph (`<p>`) that is a **sibling** of the `<ul>`, not a child of the `<li>`
4. With 4-space indent, the description nests correctly inside the `<li>`, producing a proper card

**Evidence:**

Rendered HTML with 2-space indent (broken):
```html
<div class="grid cards">
  <ul><li><strong><a href="...">Title</a></strong></li></ul>
  <p>Description as sibling — not inside the card</p>
</div>
```

Expected HTML with 4-space indent (correct):
```html
<div class="grid cards">
  <ul>
    <li>
      <strong><a href="...">Title</a></strong>
      <p>Description nested inside the card</p>
    </li>
  </ul>
</div>
```

**How it was confirmed:** Inspected the built site HTML at `site/GETTING-STARTED/index.html` and `site/index.html` to see the actual DOM structure produced by the markdown processor.

---

## Solution

Changed all grid card description text from 2-space to 4-space indentation across all documentation files.

### Implementation

**Approach:**
Simple find-and-replace of indentation within `<div class="grid cards">` blocks.

**Before (broken — 2-space indent):**
```markdown
<div class="grid cards" markdown>

- **[Essential Commands](COMMAND-GUIDE.md#essential-commands)**

  Start with the core commands: init, capture-lesson, status, and recall.

</div>
```

**After (fixed — 4-space indent):**
```markdown
<div class="grid cards" markdown>

- **[Essential Commands](COMMAND-GUIDE.md#essential-commands)**

    Start with the core commands: init, capture-lesson, status, and recall.

</div>
```

**Files changed:**
- `docs/index.md` — 2 grid card sections (Why It Matters + navigation)
- `docs/GETTING-STARTED.md` — Next Steps for Claude Code Users
- `docs/COMMAND-GUIDE.md` — Next Steps
- `docs/CONCEPTS.md` — Next Steps
- `docs/CONFIGURATION.md` — Next Steps

---

## Verification

**Test Cases:**
1. Build site with `mkdocs build` and inspect rendered HTML for proper `<li>` nesting
2. Visual check: cards should display as bordered, hoverable card elements — not flat text
3. Confirm all 6 grid card sections across 5 files render correctly

**Results:**
- Before: Descriptions rendered as `<p>` siblings outside `<li>` elements
- After: Descriptions nested inside `<li>` elements, forming proper cards

---

## Prevention System

**Immediate Prevention:**
- All future grid card markdown must use 4-space indentation for description text
- Added to project knowledge base as a known requirement

**Systematic Prevention:**
- When creating new grid card sections, copy from an existing working example rather than typing from memory
- The `mkdocs build` step in the release checklist should include visual inspection of grid card rendering
- Consider adding a linting rule or CI check that verifies indentation inside `<div class="grid cards">` blocks

---

## Replication Pattern

### For Other Projects

**When to Apply:**
- Using Material for MkDocs with grid cards (`<div class="grid cards" markdown>`)
- Any markdown content inside HTML blocks that uses the `md_in_html` extension
- List items with continuation paragraphs inside HTML containers

**Universal Pattern:**
1. Always use **4-space indentation** for any text that should nest inside a markdown list item within an HTML block
2. After adding or modifying grid cards, inspect the rendered HTML to confirm `<p>` tags are inside `<li>` tags, not siblings
3. When cards stop rendering, check indentation first — it is the most common cause

**Customization Points:**
- The specific indentation depth (4 spaces) is a markdown standard, not Material-specific
- This applies to any `md_in_html` usage, not just grid cards (e.g., admonitions inside HTML divs)

### Example Application

**Scenario:** Adding a new "Next Steps" grid card section to any MkDocs page

**Implementation:**
```markdown
<div class="grid cards" markdown>

- **[Card Title](link.md)**

    Description text with exactly 4-space indentation.
    Multiple lines are fine as long as they maintain 4-space indent.

- **[Another Card](another-link.md)**

    Another description with 4-space indent.

</div>
```

---

## External References

Sources consulted while solving this problem:

- **[Grids - Material for MkDocs](https://squidfunk.github.io/mkdocs-material/reference/grids/)** — Accessed: 2026-02-28
  - Context: Official documentation for grid cards syntax and requirements
  - Key insight: The `md_in_html` extension requires proper indentation for markdown content inside HTML blocks

---

## Related Documentation

**Other Lessons:**
- [Documentation Update Triggers in Multi-Branch Feature Development](../process/documentation-update-triggers-multibranchfeatures.md) — The grid cards issue was discovered during the v0.0.10 documentation update cycle

---

## Lessons & Takeaways

**Key Insights:**
1. Markdown indentation inside HTML blocks is strict — 2 vs 4 spaces produces completely different DOM structures
2. Visual rendering bugs in MkDocs should be diagnosed by inspecting the built HTML (`site/` directory), not by adding CSS
3. When cards "stop working," the root cause is almost always in the markdown source, not the CSS or theme configuration

**What Worked:**
- Inspecting the rendered HTML in `site/` to see the actual DOM structure
- Comparing against the Material for MkDocs documentation for correct syntax

**What Didn't Work:**
- Adding custom `.grid.cards` CSS rules (treated the symptom, not the cause)
- Reverting CSS changes from other features (the LinkedIn header CSS was unrelated)
- Assuming the CSS was the problem without verifying the HTML structure first

**If We Had to Do It Again:**
- Start by inspecting the rendered HTML immediately — this would have identified the indentation issue in minutes instead of multiple CSS iterations
- Check the official Material for MkDocs grid cards documentation first for syntax requirements

---

**Version:** 1.0
**Created:** 2026-02-28
**Last Updated:** 2026-02-28
