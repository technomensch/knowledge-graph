# Triggers — knowledge-graph (Project-Level)

> Project-level entries extend the user-level `~/.kmgraph/triggers.md`. They add conditions
> and project-specific gates but do not remove user-level triggers.

---

## When advancing to a new v0.X.x generation (minor version bump)

- Apply: `rules.md § Version & Release > README Version-Section Lifecycle`
- Gate: condense the previous generation's Feature Highlights section to a summary block **before committing the version bump**
- Check: old generation section should have a date-range header, 6–8 summary bullets, and a CHANGELOG link — not individual sub-version entries

## Before bumping the version / on any release

- Apply: `rules.md § Version & Release > Version Files` — sync all 6 files before committing version bump
- Gate: do not commit the version bump until all 6 files are updated; do not stop after package.json and plugin.json alone
- Check: grep for the old version string across README.md and INSTALL.md to catch any missed occurrences

## When a user-facing document is moved or renamed

- Apply: `rules.md § Version & Release > Sidebar Update on Doc Rename or Move`
- Invoke: `sidebar-update` skill to detect the old sidebar entry and apply the update
- Gate: do not complete the move or rename without updating `sidebars.js`
- Also check: grep `docs/` for internal links to the old path and update them

## Before pushing to origin

- Apply: `rules.md § Version & Release > Pre-Push / Pre-Merge User-Facing Doc Sync`
- Gate: **STOP** — run `/kmgraph:kmg-update-doc --user-facing` before any `git push` and confirm user-facing docs (README, COMMAND-GUIDE, CHEAT-SHEET, GETTING-STARTED, CONCEPTS, INSTALL.md) reflect all changes on this branch
- This applies to all pushes — even small PRs can change command behavior, flags, or remove commands
- Do not run `git push` until doc sync is confirmed

## Before creating a PR

- Apply: `rules.md § Version & Release > Pre-Push / Pre-Merge User-Facing Doc Sync`
- Gate: **STOP** — confirm `/kmgraph:kmg-update-doc --user-facing` has been run on this branch before opening the PR
- Do not open the PR until docs are confirmed current
