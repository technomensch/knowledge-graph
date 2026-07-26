# Handoff: ADR-067 Brainstorm In Progress (2026-07-21)

**Type:** Design/research session — no code changes.
**Status of underlying decision:** Still **Proposed / PENDING**. This handoff documents a brainstorm-in-progress, not a merged or finalized decision.

## What changed this session (verified via git)

```
git status --short
 M knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md
```

Working tree is clean except for this single file. No commits were created this session (`git log -3` still shows `b64394b2` as HEAD, unchanged). No commits/pushes have been made — **this is pending user approval.**

`git diff --stat`:
```
knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md | 74 +++++++++++++++++++++-
1 file changed, 71 insertions(+), 3 deletions(-)
```

Two new sections were appended to the ADR body, plus three "Related" bullets updated/added at the end:
1. **"Brainstorm Session Findings (2026-07-21) — spec-in-progress, decision still PENDING"**
2. A nested **"Fable Review (2026-07-21)"** subsection within it (independent second-opinion review from `claude-fable-5`)

The ADR's YAML front matter `status: Proposed` (line 4) and inline `**Status:** Proposed` marker (line 26) were **not** changed — confirmed by direct grep. The design direction below is captured for continuity, not adopted.

## What ADR-067 is about

Whether to replace the mutable `.active` KG-switch pointer (the current mechanism for choosing which knowledge graph reads/writes target) with **context-derived (cwd-based) resolution** computed fresh on every call. The motivating problem is real, observed cross-session bleed/drift: two concurrent sessions can silently read/write the wrong KG because `.active` is shared mutable state.

Notably, **a live split-brain was found active in this repo's own config during the session**: `~/.kmgraph/kg-config.json` reads `active: docs-readme-poc` while cwd is `knowledge-graph`; a second, stale legacy copy at `~/.claude/kg-config.json` reads `active: knowledge-graph`, frozen since 2026-07-17 (`lastAppliedVersion: 0.3.10`). This is a live instance of the exact drift class the ADR already documents, not a reconstructed/hypothetical case.

## Where the brainstorm landed (working direction, NOT final)

- No mutable `.active` switch as the default resolution mechanism. Project-local KG resolution should be stateless, derived from cwd/project-root per call (candidate: promote issue-10's `getProjectRoot()` from mismatch-guard to actual router).
- Personal KG (singular, cross-project) reachable via an explicit `scope` param, not a global toggle.
- Real taxonomy is three shapes, not two: project-local (many, cwd-resolved), personal (exactly one), and global-topic KGs (many, user-named — per ADR-066, which also kills `cowork` as a KG type).
- Fable (independent second opinion) recommended **registry lookup + mandatory disambiguation** for selecting among named global-topic KGs — rejecting keyword-match-only, MRU-heuristic, and pure-always-ask alternatives — with the caveat that its own recommendation still depends on the assistant actually performing the lookup step, and degrades to a harder-to-detect silent-misdirection failure if skipped.
- Two known live bugs (issue-15: missing `kgType` in `rebuildIndex()` misindexes personal-KG writes under the project-local FTS5 bucket; issue-27: `applyStrayKnowledgeDir()` silent overwrite) were flagged as failure classes any new resolution model must not inherit.

## Explicitly unresolved — "needs further discussion" list

Per the ADR's own "Open items carried forward" section, none of the following are settled:

1. **Create-vs-select gate for new topic KGs** — how to distinguish "select an existing topic KG" from "create a new one," and what confirms creation.
2. **Namespace collision policy** — no rule yet for collisions between topic-KG names, project directory names, and the reserved "personal" scope keyword.
3. **Delete/rename lifecycle for topic KGs** — no proposal for what happens to a live cross-session reference to a topic KG that gets deleted or renamed (same shape as the concurrency problem this ADR solves for project-local KGs, but unaddressed here).
4. **Exact registry matching/confidence logic** — the registry-lookup direction is adopted, but the precise selection mechanism for multiple candidate global-topic KGs is not designed (Q2 territory).
5. **Reconciling the two live-divergent `kg-config.json` files** (`~/.kmgraph/kg-config.json` vs. legacy `~/.claude/kg-config.json`) under the new model — likely a migration-path (Q4) question, not yet addressed.

Do **not** treat the design direction in the ADR as final. It is explicitly a working direction pending resolution of the above.

## Next step for whoever picks this up

Continue via `/superpowers:brainstorming` on the five open items listed above, working directly from `knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md` (the "Open items carried forward" section at the end) rather than re-deriving this context from scratch.

## Approval gate

This handoff and the underlying ADR edit are **uncommitted**. Per session-documenter's approval-gated protocol, no `git add`/`git commit`/`git push` has been run and none will be run without explicit user confirmation.
