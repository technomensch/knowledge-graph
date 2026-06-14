# ADR-019: Write Guard via Agent Instructions (v0.2.0) vs Data Layer (v0.2.1)

**Date:** 2026-03-27
**Status:** Accepted (amended v0.5.10.8 — see § Amendment)
**Implements:** v0.2.0-beta — Active KG / Project Directory Alignment
**Related:** [ADR-017](ADR-017-four-layer-architecture-thin-commands.md), [ADR-001](ADR-001-centralized-multi-kg-configuration.md)

---

## Context

KMGraph supports multiple knowledge graphs via `~/.claude/kg-config.json`. A user working on project A can have project B's knowledge graph active — either accidentally (they forgot to switch) or intentionally (cross-referencing). When `lesson-capture-agent` or `session-summary-agent` writes to the active KG, it may write to the wrong project's graph.

The v0.2.0-beta local-config branch (ADR-012 area) already ships a SessionStart alert that warns at session start if the active KG doesn't match the current working directory. But this only catches the mismatch once per session — it doesn't protect individual write operations during the session.

**Problem:**
- Agents write to the active KG, which may not match the current project directory
- A single session may switch directories (monorepo, multiple terminals) — the SessionStart alert only fires once
- Users with `autoSwitch: false` need a per-write safety check, not just a session-start warning
- The correct long-term solution is enforcement at the data layer (`kg_capture` MCP tool) — but this tool doesn't exist yet in v0.2.0-beta

**Scope:**
- In scope: write guard placement for `lesson-capture-agent` and `session-summary-agent` in v0.2.0-beta
- Out of scope: `kg_capture` MCP tool implementation (v0.2.1 scope); `sync-all` and `update-graph` commands (they don't use agents yet)

---

## Decision

For v0.2.0-beta, enforce the write guard via agent instructions. Before any filesystem write, `lesson-capture-agent` and `session-summary-agent` must:

1. Read `~/.claude/kg-config.json`
2. Identify the active KG and its `projectRoot`
3. Compare `projectRoot` against the current working directory
4. If they do not match, block the write and ask the user:

> "Hold on — the active knowledge graph is for a different project ([project name], at [projectRoot]). Do you want to switch to the current project's graph, or continue saving to [project name]?"

This guard is enforced via agent instructions — the LLM follows the specification. It is model-dependent.

In v0.2.1, this guard will be moved to the `kg_capture` MCP tool (TypeScript), making it model-independent. Agent instructions will be updated to call `kg_capture` for writes instead of writing directly.

### Core Components

1. **Agent instruction guard:** Both `lesson-capture-agent` and `session-summary-agent` include an explicit pre-write check section. The check is the first step before any write operation.
2. **User-facing block message:** The block message names the conflicting project and offers two explicit options (switch or continue). No silent override.
3. **v0.2.1 migration path:** When `kg_capture` MCP tool is added, the agent instructions will delegate write operations to the tool, which will enforce the guard at the TypeScript level.

### Implementation Approach

Agent instruction example (from `lesson-capture-agent.md`):

```
Before writing any file:
1. Read ~/.claude/kg-config.json — identify the activeKG entry and its projectRoot
2. Compare projectRoot against the current working directory
3. If they do not match, stop and ask the user:
   "Hold on — the active knowledge graph is for [project name] at [projectRoot].
    Do you want to switch the active graph to the current project, or save to [project name] anyway?"
4. Do not write until the user explicitly responds
```

---

## Rationale

### Why This Approach

1. **Incremental safety:** The write guard provides meaningful protection now, in v0.2.0-beta, without waiting for the `kg_capture` MCP tool. A guard that is model-dependent is better than no guard.
2. **Agent instructions are the available enforcement point:** In v0.2.0-beta, agents write via filesystem tools (Read/Write/Edit). There is no data-layer hook in this path. Agent instructions are the only place to insert the check.
3. **Deferred data-layer enforcement is explicitly tracked:** The v0.2.1 tracking issue (GitHub #39) captures `kg_capture` as the migration target. This is not an indefinite deferral — it has a version and an issue.
4. **User experience is identical regardless of enforcement layer:** The user sees the same block message whether the check is in agent instructions or in a TypeScript tool. The v0.2.1 migration is transparent to users.

### Alternatives Considered

**Option A: No write guard in v0.2.0-beta; wait for `kg_capture` in v0.2.1**
- Pros: Only one implementation needed; avoids the model-dependent guard
- Cons: Users with multiple KGs have zero protection during the entire v0.2.0-beta period; the SessionStart alert can be dismissed or forgotten mid-session
- Rejected because: The risk of writing lessons to the wrong project is a real UX failure that warrants immediate mitigation

**Option B: Enforce write guard in the hook scripts (pre-write shell check)**
- Pros: Shell-level enforcement is model-independent; more reliable than LLM following instructions
- Cons: Hooks fire on all filesystem writes — not just KG writes; filtering to KG-path-only writes in a shell hook is fragile and error-prone; hooks cannot prompt the user interactively (they produce output, not dialogs)
- Rejected because: Hook-level enforcement cannot target KG writes specifically without fragile path matching; interactive prompting is not possible from a shell hook

**Option C: Add `kg_capture` MCP tool immediately in v0.2.0-beta**
- Pros: Model-independent enforcement from the start
- Cons: `kg_capture` requires MCP server TypeScript development, testing, and deployment — significant scope for a safety feature; would delay v0.2.0-beta considerably
- Rejected because: Scope too large for v0.2.0-beta; incremental approach (agent instructions now, MCP tool in v0.2.1) delivers value faster

### Trade-offs

**Benefits:**
- ✅ Write protection is available immediately in v0.2.0-beta — no user action required
- ✅ User is always explicitly asked before a cross-project write proceeds
- ✅ Migration path to model-independent enforcement is explicitly scheduled (v0.2.1)

**Costs:**
- ❌ Model-dependent: if the LLM ignores or misreads the agent instructions, the guard can be bypassed; a sufficiently confused model might still write to the wrong KG
- ❌ Two implementations: agent instruction guard in v0.2.0 + `kg_capture` tool in v0.2.1 — duplicates effort; requires updating agent instructions in v0.2.1 to delegate to the tool
- ❌ Guard does not apply to `sync-all` and `update-graph` commands (they don't use agents yet; deferred to v0.2.1 refactor)

**Mitigation:**
- The SessionStart alert (already shipped) provides a session-level warning that complements the per-write guard
- Agent instruction guard is explicit and early in the agent workflow — the LLM is unlikely to proceed past it without noticing the conflict
- `kg_capture` in v0.2.1 eliminates the model-dependency concern at the data layer

---

## Consequences

### Positive

1. **Users with multiple KGs get protection immediately:** The write guard intercepts cross-project writes and surfaces the conflict explicitly — before any file is written.
2. **Clear migration path:** When `kg_capture` is added in v0.2.1, agents simply change their write mechanism. The user experience is identical; the enforcement layer changes behind the scenes.

### Negative

1. **Model-dependent enforcement period:** Between v0.2.0-beta release and v0.2.1, a highly confused LLM could bypass the agent instruction guard. Considered acceptable given the rarity of this failure mode and the session-start alert as a complementary layer.
2. **Guard gap for non-agent write paths:** `sync-all` and `update-graph` commands do not use the new agents in v0.2.0-beta — they write directly without the guard. This is a known gap documented in the v0.2.1 tracking issue.

### Neutral

1. **`autoSwitch: true` users are unaffected:** If a user has opted into auto-switching, `hooks-master.sh` handles the KG switch at session start. The write guard only blocks and prompts if there is still a mismatch after the SessionStart hook has run.

---

## Implementation

**Timeline:** Agent instruction guard implemented 2026-03-27 in v0.2.0-beta (Phase 2). `kg_capture` enforcement deferred to v0.2.1 (GitHub issue #39).

**Affected Components:**
- `agents/lesson-capture-agent.md` — pre-write KG alignment check in instructions
- `agents/session-summary-agent.md` — pre-write KG alignment check in instructions

**Migration Path (v0.2.1):**
1. Implement `kg_capture` MCP tool in TypeScript with write guard enforcement
2. Update `lesson-capture-agent.md` and `session-summary-agent.md` to call `kg_capture` instead of writing via filesystem tools directly
3. Remove the agent instruction guard (now redundant — enforcement is at the data layer)

---

## Validation

**Success Criteria:**
- ✅ `lesson-capture-agent` and `session-summary-agent` block writes when active KG doesn't match current project directory
- ✅ Block message names the conflicting project and offers explicit options (switch or continue)
- ✅ v0.2.1 tracking issue (GitHub #39) captures `kg_capture` as the migration target

**Review Date:** 2026-06-27 — reassess after v0.2.1 ships `kg_capture`; this ADR status should update to Superseded at that point

---

## Related Decisions

- **[ADR-017](ADR-017-four-layer-architecture-thin-commands.md):** Agent layer — agents are the write enforcement point in v0.2.0-beta because they own execution
- **[ADR-001](ADR-001-centralized-multi-kg-configuration.md):** Centralized multi-KG config — the configuration structure that the write guard reads

---

## Related Documentation

**Implementation:**
- `agents/lesson-capture-agent.md` — write guard section
- `agents/session-summary-agent.md` — write guard section
- `docs/plans/v0.2.0-beta-master.md` — "Active KG / Project Directory Alignment" section
- GitHub issue #39 — v0.2.1 tracking issue for `kg_capture`

---

## Future Considerations

1. **v0.2.1 supersession:** This ADR should be marked Superseded when `kg_capture` is implemented and agent instructions are updated to delegate writes to the tool. The new ADR will document the data-layer enforcement approach.
2. **`sync-all` and `update-graph` gap:** These commands have no write guard. If a user runs them while the wrong KG is active, they will write to the wrong project. This is tracked in v0.2.1 as part of the command refactor to adopt the layered pattern.

---

**Decision Made:** 2026-03-27
**Last Updated:** 2026-06-14
**Status:** Accepted (amended v0.5.10.8 — see § Amendment)

---

## Amendment — v0.5.10.8 (2026-06-14)

**Phase 2 status confirmed shipped:** `mcp-server/src/tools/capture.ts` implements the
data-layer CWD guard at lines 252-266. `lesson-capture-agent.md` and
`session-summary-agent.md` delegate all writes to `kg_capture`. The model-dependent
agent-instruction guard has been superseded for these paths.

**Remaining gap:** `commands/extract-chat.md`, `commands/sync-all.md`,
`commands/update-graph.md` do not call `kg_capture` — they write via Python or direct
filesystem tools. The "non-agent write paths" gap remains open for these commands.

**v0.5.10.8 partial fix:** Added model-layer Step 0 guard to `extract-chat.md` (mirrors
`capture.ts:252-266` semantics; skip on explicit `--output-dir`/`--project`).
Cross-platform (Claude, Gemini, Codex). Model-dependent.

**ENH-026** tracks: sync-all/update-graph Step 0 guards, `run_extraction.py` bypass-proof
CWD check, full unguarded-path audit, and ADR supersession.

**Review date updated:** Reassess when ENH-026 ships; mark this ADR Superseded at that point.
