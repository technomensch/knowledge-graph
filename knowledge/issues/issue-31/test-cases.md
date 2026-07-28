# issue-31: Acceptance Criteria

- [ ] `commands/kmg-handoff.md` Step 1 (`output_dir=` assignment) points at
      `knowledge/handoffs/$(date +%Y-%m-%d)`, not `./handoff-packages/...`.
- [ ] `commands/kmg-handoff.md`'s `--output-dir` flag documentation (default value shown
      to the user) reflects the corrected path.
- [ ] Running `/kmgraph:kmg-handoff` with no `--output-dir` override produces a new dated
      folder under `knowledge/handoffs/`, not `handoff-packages/`.
- [ ] A grep of `commands/kmg-handoff.md` for `handoff-packages` returns no remaining
      hits after the fix (or only intentional historical/example references, clearly
      marked as such).
- [ ] Disposition of the 12 existing `handoff-packages/*` stray directories is explicitly
      decided (migrated or deleted) — not left ambiguous — before this issue is closed.
- [ ] The "other commands with similarly stale hardcoded paths" follow-up question is
      either answered (via a lightweight grep) or explicitly deferred to a separate,
      named follow-up.
