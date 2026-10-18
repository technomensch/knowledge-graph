---
id: issue-62
type: Bug
status: resolved
status_category: done
github_issue: "#265"
branch: v0.7.11.1-fix-validate-plugin
created: 2026-10-18
related_issues: []
related_enhs: []
related_adrs: []
blocked_by: []
blocking: []
depends_on: []
related_to: []
---

# issue-62: `scripts/validate-plugin.sh` fails on main and its docs entry is wrong

**Local ID:** issue-62 | **GitHub Issue:** [#265](https://github.com/technomensch/knowledge-graph/issues/265) (filed via `/kmgraph:kmg-start-issue-tracking`, Mode 1, track then implement)

**Status:** ✅ Resolved — rewritten and verified on branch `v0.7.11.1-fix-validate-plugin`; not yet committed, pushed or merged
**Discovered:** 2026-10-18, while running the v0.7.11 release checks
**Type:** Bug
**Version impact:** patch-sized, folded into the unreleased 0.7.11 line (no new version number minted)

## Summary

`scripts/validate-plugin.sh` is a manual pre-publish check that scans for leftovers from the project the plugin was extracted from. It exits 1 on a clean copy of main ("Found 8 violation(s)"). It predates the v0.7.11 work: on the v0.7.11 branch it reports 9, and the extra one comes from a gitignored local file that is not in a clean checkout.

The script was written when the repo held only plugin files. It runs `grep -rniE <pattern> .` over the whole repo, so it now also reads `knowledge/` (513 tracked files; not packaged for users, but public on GitHub because the repo is public), build leftovers such as `core/scripts/__pycache__`, and scratch folders. Four of its six rules no longer match anything meaningful.

## Where

- `scripts/validate-plugin.sh` (the whole file)
- `docs/reference/hooks.md` line 76 says the script is "invoked by installer and CLI commands, not by the hook system". Nothing calls it.
- `CHANGELOG.md` line 76 names the old project, which trips the project-name rule.

## Evidence (observed 2026-10-18)

### 1. It fails on main

A clean copy of main reports 8 violations. The count was reproduced on the v0.7.11 branch (9, with the extra from a gitignored file).

### 2. Nothing calls it

No hook (`hooks/hooks.json`), `package.json` script, CI workflow (`.github/workflows/docs.yml` only runs `npm install` and `npm run build`), `scripts/pre-push-gate.sh` or command references it. Only `.claude/settings.local.json` has a permission rule for running it by hand, and a v0.7.11 handoff note lists it as a manual re-verify step.

### 3. Origin

Planned in the Phase 1 foundation commit `f0515daa` (2026-02-12) as a "pre-publish sanitization check" with the acceptance rule "passes with ZERO violations". First present in git in `48b232b2` (v0.0.1-alpha, 2026-02-16). The v0.0.6-alpha commit `14800218` only renamed the project in its header comment.

### 4. Rule-by-rule status (hits counted over shipped files only)

| Rule | Covered elsewhere | Hits in shipped files | Verdict |
|---|---|---|---|
| Private project names | No | 1 (`CHANGELOG.md` line 76) | Valid, keep |
| Maintainer home path | No | 0 | Valid, keep |
| Old project path | No | 0 | Stale, merge into project names |
| `v9.3` / `v9.4` labels | No | 0 | Stale, drop |
| `#1` to `#999` issue numbers | No | many harmless examples (the exact count depends on scope) | Stale, drop |
| Email addresses | Partly (`kg_check_sensitive` scans knowledge-graph markdown only) | 13 (author email, test fixtures) | Weak, drop |

### 5. `kg_check_sensitive` is the wrong home

It walks only `.md` files of one resolved knowledge graph (`walkDir(dir, ".md")`, no excludes), skips any file with "template" in its path, and its defaults would flood shipped files. Building the private project names into it as defaults would ship them to every user. Reviewed by Opus and by the author; both recommend keeping a small script.

### 6. Tracked notes also match the checks

Tracked files under `knowledge/` contain the old project names (10 files, mostly decision records plus a few enhancement and issue notes) and 96 lines with the maintainer's home path (spread across the decision records and specs). Outside `knowledge/` and the script itself, the only hit is `CHANGELOG.md` line 76. So the scan scope decides whether the rewritten script passes (see solution-approach, Open decisions).

## Impact

- A release check that always fails trains the maintainer to ignore it, so a real leak of a private name or a personal path would go unnoticed.
- The public docs describe a call path that does not exist.

## Relationships

- The sweep in ENH 062 listed this script under "Not checked". That is an incidental mention, not a dependency, so no link is declared.

## Progress Update: 2026-10-18

**KG Insights:** none captured (lesson capture declined for now).

**Decisions:** scan only what ships (skip `knowledge/`); project names stay in the public script; CHANGELOG entry under `### Fixed` in `[Unreleased]`.

**Review:** Opus reviewed the plan and paperwork twice; all findings verified and applied (see implementation-log).

**Blocking Issues:** none.

**Verification Requirements:** the 15 cases in `test-cases.md`; docs build.

## Progress Update: 2026-10-18 (implemented)

**Done:** `scripts/validate-plugin.sh` rewritten to two checks over tracked files outside `knowledge/`; `docs/reference/hooks.md` line 76 corrected; `CHANGELOG.md` old line reworded and a `### Fixed` entry added under `[Unreleased]`.

**Verified:** all 15 cases in `test-cases.md` pass (planting cases in a throwaway repo, the rest in the worktree); `npm run build` succeeds; the script exits 0 on the branch. An Opus audit under the Review Audit Protocol found no blockers; its findings were checked independently and applied.

**Remaining:** paperwork audit and docs-impact scan for this branch, commit, then (each on the user's yes) push and the #265 body refresh and sync comment.
