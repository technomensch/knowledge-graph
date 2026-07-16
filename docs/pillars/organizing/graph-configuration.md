---
title: Graph Configuration
---

# Graph Configuration

> "How do I set up or customize the graph structure?"

KMGraph is designed to be configured once at init and then extended gradually as your project grows. This page covers the structural configuration decisions: where files live, how categories work, and how to adapt the graph to an existing project.

## What gets configured at init

When you run `kg_config_init`, KMGraph scaffolds the core directory structure under your chosen storage path:

```
knowledge/           ← project KG root (or .knowledge/, knowledge/concepts/, etc.)
├── lessons-learned/
├── decisions/
├── knowledge/
└── sessions/
```

The init command writes a `kg-config.json` file that records:

- **`name`** — your KG identifier (used in multi-KG workflows)
- **`storage_path`** — where knowledge files live (project-relative or absolute)
- **`categories`** — the list of active category directories
- **`created`** — timestamp of initial setup

You do not need to touch `kg-config.json` directly for routine use. The `kg_config_*` commands manage it for you.

## Adding categories

Categories are subdirectories within `lessons-learned/`, `decisions/`, or `knowledge/`. Create them when a new topic area emerges — not upfront.

### Using the command

```bash
/kmgraph:kmg-add-category
```

This prompts for the category name, creates the directory, adds a `README.md`, and registers the category in `kg-config.json`.

### Manual creation

```bash
mkdir -p knowledge/lessons-learned/security
touch knowledge/lessons-learned/security/README.md
```

Then update the category detection keywords in your knowledge-capture skill if you want auto-routing:

```bash
vim ~/.claude/commands/knowledge-capture.md
# Add "security" keywords to the category mapping section
```

Categories are intentional — let them emerge from actual entries rather than pre-planning a full taxonomy.

## Project vs. personal storage paths

KMGraph supports both project-scoped and personal knowledge graphs. The storage path determines which type you are working with.

| Type | Typical path | Committed to git? |
|---|---|---|
| Project KG | `knowledge/` or `docs/knowledge-graph/` | Yes |
| Personal KG | `~/.kmgraph/` or `~/knowledge/` | No (local only) |

**Project KGs** are checked into your repository. Lessons, ADRs, and patterns are shared with the team.

**Personal KGs** live outside any repository. Use them for cross-project observations, personal working style notes, and private context that should not be committed.

See [Personal vs. Project](./personal-vs-project.md) for a full comparison and guidance on when to use each.

## Integrating with an existing project

If you are adding KMGraph to an established project that already has a `docs/` directory, avoid collisions by choosing an alternate storage path at init.

**Option 1 — Separate root:**

```bash
mkdir -p .knowledge/
# Point kg-config.json storage_path to .knowledge/
```

**Option 2 — Subdirectory within existing docs:**

```bash
mkdir -p docs/knowledge-graph/{lessons-learned,decisions,knowledge,sessions}
```

Either approach works. The key is that `storage_path` in `kg-config.json` is the single source of truth — all commands read from it.

### Linking to existing documentation

Once the KG is initialized, create entries that reference your existing docs rather than duplicating them:

```markdown
## Existing Authentication Pattern

**Quick Summary:** OAuth2 implementation with refresh tokens

**Details:** See [docs/auth/oauth-guide.md](../auth/oauth-guide.md)

**Cross-References:**
- **Related Lesson:** [[lessons-learned/security/oauth-implementation.md]]
```

## Customizing templates

Document templates control the structure of new lessons, ADRs, and knowledge entries. Edit them to match your team's conventions:

```bash
vim core/default-templates/lessons-learned/lesson-template.md
vim core/default-templates/decisions/ADR-template.md
```

Template changes affect new documents only — existing entries are not modified.

## Ongoing customization

After init, the most common configuration tasks are:

1. **Adding a new category** — `/kmgraph:kmg-add-category`
2. **Switching the active KG** — `/kmgraph:kmg-switch` (for multi-KG setups)
3. **Listing all configured KGs** — `/kmgraph:kmg-list`
4. **Editing templates** — directly in `core/default-templates/`

Avoid restructuring the directory layout after the KG is in use. Moving files breaks cross-references and FTS5 index entries. If you need to reorganize, use `kg_fts5_rebuild` after the move.

## Related

- [Personal vs. Project](./personal-vs-project.md) — where each type of config lives
- [Customize Hooks](../tailoring/customize-hooks.md) — hook-level automation configuration
