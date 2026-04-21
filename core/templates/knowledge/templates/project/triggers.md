# Triggers — [Project Name] (Project-Level)

> Project-level entries extend the user-level `~/.kmgraph/triggers.md`. They add conditions
> and project-specific gates but do not remove user-level triggers.

---

## Before bumping the version / on any release

- Gate: do not commit the version bump until all version files are synced
- Apply: `rules.md § Version & Release`
- Check: grep for the old version string across README.md and any install docs to catch missed occurrences

## When a user-facing document is moved or renamed

- Gate: do not complete the move or rename without updating the sidebar/nav config
- Apply: `rules.md § Development Workflow > Sidebar Update on Doc Rename or Move`
- Also check: grep `docs/` for internal links to the old path and update them

## When using an unrecognized model name

- Gate: model name invoked does not resolve to any tier in me.md YAML frontmatter
- Apply: `~/.kmgraph/rules.md § Profile > Adding a model` (user-level rule)
- Flow: prompt to add model to user profile me.md
