# Review Audit Protocol

**Source:** `core/rules-registry/review-audit-protocol.md`
**Personal deployment:** `~/.kmgraph/governance-rules.md § Review Audit Protocol`
**Distributed deployment:** `core/templates/knowledge/templates/user/governance-rules.md`

---

## Trigger

Fires for:
- Post-plan audit (before pushing a completed branch)
- Pre-push review (final check before `git push`)
- PR audit (reviewing an open pull request)
- Any explicit "full review" or "audit" request

Does NOT fire for:
- Casual inspection ("does this look right?", "review this file", "what do you think?")
- Inline quick checks during implementation

---

## Protocol

### Step 1: Complete review pass without interruption

Perform the full review pass top-to-bottom without stopping. For each finding that warrants investigation, dispatch a background read-only subagent as you go. Do NOT stop to discuss, implement, or wait for agent results mid-pass. Do NOT ask 'proceed?' mid-review.

### Step 2: Batched recall gate (after pass completes)

Present findings list and ask:

> "Run recall to check for prior context on any before deciding? **[all / select / skip]**"

Batch all selected findings into a single recall call. Do not run recall per-finding.

### Step 3: Display all results inline

Show agent investigation reports and recall results inline in the conversation. Do not collapse, summarize into headings only, or redirect to external files. Full content visible.

### Step 4: Present complete audit trail — HALT ONCE

After all agent reports and recall results are displayed, present the COMPLETE audit trail table covering ALL findings. This is a single halt, not one per finding.

For each finding, present a structured decision block:

---
**Finding [N]: [one-line description]**
**Severity:** [critical / high / medium / low]
**Detail:** [what was found — specific file:line or behavior]
**Recommended action:** [specific fix or recommendation]
**Decision:** fix now / ignore / track / dig deeper / discuss
---

HALT after the full table. Wait for the user to respond with a decision for each finding before implementing anything.

Do NOT stop mid-review to ask about individual findings. Do NOT ask bare "proceed?" questions. Every halt must include the finding description and recommended action.

---

## Decision Options (per finding)

| Option | Meaning | Protocol |
|--------|---------|----------|
| `fix now` | Fix immediately | Run cascade check stub first (see below); agent implements; review resumes after fix |
| `ignore` | Dismiss intentionally | Record in audit trail with reason; review continues |
| `track` | Route to issue tracking | Invoke `/kmgraph:start-issue-tracking`; review resumes |
| `dig deeper` | Investigate further | Agent investigates; return to finding after report |
| `discuss` | Open focused discussion | Take session snapshot first (`/kmgraph:session-summary --snapshot`); then discuss; resume review after |

---

## Cascade Check Stub (fires before `fix now`)

Before implementing any fix found during review, ask:

1. Does this change affect initialization scripts, user profile files, or existing graphs?
2. Is this user-local or project-wide?
3. Which tiers / platforms does this affect?

Defer to active governance framework for full protocol:
- **Now:** ENH-015 Decision Governance Protocol (`~/.kmgraph/governance-rules.md`)
- **When complete:** ENH-020 Preventive Cascade Template + Profile Ecosystem Docs

If any question is YES or UNKNOWN, classify scope before proceeding. Do not start implementation until scope is clear.

---

## Final Report Format

Present after all decisions are made:

| Finding | Severity | Recall match | Decision | Status |
|---------|----------|--------------|----------|--------|
| _description_ | critical / high / medium / low | yes / no | fix now / ignore / track / dig deeper / discuss | resolved / open / deferred |

All findings included regardless of resolution. Audit trail is permanent — do not omit dismissed items.

---

## Related

- ADR-049: Review Audit Protocol — Post-Plan/Pre-Push Review Governance
- ENH-015: Decision Governance Protocol (cascade framework authority)
- ENH-020: Preventive Cascade Template + Profile Ecosystem Docs (pending)
- `~/.kmgraph/triggers.md` — trigger condition for this rule
