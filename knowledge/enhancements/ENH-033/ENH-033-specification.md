---
id: ENH-033
type: Bug
status: proposed
---

# ENH-033: Repo-context auto-detection for `kmg-update-doc` / `kmg-create-doc`

**Status:** 🟡 Proposed
**Discovered:** 2026-07-01
**Governed by:** [ADR-056](../../decisions/ADR-056-reject-plugin-split-for-contributor-only-doc-commands.md)
**Related:** ADR-027 (original deferred flag), `commands/kmg-update-doc.md`, `commands/kmg-create-doc.md`, `skills/kmg-doc-update-router/`, `docs/reference/commands.md`

---

## Problem

The `kmg-update-doc` and `kmg-create-doc` commands unconditionally apply kmgraph's own "v0.0.7" documentation standards (third-person voice, Section 508 accessibility, canonical structure) to **any** file they are pointed at — even when the target file belongs to an installer's own project (e.g. their own `README.md`, `CHANGELOG.md`, or `docs/` folder) that has nothing to do with kmgraph.

These commands were built to manage kmgraph's own documentation and hardcode kmgraph's own repo files as examples. Shipped to all installers, they impose kmgraph's house style on unrelated projects. This is a correctness bug, not a packaging problem — see ADR-056 for why the plugin-split alternative was rejected in favor of the behavioral fix specified here.

---

## Proposed Behavior

1. **Detect repo context at invocation.** Determine whether the current working repo **is kmgraph itself** — check for `.claude-plugin/plugin.json` with `"name": "kmgraph"` present in the **invoking repo's root** (not the plugin's own install path under `~/.claude/plugins/`).

2. **If match found** (this IS the kmgraph repo — a contributor working on kmgraph itself): apply full v0.0.7 standards enforcement (third-person voice, Section 508 accessibility, canonical structure) and the existing kmgraph-specific `/kmgraph:` cross-reference sweep, exactly as today.

3. **If no match** (an installer's own unrelated project): skip forced v0.0.7 enforcement — **Option A, generic mode** (see "Options" below for why this is now decided, not open).

3a. **Always show the resolved target before writing, regardless of repo match.** Print a confirmation line before any write:
   ```
   Updating: {resolved file path}
   Repo: {detected repo name} ({kmgraph repo | not kmgraph repo})
   ```
   This is a distinct safeguard from the style-enforcement question in step 3 — it addresses a different failure mode: a user who has lost track of which repo/directory they're actually operating in (e.g. multiple terminal tabs, ambiguous cwd) telling the command to update docs, expecting it to act on a different project than the one Claude is actually in. Showing the resolved path + detected repo at the moment of write is what catches this — independent of which style-mode applies once the target is confirmed correct.

4. **Documentation requirement.** The kmgraph user guide must document:
   - (a) what files/directories these commands read and write by default (`README`, `docs/`, `CHANGELOG`); and
   - (b) how an installer can customize/override the applied conventions instead of inheriting kmgraph's defaults.

5. **Labeling requirement** (replaces the rejected plugin-split): add a contributor-only visual marker to these commands' entries in `docs/reference/commands.md` / COMMANDS.md using the existing color-dot convention (e.g. 🔴🟡), and add a note surfaced via `kmg-help` clarifying that these commands primarily matter for kmgraph contributors.

---

## Options — DECIDED: Option A

### Option A: Generic no-style mode when not in kmgraph repo (chosen)
Outside the kmgraph repo, do a plain doc update/create with no imposed style rules.

**Why decided now (2026-07-03):** the concern that made Option B (interactive prompting) attractive — catching a confused/misdirected user before an unwanted write — is now handled by the mandatory path/repo confirmation line (step 3a above), which fires regardless of style-mode. Once that safeguard exists, Option B's extra interaction step adds friction without adding safety: a user running a quick doc edit outside the kmgraph repo almost certainly already has their own conventions (or none) and doesn't need a style wizard. If they want structure enforced, that's their own tooling's job, not kmgraph's.

### Option B: Interactive convention prompt when not in kmgraph repo (rejected)
Outside the kmgraph repo, ask the user which conventions to apply (voice, accessibility level, structure) before writing.

**Rejected because:** its main justification (catching a misdirected write) is now covered by step 3a's path/repo confirmation, which is cheaper and universal. Keeping B as well would mean forcing a style-convention wizard on every non-kmgraph invocation for no added safety.

---

## Affected Files

| File | Role |
|---|---|
| `commands/kmg-update-doc.md` | Add repo-context detection gate; branch v0.0.7 enforcement on kmgraph-repo match |
| `commands/kmg-create-doc.md` | Same repo-context detection gate for the create path |
| `skills/kmg-doc-update-router/` | Verify router does not re-impose kmgraph conventions on non-kmgraph targets (if present) |
| `docs/reference/commands.md` | Add contributor-only severity-dot label + document default read/write targets and override mechanism |

---

## Acceptance Criteria

- [ ] When invoked inside the kmgraph repo (`.claude-plugin/plugin.json` name == `kmgraph`), full v0.0.7 enforcement + `/kmgraph:` cross-reference sweep behave exactly as today.
- [ ] When invoked in any other repo, kmgraph's v0.0.7 standards are NOT forced; generic mode applies (Option A, decided).
- [ ] Before any write, the command prints the resolved target file path and detected repo name/match-status (step 3a) — regardless of which repo context applies.
- [ ] Detection reads the **invoking repo's root** manifest, not the plugin install path under `~/.claude/plugins/`.
- [ ] User guide documents default read/write targets (README, docs/, CHANGELOG) and how to override applied conventions.
- [ ] `kmg-update-doc` and `kmg-create-doc` carry a contributor-only severity-dot marker in `docs/reference/commands.md` / COMMANDS.md, and `kmg-help` surfaces a clarifying note.
- [ ] No regression for the contributor workflow on kmgraph's own docs.
