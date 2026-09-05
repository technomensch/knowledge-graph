---
id: ENH-041
type: Bug
status: proposed
---

# ENH-041: Broken nav breadcrumb (`GETTING-STARTED.md` / `WORKFLOWS.md`) baked into every index README scaffold

**Status:** 🟡 Proposed
**Discovered:** 2026-07-05
**Governed by:** none (stale-link/scaffold-parity fix, not a new command/skill/docstring — ADR-058's naming/scope check does not apply)
**Related:** ADR-027 (Docusaurus Docs Restructure — Diátaxis IA; the causal decision that deleted `GETTING-STARTED.md`), `core/default-templates/decisions/README.md`, `core/default-templates/lessons-learned/README.md`, `core/default-templates/enhancements/README.md`, `core/default-templates/issues/README.md`, `knowledge/decisions/README.md`, `knowledge/enhancements/README.md`, `knowledge/issues/README.md`, `knowledge/sessions/2026-04/2026-04-07-docs-restructure-planning.md`, branch `v0.6.16-update-claude-extract-chat-for-sub-agents`, [ENH-042](../ENH-042/ENH-042-specification.md) (same-session sibling finding, same ADR-027-drift root cause for one of its contributing bugs; backlinked 2026-08-19)

---

## Problem

While executing the v0.6.16 plan's Task 9 (cross-referencing `knowledge/decisions/README.md`, `knowledge/enhancements/README.md`, and `knowledge/issues/README.md` into one connected navigation layer, per ENH-037), a broken navigation breadcrumb was found sitting at line 3 of **every** index README in this repo. The exact line (issues variant shown; the others differ only in the final crumb label and, for `decisions/`, the relative depth of the `Home` link):

```
**Navigation**: [Home](../../README.md) > [Getting Started](../../docs/GETTING-STARTED.md) > [Manual Workflows](../../docs/WORKFLOWS.md) > Issues
```

Two of the breadcrumb's three links do not resolve. Verified by direct file inspection this session, not assumed:

**1. `docs/GETTING-STARTED.md` does not exist anywhere in the repo — and this is intentional, not an oversight.**
`find . -iname 'getting-started*'` returns only `./site/GETTING-STARTED` (a Docusaurus build-output directory, not a source doc). There is no `docs/GETTING-STARTED.md`. This file was **deliberately deleted** by ADR-027 (Docusaurus Docs Restructure — Diátaxis IA). ADR-027's own text names it as the canonical example of the failure mode the restructure was designed to fix — a "578-line" file that was "tutorial, how-to, reference, and explanation all in one" — and its Consequences → Neutral section explicitly lists `GETTING-STARTED.md` among the files whose content is "either rehomed or migrated before deletion" ("No content lost"). The deletion is further corroborated by `knowledge/sessions/2026-04/2026-04-07-docs-restructure-planning.md`, which lists `docs/GETTING-STARTED.md (split + redirect; content rehomed)` in its restructure inventory. So the breadcrumb points at a file that a governing ADR intentionally removed — the link target is gone by design, but the breadcrumb was never updated to follow.

**2. `docs/WORKFLOWS.md` does not resolve from any of the README locations — the file exists only at `core/docs/WORKFLOWS.md`.**
`find . -name 'WORKFLOWS.md'` returns exactly one hit: `./core/docs/WORKFLOWS.md`. There is no `docs/WORKFLOWS.md`. From `knowledge/issues/README.md`, the breadcrumb's `../../docs/WORKFLOWS.md` resolves to `knowledge/docs/WORKFLOWS.md` (nonexistent); from `knowledge/decisions/README.md` the same relative fragment resolves elsewhere still (the `Home` crumb there uses `../../../README.md`, a different depth, so the `../../docs/...` fragment is internally inconsistent with its own `Home` link within the same line). No ADR or ENH documents a move of `WORKFLOWS.md` to the path the breadcrumb assumes. Honestly, the cause here is **unconfirmed** — it is plausibly a side effect of the same ADR-027 restructure (which relocated much of `docs/`) or an unfinished path migration, but there is no citation backing either theory, so this ENH does not assert one. What is confirmed is only that the target does not resolve. (A second, non-breadcrumb instance of the same bad `../../docs/WORKFLOWS.md` path also exists at `core/default-templates/lessons-learned/README.md` line 131, in an inline "Manual Workflow" link — same broken target, same fix domain.)

**3. This is a systemic, copy-pasted scaffold regression — not a one-off in this repo.**
A recall-agent dispatched this session confirmed via ctx/kg search across memory systems that this **exact breadcrumb line is byte-identical across at least 7 separate knowledge-graph project repos** (this repo, plus `kmgraph-mintlify`, `tidal-docs`, `claude-code-plugin-test`, `career-prism`, `tc-style-guide`, and one further repo), appearing in both `lessons-learned/README.md` and `decisions/README.md` in each. That fingerprint means the broken line originates in the PROTECTED distro scaffold under `core/default-templates/` that every fresh install copies from — it **predates** ADR-027's restructure and was never updated afterward, in any of the 7 repos. No prior ADR or ENH tracked it. This is therefore a genuine, unfixed regression introduced by ADR-027 (which removed the link target without updating the scaffold that references it), not a known or accepted stale state.

**4. The stale pattern was actively propagated forward earlier this same session.**
Confirmed in *this* repo by direct grep of the working tree (all instances still present at time of writing):
- `knowledge/decisions/README.md` line 3 — pre-existing broken breadcrumb, predates this session.
- `core/default-templates/lessons-learned/README.md` line 3 — pre-existing broken breadcrumb (plus the line-131 inline instance noted above).
- `core/default-templates/enhancements/README.md` and `core/default-templates/issues/README.md` — created **this session** (commit `f2e6d31e`, "docs(templates): add ENH and issue README index templates (ENH-037)") carrying the broken breadcrumb fresh.
- `knowledge/enhancements/README.md` and `knowledge/issues/README.md` — created **this session** (commit `2c7f991a`, "docs(knowledge): add populated README indexes for enhancements/ and issues/ (ENH-037)") carrying the broken breadcrumb fresh.

The propagation happened because the v0.6.16 plan's own literal template text (authored before this finding) reproduced the broken breadcrumb, and the plan was followed literally — so ENH-037's four new READMEs each inherited the same two dead links. The finding surfaced only when Task 9 asked the executor to actually walk the breadcrumb chain to cross-link the three indexes.

---

## Proposed Behavior

Fix the nav breadcrumb to point at real, resolving targets — and fix it in the scaffold source so fresh installs stop inheriting the regression.

1. **Determine the correct post-ADR-027 entry points before editing — do not guess.** Read ADR-027 in full (done: it deleted `GETTING-STARTED.md` and rehomed its content) and inspect what `docs/` actually contains now. Direct inspection this session shows `docs/` no longer has any `GETTING-STARTED.md`; the post-restructure entry points that *do* resolve are `docs/index.mdx` (landing/home) and `docs/quickstart.mdx` (the "getting started" analog under the Diátaxis IA). The "Workflows" content resolves at `core/docs/WORKFLOWS.md`. Implementation should confirm the final chosen targets against the live tree and against each README's own relative depth (the `decisions/` scaffold sits one directory deeper than `enhancements/`/`issues/`, so its `../` prefix count differs) rather than reusing a single hardcoded relative fragment across all of them.

2. **Fix the breadcrumb template in `core/default-templates/`** for every scaffold README that carries this header — `decisions/README.md`, `lessons-learned/README.md`, `enhancements/README.md`, `issues/README.md`, and any other scaffold sharing the same line — so a fresh install no longer ships two dead links. (These are PROTECTED `core/` files — editing requires explicit user permission per `CLAUDE.md`.) Also fix the non-breadcrumb `../../docs/WORKFLOWS.md` link at `lessons-learned/README.md` line 131 in the same pass.

3. **Fix this repo's own live copies** — `knowledge/decisions/README.md`, `knowledge/enhancements/README.md`, `knowledge/issues/README.md` — to match the corrected template.

4. **Note the wider blast radius without acting on it.** The identical broken line lives in 6 other external knowledge-graph repos. Those are separate repos/installs; propagating the fix to them is **out of scope** for this repo's ENH (see below). It is recorded here only so the systemic scope is not lost — the correct long-term remedy is that those installs pick up the corrected `core/default-templates/` on their next `kmg` upgrade, not a manual per-repo edit tracked by this ENH.

---

## Explicitly Out of Scope

- **Fixing the 6 other external knowledge-graph repos** (`kmgraph-mintlify`, `tidal-docs`, `claude-code-plugin-test`, `career-prism`, `tc-style-guide`, and the seventh). They are separate codebases/installs; this ENH governs only this repo and its distro scaffold.
- **Redesigning the breadcrumb / navigation pattern itself.** Only the broken link *targets* are fixed. The `Home > … > Section` breadcrumb UX pattern is left unchanged — this is a target-repair, not a nav-UX redesign.
- **Backfilling `GETTING-STARTED.md`.** ADR-027 deleted it deliberately and rehomed its content; recreating it would reverse a governing decision. The fix repoints the crumb at the rehomed entry point, it does not resurrect the file.

---

## Affected Files

| File | Role |
|---|---|
| `core/default-templates/decisions/README.md` | Modify (line 3 breadcrumb) — PROTECTED `core/`, needs explicit permission |
| `core/default-templates/lessons-learned/README.md` | Modify (line 3 breadcrumb + line 131 inline `../../docs/WORKFLOWS.md` link) — PROTECTED `core/`, needs explicit permission |
| `core/default-templates/enhancements/README.md` | Modify (line 3 breadcrumb) — PROTECTED `core/`; created this session with the stale line (commit `f2e6d31e`) |
| `core/default-templates/issues/README.md` | Modify (line 3 breadcrumb) — PROTECTED `core/`; created this session with the stale line (commit `f2e6d31e`) |
| `knowledge/decisions/README.md` | Modify (line 3 breadcrumb) — live index; stale line predates this session |
| `knowledge/enhancements/README.md` | Modify (line 3 breadcrumb) — live index; created this session with the stale line (commit `2c7f991a`) |
| `knowledge/issues/README.md` | Modify (line 3 breadcrumb) — live index; created this session with the stale line (commit `2c7f991a`) |

**Fix-already-landed check (performed while writing this spec):** as of this writing **no** breadcrumb fix has been applied by any process. `grep` of the working tree confirms the broken `GETTING-STARTED.md` / `WORKFLOWS.md` breadcrumb is still present verbatim in all seven files. The uncommitted `M` status on `knowledge/decisions/README.md`, `knowledge/enhancements/README.md`, and `knowledge/issues/README.md` is the ENH-037 index cross-referencing edit (Task 9), **not** a breadcrumb fix — the diff touches the ADR/ENH/issue list rows, and the line-3 breadcrumb remains broken in each. All rows above are therefore still-open.

---

## Acceptance Criteria

- [ ] The correct post-ADR-027 "Getting Started" and "Workflows" targets are determined from the live tree (not guessed) and recorded — e.g. `docs/quickstart.mdx` / `docs/index.mdx` for the getting-started crumb and `core/docs/WORKFLOWS.md` for the workflows crumb — with each README's relative-path depth accounted for individually.
- [ ] `core/default-templates/decisions/README.md`, `lessons-learned/README.md`, `enhancements/README.md`, and `issues/README.md` breadcrumbs point only at targets that resolve; no reference to the deleted `docs/GETTING-STARTED.md` or the nonexistent `docs/WORKFLOWS.md` remains.
- [ ] The inline `../../docs/WORKFLOWS.md` link at `core/default-templates/lessons-learned/README.md` line 131 is repaired in the same change.
- [ ] `knowledge/decisions/README.md`, `knowledge/enhancements/README.md`, and `knowledge/issues/README.md` breadcrumbs match the corrected template and resolve.
- [ ] A `grep -rn 'GETTING-STARTED\|docs/WORKFLOWS.md' knowledge/ core/default-templates/` returns no breadcrumb hits after the fix.
- [ ] A fresh install using `core/default-templates/` produces index READMEs whose breadcrumbs resolve, closing the copy-pasted-scaffold regression at its source.
- [ ] The 6 external repos' identical breakage is documented as known wider blast radius (to be remedied by their next scaffold upgrade), and explicitly *not* touched by this ENH.
