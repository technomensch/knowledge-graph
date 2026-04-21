# Rules — Cross-Project

> User-level rules. Active across all projects. Loaded on-demand by triggers.md — keep sections scannable.
> Project-level rules.md overrides on conflict.

---

## Communication

- [Your communication preferences — e.g., concise responses, no em dashes, skip trailing summaries]

## Plan Protocol

- [Your planning conventions — e.g., always branch from correct parent, write plans to docs/plans/]

### Stuck-Work Escalation

- After 3 failed attempts on the same task: escalate to `powerful-tier` (required — no collapse)
- After 5 failed attempts: invoke exit-path analysis (options: abandon, simplify scope, reframe approach)
- Attempt count is persisted in `~/.kmgraph/.stuck-work-state.json` keyed by session UUID — survives compaction
- Counter resets on task completion or explicit session end
- The `stuck-work-escalation` skill manages this flow; invoke it explicitly when stuck

### Subagent Tier Inheritance

- Parent dispatcher resolves tier → model and passes the resolved model name to the subagent
- Subagents do not re-read `me.md` — they use the model the parent resolved
- Exception: skills with `required_tier:` frontmatter re-resolve independently (e.g., `stuck-work-escalation`)

## Profile

### Adding a model

When a model name is invoked that does not resolve to any tier in me.md:

1. Ask the user: "Which tier does [model-name] correspond to? (fast/standard/powerful)"
2. Ask: "Is this a local model? If yes, what host and port?"
3. Update `me.md` YAML frontmatter: add or update the platform entry with the new tier_map entry
4. Confirm: "Added [model-name] as [tier] for platform [platform]. You can update this at any time by editing me.md."

## Knowledge Capture

- [When to create lessons, ADRs, session summaries]
- [How to route findings: decision → ADR, pattern → lesson, pointer → memory]

## Git Workflow

- [Your commit conventions, branch naming, PR policy]
