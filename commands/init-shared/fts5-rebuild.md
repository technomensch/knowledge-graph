---
description: Shared FTS5 rebuild module — offers to build/rebuild the search index for a KG
---

## Module: fts5-rebuild

### Parameters

| Parameter | Description |
|---|---|
| `{KG_PATH}` | Absolute path to the knowledge graph root directory |
| `{kg_name}` | Name key used in kg-config.json |

---

If the path is confirmed correct, check whether the index needs rebuilding:

```bash
FTS5_DECLINED=$(jq -r '.graphs["{kg_name}"].fts5_declined // false' ~/.claude/kg-config.json)

if [ "$FTS5_DECLINED" = "true" ]; then
  echo "⏭️  Search index: skipped (previously declined)"
elif [ ! -f "{KG_PATH}/.fts5.db" ]; then
  echo "⚠️  Search index not found (local file, not version-controlled)."
  echo ""
  echo "  Rebuild now? This may take a moment for large knowledge graphs."
  echo "    1. Yes — rebuild index"
  echo "    2. Skip for now (search will use linear scan)"
fi
```

If the user selects **Yes**, call `kg_fts5_rebuild`. **After the rebuild, validate the result:**

- If `indexed` is 0: display a warning — "Search index built but 0 files were indexed. Verify the KG path points to the directory containing lessons-learned/, decisions/, and sessions/. Current path: {KG_PATH}"
- If `indexed` > 0: confirm success — "✅ Search index built: {indexed} files indexed in {duration_ms}ms"

If the user selects **Skip**, continue without rebuilding (linear scan remains available as fallback).
