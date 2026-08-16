# Test Cases — issue-46

Covers both manifestations: filename prefix double-prepend (A) and duplicated
frontmatter block (B). Add to `mcp-server/tests/capture.test.ts`.

## Unit — `deriveFileName()` (Manifestation A)

1. **Session, bare title** (regression guard, existing case): `type: "session"`,
   `title: "main"` → `${today}-main.md`. Already covered; keep as-is.
2. **Session, already-prefixed title (the bug case):** `type: "session"`,
   `title: "2026-08-16-main"` → currently produces
   `2026-08-16-2026-08-16-main.md`. After the fix, callers never pass a prefixed
   title, so this case documents the pre-fix defect; keep it as an explicit
   regression test asserting the function does NOT re-detect/strip (confirms
   option B was chosen — the function's contract is "trust the caller").
3. **ADR, bare title** (regression guard): `type: "adr"`, `adrNumber: 69`,
   `title: "My Decision"` → `ADR-069-my-decision.md`.
4. **ADR, already-prefixed title (the bug case):** `type: "adr"`, `adrNumber: 69`,
   `title: "ADR-069: My Decision"` → currently produces
   `ADR-069-adr-069-my-decision.md`. Document as above.

## Unit — write path (Manifestation B)

9. **Content with embedded frontmatter (the bug case):** call the capture write
   path with `type: "session"`, `content` beginning with its own `---\ntitle:
   "x"\n---\n\n## Body`. Assert the written file does NOT contain two `---`-only
   lines back to back — i.e. only one frontmatter block survives. Currently
   fails (both blocks are written, stacked).
10. **Content without embedded frontmatter (regression guard):** same as above
    but `content` is body-only (`## Body...`). Assert exactly one frontmatter
    block, matching current correct behavior.
11. **ADR equivalent of case 9:** `type: "adr"`, `content` beginning with its own
    frontmatter block (as `create-adr-agent.md` currently constructs). Same
    assertion as case 9.

## Integration — agent contract

5. Grep-based regression test (or a lint step) asserting
   `agents/session-summary-agent.md` and `agents/create-adr-agent.md` never
   construct a `metadata.title` value containing a `YYYY-MM-DD` pattern or
   `ADR-{NNN}` pattern in the JSON payload passed to `kg_capture`. Prevents the
   contract from silently regressing when these files are next edited.

## Manual verification

6. Run `/kmgraph:kmg-session-summary --snapshot` from a clean branch and confirm
   the output filename is `YYYY-MM-DD-{branch-slug}.md` (single date).
7. Run `/kmgraph:kmg-create-adr` end-to-end and confirm the output filename is
   `ADR-{NNN}-{slug}.md` (single ADR-number prefix).
8. `ls knowledge/decisions/` and confirm no existing `ADR-*-adr-*-*.md`
   doubled-prefix files remain (per solution-approach.md step 4's audit).
9. Confirm `knowledge/sessions/2026-08/2026-08-16-main.md` has exactly one
   frontmatter block after the repair (solution-approach.md step 7).
10. Run the audit grep from solution-approach.md step 8 and confirm zero
    remaining double-frontmatter files across `knowledge/sessions/` and
    `knowledge/decisions/`, or that all found instances were repaired.
