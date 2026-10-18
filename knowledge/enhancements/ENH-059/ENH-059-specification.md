---
id: ENH-059
type: Enhancement
status: implemented
github-issue: pending
branch: none
created: 2026-07-30
related_enhs: ["ENH-062"]
related_issues: ["issue-52"]
---

# ENH-059: Render KG Relationships as Real Obsidian Links (Tags Kept)

**Status:** ✅ Implemented in v0.7.11

## Problem

Opening KG markdown in Obsidian shows relationship metadata as plain text, and the graph view draws few or no connections. The KG does not act as a true knowledge graph in Obsidian.

Original capture (2026-07-30): recommend [`kepano/obsidian-skills`](https://github.com/kepano/obsidian-skills) at install for better wikilink generation. Reframed 2026-10-17 after recall found the cause is in the KG's own files (below).

## Dependency

Depends on [ENH-062](../ENH-062/ENH-062-specification.md). ENH-062 owns the relationship vocabulary (which fields exist, which are a dependency versus a plain reference), the field-name and value-shape cleanup, and the migration mechanism. This ENH only owns **rendering** those fields as real links.

## Causes found (recall, 2026-10-17)

1. Frontmatter relationships are plain strings or bare numbers (`"ENH-042"`, `[1, 19, 55]`), not `[[links]]`.
2. The earlier wiki-link pass skipped YAML frontmatter on purpose (`knowledge/plans/archive/v0.3.x/v0.3.3-beta-obsidian-wiki-links.md`, safety rule 6; and `knowledge/plans/archive/obsidian-wiki-crossrefs-retrofit-v0.3.0-beta.md`).
3. That pass wrote short targets like `[[ENH-NNN]]`, but the real files are `ENH-NNN/ENH-NNN-specification.md`, so those links do not resolve.
4. Entries created after that pass, including `kg_capture` output, were never covered. Duplicate frontmatter blocks (issue-24, issue-39, issue-46) may also stop Obsidian reading properties.

## Stated requirements (from the user)

- Keep `tags:` unchanged. Nimbalyst depends on them.
- Add real, hardcoded links alongside the tags.
- Do not require a separate plugin, especially for users outside Claude. `obsidian-skills` may at most be an optional mention.
- Fold into an existing ENH. No new item.
- **Avoid ambiguous naming** (user, 2026-10-17): never write a link whose target name is shared by more than one file (for example `README`, `specification`, `lessons-learned`). Every generated link must point at exactly one file.

## Tested in Obsidian (user, 2026-10-17)

Scratch notes were opened with the vault at the repo root (the graph also showed `node_modules` files). The scratch folder was deleted afterwards.

| Test | Result |
|---|---|
| Quoted wikilink in frontmatter, plain, with alias, in a list, and with a partial path ending | All render and work as links in the Properties panel |
| Relative Markdown link in frontmatter | Renders and works as a link (web sources said it would not; the test overrides them) |
| Plain ID string | Plain text, as expected |
| `tags:` alongside the links | Still shown as real tags and as `#tag` graph nodes |
| Frontmatter wikilink in a note with no body links, checked in the global graph with a filter that included both notes | **An edge is drawn** to the linked note |

Web searches (Obsidian forum and plugin pages) claimed the built-in graph ignores frontmatter links. The test above contradicts that for wikilinks.

**Not tested:** whether a Markdown link in frontmatter also draws a graph edge; behavior with the vault opened at `knowledge/` instead of the repo root; which file an ambiguous `[[README]]` resolves to (moot under the naming rule).

**Consequence:** no generated body "Relationships" block is needed. Frontmatter alone gives both clickable links and graph edges.

## Design (approved by user 2026-10-17, together with the ENH-062 schema)

1. Relationship values in frontmatter are **quoted wikilinks in flat lists**, with the short ID as the display label: `related_enhs: ["[[ENH-042-specification|ENH-042]]"]`.
2. Every target is unambiguous: full note name when unique, otherwise the shortest path ending that is unique in the graph. If no unique target exists, the link is not written and the item is reported.
3. Body cross-references that already use relative Markdown links are left as they are.
4. Plain-markdown rendering on GitHub is not a goal for frontmatter, which GitHub shows as raw text anyway.
5. Mechanics (flat shape, field names, migration, version tracking, approval gating) are specified in ENH-062.

## Open design questions (not decided)

1. Where the link-writing logic lives for new entries: `kg_capture`, the shared normalizer in ENH-062, or both.
2. Whether to convert body cross-references to wikilinks as well.
3. Fix the duplicate-frontmatter issues (24, 39, 46) first?
4. Template and command changes touch protected `core/` and `commands/`; permission needed per branch.
5. Retest with the vault opened at `knowledge/` before release.

The docs build and broken-links question is out of scope here. `knowledge/` is not part of the docs build (user, 2026-10-17); remaining docs-site concerns were handed to the `fix-broken-links` session.

## Prior art

- `knowledge/sessions/2026-04/2026-04-09.md` — decision to use wiki links as the cross-reference standard.
- The two archived plans above — pre-pass filename map, collision handling, code-block safety rules, `wiki_pass_complete` config flag.
- ENH-010 Phase 4; ADR-031 Pattern 4; ADR-029 (graph visibility of plans).

## Status

Implemented in v0.7.11 (marked by the maintainer 2026-10-18). Relationship values are written as quoted wikilinks in flat lists with the short ID as label, `tags:` are untouched, and no extra plugin is needed. They are written by `kg_upgrade` (`frontmatter-schema` step 2) for existing notes and by `kg_capture` and the issue/ENH/ADR/lesson templates for new ones. Caveat carried over from the Obsidian test: link rendering was verified with the vault at the repo root, not yet with the vault at `knowledge/`. The optional mention of `obsidian-skills` from the original idea is not part of the release.

## Related

- [ENH-062](../ENH-062/ENH-062-specification.md) — relationship vocabulary, field cleanup and migration mechanism this depends on.
- [issue-52](../../issues/issue-52/issue-52-description.md) — issue-52's spec cross-references this item.
- [ENH-052](../ENH-052/ENH-052-specification.md) — a link-resolution check could become one of its gates.
- https://github.com/kepano/obsidian-skills — optional only.
