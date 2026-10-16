# Attempt 001: Mechanical checks in kmg-paperwork-audit

**Attempt #:** 001
**Hypothesis:** Prose enforcement of the folder-to-log-header pairing has failed repeatedly; a mechanical, grep-able check in `kmg-paperwork-audit` will catch the drift.
**Distinct from prior attempts:** First attempt (no prior attempts).
**Success criterion:** The new Step 5 scripts run correctly under bash and zsh against real repo data and report drift.

**Date Started:** 2026-08-13
**Status:** In Progress

## Approach

Add a new Step 5 to `skills/kmg-paperwork-audit/SKILL.md` containing (a) a folder-to-log-header invariant check and (b) a README size guardrail; renumber the old Step 5 (Report) to Step 6. Update the meta-issue scaffold README comment and `core/docs/META-ISSUE-GUIDE.md` to point at the atomic `--add-attempt` path.

Plan: `v0.7.1.4-issue-45-meta-issue-attempts-paperwork-drift.md` (local-only, gitignored). Reviewed by an independent Opus pass, then a codex review of the section-2 script, with findings verified against the repo.

Full narrative: [implementation-log.md](../../implementation-log.md) (Attempt 001).
