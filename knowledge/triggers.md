# Triggers — knowledge-graph (Project-Level)

> Project-level entries extend the user-level `~/.kmgraph/triggers.md`. They add conditions
> and project-specific gates but do not remove user-level triggers.

---

## Before bumping the version / on any release

- Apply: `rules.md § Version & Release > Version Files` — sync all 6 files before committing version bump
- Gate: do not commit the version bump until all 6 files are updated; do not stop after package.json and plugin.json alone
- Check: grep for the old version string across README.md and INSTALL.md to catch any missed occurrences

## When a user-facing document is moved or renamed

- Apply: `rules.md § Version & Release > Sidebar Update on Doc Rename or Move`
- Invoke: `sidebar-update` skill to detect the old sidebar entry and apply the update
- Gate: do not complete the move or rename without updating `sidebars.js`
- Also check: grep `docs/` for internal links to the old path and update them
