---
id: sync-across-machines
title: Sync a Knowledge Graph Across Machines
sidebar_label: Sync across machines
description: How to share a personal or project knowledge graph between multiple development machines
---

# Sync a Knowledge Graph Across Machines

## Goal

Access the same knowledge graph on multiple machines — a home workstation and a laptop, for example — without manual file copying.

## Prerequisites

- KMGraph initialized on at least one machine
- A Git remote accessible from all machines (GitHub, GitLab, or self-hosted)
- For personal KGs: the graph lives at `~/.claude/knowledge-graph/` — initialize a git repo there

## Steps

### Project KG (stored in the project directory)

Project KGs sync automatically with the project's git remote. No additional setup is needed beyond `git pull` on each machine.

### Personal KG (stored at `~/.claude/knowledge-graph/`)

**On the source machine:**

```bash
cd ~/.claude/knowledge-graph
git init
git remote add origin git@github.com:yourname/personal-kg.git
git add .
git commit -m "chore: initial personal KG sync"
git push -u origin main
```

**On additional machines:**

```bash
git clone git@github.com:yourname/personal-kg.git ~/.claude/knowledge-graph
```

Then register the KG with KMGraph:

```bash
/kmgraph:init-personal-kg
# or
/kmgraph:switch personal
```

**Ongoing sync:**

```bash
# Pull latest from another machine
cd ~/.claude/knowledge-graph && git pull

# Push captures done on this machine
git add . && git commit -m "chore: sync captures" && git push
```

### Automating sync

Add a post-commit hook to auto-push personal KG entries:

```bash
# ~/.claude/knowledge-graph/.git/hooks/post-commit
#!/bin/bash
git push origin main --quiet
```

Make it executable: `chmod +x .git/hooks/post-commit`

## Verify

On a second machine, run:

```bash
/kmgraph:recall "a lesson you captured on the first machine"
```

The lesson should appear.

## Next steps

- [Multi-KG workflows](/guides/multi-kg-workflows) — managing project-local, personal, and cowork KGs
- [Sanitize before sharing](/guides/sanitize-before-sharing) — remove sensitive data before pushing to a shared remote
