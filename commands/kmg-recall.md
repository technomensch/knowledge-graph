
# Knowledge Recall

Search across all project memory systems to find relevant knowledge, lessons, decisions, and session history.

---

## When to Use

Run `/kmgraph:kmg-recall` any time you want to check what the project has already documented before answering a question, solving a problem, or making a decision. Good prompts:

- "Have we solved this before?"
- "What did we decide about X?"
- "Show me past work on Y."

---

## Usage

```bash
/kmgraph:kmg-recall <topic>
/kmgraph:kmg-recall <topic> --type=<lessons|decisions|knowledge|sessions|all>
/kmgraph:kmg-recall <topic> --format=<summary|paths|detailed>
/kmgraph:kmg-recall <topic> --limit=<number>
/kmgraph:kmg-recall <topic> --scope=<active|all|personal-only>
```

**Parameters:**
- `topic` (required): Keywords or phrase to search for
- `--type` (optional): Filter by memory system (default: `all`)
- `--format` (optional): Output style — `summary`, `paths`, or `detailed` (default: `summary`)
- `--limit` (optional): Cap results per category (default: 10)
- `--scope` (optional): Which KGs to search — `active` (default when no personal KGs), `all` (project + personal), `personal-only`; auto-detected when omitted

**Examples:**
```bash
/kmgraph:kmg-recall skills architecture
/kmgraph:kmg-recall deployment --type=lessons
/kmgraph:kmg-recall version control --format=paths
/kmgraph:kmg-recall dual format --format=detailed
/kmgraph:kmg-recall CI/CD pipelines --type=lessons --limit=5
/kmgraph:kmg-recall auth patterns --scope=all
/kmgraph:kmg-recall workflow best practices --scope=personal-only
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

## Level Routing Detection

Before searching, detect the level signal from the user's invocation to scope the search.

**Invoke `gov-capture-routing` skill** to:
1. Detect level signal from the user's message (NL patterns or explicit flags)
2. Resolve `$level` and `$target_kg`
3. Map to search scope: `--user` → `~/.kmgraph/` only; `--project` → current repo KG only; `--named=<kg>` → named KG only; `--active` or no signal → all configured KGs (default)

Pass the resolved level flag to the `recall-agent` invocation.

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
- `/kmgraph:kmg-capture-lesson` — Document new lessons learned
- `/kmgraph:kmg-update-graph` — Extract insights from lessons to KG
- `/kmgraph:kmg-status` — Show active KG info
