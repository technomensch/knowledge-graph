# Platform Directives — Claude Code

This file contains Claude Code-specific tool preferences and behavioral directives for the **knowledge-graph** project. It is the authoritative home for Claude Code-specific content that must not appear in `knowledge/rules.md` (platform-agnostic), per [[ADR-032-platform-specific-directives-in-platform-config]].

**Scope:** Claude Code CLI and desktop app only. These directives do not apply to Gemini CLI, Cursor, Copilot, or other platforms.

---

## Tool Preferences

### File and Content Search

- File search: use Glob and Grep tools — not Bash `find` or `grep`
- Content search: use Grep tool — not `rg` or `grep` in Bash

### Output and Context Management

- Avoid Bash commands producing >20 lines of output — use context-mode MCP tools instead
- Subagents: use for heavy file exploration to keep main context clean

### Search Scope Restrictions

Never run namespace grep scans over `docs/plans/` or `.jsonl` chat history files
- **Why:** scanning these paths pulls thousands of tokens of non-executable plan text, hitting context limits before reaching actual command files

---

## Source

Directives relocated from `knowledge/rules.md` as part of [[ADR-032-platform-specific-directives-in-platform-config]] (platform split, v0.3.5-beta).
