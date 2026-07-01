
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
expected_dirs=(concepts templates lessons-learned decisions sessions chat-history)
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
mkdir -p "{KG_PATH}"/{concepts,templates,lessons-learned,decisions,sessions,chat-history,tmp}

# Create category subdirectories
for category in "{categories[@]}"; do
  mkdir -p "{KG_PATH}/lessons-learned/$category"
done

# Scaffold triggers.md if not already present
TRIGGERS_PATH="{KG_PATH}/triggers.md"
if [ ! -f "$TRIGGERS_PATH" ]; then
  cat > "$TRIGGERS_PATH" << 'EOF'
# Triggers

This file declares *when* rules from `rules.md` apply. Check it at each workflow phase transition.

## Planning
- Before writing a plan: run recall on the topic and architectural domain
- Before branching: confirm parent branch is fully committed

## Capture
- After solving a bug or making an architectural decision: offer to capture lesson or ADR
- At session end: offer session summary

## Session Wrap
- Before stopping work: run /kmgraph:kmg-session-wrap
EOF
  echo "✅ Created {KG_PATH}/triggers.md"
fi

# Create meta-issue if governance category selected
if [[ " {categories[@]} " =~ " governance " ]]; then
  mkdir -p "{KG_PATH}/meta-issues"
fi
```
