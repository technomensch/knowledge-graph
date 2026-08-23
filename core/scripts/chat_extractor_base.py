
"""
Base utilities for Chat History Extraction
"""
import os
import re
import glob
import json
from datetime import datetime

# Allow override via environment variable (set by skills) or CLI arg (set by run_extraction.py)
_env_output_dir = os.environ.get('KG_OUTPUT_DIR')
if _env_output_dir:
    OUTPUT_DIR = _env_output_dir
else:
    raise RuntimeError(
        "KG_OUTPUT_DIR is not set. Chat extraction must not silently write "
        "into the plugin's own directory. Set KG_OUTPUT_DIR (or pass "
        "--output-dir to run_extraction.py, which sets it) before importing "
        "chat_extractor_base."
    )

# Obsidian crashes above ~1 MB or ~34 K lines; use headroom thresholds
FILE_SIZE_LIMIT = 900_000   # bytes (~900 KB)
FILE_LINE_LIMIT = 30_000    # lines

def get_output_path(filename):
    """
    Returns the full path for an output file.
    0. If a YYYY-MM-DD/ split subfolder exists for this date, returns the last part file.
    1. Checks if file exists in any subdirectory -> returns that path.
    2. If new, parses YYYY-MM derived from filename (expected YYYY-MM-DD...) -> returns path in YYYY-MM subfolder.
    3. Fallback to root if date parsing fails.
    """
    # 0. Check for an existing split subfolder (highest priority)
    date_match_top = re.match(r'(\d{4}-\d{2}-\d{2})', filename)
    if date_match_top:
        date_str = date_match_top.group(1)
        split_dir = os.path.join(OUTPUT_DIR, date_str)
        if os.path.isdir(split_dir):
            stem = filename[:-3]  # strip .md
            part_files = sorted(glob.glob(os.path.join(split_dir, f'{stem}-part*.md')))
            if part_files:
                return part_files[-1]  # last part for appending

    # 1. Search for existing file anywhere in chat-history
    for root, dirs, files in os.walk(OUTPUT_DIR):
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'scripts']
        if filename in files:
            return os.path.join(root, filename)

    # 2. Determine target subfolder for new files
    # Expected filename format: "YYYY-MM-DD-..."
    match = re.match(r"(\d{4})-(\d{2})-\d{2}", filename)
    if match:
        year, month = match.groups()
        subfolder = f"{year}-{month}"
        target_dir = os.path.join(OUTPUT_DIR, subfolder)
        
        # Create directory if it doesn't exist
        if not os.path.exists(target_dir):
            try:
                os.makedirs(target_dir)
            except OSError:
                pass # Fallback to root on failure
        
        return os.path.join(target_dir, filename)

    # 3. Fallback to root
    return os.path.join(OUTPUT_DIR, filename)

def write_atomic(output_path, write_fn):
    """Writes output_path atomically: write_fn(f) writes into a pid-tagged
    temp file, then os.replace() swaps it into place. A crash before the
    replace leaves the original untouched; a crash after leaves the
    complete new file. Never leaves a truncated target. On any exception
    during write_fn, the temp file is unlinked and the exception re-raised
    -- no partial state left behind either way."""
    tmp_path = output_path + f".tmp-{os.getpid()}"
    try:
        with open(tmp_path, 'w', encoding='utf-8') as f:
            write_fn(f)
    except Exception:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise
    os.replace(tmp_path, output_path)


def backup_aside(path_or_dir, retention=3):
    """Renames an existing file or {date}/ split subfolder aside to a
    timestamped, dot-prefixed sibling instead of deleting it -- so the old
    good state survives until the new state is confirmed written. Rename
    (not copy) is atomic and cheap. The pid + collision-counter suffix
    guarantees back-to-back same-second reruns never collide, so a second
    interrupted run can never clobber the first backup (the single-slot
    loss this helper replaces). Dot-prefixed names are invisible to
    get_output_path()'s os.walk (skips d.startswith('.')) and to the
    ^\\d{4}-\\d{2}-\\d{2}$ split-folder match, so backups never shadow or
    get re-picked-up as live output -- stays ADR-044 compatible. Keeps the
    `retention` most recent backups per path, pruning older ones, so
    rebuilds don't accumulate unbounded backup copies in a git-committed
    store."""
    if not os.path.exists(path_or_dir):
        return None

    basename = os.path.basename(path_or_dir.rstrip(os.sep))
    parent = os.path.dirname(path_or_dir.rstrip(os.sep))
    is_split_dir = re.match(r'^\d{4}-\d{2}-\d{2}$', basename) is not None

    prefix = f".{basename}.bak-"

    ts = datetime.now().strftime('%Y%m%dT%H%M%S') + f"-{os.getpid()}"
    target = os.path.join(parent, f".{basename}.bak-{ts}")

    counter = 0
    while os.path.exists(target):
        counter += 1
        target = os.path.join(parent, f".{basename}.bak-{ts}-{counter}")

    os.rename(path_or_dir, target)

    # Retention prune: keep the `retention` most recent backups matching this prefix
    siblings = sorted(
        (e for e in os.listdir(parent) if e.startswith(prefix)),
        reverse=True,
    )
    for stale in siblings[retention:]:
        stale_path = os.path.join(parent, stale)
        if os.path.isdir(stale_path):
            import shutil
            shutil.rmtree(stale_path)
        else:
            os.remove(stale_path)

    return target

def format_timestamp(ts_str):
    """
    Standardize timestamp format to ISO 8601-like or readable string.
    Input can be a string or datetime object.
    """
    if not ts_str:
        return "N/A"
    try:
        if isinstance(ts_str, str):
            # Attempt to parse common formats if needed, or just return normalized
            dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            return dt.strftime("%Y-%m-%dT%H:%M:%S")
        elif isinstance(ts_str, datetime):
            return ts_str.strftime("%Y-%m-%dT%H:%M:%S")
    except ValueError:
        pass
    return str(ts_str)

def write_markdown_header(f, source_label, message_count, date_str=None):
    """Writes the standard Markdown header for chat exports."""
    if not date_str:
        date_str = datetime.now().strftime('%Y-%m-%d')
        
    f.write(f"# Complete Chat Session Export\n")
    f.write(f"## Full Conversation from {source_label}\n\n")
    f.write(f"**Date:** {date_str}\n")
    f.write(f"**Platform:** {source_label}\n")
    f.write(f"**Total Messages:** {message_count}\n")
    f.write(f"**Export Generated:** {datetime.now().isoformat()}\n\n")
    f.write("---\n\n")
    f.write("## Full Conversation Transcript\n\n")

def split_file_if_oversized(output_path):
    """
    Checks output_path against FILE_SIZE_LIMIT and FILE_LINE_LIMIT.
    If either threshold is exceeded, splits the file at block boundaries
    (### Message N: or ### Fragment N) into numbered part files inside a
    YYYY-MM-DD/ subfolder of OUTPUT_DIR. The original file is deleted.
    Returns a list of created part paths, or [] if no split was needed.
    """
    if not os.path.exists(output_path):
        return []

    with open(output_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if (len(content.encode('utf-8')) <= FILE_SIZE_LIMIT and
            content.count('\n') <= FILE_LINE_LIMIT):
        return []

    # Split at block boundaries, keeping each delimiter attached to its block
    blocks = re.split(r'(?=### (?:Message|Fragment) \d+)', content)
    header = blocks[0]
    item_blocks = blocks[1:]

    if not item_blocks:
        return []

    filename = os.path.basename(output_path)
    parent_dir = os.path.dirname(output_path)
    parent_name = os.path.basename(parent_dir)

    if re.match(r'\d{4}-\d{2}-\d{2}$', parent_name):
        # Already inside a split subfolder — split from current part number.
        # Part filenames use a hyphenated, zero-padded number
        # (-part-01.md, not -part1.md) -- zero-padding keeps alphabetical
        # sort equal to numeric sort past 9 parts (a plain "-part1.md" scheme
        # would otherwise sort "part10" before "part2"). This matches the
        # real, pre-existing split files already on disk from earlier
        # extractor versions -- discovered via real-data dogfooding
        # (2026-02-13, 02-20, 02-21, 03-19, 03-25, 04-07 all predate this
        # fix and already use this exact format), not invented here.
        stem = re.sub(r'-part-\d+\.md$', '', filename)
        part_match = re.search(r'-part-(\d+)\.md$', filename)
        start_part = int(part_match.group(1)) if part_match else 1
        split_dir = parent_dir
    else:
        date_m = re.match(r'(\d{4}-\d{2}-\d{2})', filename)
        date_str = date_m.group(1) if date_m else 'unknown'
        split_dir = os.path.join(OUTPUT_DIR, date_str)
        stem = filename[:-3]  # strip .md
        start_part = 1

    os.makedirs(split_dir, exist_ok=True)

    size_threshold = FILE_SIZE_LIMIT * 0.85
    line_threshold = FILE_LINE_LIMIT * 0.85

    chunks = []
    current = []
    current_size = len(header.encode('utf-8'))
    current_lines = header.count('\n')

    for block in item_blocks:
        bsize = len(block.encode('utf-8'))
        blines = block.count('\n')
        if current and (current_size + bsize > size_threshold or
                        current_lines + blines > line_threshold):
            chunks.append(current)
            current = []
            current_size = len(header.encode('utf-8'))
            current_lines = header.count('\n')
        current.append(block)
        current_size += bsize
        current_lines += blines

    if current:
        chunks.append(current)

    if len(chunks) <= 1:
        return []

    created = []
    for i, chunk in enumerate(chunks, start_part):
        part_header = re.sub(
            r'(# Complete Chat Session Export)',
            f'\\1 — Part {i}',
            header, count=1
        )
        part_path = os.path.join(split_dir, f'{stem}-part-{i:02d}.md')
        with open(part_path, 'w', encoding='utf-8') as f:
            f.write(part_header + ''.join(chunk))
        created.append(part_path)

    os.remove(output_path)
    return created


def write_message_block(f, index, role, timestamp, content, thinking=None, tool_calls=None, uuid=None):
    """Writes a single message block to the markdown file."""
    f.write(f"### Message {index}: {role.capitalize()}\n\n")
    if uuid:
        f.write(f"<!-- uuid: {uuid} -->\n")
    f.write(f"**Timestamp:** {timestamp}\n\n")
    
    if thinking:
        f.write(f"**Thinking Block:**\n\n```\n{thinking}\n```\n\n")
    
    if content:
        f.write(f"**Content:**\n\n{content}\n\n")
        
    if tool_calls:
         f.write(f"**Tool Calls:**\n")
         for tc in tool_calls:
             f.write(f"- `{tc.get('name', 'unknown')}`: {tc.get('args', '')}\n")
         f.write("\n")

    f.write("---\n\n")


def read_last_extract_version(chat_history: str) -> str:
    """Returns the plugin version stamped after the last successful extraction
    run against this chat-history directory, or "0.0.0" if never stamped.
    Used by commands/kmg-extract-chat.md's first-run repair check (ENH-043)
    to detect whether this is the first run since crossing a fix version."""
    state_path = os.path.join(chat_history, ".kmg-extract-state.json")
    if not os.path.exists(state_path):
        return "0.0.0"
    try:
        with open(state_path, encoding="utf-8") as f:
            return json.load(f).get("last_extract_plugin_version", "0.0.0")
    except (OSError, ValueError):
        return "0.0.0"


def write_last_extract_version(chat_history: str, version: str) -> None:
    """Stamps the installed plugin version after a run, so the next run can
    tell whether it has already crossed a given fix version (see
    read_last_extract_version)."""
    # Step 0.5 (first-run repair check) can call this before Step 1 has run
    # mkdir on the chat-history dir, and a clean/fresh install may have no
    # chat-history dir yet. Create it so the stamp write never crashes.
    os.makedirs(chat_history, exist_ok=True)
    state_path = os.path.join(chat_history, ".kmg-extract-state.json")
    with open(state_path, "w", encoding="utf-8") as f:
        json.dump({"last_extract_plugin_version": version}, f)
