# Related Issues, ENHs & PRs

**Last Updated:** 2026-07-10

---

## GitHub Issue

### [#163: kg-config.json silently overwritten by test-hooks.sh/test-stop-hook.sh (live on main, unpatched)](https://github.com/technomensch/knowledge-graph/issues/163)
- **Filed:** 2026-07-10, after root cause and blast radius were confirmed.
- **Content:** root cause, timeline/blast-radius, and recommended fix — mirrors this meta-issue's README at time of filing.

This issue is **not root-cause-related** to the chat-extraction-reliability-saga (`knowledge/issues/chat-extraction-reliability-saga/`) — different subsystem (kmgraph's own config/MCP server vs. the chat-history extractors). **Shipping-wise**, they are now combined: both fixes were merged onto one branch, `v0.6.18-fix-extraction-regressions`, per an explicit user decision on 2026-07-10 to ship as a single PR/release rather than two. Do not conflate the *causes*; do treat them as one *release*.

This issue's fix (`ac70b490`, "fix(hooks): sandbox test config path via KG_CONFIG_PATH env override") is code-complete on that branch. No standalone PR was filed for it — it ships as part of whatever PR opens for `v0.6.18-fix-extraction-regressions`.

---

## Related ADRs

- **[ADR-012](../../decisions/ADR-012-hook-security-model.md)** — Hook security model. States hook scripts must make "no modifications to files outside the active KG path" and must be idempotent. `test-hooks.sh`/`test-stop-hook.sh`'s direct `cp`/`rm -f` against the real `~/.claude/kg-config.json` violates this constraint. The fix (env-var config-path override) restores compliance with an existing decision rather than introducing new policy.
- **[ADR-020](../../decisions/ADR-020-lifecycle-hooks-suite-automated-capture.md)** — Governs `hooks-master.sh` (the SessionStart hook these tests exercise) and documents the v0.5.5 amendment (PPID → kg-name+date flag key, issue #106, PR #108, commit `35348c3b`) that touched `test-stop-hook.sh` on 2026-04-29. That commit's purpose was fixing session-end dedup logic — the real-config clobber pattern rode along incidentally, not as a deliberate design choice.
