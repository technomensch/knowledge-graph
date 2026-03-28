# ADR-020: Lifecycle Hooks Suite for Automated Knowledge Capture

**Date:** 2026-03-27
**Status:** Accepted
**Implements:** v0.2.0-beta — Lifecycle Layer
**Related:** [ADR-017](ADR-017-four-layer-architecture-thin-commands.md), [ADR-012](ADR-012-hook-security-model.md)

---

## Context

Before v0.2.0-beta, knowledge capture required explicit manual invocation of `/kmgraph:capture-lesson` or `/kmgraph:session-summary`. The only lifecycle automation was a `SessionStart` hook that displayed recently modified lessons. There was no mechanism to:

- Prompt for lesson capture at the moment a significant change was made
- Offer a session summary at the end of a session automatically
- Intercept a `git commit` and check for undocumented lesson-worthy changes
- Notify external systems (Slack, webhooks) when knowledge was saved
- Mirror plan files from `~/.claude/plans/` to the project's `docs/plans/` automatically

The result was knowledge leakage: insights were lost because users had to remember to invoke commands at the right moment.

**Problem:**
- Capture is friction-heavy — requires knowing a command name and remembering to run it
- Session end is the highest-risk moment for knowledge loss; no automation existed
- Pre-commit is the last chance to capture before a change is pushed; no check existed
- Multi-project users needed plan file mirroring across locations
- No notification path for team awareness of captured knowledge

---

## Decision

Introduce a six-script lifecycle hook suite, each script narrowly scoped to one moment and one behavior:

| Hook type | Script | Moment | Behavior |
|---|---|---|---|
| PostToolUse (Write/Edit) | `scripts/post-tool-lesson-check.sh` | After a file write | Check for lesson-worthy keywords; prompt if found |
| Stop | `scripts/session-end-prompt.sh` | Session end signal | Check open plans, draft ADRs, uncaptured commits; offer session summary |
| PreToolUse (Bash, git commit) | `scripts/pre-commit-knowledge-gate.sh` | Before `git commit` | Check staged diff for undocumented lesson-worthy changes |
| Notification | `scripts/notification-dispatch.sh` | After lesson/ADR save | POST to configured webhook URL (off by default) |
| PostToolUse (Write, platform files) | `scripts/platform-file-change-check.sh` | After CLAUDE.md / GEMINI.md / etc. modified | Prompt to sync platform config to other platforms |
| PostToolUse (Write, `~/.claude/plans/`) | `scripts/plan-mirror.sh` | After plan file written to `~/.claude/plans/` | Mirror file to `docs/plans/` in active KG project |

All scripts are registered in `hooks/hooks.json`.

### Design Constraints (from ADR-012)

All scripts must comply with the hook security model:

- No `eval` or dynamic code execution
- No network requests (except `notification-dispatch.sh` to explicitly configured URL)
- No modifications to files outside the active KG path
- All scripts are idempotent — safe to run multiple times
- Scripts exit 0 silently when no action is needed — hooks must never create noise

### Session-End Double-Fire Prevention

`session-end-prompt.sh` writes a PPID-scoped flag file at `/tmp/.kg-session-summarized-{PPID}-{YYYYMMDD}`. If the flag exists, the script exits silently. The flag is scoped to the parent process ID so it is session-specific — multiple terminal windows don't interfere. Flag files older than 24h are cleaned up on each run to prevent `/tmp/` accumulation.

### Lesson-Worthy Signal Detection

`post-tool-lesson-check.sh` and `pre-commit-knowledge-gate.sh` scan for lesson-worthy signals using keyword matching (`fix`, `solved`, `debug`, `error`, `pattern`, `workaround`, etc.) in the hook input JSON. Matching on keywords, not just file path, minimizes false positives — a Write to `src/auth.ts` without any lesson-worthy context in the hook payload will not trigger a prompt.

---

## Rationale

### Why Lifecycle Hooks (not polling or background processes)

Claude Code lifecycle hooks fire at deterministic moments within the normal workflow — after a tool use, before a bash command, at session end. This means:

1. **Zero polling overhead** — scripts run only when relevant events occur
2. **Context availability** — hook payloads include tool name, file path, and command, giving scripts the context needed to make intelligent decisions
3. **User in the loop** — hooks prompt; they do not auto-write. The user always approves before anything is saved
4. **Composable** — six narrow scripts are easier to test and maintain than one large script

### Why Six Separate Scripts (not one master hook)

Each script handles exactly one concern at exactly one moment. A bug in session-end handling does not affect the pre-commit gate. Scripts can be enabled or disabled individually in `hooks.json`. This follows the same single-responsibility principle as the agent layer (ADR-017).

Note: `hooks-master.sh` (the existing SessionStart hook from v0.0.9) remains separate and unchanged. It handles session start configuration (active KG display, MCP server health check, auto-switch logic). The new six scripts handle capture moments during and at the end of a session.

### Alternatives Considered

**Option A: Single mega-hook script routing all events**
- Pros: One file to maintain
- Cons: A bug in any branch of the routing logic affects all hooks; harder to test; harder to disable one behavior without affecting others
- Rejected: Violates single-responsibility; conflicts with ADR-012 hook security model guidance on scope

**Option B: Inline hook logic in `hooks.json` (no shell scripts)**
- Pros: All hook logic in one file
- Cons: `hooks.json` supports only `command` strings — complex logic requires scripts; inline commands cannot be unit-tested
- Rejected: Not feasible for multi-line logic

**Option C: Agent-only (no scripts; hooks dispatch directly to agents)**
- Pros: Simpler; agents already exist
- Cons: Hook payloads are raw JSON; agents need parsed context. Shell scripts are better suited for parsing hook JSON and making fast keyword-matching decisions before deciding whether to surface a prompt at all
- Partial adoption: The Stop hook calls `session-end-prompt.sh`, which surfaces a prompt that then dispatches to `session-summary-agent`. Scripts handle detection; agents handle execution. This is the correct boundary.

---

## Consequences

### Positive

1. **Reduced knowledge leakage:** Users are prompted at the right moment — after significant writes, before commits, and at session end — rather than needing to remember command names
2. **Zero-friction session wrap-up:** The Stop hook detects session end signals, checks for open plans and draft ADRs, and offers a summary before context is lost
3. **Pre-commit safety net:** Lesson-worthy changes are flagged before they are committed without documentation
4. **Platform file hygiene:** Modifications to CLAUDE.md, GEMINI.md, etc. trigger a sync reminder automatically

### Negative

1. **Hook noise risk:** If keyword matching is too broad, users receive too many prompts. Initial calibration required — the `post-tool-lesson-check.sh` keyword list may need tuning based on real-world usage
2. **PPID dependency:** Session-end double-fire prevention uses PPID, which works correctly in terminal sessions but may behave unexpectedly in some non-interactive or scripted environments
3. **Platform dependency:** Claude Code lifecycle hooks only. Non-Claude Code platforms (Gemini CLI, Cursor) do not have equivalent hook systems — `AGENTS-template.md` (ADR-018) provides behavioral guidance for those platforms, but lifecycle automation is absent

### Neutral

1. **User approval preserved:** All hooks prompt; none auto-write. This is consistent with the principle that the knowledge graph reflects deliberate human decisions, not automated inferences
2. **Notification is opt-in:** `notification-dispatch.sh` is a no-op unless a `webhookUrl` is configured in `kg-config.json`. Default behavior is silent

---

## Implementation

**Timeline:** Implemented 2026-03-27 in v0.2.0-beta (Phase 1)

**Affected Components:**
- `scripts/post-tool-lesson-check.sh` — new
- `scripts/session-end-prompt.sh` — new
- `scripts/pre-commit-knowledge-gate.sh` — new
- `scripts/notification-dispatch.sh` — new
- `scripts/platform-file-change-check.sh` — new
- `scripts/plan-mirror.sh` — new
- `hooks/hooks.json` — updated with 6 new hook entries

**Removed:**
- `scripts/check-memory.sh` — merged into `hooks-master.sh` in v0.0.9
- `scripts/recent-lessons.sh` — merged into `hooks-master.sh` in v0.0.9
- `scripts/memory-diff-check.sh` — merged into `hooks-master.sh` in v0.0.9

---

## Validation

**Success Criteria:**
- ✅ All 6 scripts are idempotent and exit 0 silently when no action is needed
- ✅ `session-end-prompt.sh` PPID flag prevents double-fire within the same session
- ✅ `post-tool-lesson-check.sh` fires only when lesson-worthy keywords are present in the hook payload
- ✅ `pre-commit-knowledge-gate.sh` prompts for source file changes, silent for docs-only changes
- ✅ `notification-dispatch.sh` exits cleanly with no error when no webhook URL is configured
- ✅ `plan-mirror.sh` mirrors `~/.claude/plans/` writes to `docs/plans/`

Validated in Phase 7a functional tests (2026-03-27).

**Review Date:** 2026-09-27 — reassess keyword matching false-positive rate; consider user-configurable keyword lists

---

## Related Decisions

- **[ADR-012](ADR-012-hook-security-model.md):** Hook security model — all scripts comply
- **[ADR-017](ADR-017-four-layer-architecture-thin-commands.md):** Four-layer architecture — hooks are the lifecycle layer; dispatch to the agent layer for execution
- **[ADR-018](ADR-018-agents-template-platform-portability.md):** AGENTS-template — provides behavioral guidance for platforms without hook systems

---

## Related Documentation

**Implementation:**
- `docs/plans/v0.2.0-beta-master.md` — Phase 1 (hook suite)
- `docs/plans/v0.2.0-beta-phase-7a-haiku-tests.md` — Category 1: Hook Script Functional Tests

---

**Decision Made:** 2026-03-27
**Last Updated:** 2026-03-27
**Status:** Accepted
