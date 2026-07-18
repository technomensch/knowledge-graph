# ENH-051: Acceptance Criteria

- [ ] `cli.ts` and `commands/kmg-init.md` produce identical resolved paths for all three location types (project-local, personal/global-topic, custom) by calling the same underlying logic — not two hand-maintained copies.
- [ ] Changing the resolved path for a location type requires editing exactly one place in the codebase.
- [ ] Existing `mcp-server` test suite (147/147 as of v0.6.20 final — 146 as of Task 2, +1 from issue-27's regression test) still passes; new tests cover the path-resolution capability itself.
- [ ] `tsc --noEmit` clean after the change.
- [ ] No new location types introduced as a side effect of this work (out of scope — see spec).
