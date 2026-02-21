---
title: "Lesson: Plugin Example File Management — Why You Can't Gate the Download"
created: 2026-02-21T00:00:00Z
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: main
  commit: 9c9d7dc78eb551f98e542c4244390bdf0918812e
  pr: null
  issue: null
sources: []
tags: [architecture, plugin-distribution, git, examples, install]
category: architecture
---

# Lesson Learned: Plugin Example File Management — Why You Can't Gate the Download

**Date:** 2026-02-21
**Category:** architecture
**Version:** 1.0

---

## Problem

When users install the plugin across multiple projects as a per-project local clone, `core/examples/` is downloaded every time — even for users who don't need the examples. This creates three problems:

**Context:**
- Plugin designed to support three installation tiers (Claude Code marketplace, MCP IDEs via local clone, template-only via local clone)
- Tiers 2 and 3 require `git clone` of the full repo into each project
- `core/examples/` ships in the repo as reference content (~23 markdown files)

**Impact:**
- **Duplication:** 5 project-local installs = 5 identical copies of the same example files
- **Disk space:** Light servers accumulate dead weight
- **Confusion:** Example files could be mistaken for the user's own KG content

The question was: can a prompt during `init` or `INSTALL.md` prevent examples from being downloaded, or remove them cleanly after the fact?

---

## Root Cause

**Three independent constraints make gating the download harder than it appears:**

**Analysis:**
1. **Plugin installs are atomic** — `claude plugin install` downloads the entire plugin package as a unit. There is no mechanism to selectively exclude directories during marketplace installation.
2. **Git clone is atomic** — `git clone` downloads all tracked files. Sparse checkout exists but is impractical to instruct end users to configure during setup.
3. **Gitignore doesn't work for tracked files** — `core/examples/` is tracked in the repo. Adding it to `.gitignore` after cloning has no effect on already-tracked files. `git rm --cached` removes it locally, but `git pull` restores it from upstream. Local-only exclusion (`.git/info/exclude`) prevents git from *caring* about the deletion, but doesn't prevent checkout from restoring files.

**Evidence:**
- All three installation paths (marketplace, MCP local clone, template-only local clone) use atomic download mechanisms
- Git documentation confirms: `.gitignore` only affects *untracked* files; tracked files must be removed with `git rm --cached` and will reappear on `git pull`

---

## Options Considered

Three viable approaches were identified and evaluated:

### Option A: Move examples out of the tracked repo

Remove `core/examples/` from the repo entirely. Host examples in the GitHub wiki, a `gh-pages` branch, or as a release artifact. `init.md` offers an on-demand download step.

- ✅ Eliminates duplication completely — zero examples by default
- ✅ Clean git history
- ❌ Requires a hosting decision and download mechanism
- ❌ Examples no longer available offline or in the plugin source

### Option B: Post-clone cleanup with local git exclusion

Keep examples in the repo. `INSTALL.md` and `init.md` offer to delete `core/examples/` after clone, adding `.git/info/exclude` to prevent git from surfacing the deletion.

- ✅ Simple — no infrastructure changes
- ✅ Works for users who don't want examples
- ❌ `git pull` restores deleted files (`.git/info/exclude` doesn't block this)
- ❌ Requires users to re-delete after every update

### Option C: Git submodule

Separate examples into their own repo, included as an optional git submodule. `git clone` skips submodules by default; users opt in with `--recurse-submodules`.

- ✅ Clean separation — examples are truly optional
- ✅ Standard git mechanism, no custom tooling
- ❌ Adds maintenance overhead (two repos to keep in sync)
- ❌ Increases complexity of the contribution workflow

### Decision

**Deferred.** None of the options are clearly superior for the alpha release. The problem is real but not blocking — examples are small markdown files that don't affect plugin functionality. Decision postponed to a future release.

---

## Prevention System

**Immediate:** No change needed — examples are harmless in the current state.

**Systematic (for when this is revisited):**
- Evaluate Option A (move out of repo) as the cleanest long-term solution
- Consider whether examples belong in the plugin source at all, or if they're better served as documentation-site content
- If Option B is chosen, `INSTALL.md` must explicitly warn: *"These files will return on `git pull`"*

---

## Replication Pattern

### For Other Projects

**When to Apply:**

This lesson applies to any open-source tool that ships example/sample content alongside core functionality, where users may want to opt out of that content.

**Universal Pattern:**

1. **Audit what's in the repo vs. what belongs in the repo** — Separate "plugin source needed to run" from "reference content for learning"
2. **If reference content is optional, treat it as optional at the infrastructure level** — Don't put optional content in the main tracked tree if you want users to be able to skip it
3. **Git atomic operations are not composable** — You cannot partially download or partially checkout without sparse-checkout configuration, which is too complex for an install guide
4. **Tracked file removal is not sticky** — Any cleanup step that removes tracked files will be undone by `git pull` unless the upstream repo also removes them

**Customization Points:**
- The "right" solution depends on how important offline access to examples is, and how complex the user base's git workflows are

---

## Lessons & Takeaways

**Key Insights:**
1. Git clone and plugin marketplace installs are atomic — there is no built-in mechanism for selective file exclusion without user-configured sparse checkout
2. Gitignore only affects untracked files; it cannot suppress tracked files that already exist in the repo
3. Local git exclusion (`.git/info/exclude`) prevents git from flagging deletions as modifications, but does not prevent `git pull` from restoring the files

**What Didn't Work:**
- Assumption that a post-install prompt could cleanly remove examples and keep them removed
- Assumption that `.gitignore` could suppress examples for users who opt out

**If We Had to Do It Again:**
- Before adding `core/examples/` to the tracked repo, evaluate whether it belongs in a separate location (wiki, docs site, release artifact)
- Design the opt-in/opt-out mechanism before adding the content, not after

---

## Related Documentation

**Architecture Decisions:**
- [ADR-002: Defer Update Notifications and Version Sync to v0.0.9](../../decisions/ADR-002-defer-update-notifications.md) — Companion deferred decision from the same design session

**Other Lessons:**
- [Local Marketplace Testing - Two-Location Sync Required](../process/local-marketplace-testing-workflow.md) — Related insight about plugin file location complexity

---

**Version:** 1.0
**Created:** 2026-02-21
**Last Updated:** 2026-02-21
