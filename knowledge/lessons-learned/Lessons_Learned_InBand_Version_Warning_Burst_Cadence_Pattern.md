---
title: In-Band Version Warning with Burst Cadence Pattern
category:
  uri: uri-that-does-not-map-to-patterns
---

## Problem

Plugin users often run outdated versions without knowing it. Out-of-band upgrade notifications (emails, release notes, changelogs) have low reach. Users interacting with the plugin daily may never see them. The challenge is: how do you alert users to a newer version in a way that is visible but not relentlessly annoying?

## Solution

Inject a version-outdated banner **in-band** — prepended to tool responses — using a **burst cadence**: show the warning a few times in rapid succession, then go silent for an hour, then repeat. This keeps the nudge visible enough to act on without flooding every response.

The reference implementation is `context-mode/src/server.ts`. The key functions are:

- `fetchLatestVersion()` — called once on server startup. Hits `https://registry.npmjs.org/context-mode/latest` with a 5-second timeout. Stores the result in memory for the server's lifetime. Failure is silent (no crash, no warning).
- `shouldShowVersionWarning()` — reads burst state. Returns `true` if the server is outdated AND the burst quota is not yet exhausted AND the silent-hour has not elapsed. Increments the burst counter when it returns true. Resets the burst and starts a 1-hour silence timer when the quota is hit.
- `trackResponse()` — called by every tool handler before returning. If `shouldShowVersionWarning()` is true, it prepends the banner string to the tool's response content.

The banner text is a short, action-oriented message (e.g., "A new version of context-mode is available. Run `npm install -g context-mode` to upgrade."). It appears at the top of the tool response, before any substantive content.

**Burst parameters (context-mode defaults):**
- Burst size: 3 warnings
- Silent window: 1 hour
- Version check: once per server start (no polling)

## When to Apply

Use this pattern when:

1. You ship a server process or MCP plugin that users interact with repeatedly through tool calls.
2. You publish versioned releases to a public registry (npm, PyPI, etc.) with a stable "latest" endpoint.
3. You want upgrade nudges to reach users who never read changelogs or release notes.
4. You need to keep noise low — a user who has already seen the warning three times does not need it on every subsequent call.

Avoid this pattern when:

- The plugin is internal and not published to a public registry (no "latest" endpoint to check).
- The server is short-lived (CLI one-shot) — the burst cadence does not have time to matter.
- The tool response format is structured data (JSON, binary) where prepending text would break parsing.

## Applicability to kmgraph

kmgraph ships an MCP server (`mcp-server/`) published to npm. The same pattern could be applied:

1. On `mcp-server` startup, fetch `registry.npmjs.org/kmgraph/latest`.
2. Compare to the running version from `mcp-server/package.json`.
3. If outdated, prepend a banner to `kg_capture`, `kg_search`, etc. responses using burst cadence.

This is distinct from the existing `kg_upgrade` tool (which checks and performs schema migrations). That tool handles **user data version** (the KG file format). The version warning pattern handles **plugin code version** (the npm package itself). They solve different problems and can coexist.

A natural trigger for implementing this in kmgraph: any release that introduces a behavior users would miss if running an old server (e.g., a new tool, a changed response format, a security fix).

## Key Implementation Details

```typescript
// Pseudo-code reflecting context-mode/src/server.ts structure

let latestVersion: string | null = null;
let burstCount = 0;
const BURST_LIMIT = 3;
let silenceUntil: number | null = null;

async function fetchLatestVersion(): Promise<void> {
  try {
    const res = await fetch('https://registry.npmjs.org/context-mode/latest', {
      signal: AbortSignal.timeout(5000)
    });
    const json = await res.json();
    latestVersion = json.version;
  } catch {
    // silent failure — do not block startup
  }
}

function shouldShowVersionWarning(currentVersion: string): boolean {
  if (!latestVersion || latestVersion === currentVersion) return false;
  if (silenceUntil && Date.now() < silenceUntil) return false;

  burstCount++;
  if (burstCount >= BURST_LIMIT) {
    burstCount = 0;
    silenceUntil = Date.now() + 60 * 60 * 1000; // 1 hour
  }
  return true;
}

function trackResponse(content: string, currentVersion: string): string {
  if (!shouldShowVersionWarning(currentVersion)) return content;
  const banner = `⚠️ A newer version is available. Run: npm install -g context-mode\n\n`;
  return banner + content;
}
```

## Context

- Observed in: `context-mode` MCP plugin
- Reference file: `context-mode/src/server.ts` (functions `fetchLatestVersion`, `shouldShowVersionWarning`, `trackResponse`)
- Category: patterns
- Audience: plugin developers, kmgraph contributors considering adding upgrade nudges to the kmgraph MCP server
