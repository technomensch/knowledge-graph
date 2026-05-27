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

## Plan Protocol

### Recall in Plan Mode

When plan mode is active (native `/plan` command, `superpowers:writing-plans`, or any
automated planning tool such as Ultraplan), invoke the `kmgraph:recall` skill with TWO
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
