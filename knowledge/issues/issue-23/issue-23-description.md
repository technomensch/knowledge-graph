---
id: issue-23
type: Bug
status: deferred
github-issue: "#183"
branch: none
created: 2026-07-17
---

# Issue-23: `kg_config_switch` reports false success while leaving the config file completely unchanged

## Priority

**High** — a core MCP tool silently no-ops while reporting success. This is worse than the underlying drift it was meant to fix (issue captured separately): a user who hits this has no signal anything is wrong and will proceed believing they're on the correct KG when they are not.

## Problem

Live during this session: `~/.kmgraph/kg-config.json`'s `active` field had drifted to `docs-readme-poc` (root cause: the user was separately installing/initializing this same plugin into that other repo in a parallel session — a real, expected instance of the exact multi-repo/concurrent-work friction captured in ENH-049/ADR-067, not corruption).

Called `mcp__plugin_kmgraph_kmgraph__kg_config_switch` with `{name: "knowledge-graph"}` to correct it. The tool returned:

```
Switched from 'knowledge-graph' to 'knowledge-graph'
Location: /Users/mkaplan/GitHub/knowledge-graph/knowledge
```

This response claims the switch was a no-op because `active` was already `knowledge-graph` — but direct inspection of `~/.kmgraph/kg-config.json` immediately before and after the call showed `active` was `docs-readme-poc` both times; the field was completely unchanged by the tool call. Retried once — identical false-success response, identical unchanged file. The tool never actually wrote to the config file at all, despite reporting a specific (and factually wrong) "from/to" state.

Worked around by editing `~/.kmgraph/kg-config.json`'s `active` field directly (Edit tool, single-field change, verified after).

## Suspected cause (not investigated — Mode 3, no fix planned yet)

Not yet known whether: the tool is resolving/reporting against a stale in-memory cache instead of re-reading the file each call; there's a race condition between the MCP server process and direct file edits; the `name` parameter isn't being matched correctly against the actual `active` value; or something else entirely. Needs actual investigation of `mcp-server/src/tools/config.ts`'s switch-handling logic before a fix can be scoped.

## Related

- Root cause of the drift this call was meant to fix is a live, concrete confirmation of ENH-049 (need to work across multiple repos/tools concurrently with different active KGs) and the underlying open question in ADR-067 (mutable `.active` switch vs. context-derived KG resolution) — not a new finding, but real-world validation of an already-tracked concern.
- This bug (the switch tool itself silently failing) is separate and, if anything, more urgent than the drift it failed to fix: a broken "undo" mechanism is worse than the problem it exists to correct.

## Status

Deferred (Mode 3 — track only). No branch created, no implementation planned yet. Needs investigation into `kg_config_switch`'s actual implementation before a fix can be scoped.
