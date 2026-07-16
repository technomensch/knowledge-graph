---
title: Documentation Updates Workflow
---

# Documentation Updates Workflow

The KMGraph docs site uses a Docusaurus blog plugin instance mounted at `/docs-updates/` to track docs-only changes. Each docs-only branch produces one feed post.

This page documents how to create that post, what frontmatter is required, and which style-guide rules apply.

---

## When to use a docs-only branch

Use a `docs-update-{description}` branch (no version prefix) when:
- The change only affects the docs site (`docs/`, `docs-updates/`, `docusaurus.config.js`, `sidebars.js`, `src/css/`)
- No code, commands, skills, agents, hooks, or MCP server changes are included

Use a `v{ver}-{description}` branch when:
- Code, commands, skills, agents, hooks, or MCP server are changing (even if docs are also updated)

**Scope boundary:** `CHANGELOG.md` is for code releases only. The `docs-updates/` feed is for docs site changes only. A docs-only branch does not touch `CHANGELOG.md`.

---

## Branch naming

```
docs-update-{description}
```

Examples:
- `docs-update-command-guide` — rewrote the command reference
- `docs-update-docusaurus-migration-restructure` — full Diátaxis restructure

---

## How to create a feed post

1. Create a file at `docs-updates/YYYY-MM-DD-{slug}.mdx` where the date is the expected merge date.

2. Use this frontmatter:

```mdx
---
slug: {slug}
title: Short descriptive title of the docs change
authors: technomensch
tags: [restructure, gap-closure, bugfix, visuals, accessibility]
date: YYYY-MM-DD
---

One-paragraph summary of what changed and why.

<!-- truncate -->

## Section Heading

Details...
```

3. Preview locally:

```bash
npm run start
# navigate to http://localhost:3000/knowledge-graph/docs-updates/
```

4. The post URL will be `/docs-updates/{slug}`. Link it from the PR description.

---

## Required frontmatter fields

| Field | Required | Notes |
|---|---|---|
| `slug` | Yes | Matches branch name suffix (e.g., `command-guide`) |
| `title` | Yes | Short — appears in feed list and browser tab |
| `authors` | Yes | Must match a key in `docs-updates/authors.yml` |
| `tags` | Yes | At least one tag |
| `date` | Yes | ISO 8601 (`YYYY-MM-DD`) |

---

## Style-guide rules for feed posts

- **Third-person voice** per `STYLE-GUIDE.md §1.1`
- **No hardcoded counts** (`STYLE-GUIDE.md §1.6`): write "all commands" not "26 commands"
- **Platform-agnostic language** unless the change is Claude Code-specific
- **Citation keys** (`[CitationKey]`) for any best-practice claims
- Use `<!-- truncate -->` after the intro paragraph so the feed list shows a clean excerpt

---

## Backfilling historical entries

Historical entries from the old `CHANGELOG-DOCS-ONLY.md` have been migrated to `docs-updates/2026-02-26-github-docs-visuals.mdx`. To backfill additional entries, create a file with the original date and use `tags: [historical]`.

---

## One branch = one feed post

Every docs-only branch produces exactly one feed post, regardless of how many files changed. Trivial typo fixes (one word, no structural change) may skip the post — use judgment.

---

## Related

- [ADR-027 — Docusaurus restructure and Diátaxis adoption](https://github.com/technomensch/knowledge-graph/blob/main/knowledge/decisions/ADR-027-docusaurus-restructure-diataxis-docs-feed.md)
- [STYLE-GUIDE.md](../STYLE-GUIDE.md)
