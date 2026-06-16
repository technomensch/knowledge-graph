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

## Plan Protocol

### Recall in Plan Mode

When plan mode is active (native `/plan` command, `superpowers:writing-plans`, or any
automated planning tool such as Ultraplan), invoke the `kmgraph:kmg-recall` skill with TWO
queries before making any plan recommendations:
1. The specific plan topic
2. The architectural domain of the change (rules, deployment, platform, cross-LLM, etc.)

Running only the topic query misses architectural ADRs and ENHs that constrain the work.

**Recall results take priority — reason about findings before recommending:**
- If recall surfaces a rejected approach, examine WHY it was rejected and whether that reason is still applicable.
- If still applicable: do not propose the approach; if unavoidable, explain why no workaround exists.
- If no longer applicable: may propose it, but must document why the old rejection no longer holds AND lay out full cascade impact on the project.
- If it is the only viable option: propose it, but lay out complete ramifications and cascade effects across all affected systems, skills, decisions, and docs.
- If recall finds nothing: write "No prior art found for [topic]." and proceed.

Include findings under a "## Prior Art" section at the top of the plan.
Do not skip — plan recommendations made without context contradict existing decisions.
