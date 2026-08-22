---
id: issue-21
type: Bug
status: deferred
github-issue: "#182"
branch: none
created: 2026-07-17
---

# Issue-21: Stop hook fails with "invalid stop hook JSON output" during Codex CLI init

## Priority

**High** — flagged explicitly by the project owner. Observed twice during a single live Codex CLI installation session, on the very first real-world attempt to install/initialize this plugin under Codex.

## Problem

While initializing/installing the kmgraph plugin in **Codex CLI** (not Claude Code), the Stop hook failed twice with:

```
• Stop hook (failed)
  error: hook returned invalid stop hook JSON output
```

This occurred during the interactive init wizard flow — once after choosing "selective" git strategy, and again after answering the per-category commit/ignore prompts. The init flow otherwise continued (Codex appears to tolerate/ignore the failed hook and proceed), but a hook is actively erroring on every relevant trigger under this platform.

## Suspected cause (not yet investigated — Mode 3, no fix planned yet)

This project's `hooks/hooks.json` and its Stop-related script(s) (e.g. `scripts/session-end-prompt.sh` or similar) were built and validated against Claude Code's hook JSON contract. Codex CLI is a separate platform with its own hook execution model — it's plausible the Stop hook's output format is valid for Claude Code but not for Codex's parser, or that Codex invokes the Stop hook in a context this project's script doesn't handle (e.g. missing expected env vars, different working directory assumptions).

This is a real, currently-reproducing cross-platform compatibility gap, not a hypothetical. Root cause needs actual investigation (which hook, why the JSON is invalid under Codex, whether this is a Codex-side quirk or a bug in this project's own hook output) before a fix can be designed.

## Related

- This project explicitly markets Codex CLI support (`.codex-plugin/` directory, marketplace keywords include "codex", command-guide documents "22 commands + skills" for Codex).
- Broader context: this session separately found (issue-18/#176) that at least one core mechanism (`gov-capture-routing`) was built without verifying it actually resolves/executes correctly outside the author's own Claude Code environment. This may be a related class of gap — mechanisms validated only under Claude Code, not verified under other supported platforms — worth keeping in mind during investigation, not asserting as confirmed.
- Blocks [ENH-023](../../enhancements/ENH-023/ENH-023-specification.md) — both concern
  hook behavior wired through `hooks/hooks.json`; ENH-023's marketplace-skill governance
  extension should account for this Codex-specific Stop-hook failure.

## Status

Deferred (Mode 3 — track only). No branch created, no implementation planned yet. Needs investigation into Codex CLI's actual hook JSON contract before a fix can be scoped.
