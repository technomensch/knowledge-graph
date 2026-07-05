
<!-- Updated: 2026-06-12 -->

# Extract Chat History

Automates the extraction of chat history from local Claude (.jsonl), Gemini (.json/.jsonl/.pb), and Codex CLI (.jsonl) log files.

---

## Delegation Option

For multi-session history extraction (10+ sessions or 100+ KB chat logs), consider delegating to the `knowledge-extractor` subagent:

```bash
/kmgraph:kmg-extract-chat --delegate knowledge-extractor
```

This parses chat logs and extracts insights without consuming your main context, ideal for backfilling knowledge graphs from large chat histories.

---

## Usage

```bash
/kmgraph:kmg-extract-chat [-claude | -gemini]
/kmgraph:kmg-extract-chat --source codex
/kmgraph:kmg-extract-chat --source all
/kmgraph:kmg-extract-chat --output-dir=<path>
/kmgraph:kmg-extract-chat -claude --output-dir=<custom-path>
/kmgraph:kmg-extract-chat -claude 2026-02-20 through 2026-02-21
/kmgraph:kmg-extract-chat --today
/kmgraph:kmg-extract-chat --project=knowledge-graph
/kmgraph:kmg-extract-chat --source codex --after=2026-01-01
```

---

## Options

**Source selection:**
- `-claude`: Extract only Claude Code session history (shorthand for `--source claude`)
- `-gemini`: Extract only Antigravity/Gemini session history (shorthand for `--source gemini`)
- `--source codex`: Extract only Codex CLI sessions from `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`; outputs `YYYY-MM-DD-codex.md`
- `--source all`: Extract Claude and Gemini sessions; does **not** include Codex (use `--source codex` explicitly)
- (no option): Extract all available Claude and Gemini history (same as `--source all`)

**Output:**
- `--output-dir=<path>`: Override output directory (default: active KG's chat-history/)

**Date filtering:**
- `--today`: Extract only today's sessions (convenience flag)
- `--date=YYYY-MM-DD`: Extract only sessions from a specific date
- `--after=YYYY-MM-DD`: Extract sessions from this date onwards (inclusive)
- `--before=YYYY-MM-DD`: Extract sessions up to and including this date

**Filtering:**
- `--project=<fragment>`: Filter to sessions from a specific project (path fragment match against `~/.claude/projects/<name>/`)

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

1. **Scans:** `~/.gemini/tmp/` for session logs — both `session-*.json` (pre-0.42.0, single JSON object per file) and `session-*.jsonl` (0.42.0+, line-delimited streaming format; the Gemini CLI switched formats mid-session on 2026-05-13) — plus `~/.gemini/antigravity/conversations/` for `.pb` files
2. **Merges:** By date into `YYYY-MM-DD-gemini.md`
3. **Output:** `{output_dir}/YYYY-MM-DD-gemini.md`

**Protobuf support:**
- Requires `blackboxprotobuf` library (optional)
- Falls back to JSON-only if protobuf library not installed

### Codex CLI Extraction

1. **Scans:** `~/.codex/sessions/YYYY/MM/DD/` for `rollout-*.jsonl` files
2. **Parses:** UTC timestamps in each turn, converted to local date and time
3. **Merges:** By local date into `YYYY-MM-DD-codex.md`
4. **Output:** `{output_dir}/YYYY-MM-DD-codex.md`

**Notes:**
- Codex is not included in `--source all` pending date-semantics validation across platforms — use `--source codex` explicitly
- System injection turns (internal Codex context) are filtered out of the output
- Large file splitting and incremental append behavior apply the same as Claude/Gemini extraction

---

## Execution Steps

### Step 0: Active KG / Working Directory Guard

**Skip this step entirely** if an explicit destination flag is present in the user's invocation:
`--output-dir` or `--project`. When the user has named a target, intent is unambiguous —
proceed directly to Step 1.

Otherwise, run the following check **before** creating any directories or running extraction:

1. Read the active KG name and path:
   ```bash
   active_kg=$(jq -r '.active' ~/.claude/kg-config.json)
   kg_path=$(jq -r ".graphs[\"$active_kg\"].path" ~/.claude/kg-config.json)
   kg_path="${kg_path/#\~/$HOME}"
   ```
   The tilde expansion is required: `jq` returns the raw JSON string (e.g. `~/GitHub/foo`),
   but `pwd` returns an absolute path. Without expansion the comparison always fails for
   tilde-stored KG paths.

2. Derive the project root from `kg_path`. If `kg_path` ends in `/docs`, the project root is
   its parent directory; otherwise the project root IS `kg_path`. (Mirrors `getProjectRoot`
   in `mcp-server/src/utils.ts`.)
   ```bash
   if [[ "$kg_path" == */docs ]]; then
     project_root="${kg_path%/docs}"
   else
     project_root="$kg_path"
   fi
   ```

3. Compare the project root against the current working directory. A **match** is when `pwd`
   equals `project_root` OR `pwd` starts with `project_root/` (allows subdirectories).
   ```bash
   cwd=$(pwd)
   # Match if cwd == project_root OR cwd starts with project_root/
   ```

4. **If mismatch — STOP. Do not run `mkdir` or the extraction script. Ask the user:**

   > Hold on — the active knowledge graph is **{active_kg}** (project root: `{project_root}`),
   > but you are working in `{cwd}`. Chat history would be written to `{kg_path}/chat-history/`.
   >
   > Choose:
   > 1. Switch the active KG to this project's graph, then extract here
   > 2. Extract to **{active_kg}** (`{kg_path}/chat-history/`) anyway
   > 3. Cancel
   >
   > Reply 1, 2, or 3.

   - Option 1: Run `/kmgraph:kmg-switch` for the current project's KG (if configured), then re-resolve output dir in Step 1 using the newly active KG. **If the current project has no KG registered in `~/.claude/kg-config.json`**, tell the user and offer `/kmgraph:kmg-init` to create one — or fall back to option 2 or 3.
   - Option 2: Continue to Step 1 using the current active KG unchanged.
   - Option 3: Abort. Do not run extraction.

   **Do not proceed until the user explicitly responds.**

5. **If match:** Continue to Step 1.

---

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
  *-claude* | *--source\ claude*)
    source_flag="claude"
    ;;
  *-gemini* | *--source\ gemini*)
    source_flag="gemini"
    ;;
  *--source\ codex*)
    source_flag="codex"
    ;;
  *)
    source_flag="all"
    ;;
esac
```

### Step 2.5: Parse Date Range from User Input

Translate any date constraints from the user's invocation into `$date_flags`:

| User input | Resulting flags |
|------------|----------------|
| `--today` | `--today` |
| `--date=2026-02-20` | `--date=2026-02-20` |
| `--after=2026-02-20` | `--after=2026-02-20` |
| `2026-02-20` (bare date) | `--date=2026-02-20` |
| `2026-02-20 through 2026-02-21` | `--after=2026-02-20 --before=2026-02-21` |
| `2026-02-20 to 2026-02-21` | `--after=2026-02-20 --before=2026-02-21` |
| `--project=knowledge-graph` | `--project=knowledge-graph` |
| (no date) | (empty — extracts all) |

Store results as `$date_flags` variable.

### Step 3: Run Python Extraction Script

**Execute with environment variable for output directory:**

```bash
# Set output directory via environment variable
export KG_OUTPUT_DIR="$output_dir"

# Run extraction
python3 ${CLAUDE_PLUGIN_ROOT}/core/scripts/run_extraction.py --source $source_flag $date_flags
```

**The Python script:**
- Reads `KG_OUTPUT_DIR` environment variable
- Raises `RuntimeError` at import time if neither `KG_OUTPUT_DIR` nor `--output-dir` is set — chat extraction must not silently write into the plugin's own directory
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

### Codex History Files

```markdown
# Chat History: YYYY-MM-DD (Codex)

## Session 1 (HH:MM - HH:MM)

**User:**
[Message content]

**Assistant:**
[Response content]

---

## Session 2 (HH:MM - HH:MM)

[...]
```

---

## Large File Splitting

Obsidian crashes on files larger than ~1 MB or ~34,000 lines. When a daily output file exceeds either threshold, it is automatically split into numbered part files inside a `YYYY-MM-DD/` subfolder:

**Normal output (under limit):**
```
chat-history/YYYY-MM/YYYY-MM-DD-claude.md
```

**Split output (over limit):**
```
chat-history/YYYY-MM-DD/YYYY-MM-DD-claude-part1.md
chat-history/YYYY-MM-DD/YYYY-MM-DD-claude-part2.md
```

Each part file is a valid standalone markdown document with its own header (annotated `— Part N`). Splits occur at message block boundaries so no message is cut mid-block.

Incremental appends automatically target the last part file. If appending causes the last part to exceed the limit, a new part is created.

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
/kmgraph:kmg-extract-chat -claude
# Creates: 2026-02-12-claude.md (2 sessions)

# Second run (evening)
/kmgraph:kmg-extract-chat -claude
# Appends to: 2026-02-12-claude.md (now 5 sessions total)
```

---

## Integration with Active KG

When using the default output directory (active KG):
1. Extracts to `{active_kg_path}/chat-history/`
2. Files are automatically included in `/kmgraph:kmg-recall` searches
3. Session summaries can reference chat history
4. Chat history can be analyzed for lesson extraction

---

## Multi-KG Support

When multiple knowledge graphs are configured:
- Operates on the **active** KG from `~/.claude/kg-config.json`
- Use `/kmgraph:kmg-switch` to change active KG before extraction
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
- Verify log directories exist:
  ```bash
  ls ~/.claude/projects/
  ls ~/.gemini/tmp/
  ls ~/.codex/sessions/
  ```
- Check if the relevant tool has been used recently
- Logs may be cleared on app updates

### Problem: Codex extraction returns no sessions

**Solution:**
- Verify the sessions directory structure: `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`
- Check that `--source codex` was used (Codex is not included in `--source all`)
- Confirm Codex CLI has been used since the directory was created

### Problem: Protobuf extraction fails

**Solution:**
```bash
# Install optional dependency
pip install blackboxprotobuf

# Or skip protobuf files (JSON extraction still works)
/kmgraph:kmg-extract-chat -gemini  # Will warn about .pb files
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
- Ensure active KG is configured: `/kmgraph:kmg-status`
- Verify KG path exists: `ls {active_kg_path}`
- Use `--output-dir` with absolute path as workaround

---

## Examples

### Example 1: Extract all history to active KG

```bash
/kmgraph:kmg-extract-chat
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
/kmgraph:kmg-extract-chat -claude
```

**Output:**
```
Extracting Claude history only...
✅ Found 3 sessions (2026-02-12)

Saved to: {active_kg_path}/chat-history/2026-02-12-claude.md
```

### Example 3: Extract to custom directory

```bash
/kmgraph:kmg-extract-chat --output-dir=/Users/name/archive/chat-logs
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

### Example 4: Extract a date range

```bash
/kmgraph:kmg-extract-chat -claude 2026-02-20 through 2026-02-21
```

**Output:**
```
Extracting Claude history (2026-02-20 to 2026-02-21)...
✅ Found sessions for 2 dates

Saved to:
- {active_kg_path}/chat-history/2026-02-20-claude.md
- {active_kg_path}/chat-history/2026-02-21-claude.md
```

### Example 5: Extract today only

```bash
/kmgraph:kmg-extract-chat --today
```

**Output:**
```
Extracting today's sessions (2026-02-21)...
✅ Claude: 4 sessions
✅ Gemini: 1 conversation

Saved to:
- {active_kg_path}/chat-history/2026-02-21-claude.md
- {active_kg_path}/chat-history/2026-02-21-gemini.md
```

### Example 6: Extract sessions for a specific project

```bash
/kmgraph:kmg-extract-chat --project=knowledge-graph
```

**Output:**
```
Extracting Claude history (project filter: knowledge-graph)...
✅ Found 3 sessions matching project

Saved to: {active_kg_path}/chat-history/2026-02-21-claude.md
```

### Example 7: Extract Codex CLI sessions

```bash
/kmgraph:kmg-extract-chat --source codex
```

**Output:**
```
Extracting Codex CLI history...
✅ Codex: Found 4 sessions (2026-06-12)

Saved to: {active_kg_path}/chat-history/2026-06-12-codex.md
```

### Example 8: Extract Codex sessions from a date onwards

```bash
/kmgraph:kmg-extract-chat --source codex --after=2026-01-01
```

**Output:**
```
Extracting Codex CLI history (from 2026-01-01)...
✅ Codex: Found sessions for 12 dates

Saved to: {active_kg_path}/chat-history/2026-01-*.codex.md (12 files)
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
**Updated:** 2026-06-12
**Version:** 1.1 (Added Codex CLI extraction — ENH-024)
**Integration:** Works with active KG, `/kmgraph:kmg-recall`, session summaries
**Related Skills:** /kmgraph:kmg-session-summary, /kmgraph:kmg-capture-lesson
