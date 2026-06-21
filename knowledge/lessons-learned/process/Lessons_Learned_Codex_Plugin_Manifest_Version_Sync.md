---
title: Codex Plugin Manifest Must Be Added to Version Sync Checklist on Introduction
category: process
tags: [release, version-sync, codex, plugin-manifest]
version: 1.0
created: 2026-06-21
last-updated: 2026-06-21
branch: main
commit: d07854ee
---

# Codex Plugin Manifest Must Be Added to Version Sync Checklist on Introduction

## Problem

After releasing v0.6.8, the Codex CLI marketplace continued to show the plugin at v0.5.10.6. The version sync checklist in `knowledge/rules.md` only listed three files: `package.json`, `.claude-plugin/plugin.json`, and `mcp-server/package.json`. The `.codex-plugin/plugin.json` manifest was never included. The stale manifest was only caught when the user reinstalled from the marketplace and saw the wrong version.

## Root Cause

Two plugin manifests coexist in the repository: `.claude-plugin/plugin.json` for Claude Code and `.codex-plugin/plugin.json` for Codex CLI. The Codex manifest was added in v0.5.10.2 but was never added to the version sync checklist. Because the checklist was the single source of truth for release steps, the omission propagated silently through every release from v0.5.10.2 through v0.6.8.

## Solution

Bumped `.codex-plugin/plugin.json` to 0.6.8 immediately after discovery. Added it as item 3 in `knowledge/rules.md § Version & Release > Version Files` and updated the accompanying Why note to name the Codex manifest gap as a root cause so future contributors understand the history.

## When to Apply

Apply this pattern whenever a new distribution channel or platform manifest is added to the repository:

- Identify every file that carries a version string for the project.
- Add each new file to the version sync checklist on the same commit it is introduced — not as a follow-up.
- Treat any discrepancy between marketplace-visible version and repo HEAD version as a release blocker until verified.

The complete version-sync file list as of v0.6.8:

1. `package.json`
2. `.claude-plugin/plugin.json`
3. `.codex-plugin/plugin.json`
4. `mcp-server/package.json`
5. `CHANGELOG.md`
6. `README.md`
7. `INSTALL.md`

## Context

- Branch: main
- Commit: d07854ee
- Category: process
