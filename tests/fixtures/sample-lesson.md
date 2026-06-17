---
title: 'Test Lesson: MCP Server Configuration'
category:
  uri: uri-that-does-not-map-to-architecture
---

# Test Lesson: MCP Server Configuration

## Problem

The MCP server path was incorrectly configured, causing connection failures.

## Solution

Updated the path from `core/mcp-server.js` to `mcp-server/dist/index.js` and the
package from `@anthropic/mcp` to `@modelcontextprotocol/sdk`.

## Key Insight

Always verify the dist output path after building TypeScript projects.

## Tags

mcp, configuration, typescript, build
