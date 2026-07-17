---
id: issue-22
type: Bug
status: deferred
github-issue: "#184"
branch: none
created: 2026-07-17
---

# Issue-22: Init wizard's "selective" git strategy is misleading about what it actually excludes

## Problem

During the same live Codex CLI installation session as issue-21, the init wizard asked the user to choose a git strategy — **all committed / all ignored / selective** — applied per-category across five categories: architecture, process, patterns, debugging, governance.

The user (also this project's own author) reasonably assumed "selective" would let them exclude `sessions/`, `chat-history/`, `decisions/`, and `lessons-learned/` from git — i.e., control which *structural folders* get committed. It does not. When asked directly ("what does this step actually call for"), Codex's own assistant correctly explained:

> "The selective setting applies only to lesson categories in KMGraph's configuration. It does not create `.gitignore` rules and does not control `sessions/`, `chat-history/`, `decisions/`, or `lessons-learned/`."

So "selective" only toggles commit-vs-ignore for the five *content categories* (architecture/process/patterns/debugging/governance) — a narrower and different scope than what the prompt's framing leads a reasonable user to assume.

## Why this matters

This isn't just a wording nitpick — the mismatch creates real risk: a user could pick "selective," believe they've excluded `sessions/`/`chat-history/`/`decisions/`/`lessons-learned/` from version control, and then unknowingly commit private or sensitive content in those folders because the wizard never actually asked about them and gives no signal that they need separate handling (a manual `.gitignore` edit, per Codex's own follow-up suggestion).

## Suspected fix direction (not designed — Mode 3, no implementation planned)

Either:
(a) clarify the wizard's prompt/copy so "selective" is explicitly scoped to the five content categories only, with an explicit follow-up question about `sessions/`/`chat-history/`/`decisions/`/`lessons-learned/` git handling, or
(b) actually expand "selective" to cover those structural folders too, if that's closer to what users expect.

Which direction is correct is a real product decision, not obvious — deliberately not decided here.

## Related

- Found in the same live session as issue-21 (Codex CLI install/init).
- Cross-platform note: this was surfaced via Codex's own assistant correctly explaining kmgraph's actual behavior — the confusion originates in this project's wizard copy, not in Codex's handling of it.

## Status

Deferred (Mode 3 — track only). No branch created, no implementation planned yet. Needs a product decision on which direction (a or b) before scoping a fix.
