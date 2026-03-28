# ADR-017: Four-Layer Architecture with Thin Command Dispatchers

**Date:** 2026-03-27
**Status:** Accepted
**Implements:** v0.2.0-beta — Layered Architecture Restructuring
**Related:** [ADR-002](ADR-002-commands-vs-skills-architecture.md), [ADR-018](ADR-018-agents-template-platform-portability.md), [ADR-019](ADR-019-write-guard-agent-instructions-vs-data-layer.md), [ADR-020](ADR-020-lifecycle-hooks-suite-automated-capture.md)

---

## Context

KMGraph's commands (`/kmgraph:capture-lesson`, `/kmgraph:recall`, `/kmgraph:session-summary`) bundled all interaction logic, UX prompting, context gathering, execution logic, and persistence into single markdown files ranging from 400 to 950 lines. Skills auto-suggested these commands but could not complete any work independently.

This design had three compounding problems:

1. **Hard to port:** All logic was Claude Code-specific syntax. Non-Claude Code platforms (Gemini CLI, Cursor, Windsurf) could not adopt any behaviors.
2. **Hard to maintain:** A change to lesson format required editing a 700-line command file. Concerns were entangled.
3. **Hard to automate:** Hooks could only fire a suggestion to run a command. They could not invoke execution logic directly.

**Problem:**
- Thick commands couple UX prompting, execution logic, and persistence in one file
- Skills cannot complete work without a human typing a command name
- Logic is Claude Code-specific — not portable to other LLMs or platforms
- Hooks can suggest but cannot execute

**Scope:**
- In scope: `capture-lesson`, `recall`, `session-summary` commands; associated skills; new agent layer; hook dispatch paths
- Out of scope: `sync-all`, `update-graph`, `create-adr`, `link-issue`, `help`, `init` (command refactor deferred to v0.2.1 where noted)
- Out of scope: MCP server tools (no changes in v0.2.0-beta; `kg_capture` deferred to v0.2.1)

---

## Decision

Introduce a four-layer architecture that separates concerns across distinct file types:

```
┌─────────────────────────────────────────────────────┐
│  CONTEXT LAYER — Skills + AGENTS.md                 │
│  Detect the moment, pre-structure data, dispatch    │
│  Platform: Claude Code skills + plain markdown      │
├─────────────────────────────────────────────────────┤
│  LOGIC LAYER — Agents                               │
│  Own all execution logic (one agent per concern)    │
│  Platform: plain markdown, any LLM can follow       │
├─────────────────────────────────────────────────────┤
│  LIFECYCLE LAYER — Hooks                            │
│  Automate at the right moment                       │
│  (Stop, PostToolUse, PreToolUse, Notification)      │
├─────────────────────────────────────────────────────┤
│  DATA LAYER — MCP (kg_* tools)                      │
│  Persistence, search, retrieval                     │
│  Platform: any MCP client                           │
└─────────────────────────────────────────────────────┘
         ↑
Commands = thin dispatchers between Context and Logic
```

Commands become thin guided-UX dispatchers (~100–150 lines). All execution logic moves into agents.

### Core Components

1. **Context layer (Skills):** Detect the moment (bug solved, session ending, decision made), pre-structure relevant context, dispatch to the appropriate agent. Refactored from keyword-matching to moment-detection with user-friendly language — no technical jargon, no command names exposed.
2. **Logic layer (Agents):** Three new single-purpose agents own all execution logic: `lesson-capture-agent`, `recall-agent`, `session-summary-agent`. Each handles one concern. Agent instructions are plain markdown — no Claude Code-specific syntax.
3. **Thin commands:** `/kmgraph:capture-lesson`, `/kmgraph:recall`, `/kmgraph:session-summary` shrink to guided UX only. They collect optional user input and dispatch to the corresponding agent. Commands remain as the interactive entry point for users who prefer explicit invocation.
4. **Data layer (MCP):** Unchanged in v0.2.0-beta. Agents write to the knowledge graph via filesystem tools (Read/Write/Edit), same as the former thick commands. `kg_search` and `kg_fts5_rebuild` called via MCP as before.

### Implementation Approach

Two entry paths converge on one execution path:

| Entry | Mechanism |
|---|---|
| Fast path | Skill or hook detects moment → agent runs directly |
| Interactive path | User runs `/kmgraph:command` → guided Q&A → agent |

Both paths produce identical output — the agent is the single source of execution truth.

---

## Rationale

### Why This Approach

1. **Single responsibility per layer:** Skills detect, agents execute, hooks automate, MCP persists. A change to lesson format now requires editing only the agent file, not a 700-line command.
2. **Two entry points, one execution path:** Whether a user types a command or a hook fires, the same agent runs. This eliminates logic drift between the hook path and the command path.
3. **Hooks can now do real work:** With agents as the execution layer, hooks can dispatch to agents directly rather than just prompting users to run commands manually.
4. **Progressive adoption:** Users who only use `/kmgraph:` commands see no breaking changes. The new fast path is additive. Existing command output contracts are preserved — `sync-all` and `update-graph` remain compatible without modification.

### Alternatives Considered

**Option A: Refactor thick commands only (no agent layer)**
- Pros: Smaller change; no new file types
- Cons: Commands remain Claude Code-specific; hooks still cannot execute logic; portability problem unsolved; two entry points would diverge over time
- Rejected because: Does not solve the portability or automation problems

**Option B: Collapse everything into MCP tools**
- Pros: Maximum portability — any MCP client can call the tools
- Cons: MCP tools are TypeScript/Node.js — requires compilation, deployment, and network connectivity; UX prompting logic is hard to express in tool schemas; large refactor scope
- Rejected because: Complexity and scope far exceed v0.2.0-beta goals; deferred to v0.2.1+ for the `kg_capture` write tool only

**Option C: Skills directly execute (no agents)**
- Pros: Fewer file types
- Cons: Skills are auto-invoked context providers — giving them execution authority blurs the line between detection and execution; skills cannot be unit-tested or invoked by hooks independently
- Rejected because: Agents provide a cleaner boundary and are independently invocable

### Trade-offs

**Benefits:**
- ✅ Commands shrink from 400–950 lines to ~80–150 lines — dramatically easier to maintain
- ✅ Each agent owns one concern — changes are localized
- ✅ Two entry paths share one execution path — no logic drift
- ✅ Agent instructions are plain markdown — portable (see ADR-018)
- ✅ Hooks can now dispatch to agents directly

**Costs:**
- ❌ More files to understand — a new developer must learn that agents exist alongside commands and skills
- ❌ Three new agent files added to `agents/` — small increase in directory complexity
- ❌ Dispatch indirection: a bug in lesson capture now requires checking both the skill/hook (detection) and the agent (execution)

**Mitigation:**
- `CLAUDE.md` and `docs/CONCEPTS.md` updated to explain the four-layer model
- Layer boundaries are clearly named: context / logic / lifecycle / data — not arbitrary names

---

## Consequences

### Positive

1. **Maintainability:** Lesson format changes, recall result presentation changes, and session summary structure changes are each confined to a single ~150–250 line agent file.
2. **Testability:** Agents can be invoked in isolation — `tests/test-skills-agents.sh` covers each agent independently.
3. **Automation:** PostToolUse, Stop, and PreToolUse hooks (ADR-020) can dispatch to agents directly, enabling automated capture without manual command invocation.
4. **Portability foundation:** Agent files written in plain markdown are the foundation for ADR-018 (AGENTS-template portability).

### Negative

1. **Navigation complexity:** A developer debugging a lesson-capture issue must trace: skill → command → agent → MCP. The layered structure adds indirection.
2. **Dispatch coupling:** If an agent file is renamed or removed, skills and hooks that dispatch to it will silently fail. No static type checking enforces dispatch targets in markdown.

### Neutral

1. **Output contracts preserved:** `lesson-capture-agent` produces lessons at the same path and frontmatter format as the former thick command. `sync-all` and `update-graph` are unaffected.
2. **Existing agents unchanged:** `knowledge-extractor`, `knowledge-reviewer`, `session-documenter` already followed the single-purpose pattern and required no changes.

---

## Implementation

**Timeline:** Implemented 2026-03-27 in v0.2.0-beta (Phases 2–4)

**Affected Components:**
- `agents/lesson-capture-agent.md` — new; owns lesson capture execution
- `agents/recall-agent.md` — new; owns recall/search execution
- `agents/session-summary-agent.md` — new; owns session summary execution
- `agents/platform-sync-agent.md` — new; owns platform config file sync
- `commands/capture-lesson.md` — refactored to ~104 lines (guided UX + dispatch)
- `commands/recall.md` — refactored to ~78 lines (guided UX + dispatch)
- `commands/session-summary.md` — refactored to ~68 lines (guided UX + dispatch)
- `skills/lesson-capture/SKILL.md` — refactored to moment-detection + dispatch
- `skills/kg-recall/SKILL.md` — refactored to dispatch to recall-agent
- `skills/session-wrap/SKILL.md` — refactored with temp flag awareness

**Migration Path:**
Transparent for users. Commands retain their names and produce identical output. No user action required on upgrade. The fast path (skill/hook → agent) is additive.

---

## Validation

**Success Criteria:**
- ✅ `capture-lesson`, `recall`, `session-summary` commands each < 160 lines
- ✅ Three new agents each handle one concern cleanly (no cross-concern logic)
- ✅ `sync-all` and `update-graph` continue working unchanged (output contract preserved)
- ✅ Test suite covers each agent dispatch path

**Review Date:** 2026-09-27 — reassess if agent dispatch coupling causes maintenance issues, or if MCP becomes the preferred execution layer

---

## Related Decisions

- **[ADR-002](ADR-002-commands-vs-skills-architecture.md):** Original commands-vs-skills decision; this ADR adds the agent layer between them
- **[ADR-018](ADR-018-agents-template-platform-portability.md):** Platform-agnostic AGENTS-template — enabled by the agent layer being plain markdown
- **[ADR-019](ADR-019-write-guard-agent-instructions-vs-data-layer.md):** Write guard placement — consequence of agents owning execution
- **[ADR-020](ADR-020-lifecycle-hooks-suite-automated-capture.md):** Lifecycle hooks — dispatches to the agent layer created here

---

## Related Documentation

**Implementation:**
- `docs/plans/v0.2.0-beta-master.md` — Phases 2, 3, 4
- `agents/lesson-capture-agent.md`
- `agents/recall-agent.md`
- `agents/session-summary-agent.md`

---

## Future Considerations

1. **`kg_capture` MCP tool (v0.2.1):** Moving write persistence into an MCP tool would further unify the execution path and enable platforms without filesystem access. This would effectively make the data layer the canonical write point, reducing agent responsibilities.
2. **Dispatch contract enforcement:** Consider a YAML frontmatter convention in agent files that declares the agent's name and accepted inputs — enabling skills and hooks to validate dispatch targets at install time.

---

**Decision Made:** 2026-03-27
**Last Updated:** 2026-03-27
**Status:** Accepted
