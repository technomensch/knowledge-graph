---
description: Extract chat history from Claude and Gemini local log sources
---

# Extract Chat History

Automates the extraction of chat history from local Claude (.jsonl) and Gemini (.json/.pb) log files.

---

## Usage

```bash
/knowledge:extract-chat [-claude | -gemini]
/knowledge:extract-chat --output-dir=<path>
/knowledge:extract-chat -claude --output-dir=<custom-path>
```

---

## Options

- `-claude`: Extract only Claude Code session history
- `-gemini`: Extract only Antigravity/Gemini session history
- (no option): Extract all available history
- `--output-dir=<path>`: Override output directory (default: active KG's chat-history/)

---

## How it works

The workflow runs the centralized Python extraction script located at `${CLAUDE_PLUGIN_ROOT}/core/scripts/run_extraction.py`.

### Claude Extraction

1. **Scans:** `~/.claude/projects/` for activity logs (.jsonl files)
2. **Merges:** By date into `YYYY-MM-DD-claude.md`
3. **Output:** `{output_dir}/YYYY-MM-DD-claude.md`

**Example output paths:**
- Active KG: `{active_kg_path}/chat-history/2026-02-12-claude.md`
- Custom: `/custom/path/2026-02-12-claude.md`

### Gemini Extraction

1. **Scans:** `~/.gemini/tmp/` and `~/.gemini/antigravity/conversations/` for session logs (.json/.pb files)
2. **Merges:** By date into `YYYY-MM-DD-gemini.md`
3. **Output:** `{output_dir}/YYYY-MM-DD-gemini.md`

**Protobuf support:**
- Requires `blackboxprotobuf` library (optional)
- Falls back to JSON-only if protobuf library not installed

---

## Execution Steps

### Step 1: Determine Output Directory

**Default behavior (no --output-dir):**
```bash
# Get active KG path from config
active_kg=$(jq -r '.active' ~/.claude/kg-config.json)
kg_path=$(jq -r ".graphs[\"$active_kg\"].path" ~/.claude/kg-config.json)

# Use active KG's chat-history/ subdirectory
output_dir="${kg_path}/chat-history"
```

**If --output-dir provided:**
```bash
# Use custom path
output_dir="$custom_path"
```

**Create directory if needed:**
```bash
mkdir -p "$output_dir"
```

### Step 2: Determine Source Flag

```bash
# Parse user input
case "$input" in
  *-claude*)
    source_flag="claude"
    ;;
  *-gemini*)
    source_flag="gemini"
    ;;
  *)
    source_flag="all"
    ;;
esac
```

### Step 3: Run Python Extraction Script

**Execute with environment variable for output directory:**

```bash
# Set output directory via environment variable
export KG_OUTPUT_DIR="$output_dir"

# Run extraction
python3 ${CLAUDE_PLUGIN_ROOT}/core/scripts/run_extraction.py --source $source_flag
```

**The Python script:**
- Reads `KG_OUTPUT_DIR` environment variable
- Falls back to script directory if not set (for non-plugin use)
- Uses `--output-dir` CLI arg if provided (highest priority)

---

## Output Format

### Claude History Files

```markdown
# Chat History: YYYY-MM-DD (Claude)

## Session 1: Project Name (HH:MM - HH:MM)

**User:**
[Message content]

**Assistant:**
[Response content]

---

## Session 2: Another Project (HH:MM - HH:MM)

[...]
```

### Gemini History Files

```markdown
# Chat History: YYYY-MM-DD (Gemini)

## Conversation 1: Topic (HH:MM - HH:MM)

**User:**
[Message content]

**Model:**
[Response content]

---

## Conversation 2: Another Topic (HH:MM - HH:MM)

[...]
```

---

## Incremental Append Behavior

**Script behavior:**
- Checks if output file for date already exists
- If exists: appends new sessions to end (does NOT overwrite)
- If not exists: creates new file
- Tracks last processed file to avoid duplicates

**Example:**
```bash
# First run (morning)
/knowledge:extract-chat -claude
# Creates: 2026-02-12-claude.md (2 sessions)

# Second run (evening)
/knowledge:extract-chat -claude
# Appends to: 2026-02-12-claude.md (now 5 sessions total)
```

---

## Integration with Active KG

When using the default output directory (active KG):
1. Extracts to `{active_kg_path}/chat-history/`
2. Files are automatically included in `/knowledge:recall` searches
3. Session summaries can reference chat history
4. Chat history can be analyzed for lesson extraction

---

## Multi-KG Support

When multiple knowledge graphs are configured:
- Operates on the **active** KG from `~/.claude/kg-config.json`
- Use `/knowledge:switch` to change active KG before extraction
- Each KG maintains its own chat-history/
- Use `--output-dir` to extract to specific KG manually

---

## Python Dependencies

**Required:**
- Python 3.7+ (standard library only)

**Optional:**
- `blackboxprotobuf` — For Gemini protobuf file support
  ```bash
  pip install blackboxprotobuf
  ```

**Graceful degradation:**
- If `blackboxprotobuf` not installed, Gemini extraction still works for JSON files
- Protobuf files are skipped with warning

---

## Troubleshooting

### Problem: No chat history found

**Solution:**
- Verify Claude/Gemini log directories exist:
  ```bash
  ls ~/.claude/projects/
  ls ~/.gemini/tmp/
  ```
- Check if you've used Claude Code or Gemini recently
- Logs may be cleared on app updates

### Problem: Protobuf extraction fails

**Solution:**
```bash
# Install optional dependency
pip install blackboxprotobuf

# Or skip protobuf files (JSON extraction still works)
/knowledge:extract-chat -gemini  # Will warn about .pb files
```

### Problem: Permission denied

**Solution:**
```bash
# Check permissions on output directory
ls -ld {active_kg_path}/chat-history/

# Create manually if needed
mkdir -p {active_kg_path}/chat-history/
chmod 755 {active_kg_path}/chat-history/
```

### Problem: Output directory not found

**Solution:**
- Ensure active KG is configured: `/knowledge:status`
- Verify KG path exists: `ls {active_kg_path}`
- Use `--output-dir` with absolute path as workaround

---

## Examples

### Example 1: Extract all history to active KG

```bash
/knowledge:extract-chat
```

**Output:**
```
Extracting chat history...
✅ Claude: Found 3 sessions (2026-02-12)
✅ Gemini: Found 2 conversations (2026-02-12)

Saved to:
- {active_kg_path}/chat-history/2026-02-12-claude.md
- {active_kg_path}/chat-history/2026-02-12-gemini.md
```

### Example 2: Extract only Claude history

```bash
/knowledge:extract-chat -claude
```

**Output:**
```
Extracting Claude history only...
✅ Found 3 sessions (2026-02-12)

Saved to: {active_kg_path}/chat-history/2026-02-12-claude.md
```

### Example 3: Extract to custom directory

```bash
/knowledge:extract-chat --output-dir=/Users/name/archive/chat-logs
```

**Output:**
```
Extracting to custom directory: /Users/name/archive/chat-logs
✅ Claude: 3 sessions
✅ Gemini: 2 conversations

Saved to:
- /Users/name/archive/chat-logs/2026-02-12-claude.md
- /Users/name/archive/chat-logs/2026-02-12-gemini.md
```

---

## Non-Claude Code Usage

**For users without Claude Code:**

1. **Copy scripts:**
   ```bash
   cp -r ${CLAUDE_PLUGIN_ROOT}/core/scripts/ ~/my-project/
   ```

2. **Run directly:**
   ```bash
   cd ~/my-project/scripts
   python3 run_extraction.py --source all --output-dir ../chat-history/
   ```

3. **See:** `${CLAUDE_PLUGIN_ROOT}/core/README.md` for manual workflows

---

**Created:** 2026-02-12
**Version:** 1.0 (Plugin version with OUTPUT_DIR fix)
**Integration:** Works with active KG, `/knowledge:recall`, session summaries
**Related Skills:** /knowledge:session-summary, /knowledge:capture-lesson
