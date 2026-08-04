---
title: "Lesson: os.homedir() Stale Cache on macOS"
created: 2026-07-12T00:00:00Z
last-updated: 2026-08-04T00:00:00Z
author: technomensch
tags: [debugging, macos, node, os-homedir, config-path, mcp-server]
category: debugging
version: 1.0
---

# Lesson: os.homedir() Stale Cache on macOS

**Date:** 2026-07-12
**Category:** Debugging
**Version:** 1.0

---

## Problem

During the `kg-config.json` default-location migration from `~/.claude/` to the platform-neutral `~/.kmgraph/` (commit `654c13fb`), code that resolved the config path by calling `os.homedir()` directly could not be relied on to agree with `$HOME` in every execution context on macOS — some call sites needed to read `process.env.HOME` instead, and test coverage for the migration logic had to explicitly account for the two diverging (Jest, notably, ignores `$HOME` when resolving `os.homedir()`, so tests that only patched `$HOME` did not exercise the real runtime path unless `os.homedir()` itself was mocked).

## Root Cause

`os.homedir()` and `process.env.HOME` are not guaranteed to return the same value in every Node.js execution context. Code that assumed they were interchangeable risked reading or writing config at the wrong path — silently inheriting or missing a legacy `~/.claude/kg-config.json` depending on which one it consulted.

## Solution

Standardize on `process.env.HOME || os.homedir()` at the call sites that resolve the user's home directory for config paths (`mcp-server/src/utils.ts` and the migration helpers `checkConfigLocation()`/`applyConfigLocation()`), so `$HOME` takes precedence when set. Follow-up commits `2d0aba01`, `dd62385b`, and `015d660f` hardened this further:

- `2d0aba01` gave `readConfig()` a legacy-path fallback (using the same `process.env.HOME || os.homedir()` resolution) so the migration was actually reachable for its target users.
- `dd62385b` fixed that fallback to not apply when `KG_CONFIG_PATH` is explicitly set — matching the semantics already used by `checkConfigLocation()`/`applyConfigLocation()`.
- `015d660f` extracted `handleConfigSwitch()` so the config-switch logic could be tested directly instead of being reimplemented inline in test files, and documented that under Jest, `os.homedir()` ignores `$HOME` and must be mocked explicitly (`jest.doMock("os", ...)`) to keep tests from leaking the real dev machine's home directory.

## When to Apply

- Any Node.js code resolving a user's home directory for config/data file paths, especially on macOS where `os.homedir()` behavior can diverge from `$HOME` depending on the calling context (e.g., long-running processes, hook-invoked subprocesses).
- Any test suite exercising home-directory-dependent code under Jest — mock `os.homedir()` explicitly rather than relying on setting `process.env.HOME` alone, since Jest does not route `os.homedir()` through the mocked environment variable.

## Context

Reconstructed from chat-history evidence (`2026-07-14-claude.md`, ~line 743, referencing a lesson file at `.../lessons-learned/debugging/Lessons_Learned_os_homedir_Stale_Cache_On_macOS.md`) during a 2026-08-04 KG-index audit. The original lesson file was created under `knowledge/lessons-learned/debugging/`, which has been gitignored since its creation, so the original file itself was never recoverable from git history — this document is a reconstruction, not a recovery, of that lesson. The Root Cause and Solution detail above is grounded directly in the git-verified diffs of commits `654c13fb`, `2d0aba01`, `dd62385b`, and `015d660f`, which is the only part of the original investigation that remained independently checkable.
