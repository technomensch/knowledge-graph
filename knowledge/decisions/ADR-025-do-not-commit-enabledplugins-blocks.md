---
title: "ADR-025: Do not commit `enabledPlugins` blocks in `.claude/settings.json`"
number: 025
created: 2026-04-06T00:00:00Z
status: Accepted
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: v0.2.3.2-beta
  commit: 499360b99abc98559a51a6ae2ee1f706ebfd93af
  pr: null
  issue: null
implements: null
related:
  adrs: []
  lessons:
    - Lessons_Learned_Plugin_Settings_Scope_Consistency.md
  kg_entries: []
tags: [process]
category: process
---

# ADR-025: Do not commit `enabledPlugins` blocks in `.claude/settings.json`

**Date:** 2026-04-06
**Status:** Accepted
**Implements:** None
**Related:** [Lessons_Learned_Plugin_Settings_Scope_Consistency.md](../lessons-learned/patterns/Lessons_Learned_Plugin_Settings_Scope_Consistency.md)

---

## Context

The knowledge-graph plugin's own repo contains a committed `.claude/settings.json` file with an `enabledPlugins` block referencing `kmgraph@stayinginsync-knowledge-graph`. Any developer cloning the repo inherits this entry, which creates an orphaned reference (no matching install record in `~/.claude/plugins/installed_plugins.json`). This causes `claude plugin uninstall` to fail with "not installed in scope" errors. The `.claude-plugin/plugin.json` auto-detection already loads the plugin in the dev environment, making the committed `enabledPlugins` block redundant and harmful.

**Problem:**
- Committed `enabledPlugins` entries bind to a developer's local plugin install scope
- Cloners inherit a scope reference with no corresponding install record
- Plugin manager state reconciliation fails on uninstall with "not installed in scope"

**Scope:**
- In scope: `.claude/settings.json` committed to project repos for Claude Code plugins
- Out of scope: `settings.local.json` (gitignored, developer-local)
- Constraint: `.claude-plugin/plugin.json` auto-detection is the correct loading mechanism in dev

---

## Decision

Do not commit `enabledPlugins` blocks in `.claude/settings.json`. Rely on `.claude-plugin/plugin.json` auto-detection for local plugin loading in development. If project-wide settings must be committed, use only non-scope-dependent configuration (env vars, feature flags, search settings).

### Core Components

1. **Remove `enabledPlugins` from committed settings:** Strip any existing `enabledPlugins` block from `.claude/settings.json` before committing.
2. **Rely on auto-detection:** `.claude-plugin/plugin.json` presence triggers automatic plugin loading in the development repo — no explicit enable needed.
3. **Scope-safe committed settings:** Only commit settings that do not reference install-scope identifiers (plugin names, user-scoped entries).

### Implementation Approach

- Remove the `enabledPlugins` block from the committed `.claude/settings.json` in this repo
- Add a comment or note in `settings.json` (or CONTRIBUTING docs) explaining why `enabledPlugins` is absent
- Apply this pattern to all Claude Code plugin repos going forward

---

## Rationale

### Why This Approach

1. **Auto-detection suffices:** `.claude-plugin/plugin.json` auto-detection handles plugin loading in the development repo — no explicit enable needed.
2. **Scope isolation:** Committed `enabledPlugins` entries create orphaned scope references for all developers who clone the repo.
3. **Uninstall safety:** Scope mismatches block uninstall and confuse the plugin manager's state reconciliation.

### Alternatives Considered

**Option A: Keep `enabledPlugins` in committed settings**
- Pros: Explicit; new contributors see plugin is enabled
- Cons: Creates orphaned references; breaks `plugin uninstall`; misleading for non-owners
- Rejected because: Causes concrete breakage for all cloners

**Option B: Document the issue in CONTRIBUTING.md only**
- Pros: No file changes needed
- Cons: Doesn't fix existing broken state; relies on developers reading docs before hitting the error
- Rejected because: Reactive, not preventive

### Trade-offs

**Benefits:**
- ✅ Developers no longer inherit broken uninstall state
- ✅ Plugin manager's install registry stays clean across clones
- ✅ Pattern applicable to all Claude Code plugin repos

**Costs:**
- ❌ Developers must manually enable the plugin in `settings.local.json` if they want IDE features while developing (but this is rarely needed — auto-detection suffices)

**Mitigation:**
- Auto-detection via `.claude-plugin/plugin.json` covers the primary development use case with no manual action required

---

## Consequences

### Positive

1. **Clean install state:** New cloners start with a plugin manager state that matches reality.
2. **Uninstall works:** `claude plugin uninstall` succeeds without "not installed in scope" errors.
3. **Broadly applicable:** This pattern applies to all Claude Code plugin repos, not just this one.

### Negative

1. **Manual enable required for IDE features:** Developers who want explicit IDE-level plugin activation must add to their local `settings.local.json` — a one-time, non-committed action.

### Neutral

1. **Auto-detection unchanged:** `.claude-plugin/plugin.json` behavior is unaffected; the plugin still loads automatically in the dev repo.

---

## Implementation

**Timeline:** Accepted 2026-04-06; applied to this repo immediately.

**Affected Components:**
- `.claude/settings.json` (remove `enabledPlugins` block)

**Migration Path:**
Remove the `enabledPlugins` block from `.claude/settings.json`. If it was the only content, leave the file as an empty JSON object `{}` or remove the file entirely if no other settings are committed.

---

## Validation

**Success Criteria:**
- `claude plugin uninstall kmgraph@stayinginsync-knowledge-graph` completes without "not installed in scope" error on a fresh clone
- Plugin still loads automatically in the dev repo via `.claude-plugin/plugin.json` auto-detection

**Review Date:** Reassess if Claude Code changes plugin auto-detection behavior

---

## Related Decisions

None directly superseded.

---

## Related Documentation

**Lessons Learned:**
- [Lessons_Learned_Plugin_Settings_Scope_Consistency.md](../lessons-learned/patterns/Lessons_Learned_Plugin_Settings_Scope_Consistency.md) — Source lesson that prompted this ADR

---

## Future Considerations

1. **Claude Code plugin manager evolution:** If a future version of Claude Code handles scope reconciliation on clone, this constraint could be relaxed.
2. **CONTRIBUTING.md guidance:** Add a note to plugin repo CONTRIBUTING docs explaining this pattern for new maintainers.

---

**Decision Made:** 2026-04-06
**Last Updated:** 2026-04-06
**Status:** Accepted
