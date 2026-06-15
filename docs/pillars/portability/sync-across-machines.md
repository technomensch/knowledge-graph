---
title: Sync a Knowledge Graph Across Machines
category:
  uri: portability
position: 2
slug: pillars-portability-sync-across-machines
parent:
  uri: pillars-portability-index
---

# Sync a Knowledge Graph Across Machines

> "My knowledge graph is on one machine. How do I get it on all of them?"

Access the same knowledge graph on multiple machines without manual file copying. You need KMGraph initialized on at least one machine and a git remote accessible from all machines.

## Project KG

Project KGs sync automatically with the project's git remote. No additional setup is needed beyond `git pull` on each machine.

## Personal KG

**On the source machine:**

```bash
cd ~/.kmgraph
git init
git remote add origin git@github.com:yourname/personal-kg.git
git add .
git commit -m "chore: initial personal KG sync"
git push -u origin main
```

**On additional machines:**

```bash
git clone git@github.com:yourname/personal-kg.git ~/.kmgraph
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
cd ~/.kmgraph && git pull

# Push captures done on this machine
git add . && git commit -m "chore: sync captures" && git push
```

Confirm with `/kmgraph:recall "a lesson you captured on the first machine"` — it should appear.

## Automating sync

Add a post-commit hook to auto-push personal KG entries:

```bash
# ~/.kmgraph/.git/hooks/post-commit
#!/bin/bash
git push origin main --quiet
```

Make it executable: `chmod +x .git/hooks/post-commit`

## Related

- [Multi-KG Workflows](../organizing/multi-kg-workflows.md) — managing project-local, personal, and cowork KGs
- [Sanitize Before Sharing](../organizing/sanitize-before-sharing.md) — remove sensitive data before pushing to a shared remote
