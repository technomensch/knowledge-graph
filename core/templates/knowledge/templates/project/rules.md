# Rules — [Project Name]

> Project-level rules. Loaded on-demand by triggers.md. Overrides user-level rules on conflict.

<!-- kmgraph-defaults -->
## Git Workflow

- Branch naming: [your branch format, e.g., `v{version}-{description}`]
- Commit format: `type(scope): subject` — Conventional Commits
- Never force-push to main
- Never auto-merge PRs — await user review

## Version & Release

- Sync all version files before committing a version bump
- Run `npm run build` before opening a PR that touches docs

<!-- /kmgraph-defaults -->

## Knowledge Capture

- [When to create project-specific ADRs vs. referencing user-level rules]
- [Capture threshold: what warrants a lesson vs. an ADR for this project]

## Development Workflow

- [Project-specific workflow notes — e.g., test commands, how to run locally]
