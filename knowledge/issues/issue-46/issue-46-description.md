---
id: issue-46
type: Bug
status: tracked
github-issue: "#226"
branch: v0.7.1.5-capture-filename-diffbase-fix
created: 2026-08-16
---

# Issue 46: Session-summary and ADR capture filenames double-prepend date/ADR-number (and double-embed frontmatter)

## Summary

Two distinct manifestations of the same architectural flaw: **the MCP capture
layer and its caller agents both independently own something that should have a
single owner** — first found as a duplicated filename prefix, then found again
(live, in this issue's own tracking artifacts) as a duplicated YAML frontmatter
block.

### Manifestation A — filename prefix double-prepend

`deriveFileName()` in `mcp-server/src/tools/capture.ts` unconditionally derives and
prepends a prefix onto `metadata.title` for two of four capture types — today's date
for `type: "session"`, an `ADR-{NNN}-` prefix for `type: "adr"`. Two callers already
bake that same prefix into the `title` field they pass to the capture tool, so the
prefix is applied twice. Output filenames land as
`2026-08-16-2026-08-16-main.md` instead of `2026-08-16-main.md`, and (for ADRs)
`ADR-069-adr-069-my-decision.md` instead of `ADR-069-my-decision.md`.

### Manifestation B — duplicated YAML frontmatter block

`mcp-server/src/tools/capture.ts` (write path, ~line 472) does:
```ts
fs.writeFileSync(filePath, generateFrontmatter(request.type, request.metadata) + request.content, "utf-8");
```
unconditionally, for every capture type. `generateFrontmatter()` always builds its
own `---\ntitle: ...\n---` block from `metadata`. If the caller's `content` string
*also* already contains its own hand-written frontmatter block, the result is two
stacked `---...---` blocks in the same file — most YAML parsers only read the
first, so the second becomes stray, unparsed body text carrying a stale/wrong
title.

**Confirmed live** in this issue's own session snapshot,
`knowledge/sessions/2026-08/2026-08-16-main.md` (created earlier in this same
investigation, before this bug was noticed):
```yaml
---
title: "main"
date: 2026-08-16
branch: main
commit: af447452
tags: [session, snapshot, main, bug-investigation]
---
---
title: "2026-08-16-main"
date: 2026-08-16
branch: main
as_of_commit: af447452
last_updated: 2026-08-16 16:16
tags: [session, snapshot]
---
```
Block 1 (lines 1-7) comes from `generateFrontmatter()`, using the corrected bare
`metadata.title` ("main") — this is the value that avoided Manifestation A.
Block 2 (lines 8-15) comes from `agents/session-summary-agent.md`'s own S4
content template (lines 165-178), which independently constructs a full
frontmatter block — including the OLD dated title format — as part of the
`content` string it sends. The two were never meant to coexist; `content` should
never have included a frontmatter block of its own.

**Structurally likely, not yet live-confirmed:** ADR captures. `create-adr-agent.md`
Phase 5 (lines ~253-272) populates a full frontmatter block into the "Full
populated ADR markdown" it sends as `content`, mirroring session-summary-agent's
pattern exactly. Since `generateFrontmatter()` runs unconditionally for `type:
"adr"` too, every ADR captured through this agent very likely has the same
duplicated-block defect, compounding with Manifestation A's doubled filename
prefix on the same files.

**Confirmed clean:** lesson captures. `lesson-capture-agent.md`'s Phase 4 content
(verified against this session's own two lesson captures) contains no embedded
frontmatter block — body sections only (`## Problem`, `## Solution`, etc.) — so
`generateFrontmatter()`'s output is the only frontmatter block in lesson files.

## Root Cause

`deriveFileName()` (`mcp-server/src/tools/capture.ts:131-161`):

```ts
if (type === "session") {
  return `${todayIso()}-${slugify(metadata.title)}.md`;   // line 152
}

if (type === "adr") {
  const num = String(adrNumber ?? 1).padStart(3, "0");
  return `ADR-${num}-${slugify(metadata.title)}.md`;       // lines 156-157
}
```

Both branches assume `metadata.title` is the *bare* title, with no prefix. Two
caller agents violate that assumption:

- `agents/session-summary-agent.md` constructs `title` as
  `"[YYYY-MM-DD]-[branch-slug]"` at lines 170, 201, 451, and 603. Line 594 states
  the (incorrect) intent explicitly: *"Use `{session_filename}` … as the `title` —
  this ensures the MCP server creates or updates the file as
  `YYYY-MM-DD-{branch-slug}.md`"* — the doc assumes `title` becomes the filename
  verbatim, when `deriveFileName()` re-derives and re-prepends the date on top of it.
- `agents/create-adr-agent.md` constructs `title` as `"ADR-{NNN}: {title}"` at
  lines 256 and 286, which `slugify()` turns into `adr-nnn-{title}` — then
  `deriveFileName()` prepends `ADR-{NNN}-` again on top.

The `lesson` type (`capture.ts:136-150`, prefix `Lessons_Learned_`) is **not**
affected — `agents/lesson-capture-agent.md` passes a bare topic with no prefix.
`scaffold.ts` is also unaffected — `kg_scaffold` takes an explicit `outputPath` and
derives no filename of its own.

## Confirmed Scope

**Manifestation A — filename prefix:**

| Capture type | MCP-side prefix (capture.ts) | Caller bakes same prefix into `title`? | Affected caller sites |
|---|---|---|---|
| `session` | `todayIso()` (L152) | Yes | `session-summary-agent.md:170,201,451,594,603` |
| `adr` | `ADR-{NNN}-` (L156-157) | Yes | `create-adr-agent.md:256,286` |
| `lesson` | `Lessons_Learned_` (L136-150) | No | clean |
| default/fallback (L160) | none | n/a | clean |

**Manifestation B — frontmatter block:**

| Capture type | MCP always prepends `generateFrontmatter()` output? | Caller's `content` also embeds its own frontmatter block? | Status |
|---|---|---|---|
| `session` | Yes (write path, ~L472) | Yes — `session-summary-agent.md` S4 template (L165-178) | Confirmed live (`knowledge/sessions/2026-08/2026-08-16-main.md`) |
| `adr` | Yes | Yes — `create-adr-agent.md` Phase 5 (L253-272) | Structurally certain, not yet live-confirmed |
| `lesson` | Yes | No — `lesson-capture-agent.md` Phase 4 content has no frontmatter block | Clean |

Confirmed present, unchanged, in every cached plugin version checked
(0.6.20 → 0.7.1.4) — long-standing, not a regression from recent work.

**Likely real-world impact:** any ADR captured through `create-adr-agent.md` to
date may already exist on disk as a doubled-prefix file
(`ADR-NNN-adr-nnn-{slug}.md`). Part of the fix work is confirming whether any such
files exist in this repo's `knowledge/decisions/` and, if so, renaming them.

## Test Coverage Gap

`mcp-server/tests/capture.test.ts` exercises `type: "session"` (line ~450-455) and
`type: "adr"` (line ~458-463) only with clean, unprefixed titles
(`"Feature Work"`, `"Use TypeScript"`). No existing test passes a title that
already contains a date or `ADR-NNN` prefix, so the current suite cannot catch this
defect. See `knowledge/issues/issue-46/test-cases.md`.

## Related

- `knowledge/decisions/ADR-031-lessons-learned-plural-prefix-naming.md` — governs
  the `lesson` type's prefix; confirms prefixing is intentionally
  `deriveFileName()`'s job, but does not address caller-side duplication. A fix
  here is complementary, not contradictory.
- See [[issue-47]] for the related (but separately-scoped) diff-on-main bug found
  in the same investigation session.

## Discovery Context

Found 2026-08-16 while reviewing a session-summary output filename
(`2026-08-16-2026-08-16-main.md`) during spec-drafting, before any feature branch
existed. Confirmed and scoped via an Opus deep-dive subagent
(`agentId: ae187d4f06180abd7`) before filing. Full snapshot of the session:
`knowledge/sessions/2026-08/2026-08-16-main.md`.
