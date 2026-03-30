---
description: Search across project memory systems (lessons, decisions, knowledge graph, sessions)
allowed-tools: Agent
---

# Knowledge Recall

Search across all project memory systems to find relevant knowledge, lessons, decisions, and session history.

---

## When to Use

Run `/kmgraph:recall` any time you want to check what the project has already documented before answering a question, solving a problem, or making a decision. Good prompts:

- "Have we solved this before?"
- "What did we decide about X?"
- "Show me past work on Y."

---

## Usage

```bash
/kmgraph:recall <topic>
/kmgraph:recall <topic> --type=<lessons|decisions|knowledge|sessions|all>
/kmgraph:recall <topic> --format=<summary|paths|detailed>
/kmgraph:recall <topic> --limit=<number>
/kmgraph:recall <topic> --scope=<active|all|personal-only>
```

**Parameters:**
- `topic` (required): Keywords or phrase to search for
- `--type` (optional): Filter by memory system (default: `all`)
- `--format` (optional): Output style — `summary`, `paths`, or `detailed` (default: `summary`)
- `--limit` (optional): Cap results per category (default: 10)
- `--scope` (optional): Which KGs to search — `active` (default when no personal KGs), `all` (project + personal), `personal-only`; auto-detected when omitted

**Examples:**
```bash
/kmgraph:recall skills architecture
/kmgraph:recall deployment --type=lessons
/kmgraph:recall version control --format=paths
/kmgraph:recall dual format --format=detailed
/kmgraph:recall CI/CD pipelines --type=lessons --limit=5
/kmgraph:recall auth patterns --scope=all
/kmgraph:recall workflow best practices --scope=personal-only
```

---

## Memory Systems Searched

| Type | Contents |
|---|---|
| `lessons` | Past problems solved and patterns discovered |
| `decisions` | Formal ADR documentation |
| `knowledge` | Quick-reference concepts, patterns, and gotchas |
| `sessions` | Historical work context and outcomes |

When a personal KG is registered, `recall` searches both project and personal KGs by default. Results include a source label (`[project]` or `[personal]`) to distinguish origin.

---

## Parse and Dispatch

Extract the user's query and any options from the command, then say:

> Let me check what we've documented about this before answering...

Then invoke the `recall-agent` with the topic and parsed options:

```
recall-agent: "<topic>" [--type=<value>] [--format=<value>] [--limit=<value>] [--scope=<value>]
```

The agent handles all search execution, ranking, and result formatting.

---

**Related commands:**
- `/kmgraph:capture-lesson` — Document new lessons learned
- `/kmgraph:update-graph` — Extract insights from lessons to KG
- `/kmgraph:status` — Show active KG info
