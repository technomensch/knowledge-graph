---
title: Plan Subagent Is Read-Only — Write Files Manually After Opus Analysis
category:
  uri: uri-that-does-not-map-to-process
---

## Problem

During v0.2.0-beta implementation, the Plan subagent (Opus, plan mode) was used to design phase test plans and the v0.2.1-beta master plan. The subagent returned detailed, high-quality content but could not write any files. The expectation was that invoking the Plan subagent with a "write this file" prompt would produce a written file — it did not. The subagent either returned an error or silently failed to produce the file.

## Root Cause

The Plan agent type (`subagent_type: Plan`) has access only to read tools (Glob, Grep, Read, etc.) and cannot call Write, Edit, or Bash. This is by design — plan agents are architects, not implementors. Any prompt phrased as "write this file" to a Plan subagent will fail because the required tool is not available in that agent's tool set.

## Solution

After getting analysis or design content back from a Plan subagent, write the files directly using the Write tool in the main conversation, using the subagent's output as source material. Do not re-invoke the Plan subagent to write — it will fail silently or return an error.

## Pattern

When delegating to a Plan subagent, explicitly set the expectation in the prompt that the result will be returned as text and written manually. Phrase the prompt as "design this plan and return the content" rather than "write this file." The main conversation agent is always responsible for all write operations after receiving Plan subagent output.

This applies to all subagent types with restricted tool sets: know which tools each agent type can access before delegating a task that requires writes.

## References

- Branch: `v0.2.0-beta-layered-architecture`, Phase 7 planning work
- Commit context: `a09611b5`
- Date: 2026-03-27

---

## See Also

- [Knowledge Graph: Gotchas — Plan Subagent Is Read-Only](../../knowledge/gotchas.md#plan-subagent-is-read-only--write-this-file-prompts-silently-fail)
