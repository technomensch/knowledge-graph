---
title: "ADR-066: KG content-storage location for global-topic and cowork modes"
number: 066
status: Accepted
date: 2026-07-14
resolved: 2026-07-17
author: technomensch
email: mkitact@gmail.com
git:
  branch: v0.6.19
  commit: null
  pr: null
  issue: "#171 (surfaced during, but out of scope for, issue-14)"
implements: "v0.6.20 (planned — decision made 2026-07-17, execution not yet started; see ~/.claude/plans/v0.6.20-storage-migration-completion.md)"
related:
  adrs: [028, 001]
  lessons: []
  kg_entries: []
tags: [storage, platform-agnostic, kg-location, cowork, init, split-brain, resolved]
category: architecture
---

# ADR-066: KG content-storage location for global-topic and cowork modes

**Date:** 2026-07-14
**Status:** Accepted — resolved 2026-07-17 (decision only; implementation planned via v0.6.20, not yet started)

---

## Context

This ADR records a question surfaced on 2026-07-14 during the issue-14 (#171) config-path blast-radius audit. It is **not** part of issue-14's fix (c1/c2/c3), which is scoped to the `kg-config.json` path only. It is captured here so the decision is tracked with its full context rather than lost.

### What has migrated to `~/.kmgraph/`, and what governs it

The project has an established **platform-agnostic principle**: kmgraph data should live outside `~/.claude/` (a Claude-Code-specific directory unreachable by Gemini CLI, Codex, Copilot, etc.) so the tool works across AI platforms. That principle was set by **ADR-028** and applied through a series of *narrowly-scoped* migrations:

- **ADR-028** (Accepted, v0.3.5-beta) — moved the **personal KG home** from `~/.claude/knowledge-graph/` to `~/.kmgraph/`. Scope: the personal KG only.
- **ADR-001** (Accepted, updated 2026-07-11) — moved **`kg-config.json`** to `~/.kmgraph/kg-config.json`. Scope: the config file only.
- **FTS5 index relocation** (v0.6.18, no standalone ADR) — moved the **search index** to `~/.kmgraph/index/`. Scope: the index only.

A recall pass (recall-agent, `--scope=all`, 2026-07-14) confirmed: **no ADR — accepted or proposed — has ever decided that the "global topic-based" or "cowork" KG *content* stores relocate to `~/.kmgraph/`.** Those two locations appear in zero ADRs, specs, or roadmap decisions.

### The concrete divergence

Two `kmg-init` implementations now disagree about where a new KG's content is stored, and which storage modes even exist:

- **`mcp-server/src/cli.ts` (MCP server init, lines ~63-110)** offers **three** location choices — `1. current directory (./docs/)`, `2. home (~/.kmgraph/)`, `3. custom` — and has **dropped** the global-topic and cowork modes entirely. Grep of `mcp-server/src` for `knowledge-graphs`/`cowork-knowledge` = 0 hits.
- **`commands/kmg-init.md` (slash-command wizard)** still offers **four** modes (project-local / global topic-based / Claude Cowork / custom) and still live-assigns content paths under `~/.claude/`:
  - `kmg-init.md:920-921` — the storage-mode menu, listing `~/.claude/knowledge-graphs/[name]/` and `~/.claude/cowork-knowledge/[topic]/`
  - `kmg-init.md:1039` — `KG_PATH="$HOME/.claude/knowledge-graphs/$kg_name/"`
  - `kmg-init.md:1042` — `KG_PATH="$HOME/.claude/cowork-knowledge/$kg_name/"`
  - Echoed as sample output in `commands/kmg-list.md:33,38`

For reference, `cowork` is a KG **type/scope** meaning "team-shared, synced via a shared git remote" (`mcp-server/src/tools/config.ts:70` enum; `cli.ts:98` "shared with team members"; `docs/pillars/organizing/multi-kg-workflows.md:17` "Configurable shared path … Team"). It is a knowledge-graph scope, not a plugin-installation path.

### Why this is a real question, not a typo

- The two init flows offer **different storage choices and different paths** for the same operation — a user's KG lands in a different place depending on which entry point they use.
- ADR-028's platform-agnostic rationale would *justify* moving content out of `~/.claude/` too — but that reasoning has never been applied to these modes, and doing so is a behavior change with user-migration implications (existing KGs already created under `~/.claude/knowledge-graphs/` or `~/.claude/cowork-knowledge/`).
- It is therefore a **product/architecture decision**, not a mechanical path fix, and out of scope for the config-path bug.

## Decision

**Resolved 2026-07-17**, in direct conversation, following independent research (web search confirming real Claude Cowork's actual product architecture) and a Fable-model code review verifying the current state of both `cli.ts` and `kmg-init.md`. Answering the four open questions in order:

1. **Do the "global topic-based" and "cowork" storage modes still exist as first-class concepts?**
   **Cowork: no — stop offering it as a new-KG option.** Real Claude Cowork (Anthropic's desktop/web/mobile agentic product) has no plugin/slash-command extensibility surface — kmgraph's "cowork" KG type/scope was built on a premise that was never actually reachable through the real product. Existing `~/.claude/cowork-knowledge/` content on any real install is **never silently dropped**: the upgrade script must detect it, inform the user of the incompatibility, and offer to archive it (same `.kg-archive-<timestamp>/` pattern used elsewhere) — never auto-delete or silently reclassify it into another mode.
   **Global-topic: yes — kept.**

2. **Does content storage relocate from `~/.claude/` to `~/.kmgraph/`?**
   Yes, for global-topic KGs: `~/.claude/knowledge-graphs/<name>/` → **`~/.kmgraph/knowledge-graphs/<name>/`** — no wrapper/umbrella folder. Fable-verified: the personal-KG index rebuild only walks a fixed, enumerated set of dirs at `~/.kmgraph/` root, so a sibling `knowledge-graphs/` folder has zero collision risk with personal KG content. `knowledge-graphs/` is already the umbrella; per-KG paths are stored individually in `kg-config.json`, so a hypothetical future second mode could claim its own sibling folder later with no disruption — no pre-built structure needed now. (This does **not** reopen ADR-028 — the personal KG's own placement directly at `~/.kmgraph/` root is untouched.)

3. **Migration path for existing installs?**
   Global-topic: reuse the existing one-time legacy-seed-and-copy pattern already used for `kg-config.json` — detect `~/.claude/knowledge-graphs/`, copy forward once. Cowork: detect-and-archive per point 1 above, honoring ADR-063 (never destroy known-good state before a confirmed write).

4. **Which layer is authoritative?**
   The MCP server (`cli.ts`) — but it is **not already correct as-is** and must be fixed first: its "home" location option currently sets `kgPath = ~/.kmgraph` with no `<name>` subfolder, so using it today to create a second named KG would overlay the personal KG's own directories. Fix `cli.ts` (add a proper global-topic location option per point 2; purge `cowork` from its type menu and from `config.ts`'s type enum) before declaring it authoritative. Root-cause fix, not just "pick a winner": `commands/kmg-init.md` should delegate path computation to the MCP tool (`kg_config_init`/`kg_scaffold`) instead of duplicating the logic in its own bash case-statement, so the two surfaces structurally cannot diverge again. `kmg-init.md` keeps its richer UX (categories, git strategy, upgrade checks); it stops owning the storage-mode table.

**Implementation:** planned in full as the 13-task `v0.6.20-storage-migration-completion` plan (`~/.claude/plans/v0.6.20-storage-migration-completion.md`). Decision made; execution not yet started as of this writing.

## Related

- `knowledge/issues/issue-14/investigation-log.md` — Finding 8 (the audit trail that surfaced this)
- ADR-028 (platform-agnostic source of truth; the precedent this decision would extend)
- ADR-001 (kg-config.json migration; sibling narrow migration)
- ADR-063 (never destroy known-good state before confirmed write; governs any migration path chosen)
- ROADMAP.md → "Needs its own dedicated brainstorm/ADR before scheduling"
