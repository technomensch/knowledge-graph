---
id: me-and-rules
title: Portable AI Identity — me.md and rules.md
sidebar_label: Portable AI Identity
description: Set up platform-agnostic identity and behavioral rules that travel with you across any AI tool
---

# Portable AI Identity — `me.md` and `rules.md`

KMGraph introduces two files scaffolded at `knowledge/` that give your AI assistant a consistent understanding of who you are and how you work — regardless of which AI platform you're using today.

---

## The Problem: Platform Lock-In and Rule Drift

If you've been using AI coding assistants for a while, you've probably accumulated configuration in `CLAUDE.md`, `.cursorrules`, `copilot-instructions.md`, and other platform-specific files. These files work — until you add a second tool, switch platforms, or have a collaborator join your project.

Three problems surface quickly:

1. **Platform lock-in.** `CLAUDE.md` syntax is Claude Code-only. Rules written there don't travel to Cursor, Windsurf, or Gemini. Every new platform requires rewriting the same context.
2. **Rule drift.** When you update a rule in one file, its duplicate in another platform file silently goes stale. No warning. The rule exists — just in the wrong version.
3. **Identity fragmentation.** There's no single "who am I in this project" document. Working style, communication preferences, and domain expertise live scattered across `CLAUDE.md`, memory files, and implicit expectations.

---

## The Solution: Your AI OS

Nick Milo describes this pattern in his [Obsidian ACE framework](https://youtu.be/jbHB-rzKBAs?si=nJGsbkfa7FKTDeyB) and [AI OS walkthrough](https://youtu.be/sboNwYmH3AY?si=NC0woU_9KIigqSR2): platform files should be **thin shims** that say "read these foundation files first." The foundation files are plain markdown — readable by any AI tool, owned by you.

```mermaid
%%{init: { 'flowchart': { 'useMaxWidth': true }, 'theme': 'neutral' }}%%
flowchart TB
    subgraph platforms ["Platform Config — thin shims"]
        direction LR
        CL["CLAUDE.md"]
        CU[".cursorrules"]
        GE["GEMINI.md"]
        CO["copilot-instructions.md"]
    end

    subgraph project ["Project Scope  ·  ./knowledge/"]
        direction LR
        R["rules.md\nproject conventions\n✅ committed"]
        M["me.md\ncontributor identity\n🔒 gitignored"]
    end

    subgraph personal ["Personal Scope  ·  ~/.kmgraph/"]
        direction LR
        PR["rules.md\ncross-project rules"]
        PM["me.md\ncross-project identity"]
    end

    CL & CU & GE & CO -->|read first| R
    CL & CU & GE & CO -->|read first| M
    R -. project overrides .-> PR
    M -. project overrides .-> PM

    accTitle: Platform shim pattern
    accDescr: All platform config files (CLAUDE.md, .cursorrules, GEMINI.md, copilot-instructions) point to two foundation files in knowledge/ — rules.md and me.md. Project scope overrides personal scope defaults in ~/.kmgraph/.
```

KMGraph implements this pattern directly. Two files, scaffolded automatically during `kmgraph init`:

| File | Purpose | Committed? |
|---|---|---|
| `knowledge/rules.md` | Project conventions shared by all contributors — branch naming, commit format, workflow rules | Yes |
| `knowledge/me.md` | Who *you* are in this project — working style, domain expertise, communication preferences | No — gitignored |

Your platform files (`CLAUDE.md`, `.cursorrules`, etc.) become one-line shims:

```markdown
# CLAUDE.md
For full context, read `knowledge/rules.md` and `knowledge/me.md` before acting.
```

No more duplication. When you add a new AI platform, you add one line, not rewrite everything.

---

## Two-Level Hierarchy

The same pattern extends to a personal scope — rules and identity that apply across *all* your projects:

| Scope | File | Contents |
|---|---|---|
| Project | `knowledge/rules.md` | Project-specific conventions — committed, shared by all contributors |
| Project | `knowledge/me.md` | Your identity in this project — gitignored, per-contributor |
| Personal | `~/.kmgraph/rules.md` | Cross-project behavioral rules (e.g., "always use feature flags") |
| Personal | `~/.kmgraph/me.md` | Your identity across all projects — style, expertise, preferences |

**Precedence:** project-scoped files override personal files when they conflict. Personal files supply defaults.

---

## `knowledge/rules.md` — Project Conventions

`rules.md` is the single authoritative home for behavioral rules. It replaces the scattered conventions in platform files:

```markdown
# Rules — My Project

## Git Workflow
- Branch format: `v{ver}-{description}`
- Commit format: `type(scope): subject` — include `Closes #N` in body
- Never auto-merge; push and await user review
  - **Why:** auto-merges skipped code review and shipped broken features in v0.2.x

## Workflow Preferences
- Parallel tool calls: always run independent searches and reads in parallel
  - **Source:** [[ADR-017-four-layer-architecture]]
```

Each entry supports optional `Why:` and `Source:` annotations. `Why:` is a one-sentence micro-rationale. `Source:` links to the lesson or ADR that created the rule. This means you can understand *why* a rule exists without loading the full lesson into context.

---

## `knowledge/me.md` — Your Identity

`me.md` is gitignored — each contributor on a project maintains their own. It tells the AI assistant who it's working with, how to communicate, and what domain expertise to assume:

```markdown
# About Me — My Project

## Role
Senior backend engineer, primary maintainer of the payments service.
Strong in TypeScript and PostgreSQL; new to the React components in this repo.

## Working Style
- Direct communication: skip preamble, get to the answer
- Show diffs, not rewrites — I read code well
- Ask before refactoring anything I didn't specifically request

## What I Value
Correctness over speed. If a change might break something, say so first.
```

Two contributors on the same project have different `me.md` files. Committing one person's `me.md` would surface the wrong identity context for every other contributor. That's why it's gitignored.

---

## Setting Up

Run `kmgraph init` in any project. The wizard:

1. Creates `knowledge/rules.md` with the Why/Source template populated with examples
2. Creates `knowledge/me.md` with the identity sections scaffolded
3. Offers to populate both files from your existing `CLAUDE.md` via a section-mapping step

For the personal scope, run `/kmgraph:init-personal-kg`. It creates `~/.kmgraph/me.md` and `~/.kmgraph/rules.md` and offers to populate them from `~/.claude/CLAUDE.md`.

---

## Keeping Rules Up to Date — rules-capture

The `rules-capture` skill watches for behavioral corrections mid-session:

> "from now on, always X"  
> "never do X again"  
> "I prefer X over Y"

When detected, it appends a suggestion to your response with a shortcut menu:

```
→ Capture as rule? (project-rules / project-me / personal-rules / personal-me / no)
```

Selecting an option dispatches to `rules-capture-agent`, which reads the target file, checks for duplicates, drafts the rule in house style, and presents an Approve / Edit / Discard loop before writing.

Rules stay current without manual editing.

---

## Before/After

**Before:**

```
CLAUDE.md           ← rules + identity + Claude-specific syntax, 150 lines
.cursorrules        ← duplicates 40% of CLAUDE.md, silently stale
~/.claude/CLAUDE.md ← personal preferences, Claude-only
```

**After:**

```
knowledge/rules.md          ← single authoritative rules source (committed)
knowledge/me.md             ← contributor identity in this project (gitignored)
~/.kmgraph/rules.md         ← cross-project personal rules (local only)
~/.kmgraph/me.md            ← cross-project personal identity (local only)
CLAUDE.md                   ← shim: "read knowledge/rules.md and knowledge/me.md"
.cursorrules                ← shim: "read knowledge/rules.md and knowledge/me.md"
```

One rule update. Four platforms served.

---

## Related

- [Personal vs Project KGs](../PERSONAL-V-PROJECT.md) — Understanding the two scopes
- [ADR-028](../../knowledge/decisions/ADR-028-me-and-rules-as-platform-agnostic-source-of-truth.md) — Full architectural rationale
- [Nick Milo — Obsidian ACE Framework](https://youtu.be/jbHB-rzKBAs?si=nJGsbkfa7FKTDeyB)
- [Nick Milo — Building Your AI OS](https://youtu.be/sboNwYmH3AY?si=NC0woU_9KIigqSR2)
