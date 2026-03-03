---
id: ADR-001
title: "Use TypeScript for MCP Server"
status: Accepted
date: 2026-01-10
---

# ADR-001: Use TypeScript for MCP Server

## Status

Accepted

## Context

The MCP server needs to be cross-platform and well-typed to ensure reliability.

## Decision

Use TypeScript compiled to CommonJS for the MCP server implementation.

## Consequences

- Type safety reduces runtime errors
- Compilation step required before running
- Better IDE support for contributors
