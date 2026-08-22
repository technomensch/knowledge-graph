---
id: issue-24
type: Bug
status: resolved
github-issue: "#185"
branch: none
created: 2026-07-18
---

# Issue-24: `kg_capture` produces a malformed double-frontmatter file when content already includes its own YAML frontmatter

## Resolution (2026-08-22)

Confirmed as a duplicate of [[issue-46]] (GitHub #226, already closed as
COMPLETED). issue-46's "Manifestation B" is this exact bug: `kg_capture`
unconditionally prepending `generateFrontmatter()`'s output onto
caller-supplied `content` at both write sites in
`mcp-server/src/tools/capture.ts`, regardless of whether that content
(as produced by `session-summary-agent.md`'s templates) already carries
its own frontmatter block — producing the same stacked `---...---
---...---` corruption described below. The shipped fix
(commits `e082d7f9`, `94ff2897`) added `stripLeadingFrontmatter()`, which
strips any caller-supplied leading frontmatter block before the tool
prepends its own, and closes this exact `kg_capture`/session-type code
path. issue-46 also fixed the related double-dated-filename symptom noted
below (its "Manifestation A"). Closed as a duplicate rather than
independently reimplemented; GitHub #185 closed with a comment pointing to
#226.

## Problem

Calling `kg_capture` (type: `session`) with a `content` string that already begins with its own `---` YAML frontmatter block (title/date/branch/tags etc., as produced by `session-summary-agent`'s own drafting convention) results in the tool wrapping that content in a SECOND, tool-generated frontmatter block rather than merging, replacing, or stripping the caller-supplied one.

Observed directly: saving a session summary produced a file starting with:

```
---
title: "2026-07-17-main"
date: 2026-07-18
branch: main
commit: 4fabcb43
tags: [session, mixed]
---
---
title: "2026-07-17-main"
date: 2026-07-17
branch: main
as_of_commit: 4fabcb43
last_updated: 2026-07-17
tags: [session, mixed]
---

# Session Summary — ...
```

Two stacked `---`-delimited blocks in a row. Most markdown/YAML frontmatter parsers only recognize the first block as metadata — the second one renders as literal text in the document body (or worse, breaks parsing entirely depending on the tool reading it).

## Additional detail worth noting

The tool-generated outer frontmatter also used the actual current date (`2026-07-18`) rather than the date implied by the title (`"2026-07-17-main"`), and used `commit` as the key where the caller's own convention used `as_of_commit` — a second, smaller inconsistency in the same code path (the tool isn't reading/respecting fields already present in the supplied content when generating its own).

Separately, the auto-generated filename came out as `sessions/2026-07/2026-07-18-2026-07-17-main.md` — today's real date prepended onto a title that already started with a date string, producing a double-dated filename. Related to the frontmatter issue (same root cause: the tool doesn't recognize that supplied content/title already encodes its own date) but worth noting as a second symptom of the same behavior.

## Workaround used

Manually edited the saved file to remove the tool-generated outer frontmatter block, keeping the caller-supplied one (which was more accurate — correct date, correct commit-field name). Content itself was otherwise intact; this is a metadata/framing defect, not data loss.

## Status

Resolved — see "Resolution (2026-08-22)" above. Fixed as part of [[issue-46]]'s
Manifestation B; no separate branch or implementation needed for this issue.
