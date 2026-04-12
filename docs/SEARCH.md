---
id: SEARCH
title: How Search Works
sidebar_label: How Search Works
description: Full-text search with FTS5, local indexing, and multi-KG support
---

When a search is run, kmgraph needs to match the query against everything in the knowledge graph. There are two ways to do this. The first is to open each file one by one and check whether the query appears — straightforward, but slower as the knowledge graph grows, and results are sorted by where the match appeared in the file rather than how relevant the file is. The second is to maintain a search index: a compact catalog built from all the files that can be queried directly. The index returns results ranked by relevance — files that closely match the query float to the top. The index is optional and kept current automatically.

The diagram below compares search without and with the index.

```mermaid
flowchart LR
    subgraph without ["Without index (default)"]
        direction TB
        S1([Search query]) --> F1[Read file 1]
        F1 --> F2[Read file 2]
        F2 --> F3[Read file 3 ...]
        F3 --> R1([Results in file order])
    end
    subgraph with ["With index (optional)"]
        direction TB
        S2([Search query]) --> I[Query index]
        I --> R2([Ranked results instantly])
    end
```

Without an index, kmgraph reads each file in the knowledge graph sequentially. With an index, a single query returns results sorted by relevance. Both methods return the same files — the index is faster and ranks more relevant matches higher.

The diagram below shows the two search paths in detail.

```mermaid
flowchart TD
    A([Search query]) --> B{Search index\navailable?}

    B -- No --> C[Open each file\none by one]
    C --> D[Collect matches]
    D --> E([Results in\nfile order])

    B -- Yes --> F[Query the index]
    F --> G([Results ranked\nby relevance])
```

Both paths return results from the same knowledge graph files. The difference is speed and ranking: the indexed path is faster for large knowledge graphs and surfaces the most relevant results first. The index is built once and updated automatically during sync.

The search label `(FTS5)` in results means the index was used. FTS5 stands for Full-Text Search version 5 — the underlying search technology. The label can be ignored; it is there for users who want to know which path was taken.

### How to Enable the Search Index

The index is off by default and takes about a second to build. Once enabled, it stays current automatically — no maintenance required.

```mermaid
graph LR
    accTitle: Recall Search Paths
    accDescr: Flowchart showing the two recall search paths - a recall query checks whether the FTS5 index is available, and if yes queries the fast structured index, otherwise falls back to walking files on disk, with both paths converging on ranked results.
    Q["/kmgraph:recall query"] --> D{FTS5 index<br/>available?}
    D -- Yes --> F["FTS5 index<br/>fast, structured"]
    D -- No --> W["File-walk fallback<br/>stale or missing index"]
    F --> R["Ranked results"]
    W --> R
```


The first time `/kmgraph:sync-all` is run, it will ask once whether to build the index. Answer yes and the index builds automatically. After that, every `sync-all` run keeps it current with no prompts.

To build the index at any time without running sync-all: call `kg_fts5_rebuild` from the MCP tool panel.

The diagram below shows what happens the first time sync-all is run after upgrading.

```mermaid
flowchart TD
    A([Run sync-all]) --> B{Index already\nbuilt?}
    B -- Yes --> C([Index refreshes\nautomatically])
    B -- No --> D{Previously\ndeclined?}
    D -- Yes --> E([Skipped silently])
    D -- No --> F{Asked once:\nBuild search index?}
    F -- Yes --> G([Index built —\nauto-updates from now on])
    F -- No --> H([Skipped —\nnot asked again])
```

If a search index already exists, sync-all refreshes it automatically with no prompt. If no index exists and the user has not previously declined, sync-all asks once. The preference is remembered — users are never asked again regardless of the answer.

- **How to tell it is active**: search results show `(FTS5)` — this means the index was used
- **How to re-enable after declining**: run `kg_fts5_rebuild` directly
- **How to revert**: delete `~/.kmgraph/index/projects/<kgName>.db` (project KG) or `~/.kmgraph/index/personal.db` (personal KG). Run `kg_fts5_rebuild` to recreate.
