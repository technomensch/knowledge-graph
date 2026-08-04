---
id: issue-36
type: Bug
status: tracked
github-issue: none
branch: none
created: 2026-07-31
related_issues: ["issue-17", "issue-18", "issue-33"]
---

# issue-36: Hook-injected instructions reference `kmgraph:recall` — a skill name that doesn't exist

## Problem

Multiple hook-injected rule texts (e.g. the "Brainstorm Recall" hard block fired during `superpowers:brainstorming`) instruct the assistant to *"invoke the `kmgraph:recall` skill (via Skill tool) with the topic as input."*

No skill named `kmgraph:recall` exists. The real options are:
- `kmgraph:kmg-auto-recall` — an actual skill
- `kmgraph:kmg-recall` — an actual command, not a skill

Attempting `Skill(kmgraph:recall)` literally as instructed fails with `Unknown skill: kmgraph:recall` — same failure shape as issue-18's `gov-capture-routing`.

## Observed twice, two different ways

1. **Reported by the user**, a different session on this same project: the assistant was told to call recall, the skill list hadn't been loaded (or wasn't checked), and it silently defaulted straight to the raw `kg_search` MCP tool — no signal that the intended routing failed, no mention it substituted a different mechanism.
2. **Self-confirmed this session**: at least one point mid-conversation, a direct `kg_search` MCP call was made without first checking for or attempting an applicable recall skill — the same silent-substitution pattern, just self-caught rather than user-caught.

## Why this matters

Same class as issue-17 and issue-18: a documented automatic-routing step references a name that doesn't resolve, and there is no defined fallback or error-surfacing behavior — the assistant improvises a substitute silently instead of the failure being visible to the user. Low-severity in isolation (the substitute, `kg_search` directly, generally still works), but it means the routing layer's intended behavior (skill-level defaults, any smarter-than-raw-search logic `kmg-auto-recall` might apply) never actually fires, with nobody noticing.

## Candidate fixes (not decided, not designed)

1. Fix the instruction text itself — say `kmgraph:kmg-auto-recall` (the real skill name), not the shorthand `kmgraph:recall`.
2. Make the failure loud when it does occur — if a referenced skill/command name doesn't resolve, say so explicitly rather than silently substituting a different tool.

## Attempted fix (2026-08-01) — incomplete, NOT closed

A first fix pass edited two personal dotfiles (`~/.kmgraph/triggers.md:107`, `~/.kmgraph/plan-execution-rules.md:50`), correcting `kmgraph:recall` → `/kmgraph:kmg-recall` (the command, not the skill — both sites describe deliberate invocation with an explicit topic/query, matching the command's own documented purpose; `kmg-auto-recall`'s own SKILL.md explicitly disclaims planning-context usage, confirming skill would have been the wrong choice at both sites).

**Independent Opus review verdict: NOT SATISFIED — the actual reported source was never touched.**

The real, live-firing source of this bug is **`scripts/pre-skill-rules-inject.sh`** (in this git repo, not a dotfile) — it still contains the exact text this issue quotes, at 4 locations:
- Line 160 — Brainstorm Recall hard block, verbatim: *"Before making any recommendation, invoke the `kmgraph:recall` skill (via Skill tool) with the topic as input."*
- Line 168 — Debug Recall hard block, same wording
- Line 183 — `2. Review Context — invoke kmgraph:recall with each modified file path or concept as input.`
- Line 215 — `1. Invoke the kmgraph:recall skill (via Skill tool) with TWO queries` — **this is the hook-injected twin of the now-fixed `plan-execution-rules.md:50` line, and the two now directly contradict each other** (dotfile says "command," hook still says "skill").

Both live plugin-cache copies of this script are also still stale and uncorrected:
- `~/.claude/plugins/cache/stayinginsync-knowledge-graph/kmgraph/0.6.20/scripts/pre-skill-rules-inject.sh`
- `~/.claude/plugins/marketplaces/knowledge-management-graph/scripts/pre-skill-rules-inject.sh`

(`~/.kmgraph/hooks/pre-skill-rules-inject.sh` has zero recall refs — confirmed stale/unused, not the live path.)

**4 additional instances of the identical bug class found during review, same missing-`kmg-`-prefix pattern, none yet fixed:**
- `~/.kmgraph/triggers.md:131, 176, 189` — `/kmgraph:sync-all` → should be `/kmgraph:kmg-sync-all`
- `~/.kmgraph/plan-execution-rules.md:22` — `` `stuck-work-escalation` skill `` → should be `kmgraph:kmg-stuck-work-escalation`
- `~/.kmgraph/knowledge/kg-category-index-global.md:95` — `/kmgraph:recall "query"` → should be `/kmgraph:kmg-recall`

**Scope note for whoever picks this up:** `scripts/pre-skill-rules-inject.sh` is real project code (checked into this repo), not a personal-dotfile fix like the rest of this issue — a real branching decision, since it's unrelated to any in-progress feature branch. Currently sitting uncommitted on `v0.7.0` (the ADR-067 branch) purely as an artifact of when this was investigated — recommend NOT bundling it into that branch, since it's unrelated to KG resolution.

To reach SATISFIED: fix all 4 `pre-skill-rules-inject.sh` occurrences + resync both plugin-cache copies, plus the 4 additional same-class references above.

## Related

- issue-17 (`knowledge/issues/issue-17/`) — same class: automatic trigger vocabulary that doesn't actually fire
- issue-18 (`knowledge/issues/issue-18/`) — same class, same failure shape (`Unknown skill: kmgraph:gov-capture-routing`), same "Decision Fork" question applies here too (fix the reference vs. accept the fallback as the real behavior)
- issue-33 (`knowledge/issues/issue-33/`) — different failure mode, same recall-subsystem neighborhood (pointers not dereferenced, vs. this issue's name-doesn't-resolve)

## Status

Tracked, not closed — first fix attempt (2026-08-01) was incomplete per independent Opus review; see "Attempted fix" above for exactly what's still broken. Branch/scope decision (separate from `v0.7.0`) being made in a different planning session as of this update.
