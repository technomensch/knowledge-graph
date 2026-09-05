
<!-- Updated: 2026-06-12 -->

# Extract Chat History

Automates the extraction of chat history from local Claude (.jsonl), Gemini (.json/.jsonl/.pb), and Codex CLI (.jsonl) log files.

---

## Delegation Option

For multi-session history extraction (10+ sessions or 100+ KB chat logs), consider delegating to the `knowledge-extractor` subagent:

```bash
/kmgraph:kmg-extract-chat --delegate knowledge-extractor
```

This parses and archives chat logs into `chat-history/` without consuming your main context. It does **not** extract lessons or decisions — for that, run `/kmgraph:kmg-backfill` afterward.

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
- `--confirm-unscoped`: Required whenever `--project` is omitted (ENH-061 / [ADR-062](../knowledge/decisions/ADR-062-gemini-pb-project-scoping-fail-closed.md)'s amendment). Omitting `--project` merges chat-history sessions from **every project on the machine**, not just the current repo — the extractor now fails closed and refuses to run without either `--project=<name>` or this explicit acknowledgment. Applies to all four `--source` values (`claude`/`gemini`/`codex`/`all`), since the unscoped-merge failure mode is structural to every extractor's session-directory glob, not Claude-specific. Interactive terminals get a y/N prompt instead of a hard refusal; Claude Code's own invocations (no tty attached) always need the flag.
- **Worktree note (Claude only):** a git worktree gets its own separate `~/.claude/projects/` directory (naming conventions for this are inconsistent — don't rely on the directory name). If `--project=<name>` matches both a repo's main checkout and one or more of its worktrees, the run proceeds (you did explicitly scope something) but prints a composition notice — "N session file(s) from `<cwd>`" per distinct working directory matched — so a multi-worktree merge is never silent. Re-run with a worktree's own specific name to scope to just that one.

**Rebuild:**
- `--rebuild`: Force a clean overwrite/flatten of every date in scope, ignoring existing incremental state — repairs pre-fix corrupted output (ENH-043). **Claude-only.** `--rebuild --source gemini` or `--source codex` prints a warning and is otherwise ignored; `--rebuild --source all` (or the default, no `--source`) only rebuilds the Claude portion — Gemini remains incremental (in practice this matters little, since Gemini's extractor already fully overwrites each date's output on every normal run). Prior content at a rebuilt date — including an existing split `YYYY-MM-DD/` subfolder — is backed up aside (dot-hidden, timestamped, up to 3 most recent kept), never deleted before the new content is confirmed written.

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
- **`.pb` session dating (ENH-046):** with `blackboxprotobuf` installed, a `.pb` session is dated from a plausible timestamp found inside its own decoded content, not the file's mtime (mtime is unreliable for a `.pb` file that's been copied, moved, or restored from backup after the conversation happened). Whenever content-based dating isn't available for a session — the library isn't installed, decoding fails, or no plausible timestamp is found in the decoded content — extraction prints a loud, counted warning and falls back to file mtime; it does not fail silently.

**`--project` scoping and `.pb`/hash-named directories (fail-closed, ADR-062):** `.pb` files under `~/.gemini/antigravity/conversations/` carry no per-project path — nothing can positively attribute one to a project. Hash-named directories under `~/.gemini/tmp/` (opaque names matching `^[0-9a-fA-F]{16,}$`, case-insensitive) are detected and excluded *before* any `--project` substring match runs, so a hex-valued `--project` filter can never accidentally fragment-match one into the results. So whenever `--project=<name>` is set, **all** `.pb` sessions and **all** hash-named-directory sessions are excluded from output — never leaked in as unattributed guesses — with a visible skip notice (count + reason) printed every time, never silently. Unscoped extraction (no `--project`) is unaffected and includes everything as before. See [ADR-062](../knowledge/decisions/ADR-062-gemini-pb-project-scoping-fail-closed.md).

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

### Step 0: Resolve Target Graph

**Skip this step entirely** if an explicit destination flag is present in the user's invocation:
`--output-dir` or `--project`. When the user has named a target, intent is unambiguous —
proceed directly to Step 1.

Otherwise, resolve the graph directly from the current working directory:

```
kg_resolve
```

There is no separate "active" pointer left to disagree with cwd (issue-41: this step
previously read `.active`, derived a project root from it, and compared that against
`pwd` — the pre-ADR-067 `KG_MISMATCH` pattern; `kg_resolve` derives the graph from cwd
directly, so there's nothing left to mismatch). Take the returned `path` as `$kg_path`
for Step 0.5 and Step 1.

**If `kg_resolve` errors** (no graph registered for this directory): tell the user and
offer `/kmgraph:kmg-init` to create one, or suggest `--output-dir`/`--project` to name a
target explicitly. Do not run `mkdir` or the extraction script until resolved.

---

### Step 0.5: First-Run Repair Check (ENH-043)

**Skip this step entirely** if any of `--date`, `--after`, `--before`, `--project`, `--output-dir`, or `--rebuild` is present in the user's invocation — a targeted run shouldn't trigger a global repair check. Proceed directly to Step 1.

Otherwise, check whether this is the first extraction run since the plugin crossed the version that fixed a past message-loss bug in the Claude extractor.

Derive the chat-history directory from `$kg_path` (resolved in Step 0 — reuse it, no
need to re-resolve; if Step 0 was skipped because `--project`/`--output-dir` was given,
this whole step is also skipped per the condition above, so `$kg_path` is always
available whenever this line runs):
```bash
chat_history="${kg_path}/chat-history"
```

1. Read the installed plugin version (`.claude-plugin/plugin.json`'s `.version`) and the version last stamped after a successful run (`read_last_extract_version(chat_history)` from `chat_extractor_base.py`, default `"0.0.0"` if never stamped).
2. Compare versions **numerically, not as strings** — split each on `.` into integer components and compare component-by-component (so `0.6.9 < 0.6.17` and `0.6.17 < 0.6.20` are evaluated correctly; a naive string comparison gets both wrong, e.g. `"0.6.9" > "0.6.17"` lexically). **If installed version < 0.6.17, or stamped version ≥ 0.6.17:** skip this check entirely (either a pre-fix install, or already handled) — continue to Step 1.
3. Otherwise, run:
   ```bash
   python3 ${CLAUDE_PLUGIN_ROOT}/core/scripts/check_extraction_health.py --dates-only "$chat_history" --source-root ~/.claude/projects
   ```
   Each line is `YYYY-MM-DD<TAB>repairable` or `YYYY-MM-DD<TAB>needs-backup`. **If there is no output at all:** history is clean — call `write_last_extract_version(chat_history, installed_version)` and continue to Step 1 silently, no message shown.
4. **If any dates are listed**, count `N` (total lines) and `R` (lines marked `repairable`). Show this notice:

   > Heads up — I checked your extracted Claude chat history and **{N} days** look incomplete. An older version of this extractor dropped some messages before a fix shipped; those files were never rebuilt. I can **repair {R} of them right now** from session logs still on your machine. The other **{N-R} days** have no source logs left locally and would need a backup to recover.
   >
   > Want me to: **(1)** repair the {R} I can now · **(2)** tell me more first · **(3)** check for a backup · **(4)** skip?

5. **On (2) tell me more:** show the fuller explanation, then re-offer the remaining three options (option (2) is intentionally dropped — the explanation has already been shown, so re-offering it would let the user bounce on (2) forever without the version stamp ever being written):

   > An earlier version of this tool had a bug: when a conversation used background "sub-agent" helpers, some of those messages could be dropped from the saved history — and once a file was saved that way, normal re-runs couldn't fix it on their own. The latest update fixes this and can now rebuild the affected days cleanly.
   >
   > Separately: Claude Code itself periodically rotates out old session logs on its own — that's not something this tool or you did wrong, it just means the raw source for some older days may no longer exist on this machine. If it doesn't, a backup of `~/.claude/projects/` from around that time (Time Machine, Backblaze, etc.) is the only way to recover those days.
   >
   > Want me to: **(1)** repair the {R} I can now · **(3)** check for a backup · **(4)** skip?

6. **On (1) repair now:** run `--rebuild` scoped to just the dates marked `repairable`:
   ```bash
   for date in <repairable dates>; do
     python3 ${CLAUDE_PLUGIN_ROOT}/core/scripts/run_extraction.py --source claude --date "$date" --rebuild
   done
   ```
   Report each result line back to the user. If `N-R > 0` (some dates still need a backup), move to step 7's backup offer for the remainder. Otherwise proceed to step 8.

7. **On (3) check for a backup:** tell the user the exact folder to look for — derive `<repo-name>` from the actual project path (do not hardcode `knowledge-graph`):

   > Look for a backup of `~/.claude/projects/-Users-<you>-GitHub-<repo-name>/` from around the affected dates — Time Machine, Backblaze, or any full-disk backup would have it. If you find one, tell me the restored path and I'll check what it covers.

   Once given a path, re-run the health check against it and report which of the remaining dates it actually covers:
   ```bash
   python3 ${CLAUDE_PLUGIN_ROOT}/core/scripts/check_extraction_health.py --dates-only "$chat_history" --source-root "<restored-path>"
   ```
   Then offer to repair those dates from the restored path:
   ```bash
   python3 ${CLAUDE_PLUGIN_ROOT}/core/scripts/run_extraction.py --source claude --date "$date" --rebuild --claude-projects-dir "<restored-path>"
   ```

   **When the backup interaction concludes — whether the user recovered dates, found no backup, or declined to look — proceed to step 8** so the version stamp is always written. Do not leave this path without reaching step 8, or the notice will re-fire on every future run.

8. **On (4) skip, or after any repair or backup pass completes (including a (3) path that recovered nothing):** call `write_last_extract_version(chat_history, installed_version)` so this check doesn't re-fire on future runs, then continue to Step 1.

**Gemini gets a separate, different notice — not this flow.** When `--source gemini` or `--source all` is used (and Step 0.5 wasn't otherwise skipped per its own condition above), print this one-line note before extraction runs, then continue normally:

> Your Gemini history may mix in other projects' conversations (a known scoping gap, ENH-044). Re-run with `--project=<name>` for clean, scoped output going forward.

No backup guidance for Gemini — nothing is lost, so recovery framing would be misleading; the fix is forward-looking (`--project` scoping on the next run), not a rebuild of past output.

---

### Step 1: Determine Output Directory

**Default behavior (no --output-dir):**

If `$kg_path` is already set (Step 0 ran and resolved it), reuse it — no need to
re-resolve. Otherwise (Step 0 was skipped because `--project` was given without
`--output-dir`) resolve it now:

```
kg_resolve
```

```bash
# Use the resolved graph's chat-history/ subdirectory
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
chat-history/YYYY-MM-DD/YYYY-MM-DD-claude-part-01.md
chat-history/YYYY-MM-DD/YYYY-MM-DD-claude-part-02.md
```

Each part file is a valid standalone markdown document with its own header (annotated `— Part N`). Splits occur at message block boundaries so no message is cut mid-block.

Incremental appends automatically target the last part file. If appending causes the last part to exceed the limit, a new part is created.

**`--rebuild` and split content:** a `--rebuild` of a date that already has a split `YYYY-MM-DD/` subfolder does not delete that subfolder before writing the fresh flat file. The old split content is renamed aside to a dot-hidden, timestamped backup (invisible to normal file routing, so it never shadows the new output) once the fresh write is confirmed complete, not before — the old good state is never destroyed ahead of a successful replacement. Up to 3 most recent backups per date are kept; older ones are pruned automatically.

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
- Operates on `{kg_path}` (see § Step 0: Resolve Target Graph above), or `--output-dir` if overridden
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
