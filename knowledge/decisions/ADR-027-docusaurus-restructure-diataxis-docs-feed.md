---
title: "ADR-027: Docusaurus Docs Restructure — Diátaxis IA, docs-updates Feed, Branch Schema, and Landing Page Strategy"
number: 027
created: 2026-04-08T00:00:00Z
status: Accepted
author: mkaplan
git:
  branch: docs-update-docusaurus-migration-restructure
  commit: null
  pr: null
  issue: null
implements: v0.0.6
related:
  adrs: [13, 23]
  lessons:
    - lessons-learned/process/Lessons_Learned_Dual_Changelog_Both_Must_Be_Updated.md
    - lessons-learned/process/documentation-update-triggers-multibranchfeatures.md
  kg_entries: []
tags: [docs, docusaurus, diataxis, information-architecture, changelog, branch-naming, landing-page]
category: process
---

# ADR-027: Docusaurus Docs Restructure — Diátaxis IA, docs-updates Feed, Branch Schema, and Landing Page Strategy

**Date:** 2026-04-08
**Status:** Accepted
**Implements:** v0.0.6 docs site (branch: `docs-update-docusaurus-migration-restructure`)
**Related:** ADR-013 (documentation update protocol), ADR-023 (single source of truth changelog)

---

## Context

The KMGraph documentation site (Docusaurus v3, branch `v0.0.6-docusaurus-migration`) was audited in April 2026 and found to have significant structural problems:

- `GETTING-STARTED.md` was 578 lines conflating tutorial, how-to, reference, troubleshooting, and agent/skill catalogs
- `COMMAND-GUIDE.md` was 1,453 lines of dense prose with no visual cues or learning path
- Landing page (`index.md`) opened with two prose paragraphs and a "Why It Matters" block before any actionable link
- Zero static images, only 2 Mermaid diagrams across the entire docs tree
- Sidebar grouped by feature (Concepts, Issues, Commands, Contributing) rather than by user intent
- 13 features existed in code with no user-facing documentation (hooks system, full skill catalog, full agent catalog, MCP tool reference, template library, auto-trigger keywords, config types)
- `CHANGELOG-DOCS-ONLY.md` was an orphan file with no feed, no URL, and a dual-update footgun documented in `Lessons_Learned_Dual_Changelog_Both_Must_Be_Updated.md`
- Branch naming (`v{ver}-docs-update-{description}`) attached version numbers to docs-only branches, creating ambiguity for mixed-type changes

A documentation platform evaluation was also conducted. Mintlify was explored and fully reverted — its scraper does not support MkDocs Material, and it cannot deploy to the existing `technomensch.github.io/knowledge-graph` path without breaking all external promotional links.

**Plan reference:** `~/.claude/plans/gleaming-skipping-hammock.md` — 9-phase execution plan, ~750 lines, written 2026-04-07.

---

## Decision

Seven distinct decisions were made in this planning session, captured together because they are architecturally interdependent.

### Decision 1 — Docusaurus over Mintlify

Docusaurus remains the documentation platform. Mintlify was evaluated and rejected.

**Reason:** GitHub Pages URL continuity is non-negotiable. All external promotional links (LinkedIn, Slack, Reddit, blog posts) point to `https://technomensch.github.io/knowledge-graph`. Mintlify requires a separate domain or subdomain and cannot be deployed to the existing `github.io` path without breaking every external link. Docusaurus supports the existing URL via `baseUrl` + `routeBasePath` configuration with zero disruption.

Mintlify was fully reverted: `mint.json`, `.mintignore`, `convert_admonitions.py` deleted; 6 files restored via `git checkout`; 3 `<Note>` tags reverted to `!!! example`. No Mintlify artifacts remain.

### Decision 2 — Diátaxis Framework for Information Architecture

The documentation sidebar and page structure will be reorganized around the Diátaxis four-quadrant model:

| Type | Serves | Focus | Sidebar group |
|---|---|---|---|
| **Tutorial** | Learning | Action — guided lesson | `tutorials/` |
| **How-to guide** | Working | Action — solve a specific problem | `guides/` |
| **Reference** | Working | Cognition — neutral facts | `reference/` |
| **Explanation** | Learning | Cognition — context and "why" | `concepts/` |

The current feature-grouped sidebar (Concepts / Issues / Commands / Contributing) is replaced with an intent-grouped sidebar (Quickstart / Tutorials / How-to Guides / Reference / Concepts / Troubleshooting / Contributing).

**Reason:** Current sidebar forces new users toward six pages of architectural prose before they have done anything useful. Diátaxis separates "studying" content from "working" content, enabling a new user to reach a captured lesson in ≤5 minutes following only the Quickstart page. Validated by audit of comparable Docusaurus sites (Supabase, Prisma, Astro, tRPC).

**Existing splits preserved:** `CONCEPTS.md` was already split into 5 pages on this branch (`4-LAYERS.md`, `4-PILLARS.md`, `PERSONAL-V-PROJECT.md`, `SEARCH.md`). These are kept as-is and only enhanced with diagrams in Phase 7. They are not merged back.

### Decision 3 — Landing Page: Problem-Recognition Value Qualification, Not Install Command

The landing page above-the-fold section will contain problem-recognition statements, not an install command or "who is this for" framing.

**Layout:**
```
[tagline — one sentence naming the problem without naming the tool]

✓ [outcome statement — something the visitor has felt but couldn't fix]
✓ [outcome statement — something they didn't know was possible]
✓ [outcome statement — removes friction they've accepted as normal]
✓ [outcome statement — makes them feel understood]

[card grid: Quickstart / Browse / How It Works / Install]
```

**Reason:** The goal of the above-the-fold section is for visitors to self-identify — to read it and think "this is exactly my problem" — before they understand what KMGraph does or how to install it. Install paths are a downstream step reached via the card grid after the visitor has already decided they want the product. An `npx kmgraph install` hero command was initially drafted but rejected: (a) no such npm package exists — the install mechanism is copy-paste of `INSTALL.md` or `claude --plugin-dir`; (b) even if it existed, leading with an install command before value qualification assumes the visitor has already decided they want the product.

**Writing rules:**
- Problem-recognition first, not feature description
- No "who is this for" labels, no persona framing
- No tool names or jargon above the fold
- No hardcoded counts (see Decision 6)
- Each statement stands alone — scannable in 5 seconds
- 4 lines maximum

The deeper "why" prose (existing "Why It Matters" / "When Would I Use This") moves to `docs/concepts/why-kmgraph.md`, linked from the "How It Works" card.

### Decision 4 — docs-updates/ Feed Replaces CHANGELOG-DOCS-ONLY.md

`CHANGELOG-DOCS-ONLY.md` is deleted and replaced by a Docusaurus blog plugin instance mounted at `/docs-updates/`.

**Scope boundary (non-negotiable):**

| What happened | Goes in | Never in |
|---|---|---|
| Code release (feature, fix, version bump) | `CHANGELOG.md` | `docs-updates/` |
| Docs site change (restructure, new page, gap closure) | `docs-updates/YYYY-MM-DD-{slug}.mdx` | `CHANGELOG.md` |

One docs-only branch = one feed post. Each post gets its own URL, tags, and authors. The feed has a built-in RSS endpoint at `/docs-updates/rss.xml`.

**Configuration:**
```js
plugins: [
  ['@docusaurus/plugin-content-blog', {
    id: 'docs-updates',
    routeBasePath: 'docs-updates',
    path: './docs-updates',
    blogTitle: 'Documentation Updates',
    feedOptions: { type: ['rss', 'atom'] },
    blogSidebarCount: 'ALL',
  }],
],
```

**Reason:** `CHANGELOG-DOCS-ONLY.md` was an orphan file with no linking, no feed, no URL, and high maintenance burden — updating it required discipline with no enforcement mechanism. The dual-changelog problem is documented in `Lessons_Learned_Dual_Changelog_Both_Must_Be_Updated.md`. The Docusaurus blog plugin is native, requires no extra dependencies, and makes docs changes first-class navigable content. The management burden does not increase — it shifts the docs entry from an unmarked file to a published post with a URL that can be linked from PRs and release notes.

**Supersedes:** The lesson `Lessons_Learned_Dual_Changelog_Both_Must_Be_Updated.md` for the docs-only case. The dual-changelog problem is resolved by making the two files non-overlapping by scope, not by merging them.

**Historical entries** from `CHANGELOG-DOCS-ONLY.md` are migrated to seed posts in `docs-updates/` (one post per entry, original dates preserved) before the file is deleted.

### Decision 5 — Branch Naming Schema: docs-update-{description}, No Version Prefix

Docs-only branches drop the version prefix entirely:

| Change type | Old format | New format |
|---|---|---|
| Code / mixed / infra | `v{ver}-{description}` | `v{ver}-{description}` (unchanged) |
| Docs site only | `v{ver}-docs-update-{description}` | `docs-update-{description}` |

**Current branch rename:** `v0.0.6-docusaurus-migration` → `docs-update-docusaurus-migration-restructure`

**Reason:** The version prefix on docs branches was meaningful only because it mirrored `CHANGELOG-DOCS-ONLY.md` entries (which are going away). With the `docs-updates/` feed, the branch name maps 1:1 to the feed post slug — `docs-update-{description}` → `docs-updates/YYYY-MM-DD-{description}.mdx`. No version disambiguation is needed for a docs-only change. Removing the prefix also eliminates the ambiguity of which version to attach when docs work spans multiple code versions.

**All locations that must be updated** to reflect the new schema (Phase 0 task):
- `CLAUDE.md` (project) — branch-naming table
- `~/.claude/CLAUDE.md` (user-level) — branch suffix rule
- `commands/handoff.md`, `commands/update-doc.md`, `commands/create-doc.md`
- `skills/doc-update-router/SKILL.md`
- `knowledge/decisions/ADR-013-documentation-update-protocol.md` (amendment)
- `knowledge/decisions/ADR-020-lifecycle-hooks-suite-automated-capture.md`
- `docs/enhancements/ENH-003/ENH-003-specification.md`
- `knowledge/lessons-learned/process/documentation-update-triggers-multibranchfeatures.md`

### Decision 6 — No Hardcoded Counts in User-Facing Docs (STYLE-GUIDE §1.6)

Specific counts for mutable collections are prohibited in user-facing documentation.

| Disallowed | Allowed |
|---|---|
| "26 slash commands" | "Every slash command", "All slash commands" |
| "10 skills" | "Each auto-triggered skill", "All skills" |
| "8 subagents" | "Every subagent", "The agent catalog" |

**Reason:** A specific number means every release that adds or removes an item also requires a documentation edit. Missed edits are silent inaccuracies that erode trust. Reference pages must be programmatically built from source directories (via `docusaurus-plugin-typedoc` for MCP tools, and build-time scripts reading frontmatter from `commands/`, `skills/`, `agents/`) so they never go stale.

**Validation grep** (added to STYLE-GUIDE §9 pre-commit checklist):
```bash
grep -nE '\b[0-9]+\s+(commands?|skills?|agents?|hooks?|templates?|tools?|subagents?|events?)\b' docs/
```
Any match in user-facing docs is a style violation.

### Decision 7 — Approved Plugin Set

The following plugins are approved for installation in Phase 0:

| Plugin | Purpose | Source |
|---|---|---|
| `@docusaurus/theme-mermaid` | Diagrams in MDX (config flip) | Built-in |
| `@docusaurus/plugin-client-redirects` | Old URL → new URL redirects | Built-in |
| `@docusaurus/plugin-content-blog` (second instance) | `docs-updates/` feed | Built-in |
| `plugin-image-zoom` | Click-to-zoom for screenshots | Community |
| `@orama/plugin-docusaurus-v3` | Local full-text search (while Algolia pending) | Community |
| `docusaurus-plugin-typedoc` | Auto-generate MCP tool reference from TypeScript | Community |
| Algolia DocSearch | Final search experience (free for OSS, ~2 week approval) | Application required |

Deferred: `docusaurus-plugin-remote-content`, `docusaurus-theme-github-codeblock`, Markprompt — re-evaluate after Phase 9.

---

## Rationale

### Why Diátaxis specifically

Diátaxis is the only framework that explicitly names the failure mode KMGraph docs exhibits: "writers of tutorials anxious that students should know things overload tutorials with distracting explanation." The current `GETTING-STARTED.md` is the canonical example — it is tutorial, how-to, reference, and explanation all in one 578-line file. The framework provides a testable compass for every page: "Does this serve action or cognition? Is the user studying or working?" Pages that fail this test are the ones overwhelming new users.

### Why the landing page leads with problems, not features

A visitor who does not yet know they need KMGraph will not be persuaded by a feature list. They will be persuaded by seeing their own problem described back to them. The value qualification section's job is recognition, not comprehension. The reader should not need to understand KMGraph to know they want it. This is distinct from "who is this for" framing — no personas, no audience labels, no literal enumeration of use cases. Just problem statements that land or don't.

### Why the docs-updates feed is not redundant

The `CHANGELOG.md` and `docs-updates/` feed have non-overlapping scopes by definition. A docs-only branch does not touch `CHANGELOG.md`. A code release does not produce a feed post. The management burden is the same as maintaining `CHANGELOG-DOCS-ONLY.md` — one entry per branch — but the feed post has a URL, tags, RSS, and is navigable from the docs site. The orphan markdown file had none of these.

---

## Consequences

### Positive

1. **New users reach first value in ≤5 minutes** — Quickstart page + intent-grouped sidebar replaces 10 dense screens of reading.
2. **13 code-vs-docs gaps closed** — Hooks, skills, agents, MCP tools, templates, auto-trigger keywords, and config types all get documented reference pages.
3. **Docs changelog is first-class** — Each docs update gets a URL, RSS feed entry, and PR linkable post.
4. **Reference pages never go stale** — Programmatic generation from source directories enforced by STYLE-GUIDE §1.6.
5. **URL continuity preserved** — All external promotional links remain valid via `@docusaurus/plugin-client-redirects`.

### Negative

1. **Phase 0 audit is high-touch** — Every file referencing the old branch schema or `CHANGELOG-DOCS-ONLY.md` must be updated and validated before work begins.
2. **New contributor workflow required** — `docs/contributing/docs-updates-workflow.md` must be written and maintained as the canonical reference for the new schema.
3. **Discipline required on scope boundary** — If a docs-only change touches `CHANGELOG.md`, or a code release produces a feed post, the non-overlap guarantee breaks. The CLAUDE.md scope boundary rule is the only enforcement mechanism.

### Neutral

1. **No content lost** — All content from deleted files (`GETTING-STARTED.md`, `CHANGELOG-DOCS-ONLY.md`, `NAVIGATION-INDEX.md`, `DEPLOYMENT-SITEMAP.md`, `_test-layout.md`) is either rehomed or migrated before deletion.
2. **Existing concept page splits preserved** — The 5-page split of `CONCEPTS.md` done earlier on this branch is kept as-is.

---

## Implementation

**Timeline:** 9-phase plan, starting with Phase 0 (infrastructure, no user-visible content change)

**Plan file:** `~/.claude/plans/gleaming-skipping-hammock.md`

**Affected components:**

- `docs/` — full restructure across all 9 phases
- `sidebars.js` — full rewrite (Phase 3)
- `docusaurus.config.js` — plugin additions (Phase 0)
- `package.json` — new plugin deps (Phase 0)
- `CLAUDE.md` (project + user-level) — branch schema + docs workflow update (Phase 0)
- `commands/update-doc.md`, `commands/create-doc.md`, `commands/handoff.md` — workflow update (Phase 0 + Phase 6)
- `skills/doc-update-router/SKILL.md` — routing update (Phase 6)
- `docs/STYLE-GUIDE.md` — §1.6 no-counts rule + validation grep (Phase 6)

**Migration path for CHANGELOG-DOCS-ONLY.md:**
1. Migrate each entry to a dated `docs-updates/YYYY-MM-DD-{slug}.mdx` post (preserve original dates)
2. Delete `docs/CHANGELOG-DOCS-ONLY.md`
3. Add redirect if the URL was ever linked externally

---

## Validation

**Success criteria:**
- [ ] `npm run build` passes with zero broken-link warnings after each phase
- [ ] `/docs-updates/` renders with RSS feed at `/docs-updates/rss.xml`
- [ ] New user reaches a captured lesson in ≤5 minutes following only the Quickstart page (wall-clock test)
- [ ] `grep -nE '\b[0-9]+\s+(commands?|skills?|agents?|hooks?|templates?)\b' docs/` returns zero matches in user-facing docs
- [ ] `grep -rn "CHANGELOG-DOCS-ONLY" CLAUDE.md commands/ skills/ agents/` returns zero matches after Phase 0
- [ ] All 13 code-vs-docs gaps have a documented reference page after Phase 6
- [ ] Lighthouse accessibility ≥ 95 on home and Quickstart pages

**Review date:** After Phase 4 (mid-restructure checkpoint), and again after Phase 9 (final).

---

## Related Decisions

- **[ADR-013](ADR-013-documentation-update-protocol.md):** Original documentation update protocol — superseded in part by this ADR's branch schema and changelog decisions; add amendment to ADR-013 pointing here
- **[ADR-023](ADR-023-single-source-of-truth-changelog.md):** Single source of truth for CHANGELOG — this ADR extends the scope boundary to cover the docs-updates feed

## Related Documentation

**Lessons Learned:**
- [Dual Changelog Footgun](../lessons-learned/process/Lessons_Learned_Dual_Changelog_Both_Must_Be_Updated.md) — the problem this ADR resolves for the docs case
- [Documentation Update Triggers in Multi-Branch Features](../lessons-learned/process/documentation-update-triggers-multibranchfeatures.md) — superseded by new branch schema

**Plan:**
- [gleaming-skipping-hammock.md](~/.claude/plans/gleaming-skipping-hammock.md) — full 9-phase execution plan with per-phase acceptance criteria, redirect map, and plugin configuration details

**Session:**
- [2026-04-07 Docs Restructure Planning](../sessions/2026-04/2026-04-07-docs-restructure-planning.md) — full session record including all decisions, code-vs-docs gap audit, and deferred items

---

## Deferred (out of scope, captured for future ADRs)

1. **Pluggable storage backends** — Notion, Obsidian, NotebookLM as primary KG stores instead of local markdown. Requires changes to `/kmgraph:init`, MCP server config schema, and backend adapters. Version-bump territory. Integration *guides* are in scope for this restructure; storage layer changes are not.
2. **Contributor vs user command surface area** — `update-doc`, `create-doc`, and `doc-update-router` are KMGraph project contributor tools, not end-user tools. Today they ship to every user. Future: separate via `kmgraph-contrib` plugin, a marker file, or a `commands/contributing/` subdirectory with conditional registration.
   - **Resolution (see [ADR-056](ADR-056-reject-plugin-split-for-contributor-only-doc-commands.md)):** This deferred item was resolved by ADR-056, which rejected the plugin-split (and marker-file / subdirectory) options in favor of repo-context auto-detection. Implementation is tracked in [ENH-033](../enhancements/ENH-033/ENH-033-specification.md).
3. **STYLE-GUIDE.md slim-down** — Currently 633 lines; audience is contributors only. Deferred per user direction.

---

**Decision Made:** 2026-04-07 (planning session) / 2026-04-08 (branch schema finalized)
**Last Updated:** 2026-04-08
**Status:** Accepted
