---
title: Shell Boolean Guard — Exit Code Trap with $var && cmd
category:
  uri: uri-that-does-not-map-to-patterns
---

## Problem

A bash script in `commands/init-shared/upgrade-inspector.md` was exiting with code 1
even though it completed successfully and produced valid output. The Bash tool reported
"Exit code 1" which looked like a failure.

## Root Cause

The pattern `$skip && continue` — when `skip=false`, this executes the `false` shell
builtin, which exits with code 1. The `&&` short-circuits so `continue` never runs, but
the exit code 1 from `false` persists as the last command's exit code. If that iteration
is the last one in the loop, the entire script exits with code 1.

## Solution

Replace `$skip && continue` with `[ "$skip" = "true" ] && continue`.

Also add `|| true` after the last meaningful test in a loop body to ensure clean exit:

```bash
[ ! -f "$dest" ] && upgrades+=("$entry") || true
```

## When to Apply

Anytime a shell variable holds a boolean string (`"true"` / `"false"`), never execute it
directly as `$var && cmd`. Always use the explicit string comparison form:

```bash
# Bad — executes the `false` builtin when var=false
$skip && continue

# Good — tests the string value explicitly
[ "$skip" = "true" ] && continue
```

If the last meaningful command in a loop is a conditional test (`[ ... ]`), append
`|| true` to neutralize any non-zero exit from the test itself.

## Context

- Affected file: `commands/init-shared/upgrade-inspector.md`
- Branch: v0.3.1-init-shared-refactor
- Commit: 7bd20bd6
- Category: patterns
