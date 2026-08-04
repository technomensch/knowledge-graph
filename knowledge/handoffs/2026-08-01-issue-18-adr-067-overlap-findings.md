# Handoff: issue-18 (`gov-capture-routing`) Overlaps with In-Progress ADR-067 Work

**Type:** Findings/recommendation only — no code changes, no edits to ADR-067 or its implementation plan/spec. That work is owned by a separate concurrent session (per user instruction, this session did not touch `knowledge/decisions/ADR-067-*` or `knowledge/plans/v0.7.0-adr-067-kg-resolution.md`).

**Continues from:** `knowledge/issues/issue-18/issue-18-description.md` (recall investigation this session), and is a direct input to whichever session owns ADR-067 implementation next.

## Finding

While specing a fix for issue-18 (`gov-capture-routing` skill referenced by 8+ commands/agents, unreachable via the Skill tool), a real overlap with ADR-067 surfaced:

1. **Functional overlap:** `gov-capture-routing`'s job (per its 5 command call sites — `kmg-sync-all.md`, `kmg-recall.md`, `kmg-session-summary.md`, `kmg-capture-lesson.md`, `kmg-create-adr.md`) is: detect a level signal from NL or explicit flags (`--user`/`--project`/`--named=<kg>`/`--active`), resolve `$level`/`$target_kg`/`$target_path`/`$restore_kg`, and handle prompts (named KG not found, no project KG configured, conflict resolution). `ADR-067-implementation-spec.md` §11 designs a **new** `[personal]`/`[project]` bracket-marker syntax as a one-shot override on top of cwd-derived default resolution — the same category of decision, different (and actually shippable) mechanism.

2. **Concrete breakage risk if issue-18 is ever "fixed" rather than retired:** `commands/kmg-sync-all.md`'s `gov-capture-routing` pass-down contract explicitly says *"If `--project` triggers a KG switch, the switch occurs before sub-captures begin. After all sub-captures complete, restore with `/kmgraph:kmg-switch {$restore_kg}`."* ADR-067's own stated Goal is to **retire `kmg-switch`/`kg_config_switch`/`KG_MISMATCH`** entirely, replacing the mutable `.active` pointer with context-derived resolution. If `gov-capture-routing` were migrated into the repo and made invocable (issue-18's "fix" path) without also being rewritten against ADR-067's new resolution/restore mechanism, it would call a command that no longer exists post-ADR-067.

3. **No overlap found in ADR-067 or its implementation spec today** — grepped both for `capture-level`/`capture-routing`/`gov-capture`/`--user`/`--project`/`--named`/`--active`: zero hits. ADR-067 was designed without awareness of `gov-capture-routing`'s existence or its flag vocabulary. This is not a criticism — `gov-capture-routing` has been silently non-functional for 3+ months (issue-18's own "Priority Reassessment"), so there was no reason for ADR-067's design sessions to have surfaced it via recall.

## Recommendation (not yet decided — surfacing for the ADR-067 owner to weigh)

- issue-18's own "Decision Fork" (fix vs. retire `gov-capture-routing`/ADR-034) should probably be **decided in light of ADR-067**, not independently. If ADR-067's `[personal]`/`[project]` marker + cwd-derived resolution is judged to functionally subsume what `gov-capture-routing` was trying to do for these 5 commands, that's a strong lean toward **retire** — closing issue-18 by removing the 8 dead invocations and marking ADR-034 superseded by ADR-067, rather than spending effort fixing a mechanism ADR-067 is about to make redundant.
- If ADR-067's implementation plan (`v0.7.0-adr-067-kg-resolution`) proceeds without addressing this, recommend at minimum a note in that plan or in ADR-067 itself acknowledging `gov-capture-routing`'s existence and the `kmg-sync-all.md` restore-step dependency, so a future reader doesn't rediscover this collision from scratch.
- Not recommending any change to ADR-067's scope or the in-progress plan from this session — flagging only, per the concurrent-session boundary.

## Related

- `knowledge/issues/issue-18/issue-18-description.md` — full issue, including this session's recall findings (2026-08-01) and the `gov-` naming provenance trace
- `knowledge/issues/issue-36/issue-36-description.md` — second, independent instance of the same "phantom skill reference" failure class; same Decision Fork question applies there too
- `knowledge/decisions/ADR-034-capture-level-routing-dispatcher-agent-split.md` — original design ADR for `gov-capture-routing`
- `knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md` + `ADR-067-implementation-spec.md` — in-progress, owned by a separate session
- `knowledge/plans/v0.7.0-adr-067-kg-resolution.md` — the C1 implementation plan on this same branch

## Approval gate

This handoff is new/uncommitted, as is everything else on this branch pending user review. No `git add`/`git commit`/`git push` run. No edits made to any ADR-067 file.
