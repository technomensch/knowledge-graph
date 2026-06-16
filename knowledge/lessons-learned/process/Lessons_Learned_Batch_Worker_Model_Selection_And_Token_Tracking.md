---
title: >-
  Lesson: Use Sonnet (Not Haiku) for Batch Job Evaluation Workers — And Capture
  Token Usage via --output-format json
type: lesson
category:
  uri: uri-that-does-not-map-to-process
---

# Lesson: Use Sonnet for Batch Job Evaluation Workers + Token Tracking via JSON Output

## Problem

When running career-ops batch evaluations, Haiku was briefly used for `claude -p` workers to save cost/time. It was reverted. Separately, token usage was never appearing in worker logs because `--output-format json` was not set.

## Root Cause

Haiku lacks the reasoning depth needed for nuanced job fit evaluation — it misses subtle signals in JDs, produces weaker red flag analysis, and gives less reliable comp research. Most batch offers are SKIP'd anyway, but the ones that score high drive real apply decisions, so evaluation accuracy is worth the Sonnet cost.

`claude -p` defaults to text output. Without `--output-format json`, token counts (`input_tokens`, `output_tokens`, `cache_read_input_tokens`) never appear in log files, making usage reporting impossible after the fact.

## Solution

Keep the default Sonnet model for all batch workers. Add `--output-format json` to the `claude -p` invocation in `batch-runner.sh` — this captures full token usage in each worker log file at no extra token cost.

```bash
# batch-runner.sh — worker invocation
claude -p \
  --dangerously-skip-permissions \
  --output-format json \
  --append-system-prompt-file "$resolved_prompt" \
  "$prompt"
```

Parse token usage after the run:
```bash
grep -h "input_tokens" batch/logs/3*.log | jq -s '[.[].usage] | {input: map(.input_tokens) | add, output: map(.output_tokens) | add, cache_read: map(.cache_read_input_tokens) | add}'
```

## How to Apply

Any time `batch-runner.sh` is modified or a new batch system is built:
1. Default to Sonnet — do not switch to Haiku for evaluation tasks
2. Always include `--output-format json` on the `claude -p` call
3. Token usage will be available in every log file under the `usage` JSON key

## Context

Discovered during a 137-offer batch run on 2026-04-17. Hiring.cafe URLs were also blocked by Cloudflare in this run — marked as `skipped_stale` with error `cloudflare-blocked`.
