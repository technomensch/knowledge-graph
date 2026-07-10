# Timeline

**Created:** 2026-07-10
**Last Updated:** 2026-07-10

---

- **2026-03-03** — `tests/test-hooks.sh`'s risky `cp "$TEST_CONFIG" "$REAL_CONFIG"` / `rm -f "$REAL_CONFIG"` pattern introduced (commit `094e74434`). Bug has existed, live on `main`, ever since.
- **2026-04-29** — `tests/test-stop-hook.sh`'s equivalent risky pattern introduced (commit `35348c3b`).
- **2026-05-25** — Most recent commit touching `test-hooks.sh` (`824b3968`, "fix profile-file staleness tests to use fake HOME") — partially improved some assertions to use a fake `$HOME` sandbox, but did NOT remove the `run_hook()` helper's direct `cp "$TEST_CONFIG" "$REAL_CONFIG"` calls against the real config. Bug remains live on `main` as of this date and as of 2026-07-10 (confirmed identical).
- **2026-07-10, ~13:14:45** — `~/.claude/kg-config.json` mtime (file last modified — this session's actual overwrite event; exact triggering test run not pinpointed, but root cause mechanism is confirmed regardless).
- **2026-07-10, later same session** — `kg_fts5_status` call returns `test-kg` path unexpectedly; first sign something is wrong.
- **2026-07-10, same session** — `kg_fts5_rebuild` called with explicit `kgPath` override, works around the bad active pointer, successfully rebuilds this project's real index.
- **2026-07-10, same session** — `/kmgraph:kmg-switch knowledge-graph` fails (no such KG registered); surfaces the missing-registrations problem directly.
- **2026-07-10, same session** — `~/.claude/kg-config.json` inspected directly; only `test-kg` entry found, placeholder timestamps, real registrations gone. Issue opened.
