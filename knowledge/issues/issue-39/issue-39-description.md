---
id: issue-39
type: Bug
status: deferred
github-issue: "#202"
branch: none
created: 2026-08-01
related_issues: ["issue-18", "issue-36"]
---

# issue-39: `kg_capture` Prepends a Second, Differently-Shaped Frontmatter Block When Updating a File via `existingFile`

## Problem

`kg_capture` (`mcp__plugin_kmgraph_kmgraph__kg_capture`), when called with
`metadata.existingFile` pointing at an existing session-summary file (the documented
in-place-update path), reliably prepends a *second*, near-duplicate YAML frontmatter
block above the file's real one, instead of replacing it. The result is two
`---`-delimited YAML blocks stacked back to back at the top of the file — and the two
blocks don't even share the same schema.

Observed twice in direct succession this session, on the same file:

- File: `knowledge/sessions/2026-08-01-v0.7.0.md`
- **First occurrence:** after calling `kg_capture` with `type: "session"`,
  `metadata: {title: "2026-08-01-v0.7.0", existingFile:
  "/Users/mkaplan/GitHub/knowledge-graph/knowledge/sessions/2026-08-01-v0.7.0.md",
  tags: [...], git: {...}}`, the file gained a new frontmatter block (containing
  `title`, `date`, `branch`, `commit` — note: flat `commit` field, not the original's
  `as_of_commit`/`last_updated` fields) inserted immediately before the file's existing,
  correct frontmatter block.
- **Second occurrence:** after manually stripping the duplicate and calling `kg_capture`
  again with the same `existingFile` parameter (to persist an unrelated content edit),
  the exact same duplication reappeared — confirms this is reproducible, not a one-off
  race.
- In both calls, the `content` parameter already included the correct, complete
  frontmatter block as the first thing in the string (the caller was not relying on
  `kg_capture` to generate frontmatter) — the tool prepends its own frontmatter from
  `metadata` regardless of what's already in `content`.

**Workaround used this session:** after the second occurrence, avoided calling
`kg_capture` again for a small follow-up edit and used `kg_fts5_rebuild` instead (which
re-indexes without rewriting the file) to sidestep triggering the bug a third time.

## Root Cause (confirmed by reading source — not just a lead)

`mcp-server/src/tools/capture.ts`, the "Update-in-place path" block, lines 267–293:

```ts
if (request.metadata.existingFile) {
  const existing = path.resolve(request.metadata.existingFile);
  ...
  fs.writeFileSync(
    existing,
    generateFrontmatter(request.type, request.metadata) + request.content,
    "utf-8"
  );
  ...
}
```

`generateFrontmatter()` (same file, lines 97–140) unconditionally builds a fresh
frontmatter block from `metadata` for every write, including update-in-place writes. For
`type: "session"` it emits only `title`, `date`, `branch`, `commit` (lines 120–127) — a
different field set than the richer frontmatter the session-summary template/workflow
actually produces (e.g. `as_of_commit`, `last_updated`), which explains why the
duplicate block's fields don't match the original's schema.

There is no check anywhere in the update-in-place branch for whether
`request.content` already starts with its own `---`-delimited frontmatter block. The
non-update (fresh-file) path at lines 306–326 has the exact same
`generateFrontmatter(...) + request.content` pattern, so a similar duplicate-frontmatter
risk may exist there too if a caller ever passes `content` that already contains
frontmatter on first write — not confirmed, out of scope for this filing, but worth the
eventual fixer double-checking both call sites use the same fix.

## Impact

Every session-summary update via `kg_capture`'s `existingFile` path leaves the file with
duplicate frontmatter that must be manually cleaned up. This is not just cosmetic
duplication — the duplicate block uses a different field schema (flat `commit` vs.
`as_of_commit`/`last_updated`) than the original, so downstream tooling or humans reading
the file could pick up the wrong/stale field depending on which block they parse.

## Scope

Not pre-decided here (tracking only). At minimum, whoever picks this up should:

1. In the update-in-place branch (`capture.ts` lines 267–293), check whether
   `request.content` already begins with a `---`-delimited frontmatter block before
   calling `generateFrontmatter()` — either skip generation and write `content` as-is,
   or replace the existing block instead of prepending a new one.
2. Confirm whether the fresh-file write path (lines 306–326) has the same latent risk
   and needs the same guard.
3. Decide the correct behavior when `metadata` and the existing/embedded frontmatter
   disagree (e.g. `metadata.title` differs from the `title` already in `content`) —
   should `metadata` win, should `content`'s frontmatter win, or should they merge.
4. Add a regression test exercising `kg_capture` with `existingFile` set and `content`
   containing pre-built frontmatter, asserting the output has exactly one
   `---`-delimited block.

## Filing Process Note

Filed via `/kmgraph:kmg-start-issue-tracking`, Track-only mode (mode 3), matching the
precedent set by issue-38 (filed earlier today via the same workflow): full workflow
chosen over the lightweight capture-only path because the affected code
(`mcp-server/src/tools/capture.ts`) will change once someone fixes this, so it needs
GitHub visibility.

The `Skill` tool successfully resolved `kmgraph:kmg-start-issue-tracking` and returned
the full command document in this filing pass — it did **not** reproduce the
phantom-skill/non-resolution pattern documented in issue-18 and issue-36. Noted per the
filing instructions as evidence the phantom-skill pattern is not universal / may be
state-dependent, not as a finding that it's resolved project-wide.

## Related

- `mcp-server/src/tools/capture.ts` — `generateFrontmatter()` (lines 97–140) and the
  update-in-place write path (lines 267–293), the confirmed root-cause location
- `knowledge/issues/issue-18/` — phantom-skill pattern (Skill tool non-resolution)
- `knowledge/issues/issue-36/` — related phantom-skill pattern tracking
- `knowledge/issues/issue-38/issue-38-description.md` — precedent for this filing's
  workflow-mode choice (track-only, full workflow over lightweight capture)
