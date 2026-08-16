# Test Cases — issue-46

Add to `mcp-server/tests/capture.test.ts`, alongside the existing `deriveFileName`
coverage.

## Unit — `deriveFileName()`

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
