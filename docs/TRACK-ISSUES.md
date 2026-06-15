---
title: Track Issues
category:
  uri: overview
position: 7
slug: track-issues
---

The issue tracking process documents a problem or enhancement from identification through resolution. The `/kmgraph:start-issue-tracking` command drives this process. Beginning with v0.2.3.4-beta, the command gates all git-dependent steps on repository presence — when no git repository is detected, branch strategy and git integration steps are omitted automatically.

The diagram below shows the full issue tracking flow, including the git presence gate introduced in v0.2.3.4-beta.

```mermaid
%%{init: { 'flowchart': { 'useMaxWidth': true }, 'theme': 'neutral' }}%%
flowchart TD
    A([/kmgraph:start-issue-tracking]) --> B{Git repo\ndetected?}
    B -- Yes --> C[Branch strategy\nselected and recorded]
    B -- No --> D[Git steps skipped:\nbranch strategy omitted\nGit Integration section skipped]
    C --> E[Issue document created\nin active KG]
    D --> E
    E --> F[Implementation tracked\nagainst issue document]
    F --> G{Git repo\ndetected?}
    G -- Yes --> H[Git Integration\nBranch and PR linked to issue]
    G -- No --> I[Summary omits\ngit metadata rows]
    H --> J([Issue closed])
    I --> J

    accTitle: Issue tracking process with git presence gate
    accDescr: Flowchart showing start-issue-tracking command flow, git presence gate at Step 1.0, issue document creation, implementation tracking, and conditional git integration or omission steps at completion.
```

The git presence check runs once at Step 1.0 using `git rev-parse --is-inside-work-tree`. The result is applied at every subsequent step that would otherwise invoke a git subcommand.
