---
title: "Graph Tools Called From a Git Worktree Still Resolve to the Original Folder Knowledge Graph"
created: 2026-10-18T21:11:34.932Z
updated: 2026-10-18T21:11:34.932Z
author: technomensch
git:
  branch: v0.7.11-kg-frontmatter-links
  commit: 85a9d2af63c27794716b4632db64283372c59f28
tags: [debugging, git-worktrees, kg-resolve, knowledge-graph, adr-067, parallel-sessions]
category: debugging
---
## Problem

Two parallel Claude sessions were each given their own git worktree (folders under `/Users/mkaplan/GitHub/knowledge-graph_worktrees/`, each on its own branch cut from the release branch) so that three sessions would stop sharing one checked-out branch.

A worktree isolates tracked files. It does not isolate the knowledge graph that the graph tools resolve. Before handing the worktrees out, this was run for the original folder and for both worktrees:

```bash
node mcp-server/dist/cli.js resolve --cwd <folder>
```

All three returned the same answer:

```json
{"name":"knowledge-graph","path":"/Users/mkaplan/GitHub/knowledge-graph/knowledge"}
```

The graph's registered path in the user's graph configuration is an absolute path to the original checkout, so every folder that belongs to the same project resolves to it. ADR-067 treats a worktree as a legitimate linked copy of the same project, so this is by design, not a bug.

The consequence: any graph tool called from inside a worktree reads and writes the original folder's `knowledge/` directory, which sits on whatever branch is checked out there. That covers `kg_capture`, `kg_search`, `kg_resolve`, commands that resolve the graph through them (such as kmg-start-issue-tracking), and the audit skill's Step 7. A note captured by a session working in a worktree would land as an uncommitted file on the wrong branch.

Other worktree differences found at the same time:

- Git-ignored local files are absent in a new worktree: `knowledge/plans`, `knowledge/sessions`, local handoff folders, and `node_modules`.
- The shared post-commit cache-sync hook copies whichever worktree committed into the single plugin cache, so the last commit wins.

## Solution

The resolution behavior was tested before the worktrees were handed out. Both sessions were then told to:

1. Write their notes by direct file path inside their own worktree, not through the tool.
2. Check `git -C <original folder> status --short` for stray files afterward.
3. Stop and ask if a command insisted on resolving through the tool.

Both sessions finished with no stray files in the original folder. The worktrees were removed after their branches were merged (the branches were kept).

## When to apply

- Before delegating work into a git worktree, or giving a parallel session its own worktree.
- When a session working in a worktree is about to capture a lesson, session note, or ADR, or search the graph.
- When a stray untracked file shows up in the original folder's `knowledge/` that no one on that branch wrote.

## Takeaways

1. A worktree isolates tracked files, not the knowledge graph the tools resolve.
2. Test `resolve --cwd <worktree>` before delegating work into a worktree.
3. Give sessions explicit rules: write notes by direct path inside the worktree, check the original folder for stray files afterward, and do not capture through the tool.
4. Expect missing ignored files in a new worktree, and run `npm ci` before typecheck or tests.
5. Remember the shared post-commit hook and the single plugin cache. The last commit wins, which is safe only when each branch contains everything the others do (here both branches were cut from the release branch).
6. Open idea, not done here, and a design decision for the maintainer: have graph resolution prefer the worktree's own knowledge folder when the cwd is inside a worktree whose tracked tree contains one.

## Context

- Branch: v0.7.11-kg-frontmatter-links
- Commit: 85a9d2af
- Category: debugging

## Related

- [ADR-067: Mutable Active Switch vs Context-Derived KG Resolution](../../decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md)
- [Anchor Path-Comparison Scripts to Session cwd, Not a Fixed Project-Root Env Var](Lessons_Learned_Debugging_Anchor_Path_Comparison_Scripts_To_Session_Cwd,_Not_A_Fixed_Project_Root_Env_Var_—_Git_Worktrees_Break_The_Assumption.md)
- [A Post-Commit Cache-Sync Hook Must Handle Merge Commits and Every Folder It Syncs](Lessons_Learned_Debugging_A_Post_Commit_Cache_Sync_Hook_Must_Handle_Merge_Commits_And_Every_Folder_It_Syncs.md)
