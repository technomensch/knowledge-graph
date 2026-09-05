
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

Before searching, detect the user's intent for search scope from their message or an
explicit flag directly — no separate routing skill needed (`gov-capture-routing`,
formerly invoked here, has been retired — see issue-18 — as this detection is now native
to how `recall-agent`/`kg_search` already resolve scope):

- Personal/global-KG language ("my personal", "across all my projects"), or an explicit
  `--user` flag → `--user` (personal KG only)
- This-project language, or an explicit `--project` flag → `--project` (current repo's
  KG only)
- A specific KG named by the user, or `--named=<kg>` → `--named=<kg>` (that KG only —
  `recall-agent` resolves the name itself)
- An explicit signal for "the active KG specifically, not everything" (e.g. "just this
  KG", or a literal `--active` flag) → `--active` — per `recall-agent`'s own flag table,
  this means the single cwd-resolved KG **only**, overriding its normal auto-detect.
- **Nothing specified at all** (no level flag, no NL signal) → pass **no** level flag to
  `recall-agent`. Do not default this to `--active` — `recall-agent` has its own
  auto-detect for the unflagged case (`all` if any personal KG is registered, `active`
  otherwise; see its Step 1 `--scope` resolution), which is smarter than a hardcoded
  choice here and must not be short-circuited. (The retired skill's original mapping
  conflated "nothing specified" with an explicit `--active`, which would have forced
  single-KG search even when a personal KG is registered and the smarter multi-KG default
  should apply — corrected here, not carried forward.)
- The existing `--scope=<active|all|personal-only>` flag (see Usage above) is a direct
  alternative path for scripting/explicit control. Level flags above take precedence over
  `--scope` when both are present, matching `recall-agent`'s own stated precedence — do
  not resolve both and pick one arbitrarily.

**Deliberately not reproduced from the retired skill:** the richer NL trigger vocabulary,
conflict-resolution flow for two ambiguous signals in one message, and multi-capture
handling `gov-capture-routing` supported are not replicated here — the mapping above is
a straightforward level/flag → level/flag translation, not a full reimplementation. See
issue-18's decision record for why this is an accepted scope narrowing, not an oversight.

Pass the resolved level flag (or `--scope` if that's what was given) to the
`recall-agent` invocation, exactly as `recall-agent` already expects — only how the flag
gets resolved changes here, not the flag contract itself.

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
- `/kmgraph:kmg-status` — Show active KG info
