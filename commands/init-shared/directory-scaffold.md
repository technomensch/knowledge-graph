---
description: Shared directory scaffold module — creates the standard KG directory tree
---

## Module: directory-scaffold

### Parameters

| Parameter | Description |
|---|---|
| `{KG_PATH}` | Absolute path to the knowledge graph root directory |
| `{categories}` | Array of category names configured for this KG |

---

### Directory structure check

Verify all expected directories exist. Create any that are missing:

```bash
expected_dirs=(knowledge lessons-learned decisions sessions chat-history)
for dir in "${expected_dirs[@]}"; do
  if [ ! -d "{KG_PATH}/$dir" ]; then
    mkdir -p "{KG_PATH}/$dir"
    echo "✅ Created missing directory: $dir/"
  fi
done

# Check category subdirectories
for category in "{categories[@]}"; do
  if [ ! -d "{KG_PATH}/lessons-learned/$category" ]; then
    mkdir -p "{KG_PATH}/lessons-learned/$category"
    echo "✅ Created missing category directory: lessons-learned/$category/"
  fi
done
```

### Create directory structure

```bash
mkdir -p "{KG_PATH}"/{knowledge,lessons-learned,decisions,sessions,chat-history,tmp}

# Create category subdirectories
for category in "{categories[@]}"; do
  mkdir -p "{KG_PATH}/lessons-learned/$category"
done

# Create meta-issue if governance category selected
if [[ " {categories[@]} " =~ " governance " ]]; then
  mkdir -p "{KG_PATH}/meta-issues"
fi
```
