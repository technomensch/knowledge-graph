# Test Cases — issue-46

Covers all three manifestations: filename prefix double-prepend (A),
duplicated frontmatter block (B), and filename-prediction algorithm
divergence (C). Add to `mcp-server/tests/capture.test.ts`. Numbered
sequentially in the order tests should be added — solution-approach.md's
numbered items are cross-referenced by number, not by section.

## Unit — `deriveFileName()` (Manifestation A)

1. **Session, bare title** (regression guard, existing case): `type: "session"`,
   `title: "main"` → `${today}-main.md`. Already covered; keep as-is.
2. **Session, already-prefixed title (the bug case):** `type: "session"`,
   `title: "2026-08-16-main"` → currently produces
   `2026-08-16-2026-08-16-main.md`. After the fix, callers never pass a prefixed
   title, so this case documents the pre-fix defect; keep it as an explicit
   regression test asserting the function does NOT re-detect/strip (confirms
   the "trust the caller" contract for filenames specifically — this is
   distinct from Manifestation B's contract, which after the fix is
   *enforced*, not just trusted; see case 9).
3. **ADR, bare title** (regression guard): `type: "adr"`, `adrNumber: 69`,
   `title: "My Decision"` → `ADR-069-my-decision.md`.
4. **ADR, already-prefixed title (the bug case):** `type: "adr"`, `adrNumber: 69`,
   `title: "ADR-069: My Decision"` → currently produces
   `ADR-069-adr-069-my-decision.md`. Document as above.

## Integration — agent contract (Manifestation A)

5. Grep-based regression test (or a lint step) asserting
   `agents/session-summary-agent.md`, `agents/create-adr-agent.md`, and
   `commands/kmg-create-adr.md` never construct a `metadata.title` value
   containing a `YYYY-MM-DD` pattern or `ADR-{NNN}` pattern in the JSON
   payload passed to `kg_capture`. Prevents the contract from silently
   regressing when these files are next edited.

## Unit — write path (Manifestation B)

Per solution-approach.md's hybrid contract, `capture.ts` now defensively
strips a leading frontmatter block from `request.content` at both write
sites — these tests assert the strip works, not merely that the bug exists.

6. **Content with embedded frontmatter (the bug case, now defended):** call
   the capture write path with `type: "session"`, `content` beginning with
   its own `---\ntitle: "x"\n---\n\n## Body`. Assert the written file contains
   exactly one frontmatter block (the caller's embedded block is stripped
   before `generateFrontmatter()`'s output is prepended).
7. **Content without embedded frontmatter (regression guard):** same as above
   but `content` is body-only (`## Body...`). Assert exactly one frontmatter
   block, unchanged from current correct behavior — the strip must be a
   no-op when there's nothing to strip.
8. **ADR equivalent of case 6:** `type: "adr"`, `content` beginning with its
   own frontmatter block (as `create-adr-agent.md` currently constructs).
   Same assertion as case 6.
9. **Update-in-place path, both cases 6 and 7 repeated:** the strip must apply
   at the update-in-place write site (capture.ts ~429-433) as well as the
   new-file site (~474) — a single shared helper, not two independent
   implementations, so add tests against both call sites rather than trusting
   symmetry.
10. **Metadata plumbing regression guard:** call the update-in-place path with
    `existingFile` set and `metadata.as_of_commit` / `metadata.last_updated`
    populated; assert both fields appear in the written file's single
    frontmatter block (covers solution-approach.md item 9's schema/interface
    additions).
11. **ADR metadata plumbing regression guard:** call ADR capture with
    `metadata.status: "Accepted"` and assert the written frontmatter's
    `status:` field is `Accepted`, not the previously-hardcoded `Proposed`
    (covers solution-approach.md item 10).

## Unit — filename-prediction agreement (Manifestation C)

12. **Dotted branch name:** if a client-side filename-prediction helper is
    kept per solution-approach.md item 15's fallback option, assert it agrees
    with `deriveFileName()`'s actual output for a branch name containing
    dots, e.g. `v0.7.0-adr-067-c1` → both must independently arrive at
    `{today}-v070-adr-067-c1.md`. If the preferred fix (stop predicting
    client-side, use the `kg_capture` response) is taken instead, this test
    becomes N/A — replace with a test asserting the "does today's file
    already exist" check correctly matches an existing dotted-branch session
    file by directory-listing pattern rather than exact-string prediction.

## Manual verification

13. Run `/kmgraph:kmg-session-summary --snapshot` from a clean branch and confirm
    the output filename is `YYYY-MM-DD-{branch-slug}.md` (single date, no
    doubled block).
14. Run `/kmgraph:kmg-create-adr` end-to-end and confirm the output filename is
    `ADR-{NNN}-{slug}.md` (single ADR-number prefix, single frontmatter
    block, correct `status`).
15. `ls knowledge/decisions/` and confirm no existing `ADR-*-adr-*-*.md`
    doubled-prefix files remain, **and** grep
    `knowledge/decisions/README.md`, `knowledge/sessions/README.md`, and
    `knowledge/lessons-learned/README.md` for any lingering doubled-prefix
    *link targets* (per solution-approach.md items 5-6 — a filename-only
    check misses ADR-046's broken link).
16. Confirm each of the 9 files identified in solution-approach.md item 13
    (session, ADR, and lesson) has exactly one frontmatter block after
    repair, with the documented conflict-resolution rule applied where two
    blocks disagreed (e.g. `2026-07-14-main.md`'s date conflict).
17. Run the precise double-frontmatter detection from solution-approach.md
    item 14 (not a naive `grep -c '^---$'`, which over-counts body horizontal
    rules) across `knowledge/sessions/`, `knowledge/decisions/`, **and**
    `knowledge/lessons-learned/` and confirm zero remaining instances.
18. Capture a second same-day session (triggers the update-in-place path) and
    confirm it succeeds without a `CONFLICT` error, and that the resulting
    file still has exactly one frontmatter block with both original and
    updated fields present (covers solution-approach.md item 9's full fix,
    not just the schema addition).
