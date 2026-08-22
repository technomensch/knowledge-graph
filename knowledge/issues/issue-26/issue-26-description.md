---
id: issue-26
type: Hardening
status: resolved
github-issue: "#190"
branch: none
created: 2026-07-18
---

# issue-26: `commands/kmg-start-issue-tracking.md` References `docs/issue-tracker.md`, Which Does Not Exist

## Problem

`commands/kmg-start-issue-tracking.md` Step 6.1 ("Master Issue Tracker") instructs: "Add entry to `docs/issue-tracker.md`." That file does not exist anywhere in this repository. Confirmed via direct file check (`test -f docs/issue-tracker.md` → false) while executing the command live, for real, to file both ENH-051 and issue-25.

The step is prose-only with no bash fence checking for the file's existence first — following the command literally would either fail silently (writer tool errors, unnoticed) or require inventing a new file on the spot, neither of which is what the command author intended. The actual established convention in this project is the two `README.md` index files (`knowledge/enhancements/README.md`, `knowledge/issues/README.md`) — both real, both maintained (if inconsistently — see issue-13/ENH-042), both already doing the job `docs/issue-tracker.md` was presumably meant to do.

## Context That Triggered This

Discovered live, in-session, on 2026-07-18, while actually running `/kmgraph:kmg-start-issue-tracking` end-to-end for the first time this session (per issue-25's own finding, most enhancement/issue capture in this project has been ad hoc hand-writes, not driven through this command — so its Step 6.1 instruction may never have been exercised against the current repo state before). Same discovery session as ENH-051 and issue-25.

## This Is the Same Class as issue-13

This project already tracks the general pattern — "a documented reference or rule turns out to be stale/wrong, and nothing catches it automatically" — under [issue-13](../issue-13/issue-13-description.md) ("No automated broken-link detection anywhere in the docs pipeline"). issue-13 documents this example added directly to it rather than treating it as a wholly separate meta-finding. See issue-13 for the aggregated pattern; this issue documents only the specific instance.

**Scope distinction worth preserving:** issue-13's three checked detection mechanisms (`onBrokenLinks` config, `kmg-docs-impact-scan`, `pre-push-gate.sh`) are all scoped to the Docusaurus `docs/` site build. `commands/kmg-start-issue-tracking.md` is a command prompt file, not Docusaurus content — it is never touched by `npm run build`, `onBrokenLinks`, or any of issue-13's three mechanisms. A fix for issue-13 (e.g., flipping `onBrokenLinks` to `throw`) would **not** have caught this instance. The underlying failure pattern is the same (stale reference, nothing catches it), but the surface and any eventual fix mechanism differ — noted so issue-13's eventual resolution isn't assumed to cover this case too.

## Related

- [issue-13](../issue-13/issue-13-description.md) — general detection-gap pattern this instance was folded into
- [issue-25](../issue-25/issue-25-description.md) — filed in the same session, same underlying "process/reference gap not caught until hit live" theme
- [ENH-051](../../enhancements/ENH-051/ENH-051-specification.md) — the enhancement being filed when this was found
- [ENH-052](../../enhancements/ENH-052/ENH-052-specification.md) — superset pre-PR paperwork-consistency check that names this issue as a narrow, non-duplicated mechanism. Backlinked 2026-07-26 (paperwork-audit backlink-symmetry check).
- [issue-49](../issue-49/issue-49-description.md), [issue-50](../issue-50/issue-50-description.md), [issue-51](../issue-51/issue-51-description.md) — all three name this issue, alongside issue-13/ENH-042/issue-28, as part of ENH-052's "internal paperwork drifts silently, nothing catches it" pattern family. Backlinked 2026-08-19.
- **`commands/kmg-start-issue-tracking.md` hotspot:** besides ENH-052 (above), also
  touched by [issue-19](../issue-19/issue-19-description.md) (no prior-art/provenance
  enforcement) and [issue-52](../issue-52/issue-52-description.md) (GitHub-issue-creation
  Step 5.0 bypass) — same command surface, FYI, not batched with this issue.

## Resolution (2026-08-22)

Fixed — `commands/kmg-start-issue-tracking.md` Step 6.1 now points at the real, already-maintained convention (`issues/README.md` / `enhancements/README.md`) instead of the nonexistent `docs/issue-tracker.md`. No stub file created: the existing indexes already do the job the dead reference was presumably meant to do. GitHub issue #190 close is a separate, explicit follow-up (not automated by this fix).
