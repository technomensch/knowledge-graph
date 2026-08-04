---
id: issue-25
type: Hardening
status: resolved
github-issue: "#189"
branch: none
created: 2026-07-18
---

# issue-25: No Documented Authority for ENH-Spec vs. Issue-Tracking-Workflow (Enhancement Scope Overlap)

## Problem

Two separate, overlapping mechanisms exist in this project for capturing an enhancement, and nothing documents which one governs:

1. **`knowledge/enhancements/ENH-NNN/ENH-NNN-specification.md`** — a lightweight, hand-authored spec file. No dedicated command drives its creation. Confirmed by inspecting the most recent prior entry (ENH-050): its own frontmatter says "Request captured only... deferred to implementation scoping," meaning these get written ad hoc, by hand, same as any other file.

2. **`/kmgraph:kmg-start-issue-tracking`** — a full formal workflow. Its own purpose line explicitly claims this scope: "Initialize issue tracking for a specific problem **or enhancement**." It auto-detects issue type including "Enhancement," and for that type still lands docs under `knowledge/enhancements/ENH-NNN/` (per its own file-naming conventions section) — but via a much heavier path: branch creation, `solution-approach.md`, a real GitHub issue filed with `--body-file`, multiple mandatory interactive gates.

Nothing in `rules.md`, `triggers.md`, any skill, or either command's own docs says which of these two paths an enhancement request should take. Both claim the same territory (`knowledge/enhancements/ENH-NNN/`), with materially different weight (one file write vs. a full branch+GitHub-issue workflow).

## Context That Triggered This

Discovered live, in-session, on 2026-07-18. While filing what became ENH-051 (KG path-resolution delegation), the assistant defaulted to the lightweight hand-written spec path without checking whether `/kmgraph:kmg-start-issue-tracking` should have been used instead — a real miss, not a hypothetical. The user caught it: "shouldn't this follow the issue workflow but for an enhancement." On inspection, both paths turned out to be real, both claim enhancement scope, and no rule resolves the conflict. ENH-051 was then redone through the formal workflow to close the immediate gap, but the underlying ambiguity — which path is authoritative, and when — remains undocumented.

## Impact

- Future sessions (human or AI) will keep guessing between the two paths inconsistently, the same way this session did.
- The lightweight `ENH-NNN` convention has no command enforcing its structure, so quality/completeness of hand-written specs will vary by whoever writes them (compare ENH-050's minimal capture vs. what a `kmg-start-issue-tracking` Enhancement produces).
- `kmg-start-issue-tracking`'s heavier workflow (branch + GitHub issue) may be overkill for genuinely small, deferred, "just write it down" requests — if so, the lightweight path is legitimate and should be documented as such, not just tolerated by omission.

## Related

- **Resolved by [ADR-068](../../decisions/ADR-068-lightweight-vs-full-workflow-rule-and-piloted-command-completion-check.md) (2026-08-01)** — Half A of that ADR is this issue's rule: lightweight path vs. full `kmg-start-issue-tracking` workflow, formalizing the de facto pattern already used by issue-30/ENH-053/054/055/issue-33. **Implemented:** `knowledge/rules.md` § Bug / Enhancement Triage (Path 1's lightweight-vs-full split bullet).
- Loosely adjacent to ADR-058 ("naming-scope-upfront-check-for-new-commands-skills-docstrings") — same family of problem (undocumented scope boundaries between project mechanisms), different specific gap.
- [ENH-051](../../enhancements/ENH-051/ENH-051-specification.md) — the enhancement being filed when this was found.
- [issue-26](../issue-26/issue-26-description.md) — filed in the same session, same underlying "process/reference gap not caught until hit live" theme.
- [ENH-056](../../enhancements/ENH-056/ENH-056-specification.md) — this issue's rule is a blocking dependency for ENH-056's AC-3/AC-4 (distinguishing legitimate lightweight paths from silently-skipped steps)
