# SessionStart Hook Path Resolution Saga

**Status:** 🟢 **RESOLVED (Attempt #7)**
**Created:** 2026-03-28
**Domain:** Hooks & Configuration
**Severity:** Was Critical — turned out to be misattributed
**Attempts:** 7
**Root Cause:** The SessionStart errors were from `learning-output-style` and `explanatory-output-style` plugins (Anthropic official), NOT from kmgraph. Disabling both eliminated the errors.

---

## Quick Summary

SessionStart hook fails on every `claude` session start with repeated errors:
```
⎿ SessionStart:startup hook error
⎿ SessionStart:startup hook error
```

**Root cause (Attempt 007 — confirmed):**

The two `SessionStart:startup hook error` messages were produced by **`learning-output-style`** and **`explanatory-output-style`** plugins from `claude-plugins-official`. These are Anthropic-maintained plugins unrelated to kmgraph. Disabling both in `~/.claude/settings.json` eliminated the errors entirely. The errors appeared in ALL projects (knowledge-graph, mindstudio-job-search), confirming they were user-level, not project-specific.

**kmgraph was never the source of the visible errors.** However, the investigation did uncover and fix a real bug: the `../scripts/` path in hooks.json (introduced in commit `680d2dd0`) was incorrect and would have failed once triggered. The fix (`../scripts/` → `scripts/`) is on main since commit `e9f7135a`.

**Collateral cleanup performed:**
- Removed ghost `installed_plugins.json` entries that Claude Code kept re-creating
- Cleaned stale permission entries from `settings.local.json`
- Restored marketplace registration for clean install testing

---

## Navigation

- **Current Understanding:** See [description.md](description.md)
- **All Attempts:** See [implementation-log.md](implementation-log.md)
- **How Belief Evolved:** See [analysis/root-cause-evolution.md](analysis/root-cause-evolution.md)
- **Test Cases:** See [test-cases.md](test-cases.md)

---

## Files

```
sessionstart-hook-path-saga/
├── README.md (this file)
├── description.md (problem, current understanding, status)
├── implementation-log.md (all 3 attempts chronologically)
├── test-cases.md (validation: hook runs without errors)
├── analysis/
│   ├── root-cause-evolution.md (belief shift log)
│   ├── timeline.md (2026-03-28 session history)
│   └── lessons-learned.md (reusable insights)
├── attempts/
│   ├── 001-revert-env-var/
│   │   ├── solution-approach.md
│   │   ├── attempt-results.md
│   │   └── plan-reference.md
│   ├── 002-debug-script-paths/
│   │   ├── solution-approach.md
│   │   ├── attempt-results.md
│   │   └── plan-reference.md
│   ├── 003-fix-actual-paths/
│   │   ├── solution-approach.md
│   │   ├── attempt-results.md
│   │   └── plan-reference.md
│   ├── 004-root-cause-diagnosis/
│   │   ├── solution-approach.md
│   │   └── attempt-results.md
│   ├── 005-uninstall-and-fix-path/
│   │   ├── solution-approach.md
│   │   └── attempt-results.md
│   └── 006-full-uninstall-and-root-cause/ (CURRENT)
│       ├── solution-approach.md
│       └── attempt-results.md
└── related-issues/
    └── github-links.md
```

---

## Remaining Work

1. ~~Verify kmgraph hooks work~~ — kmgraph SessionStart hook confirmed working (green checkmark in session context)
2. Test marketplace install in another project — still needed to verify user install path end-to-end
3. Report `learning-output-style` and `explanatory-output-style` hook failures to Anthropic (or investigate further)

## Related Issues

- [Docs: Claude prompts vs shell commands not distinguished](related-issues/docs-prompt-distinction.md) — GETTING-STARTED.md troubleshooting section mixes shell and Claude prompts without visual distinction

## Key Lesson

**The errors were never from this project's plugin.** Six attempts were spent fixing kmgraph paths and cleaning registries when the actual source was two unrelated Anthropic plugins. The misattribution happened because the errors appeared during kmgraph development work, creating a false correlation. Future debugging should isolate by disabling plugins one-by-one before assuming the most recently changed component is at fault.
