---
title: "Cross-platform upgrade triggering: version sentinel over startup notification"
status: Accepted
date: 2026-06-19
tags: [codex, upgrade, kg_upgrade, version-sentinel, cross-platform, ENH-022, v0.6.4, gemini-cli, antigravity, hooks, issue-32]
---
## Status

Accepted — implemented in v0.6.4 (Task 6)

## Context

Claude Code triggers `kg_upgrade` via re-running initialization (wizard flow). Codex has no wizard, no hook system, and no session-start automation. When a user installs a new kmgraph version on Codex, upgrades are silently skipped unless called manually.

Three options were considered:

1. **AGENTS.md instruction only** — tell Codex to call `kg_upgrade` at session start. No version tracking; agent has no signal for *when* upgrades are needed. Relies entirely on agent compliance.

2. **Version sentinel in config + AGENTS.md instruction** — store `lastAppliedVersion` per graph in config. `kg_upgrade` inspect surfaces a `version-update` item when installed version > stored version. AGENTS.md instruction gives Codex the trigger to check.

3. **MCP startup notification** — prepend an upgrade notice to every `kg_*` tool response when version mismatch detected. No AGENTS.md instruction needed.

## Decision

**Option 2: version sentinel + AGENTS.md instruction.**

## Rationale

- Version tracking in config is the correct source of truth — it's explicit, inspectable, and aligns with the existing `kg_upgrade` inspect pattern (check → report → apply)
- Option 3 adds noise to every tool call response, even when users have no pending upgrades; leaks upgrade state into unrelated tool outputs
- Option 1 alone has no signal — agent would call `kg_upgrade` every session indefinitely even when nothing needs upgrading
- Sentinel allows future tooling (dashboards, diagnostics) to query upgrade state without a live MCP call

## Key Design Choices

- **`absent lastAppliedVersion` = first install, not mismatch.** No `version-update` item shown on first install. Clean installs don't need migration prompts.
- **`lastAppliedVersion` written after any `apply` run**, not only after full upgrade. Partial applies update the sentinel to avoid re-prompting for categories already applied. **Updated 2026-09-07 (c2 Task 0):** also auto-advances on a clean `inspect` (nothing else pending) when installed is genuinely ahead — `version-update` is inspect-only, never a valid `apply` category, so a graph with no other pending items could otherwise never clear it via apply. Forward-direction only; never on a downgrade or equal case. The value written is now resolved from `.claude-plugin/plugin.json` (the plugin's own version), not mcp-server's independently-versioned `package.json` — the session-start hooks below can only ever read the plugin manifest, so both sides of the comparison now agree on one authority.
- **`core/default-templates/AGENTS-template.md` is canonical** for the session-start instruction. Direct `AGENTS.md` edit is upgrade-path only for existing installs.

## Consequences

- New config field `lastAppliedVersion` per graph entry (optional, backward-compatible)
- `kg_upgrade` inspect adds one more check function (`checkVersionMismatch`)
- Codex users on first install see no upgrade prompt (acceptable — clean install has correct structure)
- Existing Codex users upgrading from pre-v0.6.4 see `version-update` item on first session after install (desired behavior)

## Known Gap — found 2026-07-28, resolved 2026-09-07 (§ Amendment → Component C)

**Tracked as `issue-32`** (`knowledge/issues/issue-32/issue-32-description.md`), filed 2026-07-28 so this gap has a real ID for release-grouping purposes alongside ADR-067.

This ADR's sentinel model covers *"the installed plugin version is ahead of what this graph last applied"* — a disk-state comparison, checked at session start. It does not cover a **different, narrower case surfaced live during ADR-067's brainstorm**: an *already-running* MCP server process, spawned before an upgrade landed on disk, keeps executing its old in-memory code indefinitely — Node doesn't hot-reload — even after the upgrade completes and `lastAppliedVersion` is current. The sentinel check itself is correct and unaffected; the gap is that nothing tells a **live, already-open session** that the process serving it is now stale relative to what's installed.

**Live evidence:** at the time of writing, all 5 real MCP server processes running on this machine were on v0.6.16 code, two of them 2+ days old, while the installed plugin was newer — confirmed the more plausible root cause of a live config split-brain incident caught mid-session during ADR-067's research (see `knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md`, § Fable Review Findings, item 9), independently validated by Opus.

**Resolved 2026-09-07 — see § Amendment (2026-09-06) → Component C below for the design and its implementation.** The running process now detects its own code version is behind what's on disk and surfaces that mid-session, on every tool call, distinct from this ADR's inspect-time check.

**Clean repro, same day, before/after `/reload-plugins`:** `kg_version` reported `installed: "0.3.10"` before a plugin update+reload (itself reading the stale legacy `~/.claude/kg-config.json` — the exact split-brain § Live Split-Brain Caught Mid-Session already documents). After running `/plugin` update then `/reload-plugins`, the same tool call in the same session correctly reported `installed: "0.6.20"` — confirming a session's own process *does* pick up new code on reload. But a process listing taken at that same instant showed **6 of 8 live `mcp-server/dist/index.js` processes still running from `.../kmgraph/0.6.16/...`**, unaffected by the reload — only the two sessions that actually ran `/plugin` + `/reload-plugins` got new processes (PIDs `43105`, `41761`, both `.../kmgraph/0.6.20/...`). Every other open session, across other terminals/IDEs, keeps serving 0.6.16 indefinitely with no signal that it's now behind. This is the exact mechanism gap stated above, caught mid-repro rather than inferred.

## Amendment (2026-09-06) — Standalone command + Claude Code / Gemini CLI hook parity

**In progress — Components A and B below are approved; Component C (issue-32's per-tool-call stale-process check) is still being designed and will be folded into this same amendment once approved, rather than left as a separately-branched fix.** This keeps the full upgrade-triggering story — discovery, action, and process-level staleness — in one ADR instead of fragmented across ADR-055/issue-32/a hypothetical new ADR, per explicit direction to avoid spawning a new ADR for this effort.

**Context for this amendment:** two adjacent gaps surfaced during a 2026-09-06 brainstorm, both stemming from the same root problem this ADR already names for Claude Code in § Context — *"Claude Code triggers `kg_upgrade` via re-running initialization (wizard flow)"* — which is itself a weak trigger (nothing prompts the re-run; the user has to remember). Gemini CLI and Codex additionally get a static `AGENTS.md`/`GEMINI.md` instruction to call `kg_upgrade` every session, unconditionally — costing a real tool call even when nothing is pending.

### Component A — standalone `/kmgraph:kmg-upgrade` command

New command file `commands/kmg-upgrade.md`, a thin dispatcher (no new logic):

1. Resolve the target graph (`kg_resolve`, or `--project`/`--named` flags matching other commands' conventions)
2. Call the existing `kg_upgrade` MCP tool (inspect mode) — the same tool `/kmgraph:kmg-init`'s upgrade-inspector already calls
3. Reuse `commands/kmg-init-shared/kmg-upgrade-inspector.md` as-is for the menu/apply flow — enter it directly, skipping `/kmgraph:kmg-init`'s "existing KG detection" pre-wizard menu (nothing to detect when the user has explicitly asked for an upgrade check, not init)

`/kmgraph:kmg-init` keeps its existing "See what's new" path into the same shared module — one inspector, two entry points. This directly replaces "re-running initialization" as the *acted-upon* step referenced in § Context above.

### Component B — session-start hook parity (the *triggering* half)

Real capability check performed 2026-09-06 (web search + official docs, not assumption) across all three platforms with a hook system, since `AGENTS.md`'s "no hook system" framing in § Context was verified for Codex only and never separately checked for Gemini CLI or Antigravity:

| Platform | Hook system | Session-start-shaped event | Config location |
|---|---|---|---|
| Claude Code | Yes | `SessionStart` | `hooks/hooks.json` |
| Gemini CLI | Yes | `SessionStart` | `settings.json` |
| Antigravity CLI | Yes | **None** — only `PreToolUse`, `PostToolUse`, `PreInvocation`, `PostInvocation`, `Stop` | `hooks.json` (`.agents/` or `~/.gemini/config/`) |
| Codex | No (unchanged from original § Context finding) | — | — |

Design for the two platforms with a real `SessionStart` event:

- The hook does **not** call the `kg_upgrade` MCP tool — hooks are plain scripts, no LLM/MCP round-trip available to them. Instead it directly re-implements the cheap half of this ADR's own sentinel comparison in the hook's own language (bash for Claude Code, whatever `SessionStart` command hooks run for Gemini CLI): read installed version (`.claude-plugin/plugin.json` / plugin-cache path), read the graph's `lastAppliedVersion` from `kg-config.json` (this ADR's existing field — no new state), compare via parsed-semver (never mtime or naive string sort, per issue-32's already-established constraint).
- If `installed > lastAppliedVersion`: print a note as part of normal `SessionStart` output — no tool call, no LLM round-trip: `"KMGraph updated: vX → vY installed but not yet applied to this graph. Run /kmgraph:kmg-upgrade to review and apply."`
- This is strictly cheaper than the existing `AGENTS.md`/`GEMINI.md` pattern (Option 1/2's Codex-oriented instruction), which forces a real `kg_upgrade` tool call every session regardless of whether anything is pending. Claude Code and Gemini CLI only pay for a real inspect when the hook's own cheap check says there's something to look at.
- Codex keeps the existing `AGENTS.md` instruction unchanged (no hook system, confirmed, no alternative available).
- **Antigravity has no native fit.** Its closest event, `PreInvocation`, fires before *every* model call, not once at boot — using it would require the script to self-limit via a session-scoped sentinel file, which is a workaround, not a clean port of this pattern. **Decision: do not build this now.** Antigravity falls back to the same static text-instruction pattern as Codex until/unless a native fit is designed separately. Flagged as an explicit follow-up, not silently deferred: *verify whether a `PreInvocation` + sentinel-file approach is worth building for Antigravity once Component A/B ship and real usage data shows how many users are actually on Antigravity vs. Gemini CLI.*
- **Also flagged, not resolved:** unpaid-tier/Google One Gemini CLI users are being migrated to Antigravity CLI (per Gemini CLI's own official docs banner, transition date already passed relative to this amendment's date) — meaning the Gemini CLI `SessionStart` hook built here may serve a shrinking population. Building it anyway is still correct (real, currently-used mechanism, cheap to build, matches the Claude Code implementation almost exactly) — but Antigravity parity is the more durable investment long-term, not this amendment's problem to solve today.

**Component B: implemented 2026-09-07 (c2, `v0.7.9-c2-hook-parity`).** Commits: `f5824d3b` (lastAppliedVersion sentinel fix — prerequisite), `59fe2c75` (shared `semver_compare`), `58a1941e` (Claude Code `hooks-master.sh` nudge), `c22e88a8` (Gemini CLI hook script), `34da01ed` (deployment wiring into `/kmgraph:kmg-init` + upgrade-inspector retrofit check). Both `hooks.SessionStart` schema assumptions (flat `{type, command}` array, `systemMessage` stdout key) were confirmed against Gemini CLI's official docs (`geminicli.com/docs/hooks/`) before implementation, not left as assumptions. Codex's `AGENTS.md` instruction is unchanged (Component B never touched Codex). Antigravity's "no native fit, falls back to static text instruction" decision is unchanged (Component B never touched Antigravity either) — this is a closeout confirmation, not new work.

### Component C — per-tool-call stale-process check (closes issue-32 / § Known Gap above)

This addresses the gap Components A and B don't reach: a session that was *already open* before an upgrade landed keeps serving the *old* code indefinitely (Node doesn't hot-reload), even after `lastAppliedVersion` is current and Component B's hook has already told a *new* session about it.

**Core mechanism — unchanged from issue-32's own resolved design, approved as-is, not re-litigated here:** lives entirely inside the MCP server process (`mcp-server/src/index.ts`), so it's inherently host-agnostic — any host spawning this Node process is equally subject to the bug and gets the identical fix. At startup, capture the process's own baked-in version. On each tool call (lazy, cheap — no file-watcher), resolve the *freshest actually-installed* version via sibling-directory scan or manifest, semver-parsed, never mtime or string-sort. If installed > running: warn via the tool response text itself, addressed to the human, never self-restart (the host owns the stdio pipe to this specific PID — restarting would break the transport and destroy in-flight work).

Two points below were **open gaps in issue-32's design that Claude identified and proposed resolutions for during this 2026-09-06 brainstorm — recommendations at the time of writing, not independently verified against the live MCP SDK behavior or Antigravity's actual restart semantics.** Flagged explicitly per the user's request, including why the alternative wasn't taken:

1. **How does the warning know which host to address?** issue-32 said remediation text must differ by host but never specified how the running process identifies its caller.
   - **Recommended:** capture `clientInfo: {name, version}` from the MCP `initialize` handshake, once at startup, and key the remediation text off it. This is signal the MCP protocol already provides for free — no new tracking mechanism needed.
   - **Alternative considered and rejected:** ship one universal remediation instruction (e.g., "reload or restart your tool") regardless of host. Rejected because issue-32's own design already ruled this out explicitly ("must select the correct remediation instruction for the calling client, not state one universal instruction") — a universal instruction is either wrong or uselessly vague for at least 3 of the 5 hosts in the table below.
   - **Not independently confirmed:** whether `clientInfo` is reliably populated by every host's MCP client implementation in practice (the MCP spec requires it, but spec-compliance isn't the same as verified behavior here) — flagged as a real implementation-time check, not assumed true.

2. **What remediation instruction should Antigravity CLI get?** Not in issue-32's original host list at all (predates Antigravity's recognition as a distinct platform in this project).
   - **Recommended:** "full restart," matching Gemini CLI/Codex/Claude Desktop's fallback pattern.
   - **Why this over the alternatives:** (a) leaving no instruction for Antigravity was rejected — an unhandled host silently getting no remediation text is worse than a possibly-imperfect one; (b) blocking Component C's ship on confirming Antigravity's exact restart mechanism was rejected — it would delay a fix that's already correct and confirmed for 4 of 5 hosts, over one platform's cosmetic detail; (c) "full restart" specifically was chosen over guessing at a hypothetical reload command because nothing in Antigravity's official hook docs (checked 2026-09-06) mentions any hot-reload capability, and "full restart" is a safe fallback — worst case it costs the user an unnecessary restart, it never leaves them stuck.
   - **Not independently confirmed:** Antigravity's actual reload/restart behavior. This is a stated assumption, explicitly flagged, pending real-world confirmation.

**Host table (supersedes issue-32's original list — Antigravity added):**

| Host | Remediation instruction | Confidence |
|---|---|---|
| Claude Code | `/reload-plugins` | Confirmed (issue-32 original) |
| Claude Desktop | No reload parity — full app restart | Confirmed (issue-32 original, citing #52967) |
| Gemini CLI | Full restart | Confirmed (issue-32 original, citing #21392) |
| Codex | Full restart | Confirmed (issue-32 original) |
| Antigravity CLI | Full restart | **Assumed — Claude's recommendation, not verified** |

**Sequencing — confirmed moot, not deferred:** issue-32's own design flagged an open sequencing question against ADR-067's `index.ts` rewrite. Verified directly this session: ADR-067's `index.ts` changes (`registerCompareTools`, `personalScopeSession`) are already shipped in the current codebase. Nothing left to sequence against — this can be implemented now without the ordering constraint issue-32 originally required.

**Disposition:** this replaces the "Not designed here" line in § Known Gap above. `issue-32`'s own file should be re-targeted from its current stale `v0.7.0` branch reference to whatever branch actually ships this amendment, and its status updated once Component C lands.

**Component C: implemented 2026-09-07 (c3, `v0.7.9-c3-stale-process-check`).** Commits: `ddae32da` (freshest-installed-version resolver, `compareSemver`, `getRemediationText`), `c39e09ab` (`checkStaleProcess`), `691aea11` (wired into `index.ts` via `installStaleProcessWarning`; also relabels `upgrade.ts`'s `checkVersionMismatch` description from "Installed" to "Running", per issue-32's own resolved design § "Task 6" — the label collision this component's own warning would otherwise create with that string). Verified end-to-end against the real built `dist/index.js` via a real MCP client/server handshake, not just unit tests. The `clientInfo.name` value for Claude Code remains unconfirmed (attempted, inconclusive) — the `"claude-code"`/`"claude code"` substring match in the host table above stays a flagged assumption, same status as Gemini CLI/Codex/Antigravity's rows. See `issue-32`'s own resolution note for full detail.

## Amendment status: Components A, B, and C all implemented (2026-09-07)

Components A, B, and C were approved as of 2026-09-06 and implemented as c1/c2/c3 of the `v0.7.9-upgrade-triggering` orchestration. See each component's closeout note above for commit hashes.
