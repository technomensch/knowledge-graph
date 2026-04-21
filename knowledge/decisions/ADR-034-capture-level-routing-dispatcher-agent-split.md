---
title: "ADR-034: Capture Level Routing — Dispatcher/Agent Split with Shared gov-capture-routing Skill"
date: 2026-04-15
status: Accepted
deciders: [technomensch]
implements: v0.3.9-beta
tags: [architecture, capture, routing, governance, skills, agents, commands]
---

# ADR-034: Capture Level Routing — Dispatcher/Agent Split with Shared gov-capture-routing Skill

## Status

Accepted — implemented in v0.3.9-beta (branch: v0.3.9-capture-level-routing, PR #91)

## Context

All capture commands (`session-summary`, `create-adr`, `capture-lesson`, `rules-capture`, `recall`, `sync-all`) always routed to the active KG. There was no mechanism to explicitly target the user KG (`~/.kmgraph/`), a specific project KG, or a named KG from natural language — the user had to manually switch KGs before capturing.

This caused misroutes when the active KG didn't match the intended destination, and created friction for common patterns like "save this to user level" or "this is project-specific."

Three target modes were needed:
1. **User** — `~/.kmgraph/{type}/`, bypass `kg_capture`, no KG switch
2. **Project** — current repo's KG; temporarily switch if active KG differs, restore after
3. **Named** — specific KG by name, write directly, no switch

The design question was: **where should NL detection live, and how should routing logic be shared across 6 dispatchers and 6 agents?**

## Decision

### Dispatcher/Agent Split

**Dispatchers** (commands/) own NL detection — they inspect the user's message, resolve it to an explicit flag (`--user`, `--project`, `--named=<kg>`, `--active`), and pass that flag to the agent. Dispatchers never apply routing logic directly.

**Agents** (agents/) handle flags only — they accept `--user`, `--project`, `--named=<kg>`, `--active` and apply routing from the flag value. Agents never parse raw NL for routing intent.

This split means: one place does detection (dispatchers), one place does routing (agents). Neither duplicates the other's job.

### gov-capture-routing Shared Skill

`~/.claude/skills/gov-capture-routing.md` is the single source of truth for:
- Full NL trigger vocabulary (all patterns for user/project/named/active)
- Path resolution logic for all three modes
- KG switch/restore logic (`--project` only)
- All user-facing prompts verbatim: named-not-found, no-KG-configured, conflict 6-option
- `kg_capture` error behavior (surface error for project/named; bypass by design for user)
- Output contract: sets `$level`, `$target_kg`, `$restore_kg`, `$target_path`

All 6 dispatchers invoke `gov-capture-routing` at the top before dispatching to the agent. No dispatcher duplicates routing logic inline.

### User-Level Writes Bypass kg_capture

`--user` captures write directly via the Write tool to `~/.kmgraph/{type}/`. The `kg_capture` MCP tool is intentionally not called — user-level writes are personal and should not go through the project-scoped MCP layer.

### Always Surface Resolved Target

Every capture draft shows `"Saving to: {resolved_path}"` before writing, even when no level signal was given. This lets the user catch misroutes before they happen.

### sync-all Resolves Level Once

`sync-all` invokes `gov-capture-routing` at the top, resolves the level once, then passes the explicit flag to every sub-capture it orchestrates. Sub-captures skip their own NL detection and use the passed flag directly.

## Rationale

**Why not have agents do their own NL detection?**  
Six agents would each need to duplicate the same NL vocabulary and path resolution logic. A single shared skill eliminates that duplication and ensures all agents stay in sync when the vocabulary changes.

**Why a skill rather than a shared command or utility file?**  
Skills are invokable mid-conversation by any dispatcher without spawning a subagent. The output contract (`$level`, `$target_kg`, etc.) is a natural fit for skill-based context injection. Commands are user-facing; this is internal governance.

**Why bypass kg_capture for user-level?**  
User-level captures are personal — they go to `~/.kmgraph/`, which is outside the project-scoped MCP boundary. Routing them through `kg_capture` would require the MCP server to know about the personal KG structure, coupling a project tool to user-level configuration.

**Why the 6-option conflict prompt rather than a simpler choice?**  
The conflict case (e.g., "save to user level for the knowledge-graph project") is inherently ambiguous. Offering a remember-preference option (options 3-6) reduces future friction by letting the user encode their preference into `rules.md` once rather than disambiguating every time.

## Consequences

**Positive:**
- All capture commands support explicit level routing without KG switching
- Single source of truth for routing logic — one update to `gov-capture-routing` propagates to all dispatchers
- NL trigger vocabulary is learnable by users — "user level", "for this project", "career-ops" all work naturally
- `--user`/`--project`/`--named` flags work for scripting and automation without NL parsing
- Default behavior unchanged — active KG is still the default, with only the addition of the resolved-target confirmation in drafts

**Negative:**
- `gov-capture-routing` skill must be kept in sync with dispatcher expectations — a vocabulary change requires updating one file, but that file is not checked into the project repo
- `--project` switch/restore logic is stateful — if a capture fails mid-way, the KG switch may not be restored (mitigated by surfacing errors before writing)
- The dispatcher/agent contract (explicit flags only) requires discipline — an agent that tries to parse NL directly would bypass the shared skill

## Related

- `~/.claude/skills/gov-capture-routing.md` — shared skill implementation
- `~/.claude/plans/v0.3.9-capture-level-routing.md` — full implementation plan
- `~/.kmgraph/triggers.md` — "When capturing anything" trigger section
- PR technomensch/knowledge-graph#91
- ADR-017: Four-Layer Architecture Thin Commands (related: commands as thin dispatchers)

---

## Amendments

### 2026-04-21 — Subagent Tier Inheritance (v0.5.0-beta)

**Rule:** Parent dispatcher resolves tier → model once and passes the **resolved model name** (not the tier label) to the subagent. Subagents do not re-read `me.md`.

**Rationale:** Prevents drift if `me.md` changes mid-session. Ensures predictable model assignment across the dispatcher → subagent boundary.

**Exception:** Skills with `required_tier: <label>` in their frontmatter override this — the subagent re-resolves that tier independently against `me.md`. Primary use case: `stuck-work-escalation` declares `required_tier: powerful-tier` and halts (does not collapse) if powerful-tier is unavailable.

**Rule location:** `~/.kmgraph/rules.md § Profile > Subagent Tier Inheritance`
