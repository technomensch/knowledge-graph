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

## Decision

**PENDING — not yet decided, and deliberately deferred beyond the current session.** Questions to resolve when this is picked up:

1. **Do we keep the mutable `.active` switch, or move to context-derived resolution** (project-root/cwd-based), or a hybrid (context-derived default + explicit override)?
2. If context-derived: **how is the KG chosen when cwd maps to no registered KG**, or to more than one? What replaces the "personal / global / cowork" cross-project KGs that are intentionally *not* tied to a cwd?
3. **Concurrency semantics** — is "active KG" per-machine, per-session, or per-project? (The bleed risk is fundamentally about this scope.)
4. **Migration path** — how do existing installs relying on `.active` + `kmg-switch` transition without breaking? What happens to the `kmg-switch` command and its issue-14/c1 fix?
5. **Relationship to issue-10's `KG_MISMATCH` guard** — does context-derived resolution subsume it, or coexist?

_No option selected. Consequences, migration design, and cascade impact across all `kg_*` tools, commands, and the switch surface are deferred until the decision above is made._

## Related

- ADR-001 (centralized multi-KG configuration — the `.active`/switch model this would revisit)
- ADR-066 (content-storage location — sibling parked storage/resolution decision)
- issue-10 (`getProjectRoot()` / `KG_MISMATCH` guard — prior art on active-vs-cwd mismatch)
- `knowledge/issues/issue-14/investigation-log.md` (the session that surfaced this)
- ROADMAP.md → "Needs its own dedicated brainstorm/ADR before scheduling"
