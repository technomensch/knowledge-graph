---
title: Migrate Claude ↔ Gemini
category:
  uri: portability
position: 4
slug: pillars-portability-migrate-claude-gemini
parent:
  uri: pillars-portability-index
---

# Migrate Claude ↔ Gemini

> "I'm switching AI tools. How do I bring my knowledge graph with me?"

The knowledge graph is platform-agnostic markdown — switching from Claude Code to Gemini CLI (or back) requires only a sync and a re-registration step. You need a populated knowledge graph on the source platform and KMGraph installed on the target (see [Installation](/INSTALL)).

## Sync MEMORY.md first

Before switching, update the MEMORY.md with the latest session context:

```bash
/kmgraph:kmg-session-summary
```

This writes a summary to `docs/sessions/` and updates MEMORY.md pointers. Commit and push.

## Export chat history

```bash
/kmgraph:kmg-extract-chat          # Claude + Gemini history
/kmgraph:kmg-extract-chat --source codex   # Codex CLI history (if applicable)
```

Extracts session history from the departing platform into the active KG's `chat-history/` directory, making it available for `/kmgraph:kmg-recall` and lesson extraction on the target platform.

## Point to the same graph

The knowledge graph is platform-agnostic markdown. If it is in the project directory, `git pull` is all that is needed. If it is a personal KG at `~/.kmgraph/`, pull that repo too.

## Register on the target platform

**For Claude Code (target):**
```bash
/kmgraph:kmg-init
# Select "Use existing KG"
```

**For Gemini CLI (target):**

Copy the contents of `core/default-templates/AGENTS-template.md` into your project's `AGENTS.md` or `GEMINI.md`. The template loads the KMGraph workflow instructions for non-Claude-Code platforms.

## Verify recall works

```bash
/kmgraph:kmg-recall "a lesson from the previous platform"
# On Gemini: paste the kg_search tool call format from AGENTS.md
```

## Notes

- The knowledge graph files are identical across platforms — no conversion needed
- MCP tools (`kg_*`) work the same on any MCP-enabled IDE
- MEMORY.md is human-readable markdown — the target platform can load it directly
- Full automation (slash commands, hooks) is Claude Code-exclusive; other platforms use the MCP tools or manual workflow
- Codex CLI chat history can be extracted with `--source codex`; see [`/kmgraph:kmg-extract-chat`](/knowledge-graph/commands/extract-chat) for the full source flag reference

## Related

- [Use in Cursor/Windsurf/VS Code](./use-in-cursor) — IDE-specific setup
- [Platform Adaptation reference](../../reference/PLATFORM-ADAPTATION.md) — full compatibility matrix
