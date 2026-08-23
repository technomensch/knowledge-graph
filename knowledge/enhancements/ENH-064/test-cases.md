# Test Cases / Acceptance Criteria: ENH-064

1. **Fresh init writes README.** Running `kmg-init` on a repo with no
   existing knowledge graph produces a README in the graph folder
   containing: the "plain Markdown, no tooling required" statement, the
   KMGraph link, and the `/kmgraph:kmg-init` install instruction.
2. **Voice/style compliance.** Generated README text contains no em
   dashes and reads in neutral third-person voice (no "you"/"your").
3. **No per-file watermarking.** Newly created decision/lesson/issue
   files do not contain any KMGraph attribution text or HTML comment.
4. **Upgrade backfill.** Running `kmg-upgrade` against a graph
   initialized before this enhancement (no README present) adds the
   README without altering any other existing file.
5. **Upgrade does not clobber edits.** Running `kmg-upgrade` against a
   graph that already has a README (user-edited or otherwise) does not
   overwrite it silently — either skips, or prompts before overwrite.
6. **No collision with project root README.** Scaffolding into a nested
   knowledge-graph folder (e.g. `knowledge/`) does not touch or shadow
   an existing repo-root `README.md`.
7. **First install against a pre-populated graph.** A machine with no
   prior KMGraph install, run against a repo where `knowledge/` already
   contains content (decisions/lessons/issues from someone else's use),
   does not overwrite or blank existing files. `kg_init`'s
   existing-graph detection connects to it (offers upgrade/connect, not
   blind re-scaffold).
8. **INSTALL.md / docs/INSTALL.md updated.** Both installation docs
   describe the first-time-install-into-existing-graph path from test 7
   and stay in sync with each other.
