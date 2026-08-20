# ENH-042: Three disconnected release-doc-sync mechanisms leave README and actual version numbers chronically out of sync

**Status:** 🟡 Proposed
**Discovered:** 2026-07-06
**Governed by:** none (process/governance gap, not a new command/skill/docstring — ADR-058's naming/scope check does not apply)
**Related:** `commands/kmg-update-doc.md`, `knowledge/plans/v0.6.16-fix-extract-chat-subagents.md` (kmg-execute-plan's Step 6.4 prerequisite check), `~/.kmgraph/rules.md` (CLAUDE.md's "Sync package.json + plugin.json before pushing" rule), `README.md`, `ROADMAP.md`, `CHANGELOG.md`, `package.json`, `.claude-plugin/plugin.json`, [ENH-041](../ENH-041/ENH-041-specification.md) (same-session sibling finding, same ADR-027-drift root cause for one contributing bug), [ENH-034](../ENH-034/ENH-034-specification.md) (validated 2026-07-11: this ENH's proposed fix references `kmg-update-graph`, `kmg-execute-plan`, and `kmg-update-doc.md` by name — hold implementation until ENH-034's Option A/B rename decision lands, so the reconciliation work targets post-rename names rather than needing a second edit pass; deliberately kept as a separate ENH, not merged, since ENH-034 is naming/IA work and this ENH is sync-logic reconciliation + a new pre-push enforcement gate — different risk profiles, different commits), [ENH-052](../ENH-052/ENH-052-specification.md) (superset "internal consistency" concern — this ENH's release-doc version-sync gap is one of the specific mechanisms it names, not merged into it; backlinked 2026-07-26, paperwork-audit backlink-symmetry check), [issue-13](../../issues/issue-13/issue-13-description.md) (names this ENH as an "adjacent finding" — release-doc-sync mechanisms are similarly fragmented, same class of "documented rule, no enforcement" gap; backlinked 2026-07-26, paperwork-audit backlink-symmetry check), [issue-49](../../issues/issue-49/issue-49-description.md), [issue-50](../../issues/issue-50/issue-50-description.md), [issue-51](../../issues/issue-51/issue-51-description.md) (all three name this ENH, alongside issue-13/issue-26/issue-28, as part of ENH-052's "internal paperwork drifts silently, nothing catches it" pattern family; backlinked 2026-08-19), [issue-11](../../issues/issue-11/issue-11-description.md) (this ENH's release-doc-sync investigation is what led directly into discovering issue-11's missing-GitHub-issue pattern in the same 2026-07-11 session; backlinked 2026-08-19)

---

## Problem

Discovered live, during this session's v0.6.16 branch finalization: `package.json`, `.claude-plugin/plugin.json`, and `README.md`'s version badge were all still `0.6.15` immediately before this branch was pushed to origin, even though `CLAUDE.md`'s own **Key Workflows** section states plainly: **"Versions: Sync package.json + plugin.json before pushing (mcp-server independent)."** The push happened anyway, unsynced — confirmed directly via `grep version package.json .claude-plugin/plugin.json` returning `0.6.15` for both, moments after `git push` succeeded.

This is not a one-off slip. Direct inspection this session found **three separate, non-overlapping mechanisms** that each own a different partial slice of "keep release-facing docs in sync," and none of them covers the actual version-number bump:

1. **`kmg-execute-plan`'s Step 6.4 prerequisite check** (fired during this session's own plan execution) enforces "ROADMAP + CHANGELOG sync" — but only those two files. It does not touch README.md, and does not touch `package.json`/`.claude-plugin/plugin.json` at all.
2. **`commands/kmg-update-doc.md`'s "User-Facing Docs — Reference File List"** (`--user-facing` Tier system) lists `README.md` and `CHANGELOG.md` together under **Tier 1 — Every release** (confirmed via direct read, lines 200-207) — the correct pairing — but its own **Excluded** line (line 252, confirmed via direct read) explicitly states `ROADMAP.md` is "not user-facing" and excluded from this pass entirely. So README's Tier-1 owner deliberately excludes ROADMAP, while Step 6.4's owner covers ROADMAP but not README — the two systems' file sets don't overlap on README+ROADMAP at all, and neither one bumps a version number anywhere.
3. **`kmg-docs-impact-scan`** (this session's own trigger before push) is diff-driven and content-claim-focused: it greps the diff's changed identifiers against docs and always adds `README.md`/`INSTALL.md`/`CHANGELOG.md`/`COMMAND-GUIDE.md` as "obvious files" to check for stale *prose claims* (e.g. "Gemini is `.json`/`.pb`-only" — a real hit fixed this session in both `commands/kmg-extract-chat.md` and `docs/reference/command-guide.md`). It has no concept of "bump the version badge" — that's a different kind of staleness (a number, not a claim) that its grep-for-identifiers design doesn't look for at all.

**A fourth, compounding bug:** `commands/kmg-update-doc.md`'s own Tier-1 list (the one system that *does* correctly pair README+CHANGELOG) cited `docs/COMMAND-GUIDE.md` as a real path — that file does not exist; the real file lives at `docs/reference/command-guide.md` (moved during the ADR-027 Diátaxis restructure and never repointed here, the same root cause and bug class as [ENH-041](../ENH-041/ENH-041-specification.md)'s nav-breadcrumb finding, discovered independently in the same session). A user or LLM following this Tier-1 list literally would fail to find the file it names — one more reason "run the Tier-1 pass" doesn't reliably happen: the list itself was already broken. (Fixed in this same session's commit, not left for a follow-up ENH — see Affected Files.)

Separately: `README.md` itself carried **two mutually inconsistent version mentions before this session** — the top badge (`**Version:** 0.6.15`) and a footer line (`**Current Version:** v0.6.10 (2026-06-22)`, six versions stale) — confirmed via direct `grep`. This is independent evidence that README's version content drifts even *within itself*, not just relative to `package.json`.

---

## Proposed Behavior

This ENH documents the finding; it does not itself implement the fix (no plan/branch scoped yet — see Explicitly Out of Scope). A future implementation should consider:

1. **A single, authoritative version-bump checklist** that explicitly lists every file touched by a version change in one place: `package.json`, `.claude-plugin/plugin.json`, `README.md` (badge line **and** footer "Current Version" line **and** a new Feature Highlights entry), `CHANGELOG.md`, `ROADMAP.md`. `mcp-server/package.json` is explicitly independent per existing `CLAUDE.md` text and should stay out of this list, not be added by mistake.
2. **Reconcile `kmg-execute-plan`'s Step 6.4 and `kmg-update-doc`'s Tier-1 list** so they either share one definition of "release sync scope" or explicitly cross-reference each other's scope instead of silently disagreeing on whether README and ROADMAP belong in the same pass.
3. **A mechanical check** (hook or pre-push gate, mirroring the existing `pre-push-gate.sh` pattern already used for docs-impact-scan) that fails loudly if `package.json` and `.claude-plugin/plugin.json` versions differ from each other, or if README's badge doesn't match `package.json`, at push time — turning CLAUDE.md's existing "Sync package.json + plugin.json before pushing" prose rule into an enforced gate instead of an easily-skipped instruction.
4. Fix the remaining stale `COMMAND-GUIDE.md`/`GETTING-STARTED.md`-style bare-filename mentions elsewhere in `commands/kmg-update-doc.md` (lines 20, 35, 64, 483, 490, 562 per this session's grep) if a fuller cleanup pass is later scoped — this ENH only fixed the one operationally load-bearing Tier-1 list entry, not every illustrative mention in the file.

---

## Explicitly Out of Scope

- Implementing the pre-push version-sync gate itself (a script/hook) — this ENH documents the gap; building the enforcement mechanism is a separate, later decision requiring its own scoping (what should it check, how strict, does it block or just warn).
- Auditing every other doc file for the same kind of self-inconsistent version mention README had — only README was checked directly this session.
- Fixing every stale `COMMAND-GUIDE.md`/`GETTING-STARTED.md`-style reference across the whole repo — [ENH-041](../ENH-041/ENH-041-specification.md) already scopes the nav-breadcrumb instance of this same underlying ADR-027-drift class; a repo-wide stale-path audit is a separate, larger effort not attempted here.
- Deciding whether `ROADMAP.md` *should* be Tier-1 user-facing content (that's an editorial/scope call for `kmg-update-doc.md`'s own definition) — this ENH only documents that the two systems currently disagree, not which one is "right."

---

## Affected Files

| File | Role |
|---|---|
| `package.json` | Fixed this session — version bumped `0.6.15` → `0.6.16` |
| `.claude-plugin/plugin.json` | Fixed this session — version bumped `0.6.15` → `0.6.16` |
| `README.md` | Fixed this session — version badge bumped, footer "Current Version" line corrected (was 6 versions stale), new v0.6.16 Feature Highlights entry added |
| `docs/reference/command-guide.md` | Fixed this session — stale Gemini `.json`/`.pb`-only claim updated to include `.jsonl` (same fix already applied to `commands/kmg-extract-chat.md` in the v0.6.16 plan's Task 13) |
| `commands/kmg-update-doc.md` | Fixed this session — Tier-1 list's `docs/COMMAND-GUIDE.md` entry corrected to the real path `docs/reference/command-guide.md`; other stale bare-filename mentions in the same file left as a noted follow-up, not fixed here |
| `knowledge/plans/v0.6.16-fix-extract-chat-subagents.md` (Step 6.4 definition, indirectly via `kmg-execute-plan` skill) | Not modified — cited as one of the three disconnected mechanisms this ENH documents |

---

## Acceptance Criteria

- [x] Root cause identified with direct evidence (not assumption): three specific mechanisms and their exact non-overlapping scopes cited by file/line.
- [x] The immediate instance (this branch's unsynced versions) fixed: `package.json`, `.claude-plugin/plugin.json`, `README.md` all now read `0.6.16`.
- [x] The compounding stale-path bug in `kmg-update-doc.md`'s Tier-1 list fixed (`docs/COMMAND-GUIDE.md` → `docs/reference/command-guide.md`).
- [ ] A future implementation reconciles the three mechanisms or builds the enforcement gate described in Proposed Behavior — not attempted in this ENH, tracked here as the open follow-on work.
