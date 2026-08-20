# Test Cases — issue-48

No fix is implemented in this issue's branch. These test cases describe what
a consistency check and a verification pass would look like once one of
`solution-approach.md`'s options is implemented — written now so the
eventual implementation has a concrete target, per this issue's
tracked-not-implemented mode.

## Consistency check (prevents future re-divergence)

1. **Grep-based regression test asserting field-set agreement.** If Option A
   (dispatch) is implemented: assert `commands/kmg-create-adr.md` contains no
   literal `---`-delimited YAML block and no direct filename-construction
   logic (i.e., Steps 4-7 are gone, replaced by a dispatch call) — a
   regression here would mean the duplication silently came back.
2. **If Option B (inline-but-synced copies) is implemented instead:** a
   script or grep-based test comparing the frontmatter field list literally
   present in `commands/kmg-create-adr.md` Step 5.1 against the field list in
   `create-adr-agent.md` Phase 5's `metadata` JSON — flag any field present
   in one but not the other. This is the test that would have caught today's
   confirmed divergence (`author`/`email` nesting, `commit_short`,
   `implements`) had it existed when the two files first drifted apart.

## Confirmed-divergence regression guards (document today's baseline)

3. **`implements` field reachability:** confirm whichever path is kept (or
   both, if Option C/status-quo) either (a) has a wizard question equivalent
   to `create-adr-agent.md` Phase 3 question 9 ("Implementation Commit"), or
   (b) explicitly documents that `implements` is permanently `null` via that
   path, so the gap is a documented limitation rather than a silent one.
4. **`git` sub-field shape:** confirm `author`/`email` are captured in
   exactly one location (either nested under `git:` or top-level, not
   differently per code path) in whichever frontmatter shape ships after the
   fix.

## Manual verification (once implemented)

5. Create an ADR via `/kmgraph:kmg-create-adr` (the command path) and via a
   direct `create-adr-agent` invocation (the agent path, if still separately
   reachable after the fix). Diff the two resulting frontmatter blocks for a
   title/status/category/git-metadata-only ADR with no `implements` value
   and no related lessons — they should now be structurally identical field
   sets (module differences like the actual title/number are expected to
   differ; the *shape* should not).
6. Create an ADR via the command path answering "yes" to an
   implementation-commit-equivalent question (once Option A/B adds one) and
   confirm the written `implements` field is non-null and matches the
   `[[<hash>]] — <commit subject>` format `create-adr-agent.md` Phase 3
   question 9 already produces.
7. Confirm `commands/kmg-create-adr.md`'s Checklist section (lines ~475-490)
   still accurately describes the post-fix behavior — it currently lists
   steps ("Filename follows `ADR-{NNN}-{slug}.md` pattern", "YAML frontmatter
   fully populated") that describe the standalone implementation being
   replaced or synced; update wording to match whichever option is chosen.

## Out of scope

- Unit tests in `mcp-server/tests/` — this issue's fix (whichever option) is
  entirely at the markdown-instruction layer (`agents/`, `commands/`); no
  `capture.ts` behavior changes as a result of this issue alone.
