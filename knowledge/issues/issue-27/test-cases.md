# issue-27: Test Cases

- [x] Stray file byte-identical to canonical template, destination pre-populated with unrelated real content → real content survives untouched, reported as skipped (regression test, `upgrade.test.ts` T-49 block, "real accumulated content in concepts/ is never overwritten").
- [x] Stray file matches canonical template, destination does not exist → moved normally (pre-existing test, "known template file moves to concepts/").
- [x] Stray file differs from canonical template (user-modified) → skipped, stray dir not removed (pre-existing test, "modified template file skipped").
- [x] `tsc --noEmit` clean.
- [x] Full mcp-server suite passes (147/147).
- [x] `dist/` rebuilt.
