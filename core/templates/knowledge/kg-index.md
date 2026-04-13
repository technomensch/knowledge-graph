# Knowledge Graph — [Project Name]

> One-line description of what this project does and its domain.

## Structure

| Directory | Purpose |
|---|---|
| `knowledge/` | Standing reference: me, rules, concepts, patterns |
| `lessons-learned/` | Solved problems and non-obvious discoveries |
| `decisions/` | Architecture Decision Records (ADRs) |
| `sessions/` | Session summaries and working notes |
| `chat-history/` | Exported AI conversation history (may live outside vault — see `chatHistoryPath` in kg-config.json) |

## Key Files

- [[me]] — Who I am and how I work on this project (gitignored — personal)
- [[rules]] — Conventions, always/never rules, directory map (committed — shared)
- [[lessons-learned/README]] — Lessons index
- [[decisions/README]] — ADR index

## For AI Agents

Read `knowledge/me.md` and `knowledge/rules.md` before acting on any task in this repository.
`me.md` describes who you are working with. `rules.md` contains the behavioral rules and conventions you must follow.

## Maintenance

Update this file whenever major new subdirectories are added to the knowledge graph.
Quarterly review of `me.md` and `rules.md` is recommended — identity and rules change slowly but do change.
