# Solution Approach: Issue-12 — Platform-guard for `kmg-execute-plan`

## Summary

Unlike issue-11 (a scan-based structural invariant over persistent file state), this fix must
act at **trigger time**, inside the skill itself, because the failure mode (wrong skill invoked)
leaves no artifact behind to scan for afterward. The investigation in
`issue-12-description.md` found no existing reusable "which platform is running this session
right now" detection mechanism in this repo — the closest analog
(`commands/kmg-setup-platform.md`) detects installed/configured platforms via project-level file
presence (e.g. `GEMINI.md` in the repo root), which answers a different question and can't be
reused for this. This makes the fix somewhat larger in scope than a pure documentation tweak: it
requires a small, new, deliberately narrow precondition check.

## Proposed fix

Add a **platform-guard precondition** to `skills/kmg-execute-plan/SKILL.md`, placed before the
existing "Prerequisite Check — Step 6.4 Sync Verification" section (i.e. the very first thing
the skill does after trigger match, before even the STRICT EXECUTION MODE banner):

1. **Precondition check:** Before surfacing the STRICT EXECUTION MODE banner, determine whether
   the current session is running under Gemini/Antigravity. Recommended detection signal
   (session-scoped, not project-scoped, so it doesn't confuse "Gemini is configured for this
   repo" with "Gemini is running right now"): check for an Antigravity/Gemini-specific runtime
   marker available at session time — e.g. an environment variable the Antigravity harness sets
   (needs confirming which one, if any, is actually exposed — this is the one open question this
   fix must resolve during implementation), or, absent a reliable env var, an explicit
   self-identification the assistant already has access to (Claude Code sessions know they are
   Claude Code; this skill's own guard can simply ask "is the current runtime Claude Code?" and
   treat "yes" as the exclusion case, since the skill's *only* intended runtime is
   Gemini/Antigravity — everything else is out of scope by design, not just Claude Code).
2. **If running under Claude Code (or any non-Gemini/Antigravity ECC platform):** do not surface
   the STRICT EXECUTION MODE banner or run the 8-step protocol. Instead, output a short redirect:

   ```
   kmg-execute-plan is scoped to Gemini/Antigravity sessions only (it was written as a
   drift-guardrail for that platform). This session is running under Claude Code — use
   superpowers:executing-plans or superpowers:subagent-driven-development instead, per the
   plan file's own "REQUIRED SUB-SKILL" header.
   ```

3. **If running under Gemini/Antigravity:** proceed exactly as today — no behavior change for
   the skill's actual intended audience.
4. **Update the "ECC Compatibility Note"** (currently line 28) to state the scoping explicitly,
   since today it reads as if Claude Code is a supported target (it describes tool-mapping for
   Claude Code without excluding it). Reword to something like: "This skill is intentionally
   scoped to Gemini/Antigravity sessions, where it originated as a drift guardrail
   (`.agent/workflows/gov-execute-plan.md`). On Claude Code and other ECC platforms, this skill
   should not fire — see the platform-guard precondition above. If ported to a new platform in
   the future where an equivalent guardrail is needed, treat this as a template to adapt, not a
   skill to broaden in place."

## Open question to resolve during implementation

Exactly which signal reliably indicates "this session is Gemini running in Antigravity" at
skill-trigger time was not conclusively identified during this investigation — no environment
variable, marker file, or existing convention surfaced in the repo search. Implementation must
either:
- (a) confirm Antigravity exposes a detectable session-level signal (env var, injected system
  context, etc.) that a skill body can check, or
- (b) fall back to the simpler asymmetric heuristic in step 1 above (Claude Code sessions can
  self-identify as Claude Code; treat "not self-identified as Claude Code" as inconclusive and
  still redirect, since kmg-execute-plan's audience is narrow and false-negatives — i.e.
  occasionally not firing for genuine Gemini/Antigravity sessions — are far less costly than the
  false-positive this issue documents (firing wrongly inside Claude Code and driving an entire
  plan execution under the wrong protocol).

This should be scoped as a single, small plan task (separate commit from issue-11's scan-based
work, per this project's commit-grain rule — different governing issues, different subsystems):
edit `skills/kmg-execute-plan/SKILL.md` to add the precondition check and redirect message, and
update its ECC Compatibility Note. No new agent, hook, or MCP tool is needed — this is a
same-file, in-skill guard.

## Out of scope for this issue

- Building a general-purpose, reusable "detect which ECC platform is running" utility for the
  whole plugin — the investigation found nothing like this exists, but inventing one is a larger
  undertaking than this fix needs. If a second skill later needs the same kind of guard, revisit
  whether to extract a shared pattern then; do not speculatively build it now for a single
  consumer.
- Modifying `skills/kmg-execute-plan/SKILL.md` itself — this document is a proposal only; the
  actual edit is deferred to a plan task (see c5's plan, to be updated in a follow-up step after
  this issue is filed).
- Retroactively auditing other skills for the same platform-scoping gap — `kmg-lesson-capture`,
  `kmg-session-wrap`, etc. all carry ECC Compatibility Notes that describe adaptive behavior
  rather than exclusion, but none of them claim to be single-platform-only tools the way
  `kmg-execute-plan` does, so they are not obviously affected. Worth a quick sanity check at
  implementation time, but not part of this issue's scope.

## Pending: GitHub issue creation

Not run. Awaiting explicit user confirmation before `gh issue create` is invoked, per this
project's Approval Gates — matching issue-11's pattern.
