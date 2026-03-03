---
title: "Test Lesson: MCP Server Configuration"
date: 2026-01-15
category: architecture
tags: [mcp, configuration, testing]
git_commit: abc1234
git_branch: main
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
