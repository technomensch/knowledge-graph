# Timeline

**Created:** 2026-07-10
**Last Updated:** 2026-07-10

---

- **2026-07-10, ~13:14:45** — `~/.claude/kg-config.json` mtime (file last modified — exact cause/trigger not yet known).
- **2026-07-10, later same session** — `kg_fts5_status` call returns `test-kg` path unexpectedly; first sign something is wrong.
- **2026-07-10, same session** — `kg_fts5_rebuild` called with explicit `kgPath` override, works around the bad active pointer, successfully rebuilds this project's real index.
- **2026-07-10, same session** — `/kmgraph:kmg-switch knowledge-graph` fails (no such KG registered); surfaces the missing-registrations problem directly.
- **2026-07-10, same session** — `~/.claude/kg-config.json` inspected directly; only `test-kg` entry found, placeholder timestamps, real registrations gone. Issue opened.
