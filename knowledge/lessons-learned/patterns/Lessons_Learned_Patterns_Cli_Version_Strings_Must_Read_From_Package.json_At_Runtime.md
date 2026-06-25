---
title: "CLI Version Strings Must Read from package.json at Runtime"
created: 2026-04-11T20:02:20.263Z
updated: 2026-04-11T20:02:20.263Z
tags: [versioning, mcp-server, cli, package-json, drift, v0.3.5]
category: patterns
---
# Lesson: CLI Version Strings Must Read from package.json at Runtime

## Problem

`mcp-server/src/cli.ts` had a hardcoded version string in the MCP server definition:

```typescript
const server = new McpServer({
  name: "knowledge-graph",
  version: "1.0.0",   // hardcoded — wrong
});
```

Actual version in `mcp-server/package.json` was `0.3.5-beta`. Any client querying the MCP server received `1.0.0` regardless of actual release. Discrepancy only surfaced during a deep audit — never caused a runtime error so it went unnoticed through multiple version bumps.

## Solution

Read from `package.json` at startup:

```typescript
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { version: SERVER_VERSION } = require("../package.json") as { version: string };

const server = new McpServer({
  name: "knowledge-graph",
  version: SERVER_VERSION,
});
```

## Root Cause

Hardcoded string written during initial scaffolding, never updated. No automated check compared it to `package.json`.

## Prevention

1. **Never hardcode version strings in runtime code.** Always read from the canonical version file (`package.json`, `pyproject.toml`, etc.).
2. **Add version sync verification to release plan steps.** Check all version files before pushing.
3. **Consider a CI lint rule** that fails on hardcoded semver strings outside of version files.

## Applied In

`mcp-server/src/cli.ts` — fixed in v0.3.5-beta. `SERVER_VERSION` now read from `../package.json` at module load time.
