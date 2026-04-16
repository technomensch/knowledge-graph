# Triggers — knowledge-graph (Project-Level)

> Project-level entries extend the user-level `~/.kmgraph/triggers.md`. They add conditions
> and project-specific gates but do not remove user-level triggers.

---

## When a user-facing document is moved or renamed

- Apply: `rules.md § Version & Release > Sidebar Update on Doc Rename or Move`
- Invoke: `sidebar-update` skill to detect the old sidebar entry and apply the update
- Gate: do not complete the move or rename without updating `sidebars.js`
- Also check: grep `docs/` for internal links to the old path and update them
