---
title: Agents Template
category:
  uri: templates
slug: templates-agents-template
---

# Agent Template

Template for creating new KMGraph agents. Copy this file and fill in each section.

---

## Startup Protocol

At the start of each session, call `kg_upgrade` (no `apply` arg) to inspect for pending upgrades.
If `kg_upgrade` returns an error (e.g., no knowledge graph configured), stay silent — do not surface the error to the user.
If upgrades are reported, summarize them and ask before applying.

---

## Metadata

```yaml
---
name: {agent-name}
description: {One-line description of what this agent does}
model: {opus | sonnet | haiku}
---
```

## Structure

Each agent should include:

1. **Role description** — What the agent does, its operating mode, and tool permissions
2. **Active KG / CWD Guard** — Verify the active knowledge graph matches the working directory before any writes
3. **Phases** — Numbered steps from input gathering through output
4. **User review gate** — Present drafts for approval before saving
5. **Capture via `kg_capture`** — Use the MCP tool for all writes to the knowledge graph
6. **Error handling** — Surface errors clearly, offer retry or fallback
7. **UX language constraints** — Direct address, plain language, no internal mechanics exposed

---

## If MCP Tools Aren't Responding

When `kg_*` MCP tools fail (tool not found, connection refused, timeout), agents should follow this graceful degradation path:

### 1. Detect the Failure

If a `kg_capture`, `kg_search`, or any `kg_*` call returns an error indicating the MCP server is not registered or not reachable:

- Do **not** silently swallow the error
- Do **not** retry in a loop without user awareness

### 2. Delegate to `mcp-setup-agent`

If the error indicates the server is not registered or not connected:

> "The search index isn't connected. Want me to set it up? (Takes about 10 seconds.)"

Hand off to `mcp-setup-agent` with the error context and original operation details. Wait for its return signal before proceeding.

### 3. File-System Fallback

If the user declines setup, or if setup fails:

- Write the content directly to the file system using standard `Write` tool
- Place files in the correct KG directory structure (e.g., `{kg_path}/lessons-learned/`, `{kg_path}/sessions/`)
- Follow existing file naming conventions from the knowledge graph
- Explicitly tell the user: "Saved to the file system. Search won't be ranked until the index is connected."

### 4. What the Fallback Preserves

| Capability | With MCP | File-System Fallback |
|---|---|---|
| Content saved | Yes | Yes |
| Frontmatter/metadata | Yes | Yes |
| FTS5 search indexing | Automatic | Manual rebuild needed |
| Duplicate detection | Automatic | Best-effort via filename |

### 5. Never Block on MCP

The user's work is more important than index connectivity. If MCP is unavailable:

- Capture the content first (file-system write)
- Offer to set up MCP afterward
- Never lose user data because of a connection issue

---

## Tools Commonly Used

- `Read` — Read config files, existing entries, plans
- `Grep` — Search for related content locally
- `Glob` — Find files by pattern
- `Bash` — Git read-only commands, path resolution
- MCP: `kg_search` — Search the knowledge graph
- MCP: `kg_capture` — Write entries to the knowledge graph
- `Write` / `Edit` — File-system fallback only (prefer `kg_capture`)

---

## UX Language Guidelines

- Address the user directly ("Want me to...?" not "The system will...")
- Use plain language (no internal mechanics or error codes)
- Show drafts for review before saving
- Suggest, don't mandate ("Want to...?" not "You must...")
- Frame MCP as "the search index" or "the connection" — not "MCP server"
