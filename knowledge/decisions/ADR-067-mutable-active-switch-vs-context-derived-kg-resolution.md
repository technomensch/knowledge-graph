---
title: "ADR-067: Mutable `.active` switch vs context-derived KG resolution — decision pending"
number: 067
status: Proposed
date: 2026-07-15
author: technomensch
email: mkitact@gmail.com
git:
  branch: v0.6.19
  commit: null
  pr: null
  issue: null
implements: null
related:
  adrs: [1, 19, 60, 66]
  lessons: []
  kg_entries: []
  issues: [10, 14]
tags: [architecture, kg-resolution, switch, context-mode, cross-kg-bleed, state-model, decision-pending]
category: architecture
---

# ADR-067: Mutable `.active` switch vs context-derived KG resolution — decision pending

**Date:** 2026-07-15
**Status:** Proposed (context + open decision only — **no decision has been made; explicitly NOT for the current session**)

---

## Context

Raised 2026-07-15 while reviewing the issue-14 config-path fix. This is a **future architectural question**, captured so it is not lost. It is **not** part of issue-14 and does not gate c1/c2/c3.

### The current model

KMGraph resolves "which knowledge graph am I operating on" through a **single mutable pointer**: `kg-config.json` holds an `.active` field, `/kmgraph:kmg-switch` rewrites it, and every tool/command reads `.active` to pick the target KG. This is **global mutable state** — one active KG at a time, shared across all sessions and all projects on the machine.

### Why this is being questioned (the bleed risk)

A single mutable `.active` pointer has structural failure modes where a correct path string still routes an operation to the wrong KG:

1. **Stale/divergent pointer** — the exact split-brain issue-14 is fixing: `.active` written to one config file, read from another. More generally, any staleness in `.active` sends a write meant for KG-A into KG-B.
2. **Concurrency** — two Claude Code sessions (or two projects) open at once share one `.active`. Switching in session 1 silently changes the target for session 2 → cross-KG contamination ("bleed").
3. **Context mismatch** — the active KG can disagree with the current working directory / project. (Prior art: issue-10 added a `getProjectRoot()` / `KG_MISMATCH` guard that *detects* active≠cwd, i.e. the project already treats this mismatch as a hazard worth guarding.)

### The alternative under consideration

Instead of a mutable toggle, resolve the KG from **context** — derive it from the project root / working directory (and/or an explicit per-invocation argument), the way the context-mode plugin centralizes context resolution. This would make "which KG" a function of *where you are*, not a stateful global flag, structurally eliminating failure modes 1-3.

### Interaction with in-flight work

- c1 (issue-14) fixes `kmg-switch`'s config path **now**; that fix is correct regardless of this decision (the switch still writes to the right file in the interim).
- If a future decision **replaces** the mutable-switch model, the `kmg-switch` command (and its c1 fix) would be **superseded**, and the resolution logic across every `kg_*` tool and command would change. This is a large blast radius — hence a dedicated ADR, not a patch.

## Prior Art (recall + chat-history sweep, 2026-07-15)

A recall + `knowledge/chat-history/2026-02/` sweep was run before framing this decision. Findings:

- **Separation itself was never a reasoned decision — it is an unexamined premise.** `ADR-001:16` ("designed to support multiple independent knowledge graphs, each potentially owned by different users or projects") and `ADR-001:28` assume separation; no ADR argues isolation/privacy/anti-bleed as the reason to keep graphs separate. Ironically ADR-001's stated *problem* was the opposite — **fragmentation** (too separate, no coordination), not bleed. Any isolation rationale this ADR needs must be **authored**, not quoted.
- **The `.active` + switch model was deliberate — but weighed only against config-file alternatives, not against context-derived resolution.** `ADR-001:85-95` (Alternatives Considered):
  - **Option A — per-project `.claude/kg-local.json` (self-contained, the closest proxy to cwd/context-derived):** *rejected* — "Can't switch between KGs; must edit per-project config to use global KG." I.e. it could not serve "different KGs for different tasks" or reach a global/cowork KG from inside any project directory.
  - **Option B — env var `KG_PATH`:** rejected (fragile, no discovery).
  - Positive rationale (`ADR-001:80-83`): single source of truth; **git-like active-pointer pattern**; extensible; backward-compatible.
- **Pure context/cwd-derived resolution was never proposed before this ADR (2026-07-15).** ADR-001 foreclosed it structurally without naming it.
- **`ADR-060` already characterized the switch as intentionally manual, contrasting context-mode.** `ADR-060:35` was "Prompted by a user question ('recall why we switch KGs manually and context-mode doesn't')"; `ADR-060:29,59` frame ADR-001's model as **"manual/git-like, not auto-detected like context-mode's project scoping"** — serving intentional, durable knowledge management. This is the strongest "it was intentional" citation (though ADR-060 interprets ADR-001's intent after the fact; ADR-001 never wrote "we rejected auto-detection").
- **The Option-A rejection reason is still live** — a cwd-bound model has no home for the personal/global/cowork cross-project KGs that are intentionally *not* tied to a directory. This is precisely open question #2 below, and it pushes the answer toward a **hybrid** (context-derived default + explicit override) rather than a clean replacement of the switch.
- **Bleed has a concrete track record that favors revisiting:** `ADR-019` (v0.2.0-beta) first named the wrong-graph-write hazard and added an agent-instruction write guard; the data-layer `KG_MISMATCH` guard (`kg_capture`, issue-10) was meant to harden it but shipped as a **false-positive bug** ("currently more friction than protection", `issue-10-description.md:31`); and issue-14 is the live split-brain. The mutable-pointer model has now produced **two distinct real bugs** where correct-looking state still routed to the wrong KG — direct evidence for the failure modes in the Context above.

## New Incident + a Working Mitigation, Observed Live (2026-07-21)

A third real drift incident, on the `v0.6.20-storage-migration-completion` branch: `.active` was confirmed correctly pointing at `knowledge-graph` earlier in the same session (checked directly before running `kg_upgrade` operations), then found — later in the same session, no `kmg-switch` call in between — pointing at `docs-readme-poc`, a completely unrelated project. Root cause not investigated (out of scope for the in-flight branch); the point is the drift happened silently, mid-session, exactly as failure mode 2/3 above predict, with no action taken by the user or the assistant to cause it.

**What explicitly did NOT go wrong, and why — this is the useful part.** Two background agents were writing real content to `knowledge-graph`'s own `knowledge/sessions/` and `handoff-packages/` during this exact drift window. Neither wrote to the wrong project. Both were given an **explicit absolute working directory** and **explicit relative file paths** in their task prompts, and used direct file Read/Write/Edit tools — never a `kg_*` MCP tool, which is the only thing that actually resolves against `.active`. The active-pointer's value was simply never consulted for these writes; the operation was anchored to an explicit path from the start, not resolved from ambient state.

**This is a concrete, observed data point for the open decision, not just a hazard restated:** explicit-path / context-anchored operations are *structurally immune* to `.active` drift, by construction — not because they're careful, but because they never ask the question `.active` answers. This is direct empirical support for the "context-derived resolution" side of question 1 below, and independently, a viable *interim* mitigation while the ADR stays undecided: prefer giving agents/tools an explicit target path over relying on implicit active-KG resolution, whenever the target project is already known. Worth weighing explicitly when this is picked up — not as the final answer (it doesn't address the cross-project personal/global KGs that have no cwd, per question 2), but as evidence of which failure modes an explicit-path convention already closes today, without waiting on this decision.

## Decision

**PENDING — not yet decided, and deliberately deferred beyond the current session.** Questions to resolve when this is picked up:

1. **Do we keep the mutable `.active` switch, or move to context-derived resolution** (project-root/cwd-based), or a hybrid (context-derived default + explicit override)?
2. If context-derived: **how is the KG chosen when cwd maps to no registered KG**, or to more than one? What replaces the "personal / global / cowork" cross-project KGs that are intentionally *not* tied to a cwd?
3. **Concurrency semantics** — is "active KG" per-machine, per-session, or per-project? (The bleed risk is fundamentally about this scope.)
4. **Migration path** — how do existing installs relying on `.active` + `kmg-switch` transition without breaking? What happens to the `kmg-switch` command and its issue-14/c1 fix?
5. **Relationship to issue-10's `KG_MISMATCH` guard** — does context-derived resolution subsume it, or coexist?

_No option selected. Consequences, migration design, and cascade impact across all `kg_*` tools, commands, and the switch surface are deferred until the decision above is made._

## Brainstorm Session Findings (2026-07-21) — spec-in-progress, decision still PENDING

A `/superpowers:brainstorming` session on this ADR produced the following. **This is design-in-progress captured for continuity, not a decision** — status remains Proposed/pending.

### User's stated bottom line (verbatim intent)

"Having one authoritative graph that is constantly switching is not going to work. Users work on multiple projects simultaneously and should not have to think about which graph is active. If a user is in one repo/folder in one terminal session, the graph should know to write/read from that one. If there is a parallel session working in a completely different repo, the user should read/write from that one without having to think about it. There should be no bleed between them. The only overlap might be both being able to read the user-level graph which goes across all local projects. Each session might even be in different LLMs — one in Claude, another in Codex, in a different repo."

This resolves Q1's direction: **no mutable `.active` switch** as the default resolution mechanism. Replace with **stateless, context-derived (cwd/project-root) resolution per call** — no shared file is read as "current truth," so concurrent sessions (even across different LLM tools) cannot bleed into each other by construction, because there is nothing shared to drift.

### Emerging Q1 model (not yet finalized)

- **Project-local KG**: auto-resolved from cwd/project-root at call time, no switch needed. Candidate mechanism: promote issue-10's existing `getProjectRoot()` from a mismatch *guard* to the actual *router*.
- **Personal KG** (singular, cross-project): always reachable regardless of cwd, addressed via an explicit param on the call (not a global switch) — e.g. `scope: "user"` — rather than a stateful toggle.
- **Agent-level judgment on when to search which scope** (e.g., search project by default, offer "want me to check your personal KG too?" as a follow-up rather than hard-coding a merged-search default) is explicitly **out of scope for this ADR** — flagged as a question for the fable/planning pass, not an architectural rule.

### Research findings that complicate/refine the model (agent sweep of chat-history + KG + live config, 2026-07-21)

1. **Historical switch usage was project↔project only, never project→personal.** All 18 real `kmg-switch` invocations found in `knowledge/chat-history/` (2025-12 through 2026-07) swap between project-local KGs (e.g. `knowledge-graph` ↔ `docs-readme-poc`). No instance of switching to a personal KG exists — because none has ever been created on this machine, despite ENH-001 "completing" the code path in 2026-03. This *strengthens* the case for killing the switch: the actual historical pain (project↔project switching) is exactly what cwd-derived resolution eliminates.
2. **A live split-brain instance exists right now, in this repo, at the moment of writing.** `~/.kmgraph/kg-config.json` currently reads `active: docs-readme-poc` while cwd is `knowledge-graph`. A second, stale legacy copy at `~/.claude/kg-config.json` reads `active: knowledge-graph`, frozen mid-migration since 2026-07-17 (`lastAppliedVersion: 0.3.10`). This is the exact drift class this ADR already documents (the 2026-07-21 incident, above), caught live rather than reconstructed after the fact.
3. **Only 2 KGs are registered today, both `project-local`** (`knowledge-graph`, `docs-readme-poc`). No `personal` or `global-topic` KG exists yet on this machine.
4. **The real taxonomy is three shapes, not two.** ADR-066 (resolved 2026-07-17, not yet implemented as of the v0.6.20 plan) kills `cowork` as a KG type but keeps **global-topic KGs** as a separate first-class concept: arbitrary count, user-named, stored at `~/.kmgraph/knowledge-graphs/<name>/`. So the model is **project-local (many, cwd-resolved)** + **personal (exactly one, singular)** + **global-topic (many, named)**. The emerging Q1 model above only accounts for project vs. a single "user-level" scope — it has **no answer yet for selecting among multiple named global-topic KGs**, which is likely Q2 territory (what happens when cwd maps to none/multiple candidates) rather than a Q1 concern, but is flagged here so it isn't lost.
5. **Two live bugs in the current write path that any new resolution model must not silently inherit:**
   - **issue-15**: `capture.ts`'s `rebuildIndex()` never passes `kgType`, so writes targeting a `personal` KG get indexed under the `project-local` FTS5 bucket.
   - **issue-27**: `applyStrayKnowledgeDir()` silently overwrote real KG content by skipping a destination-exists check — reinforces that any new resolution logic needs an explicit "never silently overwrite/misroute" invariant (ADR-063 pattern).

### Fable Review (2026-07-21) — independent second opinion, requested mid-brainstorm

Fable (`claude-fable-5`) was given the emerging model above plus the research findings and asked for (a) a recommendation on global-topic KG selection and (b) any gaps in the model not already surfaced. Response:

**Recommendation — registry lookup + mandatory disambiguation, not keyword-match or MRU.** Require an explicit `topic` param on every call, resolved via a registry/manifest lookup (list of topic-KG names + short descriptions) *before* the call: the tool exposes a lightweight list/lookup, the assistant performs one resolution pass (exact name match, or fuzzy match against name/description), and only passes the param once confident. If zero or multiple candidates match, the tool refuses and forces the assistant to ask the user rather than guess.

*Alternatives considered and rejected, per Fable:*
- **Keyword/topic matching as the sole mechanism** — risks exactly the failure class being eliminated: silent misdirection, just non-deterministic instead of stale-pointer.
- **Most-recently-used heuristic** — definitionally the same bug pattern as `.active` in a different hat: implicit shared state that drifts.
- **Pure "always ask the user"** — safe, but degrades UX for the common case where the assistant can resolve unambiguously (e.g., user said "log this under woodworking" and only one KG matches).
- The registry approach gets assistant-side confidence *and* keeps writes deterministic and explicit. Reads can be more permissive (fan-out across matches is low-risk); writes cannot.

*Stated failure mode of its own recommendation*: depends on the assistant actually performing the lookup step every time. Under time/context pressure an assistant can skip the list-and-match round trip and pass a remembered or hallucinated topic name directly. If that name doesn't exist, the result is a clean error (safe). If it's a near-miss of an existing name (typo, pluralization, stale name after a rename), the result is a misdirected write that looks superficially fine — the same class of silent-wrong-target bug, just moved from "shared mutable pointer" to "assistant's guess," and harder to detect because there's no drift signal to notice. Mitigation: the tool should always echo back the resolved KG name/description in its response, so misdirection is at least visible to whoever reads the result, even if not structurally prevented.

**New gaps identified (beyond what this ADR had already surfaced):**

1. Read/write need explicitly different resolution defaults (fan-out-merge for search, never for capture), not one shared algorithm with variable strictness.
2. The registry itself is new shared mutable state, same failure class as `.active`, just narrower scope — must stay append-mostly and never grow a "current"/"last used" field, or the bug reappears one layer down.
3. First mention of a brand-new topic name is a *creation* decision, not a *selection* one, and needs its own gate.
4. Namespace collisions are unhandled: nothing stops a topic-KG name from colliding with a project directory name or the reserved "personal" scope.
5. The known indexer bug (issue-15, missing `kgType`) is a symptom of implicit/positional scope-tagging generally, not a one-off — the fix needs to make type an explicit required tag at write time everywhere, or the same bug recurs for topic KGs.
6. No lifecycle story exists for delete/rename of a topic KG while another session holds a reference to it by name — structurally the same live-reference problem as the concurrent-session bleed being fixed for project-local KGs, but unaddressed for the registry case.

### Open items carried forward (not yet resolved)

**Settled direction (low discussion needed, ready to carry into planning):**
- Registry-lookup + mandatory-disambiguation as the resolution strategy for global-topic KGs (Fable's recommendation, adopted as working direction).
- Read vs. write must have explicitly different resolution defaults (fan-out for search, strict for capture) — gap #1 above.
- The registry must stay append-mostly, no "current"/"last used" field, ever — gap #2 above.
- Generalize the issue-15 fix: type/scope must be an explicit required tag at every write call, not inferred — gap #5 above.
- Mitigation for assistant-skips-the-lookup risk: tool always echoes back the resolved KG name/description so misdirection is visible even if not prevented.

**Needs further discussion before this can be finalized:**
- **Create-vs-select gate for new topic names** (gap #3) — how does the assistant/user distinguish "select existing KG" from "spin up a new one," and what confirms a creation?
- **Namespace collision policy** (gap #4) — reserved-word rules between topic-KG names, project directory names, and the "personal" scope keyword; not yet designed.
- **Lifecycle of delete/rename of a topic KG with live cross-session references** (gap #6) — no proposal yet, same shape as the concurrency problem solved for project-local KGs but unsolved here.
- Selection mechanism for multiple named global-topic KGs, beyond the registry-lookup direction above — the exact matching/confidence logic (Q2 territory generally).
- Whether/how the two live divergent config files (`~/.kmgraph/kg-config.json` vs. legacy `~/.claude/kg-config.json`) get reconciled or retired under the new model (likely Q4, migration path).
- Agent-behavior heuristics for defaulting search scope and offering cross-scope follow-up checks — deferred to fable/planning, not architectural.

## Related

- ADR-001 (centralized multi-KG configuration — the `.active`/switch model this would revisit)
- ADR-066 (content-storage location — sibling parked storage/resolution decision; also the source of the project-local/personal/global-topic taxonomy used above)
- issue-10 (`getProjectRoot()` / `KG_MISMATCH` guard — prior art on active-vs-cwd mismatch, candidate to promote to primary router)
- issue-14 (`knowledge/issues/issue-14/investigation-log.md` — the session that surfaced this)
- issue-15 (personal-KG writes misindexed under project-local FTS5 bucket — a bug the new model must not inherit)
- issue-27 (silent overwrite via `applyStrayKnowledgeDir()` — reinforces a never-silently-misroute invariant)
- ROADMAP.md → "Needs its own dedicated brainstorm/ADR before scheduling"
