# Solution Approach — issue-46

## Contract decision

Two ways to resolve the duplication:

- **A — MCP strips:** `deriveFileName()` detects an already-prefixed title (regex
  for a leading `YYYY-MM-DD-` or `ADR-NNN-`/`ADR-NNN:` pattern) and skips
  re-prepending.
- **B — Callers stop baking the prefix in:** `deriveFileName()` keeps sole
  ownership of prefix generation; caller agents pass the bare semantic title only
  (branch-slug for session, decision title for ADR).

**Recommended: B.** Regex-detecting "did the caller already prefix this" (A) is
fragile — it has to keep pace with any future prefix format change in
`deriveFileName()`, and a title that happens to start with something
date-shaped for unrelated reasons would falsely suppress the real prefix. B makes
`deriveFileName()` the single source of truth for filename shape, which is also
what its lesson-type branch already assumes (`Lessons_Learned_` is never baked
into `metadata.title` by `lesson-capture-agent.md`).

This is also already field-validated: while running the mandatory session-summary
snapshot for this issue (2026-08-16), the session-summary-agent subagent
independently chose to pass `metadata.title: "main"` instead of the templated
`"2026-08-16-main"` — explicitly reasoning that the dated form would reproduce
this exact bug — and the resulting file landed correctly as `2026-08-16-main.md`.
That's option B, done ad hoc, by hand, once. This fix makes it structural so every
future invocation doesn't depend on the agent noticing.

## Changes required — Manifestation A (filename prefix)

1. **`agents/session-summary-agent.md`** — lines 201, 603 (`metadata.title` passed
   to `kg_capture`): change from `"[YYYY-MM-DD]-[branch-slug]"` to
   `"[branch-slug]"`. Lines 170, 451 (the generated file's own YAML frontmatter
   `title:` field) may keep the full dated form if desired for display — that
   value is written directly into file content, not fed back through
   `deriveFileName()`, so it's cosmetic and out of scope for this bug. Line 594's
   comment is now false and should be corrected to describe the real mechanism
   (filename comes from `{today}-{branch_slug}.md` computed independently at S1,
   not from `metadata.title`).
2. **`agents/create-adr-agent.md`** — lines 256, 286: change `metadata.title` from
   `"ADR-{NNN}: {title}"` to the bare `"{title}"`. Same split as above applies if
   line 256 is also a document-frontmatter template rather than the tool-call
   payload — confirm which before editing (the JSON block at 286 is the
   tool-call payload and is the one that must change; verify 256 the same way
   line 170 was verified for session-summary-agent.md, i.e. check whether it's
   inside a rendered-file template or an actual `kg_capture`/`kg_scaffold` call).
3. **`mcp-server/src/tools/capture.ts`** — no code change required under option B;
   `deriveFileName()`'s existing behavior becomes correct once callers stop
   duplicating it. Consider adding a one-line comment above lines 151-153 and
   155-158 stating the contract explicitly ("caller must pass a bare title —
   this function owns all filename prefixing") so a future caller doesn't
   reintroduce the bug.
4. **Audit existing files** in `knowledge/decisions/` for any `ADR-NNN-adr-nnn-*.md`
   doubled-prefix artifacts created by the create-adr-agent bug prior to this fix,
   and rename if found. (Session files are lower-risk to leave as-is since the
   doubled date is cosmetic-only there; still worth a quick `ls` check.)

## Changes required — Manifestation B (duplicated frontmatter block)

Same ownership principle as Manifestation A, applied to the whole frontmatter
block instead of a prefix substring: `generateFrontmatter()` in `capture.ts`
should be the *only* place a frontmatter block is generated. Callers must send
`content` as body-only — the same shape `lesson-capture-agent.md` already uses
correctly.

5. **`agents/session-summary-agent.md`** S4 template (lines ~165-178): remove the
   `---` frontmatter block from the content the agent constructs, for both the
   "create new" and "update existing" paths. Content sent to `kg_capture` should
   start directly at `## Operational Snapshot...`. Verify the "update existing"
   path (S4's second branch, "update YAML header fields") doesn't depend on a
   frontmatter block being present in the file it's editing in place — if it
   does, that logic needs to move to `generateFrontmatter()`'s inputs (i.e. pass
   `as_of_commit`/`last_updated` through `metadata` instead of writing them into
   `content`).
6. **`agents/create-adr-agent.md`** Phase 5 (lines ~253-272): remove the
   frontmatter block from the "Full populated ADR markdown" content; pass the
   equivalent fields (`status`, `number`, `git`, `implements`, `related`,
   `category`) through `metadata` instead, extending `generateFrontmatter()`'s
   `adr` branch (capture.ts lines ~192-200) to emit them — it currently only
   emits `title`, `status: Proposed` (hardcoded, not from metadata — separate
   minor issue worth flagging in the PR), `date`, `deciders`, `tags`. Confirm
   with a live ADR capture test that no ADR-specific metadata is lost in the
   switch.
7. **Repair the malformed live artifact:** `knowledge/sessions/2026-08/2026-08-16-main.md`
   currently has two stacked frontmatter blocks (see issue-46-description.md for
   the exact content). Fix by hand as part of this branch's work — merge the two
   blocks into one, keep the corrected bare title, drop the duplicate.
8. **Audit for other pre-existing malformed files:** grep `knowledge/sessions/`
   and `knowledge/decisions/` for files with two `---`-only lines back to back
   in the first ~20 lines — every prior session/ADR capture is a candidate.

## Test coverage note

No existing test in `capture.test.ts` asserts on the *number* of frontmatter
blocks written, or on `content` containing a pre-existing frontmatter block —
this is a second, independent test-coverage gap from Manifestation A's. See
`test-cases.md`.

## Linked Knowledge

- Lesson: `knowledge/lessons-learned/patterns/Lessons_Learned_Patterns_Ownership_Of_Derivation_Contract_Violation_Causes_Double_Prefixed_Filenames.md`

## Out of scope

- `scaffold.ts` / `kg_scaffold` — confirmed unaffected, no change needed.
- `lesson` capture type — confirmed unaffected, no change needed.
