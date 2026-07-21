# ENH-052: Acceptance Criteria

Direction decided: Option B (`scripts/pre-push-gate.sh` Gates 5/6). Status below
reflects what's actually built vs. still open.

- [x] A pre-PR run detects when an index README's declared count no longer
      matches the actual folder listing, and reports it before push. **Gate 5,
      implemented.** Message explicitly says entries are missing and must be
      added, not that the count should be edited to match (caught as a real
      wording bug during review and fixed).
- [x] The check covers all four index families (decisions, enhancements,
      issues, lessons-learned), not just a subset. **Implemented.**
- [x] Backlink symmetry: given a cross-reference A→N in a doc changed on the
      current branch, the mechanism reports when the expected N→A backlink is
      absent. **Gate 5, implemented**, scoped to branch-changed issue/ENH docs
      only (not a full-KG scan, for per-push cost reasons — documented, not an
      oversight).
- [ ] CHANGELOG entry currency checked against the branch's actual final
      state, not just that the version string appears somewhere. **Not
      implemented** — Gate 2's presence check is unchanged in this pass; this
      remains open, likely belongs to the companion skill (judgment-required:
      "does this entry reflect the branch's final commits" isn't a grep).
- [x] Version-sync scope widened beyond the original two-file comparison.
      **Implemented** (Gate 2 extended): now also checks
      `.codex-plugin/plugin.json`, `.claude-plugin/marketplace.json`'s embedded
      version, and conditionally `mcp-server/package.json` when
      `mcp-server/src/` changed on the branch.
- [x] Issue/enhancement `status:` accuracy is checked. **Implemented** —
      `skills/kmg-paperwork-audit/SKILL.md`, Steps 2-3 (resolved-without-evidence
      and deferred-but-implemented checks).
- [x] Session-summary/handoff currency is checked. **Implemented** —
      `skills/kmg-paperwork-audit/SKILL.md`, Step 4.
- [x] The implementation documents its scope boundary: does **not** cover
      Docusaurus link integrity (issue-13) or `commands/*.md` references
      (issue-26). **Documented** in both the spec and the script's own
      comments.
- [x] Advisory-vs-blocking is an explicit choice. **Decided: advisory**,
      matching every existing gate (Gates 5/6 always exit 0).
- [x] Cross-referenced to issue-13, ENH-042, and issue-26. **Preserved**
      throughout.

## Verified

- [x] Functional test of Gates 5/6 — simulated `PreToolUse` hook invocation
      against this repo's real data. Caught the real, pre-existing
      `issues/README.md`/`lessons-learned/README.md` count drift, the 6
      github-issue-sync leaks, and 9 real backlink gaps the manual audit had
      missed (older docs like `ENH-022`, `issue-11`, `ENH-050` never
      backlinked from newer items referencing them).
- [x] `kmg-paperwork-audit` skill built (`skills/kmg-paperwork-audit/SKILL.md`).
      Flag/gate integration verified directly: wrote the completion flag by
      hand using the skill's own documented snippet, re-ran the hook, confirmed
      Gate 6's reminder cleared.

## Still Open

- [ ] CHANGELOG-entry-currency — still not mechanically or skill-checked;
      remains genuinely open, not assigned to either Gate 5 or the skill yet.
- [ ] The skill's own judgment-based logic (Steps 2-3's "does the diff support
      this resolved claim") has only been integration-tested for the flag
      mechanics, not exercised against a real resolved/deferred item to confirm
      its actual judgment calls are reasonable — that requires running it for
      real on a live case, not just confirming the flag file appears.
- [ ] Bonus finding from this test pass, tracked in `issue-28` (not this ENH):
      the live `PreToolUse` hook itself runs from the installed plugin cache
      (currently `0.6.15`), same bug class as the `mcp-server`/`kg_upgrade`
      case — confirmed hooks are affected too, not just MCP tool calls.
