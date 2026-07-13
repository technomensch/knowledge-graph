---
id: issue-12
type: Hardening
status: tracked
github-issue: "#N"
branch: v0.6.18-misc-patches (deferred — additional commit on the existing shared branch once planned)
created: 2026-07-12
related-adrs: []
related-enhs: []
---

# Issue-12: `kmg-execute-plan` fires in Claude Code sessions despite being a Gemini/Antigravity-only guardrail

## Problem

During this session, while executing implementation plans (c0–c5) for branch
`v0.6.18-misc-patches` in a Claude Code session, the user said "start" and the assistant
invoked `kmgraph:kmg-execute-plan` — a project skill that surfaces a "STRICT EXECUTION MODE"
banner and enforces an 8-step zero-deviation protocol (literal mapping, checkpoint-every-3-edits,
Step 6.4 ROADMAP/CHANGELOG sync gate, etc.). It fired because its trigger keywords
("start [plan-file]", "execute plan", "any mention of explicit plan-based execution") matched,
it's listed in this project's `CLAUDE.md` Skills section, and a prior session's summary had
mentioned using it.

But the plan files actually in use (authored via `superpowers:writing-plans`) each carry their
own header: *"REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or
`superpowers:executing-plans`"* — a completely different, unrelated skill family from a different
plugin ecosystem (`superpowers`, not `kmgraph`).

The assistant used the wrong skill initially. The user then clarified the actual intended scope
of `kmg-execute-plan`: it (originally `.agent/workflows/gov-execute-plan.md`) was written
specifically as a guardrail for **Gemini running in Antigravity**, because Gemini would go
off-rails/tangent without heavy strict-mode banners and a rigid step protocol. It was never
intended to run in Claude Code sessions, where `superpowers:executing-plans` /
`superpowers:subagent-driven-development` are the correct, already-designed-for-this-platform
tools.

## Root cause

Nothing in `skills/kmg-execute-plan/SKILL.md` gates it to only fire on Gemini/Antigravity. It
ships in the same cross-platform `kmgraph` plugin as every other skill, with trigger keywords
broad enough to match in any ECC (Editor-Coding-Companion) platform, including Claude Code,
where it is actively the wrong tool: it duplicates/conflicts with `superpowers`' own
plan-execution skills, and its 8-step protocol (literal mapping, per-edit integrity audits,
checkpoint-every-3-edits) is calibrated for a model (Gemini) with a different tendency to drift,
not for how Claude Code sessions are meant to run plans.

The skill file does carry an "ECC Compatibility Note" (line 28 of
`skills/kmg-execute-plan/SKILL.md`):

> "The banner above uses generic tool categories (file read/edit/write, shell) to maintain
> portability across ECC platforms. On Claude Code, these map to Read, Edit, Write, and Bash
> tools. On other platforms, the underlying MCP or native tool implementations are used
> automatically. The constraint semantics remain identical: no authorization changes outside
> the plan."

This note assumes the skill *should* run on Claude Code too (it describes tool-mapping for
Claude Code, not exclusion of Claude Code) — it documents portability, not scoping. There is no
statement anywhere in the file restricting it to Gemini/Antigravity, despite that being its
actual designed purpose per the user's clarification. The `**Source:**` line ("Adapted from
`.agent/workflows/gov-execute-plan.md`") is the only trace of its Gemini/Antigravity origin, and
it carries no scoping semantics — it reads as changelog/provenance, not a runtime precondition.

## Investigation: does a reusable platform-detection pattern already exist?

Searched `skills/`, `commands/`, and `core/` for any existing convention that lets a skill
determine *which platform/CLI is currently running it* (Claude Code vs. Gemini/Antigravity vs.
Codex vs. other ECC platforms), specifically to check whether this fix could reuse something
rather than invent it.

**Found:** six skills carry an "ECC Compatibility Note" or "Natural Language & ECC Compatibility"
section — `kmg-lesson-capture`, `kmg-rules-capture`, `kmg-execute-plan`, `kmg-session-wrap`,
`kmg-capture-router`, `kmg-doc-update-router`. Every one of these describes how the *same*
skill's output/dispatch mechanism should adapt once you already know the platform (e.g. "On
Claude Code, map to Read/Edit/Write/Bash; on other platforms, use native MCP/agent dispatch").
None of them contains logic to *detect* the platform at runtime, and none of them uses that
information to decide whether the skill should fire at all — they only adjust *how* it behaves
once it has already fired. This is a materially different problem from what issue-12 needs
(a precondition that suppresses firing entirely on the wrong platform).

Also checked `commands/kmg-setup-platform.md`, which does contain a detection mechanism —  but
it detects which platforms are *installed/configured in this project* (e.g. presence of a
`GEMINI.md` file in the project root, or `.cursorrules`, to decide whether to offer to configure
that platform), not which platform is *currently executing the running session*. A repo can have
both `GEMINI.md` (Gemini configured) and be actively driven by a Claude Code session at the same
time — file-presence-in-project detection cannot distinguish "Gemini is configured for this repo"
from "Gemini is the CLI currently reading this SKILL.md file right now." These are different
questions; the existing mechanism answers the wrong one for this fix's purposes.

**Conclusion:** No existing mechanism in this repo answers "what platform/CLI is running this
session right now, at skill-trigger time." The `ECC Compatibility Note` sections describe
platform-adaptive *behavior*, not platform-gating *preconditions*. This means the fix needs to
either invent a lightweight runtime marker (session-scoped, not project-scoped) or fall back to
a simpler heuristic. See `solution-approach.md` for the proposed mechanism and why it doesn't
require inventing broad new infrastructure.

## Why this is a distinct issue from issue-11, not the same one

Both issue-11 and issue-12 are instances of the same root-cause *family*: multiple mechanisms
overlap in responsibility, nobody arbitrated which one should win, and the wrong (or no)
mechanism fires silently. This is the same pattern already cross-linked this session between
ENH-026 ↔ ENH-034 ↔ ENH-042, and between ENH-027 ↔ issue-11 — deliberately kept as separate,
cross-linked issues rather than merged, because the concrete fix mechanics differ:

- **issue-11's fix** is a scan that inspects *resulting artifact file state* — a missing
  `github_issue` frontmatter field on a spec folder. This works regardless of which command
  produced the file, because the failure leaves a durable, scannable trace sitting in the
  repository indefinitely.
- **issue-12's fix** has no file-state trace to scan for. The failure is "the wrong skill fired
  at trigger time" — a one-time conversational event with nothing left behind afterward once the
  (wrong) protocol has been invoked and abandoned. There is no folder, frontmatter field, or file
  to inspect after the fact. The fix must instead be a **precondition/platform-guard added to
  `kmg-execute-plan`'s own trigger logic** — refuse to fire (or redirect to
  `superpowers:executing-plans` / `superpowers:subagent-driven-development`) when the session is
  not running under Gemini/Antigravity.

Given this mechanical difference (scan-after-the-fact vs. guard-at-trigger-time), merging these
into one issue would obscure that they require entirely different remediation shapes.

## Related

- [issue-11](../issue-11/issue-11-description.md) — same root-cause family (overlapping
  mechanisms, no arbitration, wrong/no mechanism fires silently), deliberately not merged; see
  "Why this is a distinct issue" above for the fix-mechanics comparison.
- `skills/kmg-execute-plan/SKILL.md` — the skill needing the platform-guard (not modified by
  this issue; documentation/proposal only).

## Pending: GitHub issue creation

Per this project's Approval Gates, `gh issue create` has **not** been run for this issue. This
is left as an explicit pending step awaiting user confirmation, matching how issue-11's own
documentation handles the same gate (issue-11's `github-issue` frontmatter is also the `"#N"`
placeholder, not yet created).
