import os
import argparse
import re
import json
import glob
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional
import re
from chat_extractor_base import get_output_path, format_timestamp, write_markdown_header, write_message_block, split_file_if_oversized, write_atomic, backup_aside, OUTPUT_DIR

CLAUDE_PROJECTS_DIR = os.path.expanduser("~/.claude/projects")


def _dedup_key(uuid, timestamp, content) -> str:
    """Every real Claude Code JSONL record carries a uuid, but if one is
    ever absent, falling back to `None` as the dedup key would make the
    message look "new" on every incremental run forever (None not in
    seen_uuids is always True) -- silently duplicating it indefinitely.
    Hash timestamp+content instead, so a uuid-less message still gets a
    stable identity across runs.
    """
    if uuid:
        return uuid
    return hashlib.sha256(f"{timestamp}:{content}".encode('utf-8')).hexdigest()[:16]

def _parse_ts(ts: str) -> Optional[float]:
    """Parses an ISO 8601 timestamp string to a UTC epoch float, tolerating
    truncated formats (no ms, no Z) as written by the extraction script and
    full formats (with .msZ) as stored in Claude JSONL files."""
    if not ts:
        return None
    for fmt in (
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
    ):
        try:
            return datetime.strptime(ts, fmt).replace(tzinfo=None).timestamp()
        except ValueError:
            continue
    return None


def parse_metadata_from_file(file_path: str) -> tuple[Optional[float], int]:
    """Parses the existing file to find the last message index and timestamp.

    Returns last_ts as a UTC epoch float (not a string) so it can be compared
    safely against JSONL timestamps regardless of formatting differences.
    """
    if not os.path.exists(file_path):
        return None, 0

    last_ts = None
    last_idx = 0
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            # Read last few KB for efficiency
            f.seek(0, os.SEEK_END)
            size = f.tell()
            f.seek(max(0, size - 10240), os.SEEK_SET)
            tail = f.read()

            # Timestamps written by extraction script: "2026-04-21T17:40:50"
            # Capture full match including optional fractional seconds and Z
            ts_matches = re.findall(r'\*\*Timestamp:\*\* ([\d\-T:\.\+Z]+)', tail)
            if ts_matches:
                last_ts = _parse_ts(ts_matches[-1])

            # Find last message index
            idx_matches = re.findall(r'### Message (\d+):', tail)
            if idx_matches:
                last_idx = int(idx_matches[-1])
    except Exception as e:
        print(f"Warning: Could not parse metadata from {file_path}: {e}")
    return last_ts, last_idx


def parse_seen_uuids(file_path: str) -> set[str]:
    """Returns the set of message uuids already written for this date,
    read from the `<!-- uuid: ... -->` markers written by write_message_block.

    ADR-044: a date's history may be split across `{stem}-part*.md` files in a
    `YYYY-MM-DD/` subfolder (split_file_if_oversized, chat_extractor_base.py:96),
    and get_output_path() returns only the LAST part. Scanning that single path
    would miss uuids written to earlier parts, causing them to be re-appended as
    duplicates on the next incremental run. Union across every part instead.
    """
    from chat_extractor_base import OUTPUT_DIR  # already imported at module top; shown for clarity

    paths = []
    filename = os.path.basename(file_path)
    date_m = re.match(r'(\d{4}-\d{2}-\d{2})', filename)
    if date_m:
        split_dir = os.path.join(OUTPUT_DIR, date_m.group(1))
        if os.path.isdir(split_dir):
            stem = filename[:-3]  # strip .md, matches get_output_path()
            # strip any trailing -part-NN so we glob the whole family, not one
            # part (hyphenated, zero-padded -- matches split_file_if_oversized's
            # naming in chat_extractor_base.py, aligned to real pre-existing
            # split files discovered via real-data dogfooding, 2026-07-11)
            stem = re.sub(r'-part-\d+$', '', stem)
            paths = sorted(glob.glob(os.path.join(split_dir, f'{stem}-part*.md')))
    if not paths:
        paths = [file_path]  # single flat file (no split subfolder)

    seen = set()
    for p in paths:
        if not os.path.exists(p):
            continue
        with open(p, 'r', encoding='utf-8') as f:
            for line in f:
                m = re.match(r'<!-- uuid: (\S+) -->', line)
                if m:
                    seen.add(m.group(1))
    return seen


def extract_claude_sessions(days_back=None, date_filter=None, after_date=None,
                             before_date=None, project_filter=None, incremental=False,
                             rebuild=False, claude_projects_dir=None):
    """
    Scans Claude project directories for jsonl files and extracts them.

    Args:
        days_back: Legacy parameter (not used)
        date_filter: Extract only sessions from specific date (YYYY-MM-DD)
        after_date: Extract only sessions on or after this date (YYYY-MM-DD, inclusive)
        before_date: Extract only sessions on or before this date (YYYY-MM-DD, inclusive)
        project_filter: Filter to sessions from a specific project (path fragment match)
        incremental: Skip extraction if file already exists and is current
        rebuild: Force the overwrite/flatten branch for every date in scope,
            ignoring any existing output file's parsed last_ts/seen_uuids.
            Use to repair output written by an older, buggy version of this
            script (uuid-dedup treats already-written content as permanent,
            so a normal incremental run can never self-heal it — see ENH-043).
            Takes precedence over `incremental` when both are set (rebuild is
            the more destructive, more intentional operation, so it wins).
        claude_projects_dir: Override the Claude session-log source directory
            instead of ~/.claude/projects — e.g. a restored backup, when the
            live logs have been rotated out (see ENH-043).

    Returns a list of processing results.
    """
    results = []
    # Find all project directories
    projects_dir = claude_projects_dir or CLAUDE_PROJECTS_DIR
    project_dirs = glob.glob(os.path.join(projects_dir, "*"))

    # Filter project directories by path fragment if --project provided
    if project_filter:
        project_dirs = [d for d in project_dirs
                        if project_filter.lower() in os.path.basename(d).lower()]
    
    # Collect all sessions first
    all_sessions = []

    # ENH-061: attribute each session by its own recorded `cwd`, not by which
    # ~/.claude/projects/ directory it was found under. A git worktree gets
    # its own separate project directory (naming conventions for this are not
    # consistent -- confirmed 3 different ones coexist on real machines), but
    # every session .jsonl carries an absolute `cwd` field per message, which
    # is a reliable, convention-independent signal. Used below to print a
    # composition breakdown whenever project_filter matched more than one
    # directory, so a multi-directory merge (worktree or otherwise) is never
    # silent -- see ADR-062's amendment extending its fail-closed/never-silent
    # principle from Gemini to Claude.
    cwd_file_counts: Dict[str, int] = {}

    for project_dir in project_dirs:
        # Find jsonl files in each project recursively (including subagents)
        jsonl_files = glob.glob(os.path.join(project_dir, "**", "*.jsonl"), recursive=True)

        for jsonl_path in jsonl_files:
            # Skip empty files
            if os.path.getsize(jsonl_path) == 0:
                continue
                
            # Per-message date bucketing (ENH-047): a session .jsonl can span
            # multiple real calendar days (resumed via /clear or context
            # compaction). Bucketing the whole file by only its first
            # timestamp misfiles every later-day message under the start
            # date. Each message gets its own date instead, carried forward
            # from the nearest preceding timestamped record when a message
            # has no parseable timestamp of its own. Leading untimestamped
            # records (no preceding timestamped record yet in this file) are
            # buffered until the first real date is derived, then backfilled
            # to that date -- a single streaming pass can't know the
            # fallback date before that point.
            messages_by_date: Dict[str, list] = {}
            date_ts_str: Dict[str, str] = {}
            pending_untimestamped = []
            current_date = None
            file_cwd = None  # ENH-061: first `cwd` seen in this session's records

            try:
                with open(jsonl_path, 'r') as f:
                    for line in f:
                        try:
                            obj = json.loads(line)

                            if file_cwd is None and obj.get('cwd'):
                                file_cwd = obj['cwd']

                            msg_date = None
                            msg_ts_str = None
                            if obj.get('timestamp'):
                                try:
                                    dt = datetime.fromisoformat(obj['timestamp'].replace("Z", "+00:00"))
                                    msg_date = dt.strftime("%Y-%m-%d")
                                    msg_ts_str = dt.strftime("%H%M%S")
                                except: pass

                            if msg_date:
                                current_date = msg_date
                                existing_ts = date_ts_str.get(current_date)
                                if existing_ts is None or msg_ts_str < existing_ts:
                                    date_ts_str[current_date] = msg_ts_str
                                if pending_untimestamped:
                                    messages_by_date.setdefault(current_date, []).extend(pending_untimestamped)
                                    pending_untimestamped = []

                            parsed_msg = None
                            if obj.get('type') == 'user' and 'message' in obj:
                                content_list = obj['message'].get('content', [])
                                text = ''.join(i.get('text', '') for i in content_list if isinstance(i, dict))
                                if text.strip():
                                    parsed_msg = {
                                        'role': 'user',
                                        'content': text,
                                        'timestamp': obj.get('timestamp'),
                                        'uuid': _dedup_key(obj.get('uuid'), obj.get('timestamp'), text),
                                    }
                            elif obj.get('type') == 'assistant' and 'message' in obj:
                                content_list = obj['message'].get('content', [])
                                thinking, text = '', ''
                                for item in content_list:
                                    if isinstance(item, dict):
                                        if 'thinking' in item: thinking = item['thinking']
                                        if 'text' in item: text = item['text']
                                if thinking or text:
                                    parsed_msg = {
                                        'role': 'assistant',
                                        'thinking': thinking,
                                        'content': text,
                                        'timestamp': obj.get('timestamp'),
                                        'uuid': _dedup_key(obj.get('uuid'), obj.get('timestamp'), text or thinking),
                                    }

                            if parsed_msg is None:
                                continue

                            if current_date:
                                messages_by_date.setdefault(current_date, []).append(parsed_msg)
                            else:
                                pending_untimestamped.append(parsed_msg)
                        except json.JSONDecodeError: continue
            except Exception as e:
                print(f"Error reading {jsonl_path}: {e}")
                continue

            # A file with zero timestamped records never resolves
            # pending_untimestamped into any date bucket -- nothing is
            # emitted for it, preserving prior behavior (a file with no
            # derivable session_date was never appended either).
            for bucket_date, bucket_messages in messages_by_date.items():
                bucket_messages.sort(key=lambda m: m.get('timestamp') or '')
                all_sessions.append({
                    'date': bucket_date,
                    'ts_str': date_ts_str.get(bucket_date) or "000000",
                    'messages': bucket_messages,
                    'count': len(bucket_messages)
                })

            cwd_file_counts[file_cwd or "(no cwd recorded)"] = \
                cwd_file_counts.get(file_cwd or "(no cwd recorded)", 0) + 1

    # ENH-061: project_filter matching more than one distinct cwd means
    # sessions from genuinely different working contexts (a worktree, an
    # unrelated same-prefix directory, etc.) are about to be merged into one
    # output. Never silent about that -- print the breakdown before writing,
    # so a multi-context merge is always visible even though it's still
    # allowed (the user did explicitly scope something with --project).
    if project_filter and len(cwd_file_counts) > 1:
        print(f"NOTE: --project={project_filter!r} matched {len(cwd_file_counts)} "
              f"distinct working directories -- sessions from all of them are included:")
        for cwd_path, count in sorted(cwd_file_counts.items(), key=lambda kv: -kv[1]):
            print(f"  {count} session file(s) from {cwd_path}")
        print("  If this isn't what you meant, re-run with a more specific "
              "--project value (e.g. a worktree's own name).")

    # Group by date
    from collections import defaultdict
    sessions_by_date = defaultdict(list)
    for session in all_sessions:
        sessions_by_date[session['date']].append(session)

    # Apply date filtering
    if date_filter:
        sessions_by_date = {k: v for k, v in sessions_by_date.items() if k == date_filter}
    else:
        if after_date:
            sessions_by_date = {k: v for k, v in sessions_by_date.items() if k >= after_date}
        if before_date:
            sessions_by_date = {k: v for k, v in sessions_by_date.items() if k <= before_date}

    # Note: incremental mode used to skip a date entirely if its output file's
    # mtime was under an hour old, on the assumption that a recent mtime meant
    # the file was already synced. That assumption is false for an active
    # session (new messages can land within the same hour), and it silently
    # dropped real incremental syncs run twice inside an hour. The write-files
    # loop below now performs correct per-message uuid dedup (parse_seen_uuids)
    # regardless of file age, and already reports "No new activity" when there
    # is genuinely nothing new — so no separate recency-based skip is needed.

    if rebuild and date_filter and date_filter not in sessions_by_date:
        existing_path = get_output_path(f"{date_filter}-claude.md")
        if os.path.exists(existing_path):
            results.append(
                f"WARNING: --rebuild found 0 source sessions for {date_filter} "
                f"(project_filter={project_filter!r}) -- existing output was left "
                f"untouched. If your local ~/.claude/projects/ session logs for this "
                f"date have been rotated/deleted and no backup exists, this date's "
                f"original conversation content cannot be recovered."
            )

    # Write files
    for date, sessions in sessions_by_date.items():
        # Sort sessions by timestamp within the day
        sessions.sort(key=lambda x: x['ts_str'])
        
        filename = f"{date}-claude.md"
        split_dir = os.path.join(OUTPUT_DIR, date)

        if rebuild:
            # Resolve the flat output path directly -- do NOT call
            # get_output_path() here, since a stale {date}/ split subfolder
            # (if any) is still live at this point and get_output_path()
            # would route into it (it always prefers an existing split
            # dir's last part). The old split content, and any stray flat
            # copies elsewhere, are backed aside AFTER the fresh write
            # succeeds below -- never deleted before it.
            year_month = date[:7]
            output_dir_for_date = os.path.join(OUTPUT_DIR, year_month)
            os.makedirs(output_dir_for_date, exist_ok=True)
            output_path = os.path.join(output_dir_for_date, filename)
        else:
            output_path = get_output_path(filename)

        if rebuild:
            # --rebuild takes precedence over --incremental: forcing
            # last_ts=None here routes unconditionally to the overwrite/flatten
            # branch below. --incremental only ever influences the append
            # branch that rebuild deliberately bypasses (and in fact the write
            # loop never consults `incremental` for branching at all), so when
            # both flags are passed, rebuild deterministically wins.
            last_ts, last_idx = None, 0
        else:
            last_ts, last_idx = parse_metadata_from_file(output_path)

        if last_ts is not None:
            # Filter for truly new messages using per-message uuid dedup
            # (not a cross-file timestamp cutoff — see parse_seen_uuids).
            seen_uuids = parse_seen_uuids(output_path)
            filtered_sessions = []
            new_msg_count = 0
            for session in sessions:
                new_msgs = [
                    m for m in session['messages']
                    if m.get('uuid') not in seen_uuids
                ]
                if new_msgs:
                    filtered_sessions.append({
                        **session,
                        'messages': new_msgs,
                        'count': len(new_msgs)
                    })
                    new_msg_count += len(new_msgs)

            if filtered_sessions:
                # Flatten across all filtered source files and sort by true
                # timestamp, same as the fresh-write branch, so a newly
                # discovered subagent file's messages interleave correctly
                # rather than appending as one contiguous same-file block.
                flat_new_msgs = [m for s in filtered_sessions for m in s['messages']]
                flat_new_msgs.sort(key=lambda m: _parse_ts(m.get('timestamp')) or 0)

                # Wrap the append in write_atomic too: read the existing
                # content, append the new block in memory, then swap the
                # whole thing in atomically -- a crash mid-append can no
                # longer leave a partial trailing block (append content is
                # small, so reading it all into memory first is cheap).
                with open(output_path, 'r', encoding='utf-8') as existing_f:
                    existing_content = existing_f.read()

                def _write_appended(f, _existing=existing_content, _msgs=flat_new_msgs, _start=last_idx + 1):
                    f.write(_existing)
                    f.write(f"\n\n---\n## [Incremental Update: {datetime.now().strftime('%H:%M:%S')}]\n\n")
                    idx = _start
                    for msg in _msgs:
                        write_message_block(
                            f, idx, msg['role'],
                            format_timestamp(msg['timestamp']),
                            msg.get('content'),
                            msg.get('thinking'),
                            uuid=msg.get('uuid'),
                        )
                        idx += 1

                write_atomic(output_path, _write_appended)
                split_parts = split_file_if_oversized(output_path)
                if split_parts:
                    results.append(f"Appended to {filename} — split into {len(split_parts)} parts in {date}/ subfolder")
                else:
                    results.append(f"Appended {new_msg_count} new messages to {filename}")
            else:
                results.append(f"No new activity for {filename} (last sync: {datetime.utcfromtimestamp(last_ts).strftime('%Y-%m-%dT%H:%M:%SZ')})")
        else:
            # File exists but metadata parsing failed, is new, or --rebuild
            # forced this branch.
            file_exists = os.path.exists(output_path)
            file_has_content = file_exists and os.path.getsize(output_path) > 0

            # Back up the PRIMARY target's existing content BEFORE writing
            # over it -- never destroy the old good state until the new
            # state is confirmed written. backup_aside() renames (not
            # copies) it aside to a timestamped, dot-prefixed sibling, so a
            # second consecutive run (e.g. two --rebuild passes on the same
            # date) gets its own distinct backup instead of clobbering a
            # single shared ".backup" slot.
            backup_msg = ""
            if file_has_content:
                backed_up_path = backup_aside(output_path)
                if backed_up_path:
                    backup_msg = f" (backup saved to {os.path.basename(backed_up_path)})"

            total_messages = sum(s['count'] for s in sessions)

            # Flatten all source-file "sessions" into one chronological stream.
            # A source file's own boundary no longer determines write order —
            # true message timestamps do, so subagent messages interleave
            # correctly with the main thread instead of appearing as a
            # separate trailing block.
            all_msgs_for_date = []
            for session in sessions:
                all_msgs_for_date.append(session['messages'])
            flat_messages = [m for msgs in all_msgs_for_date for m in msgs]
            flat_messages.sort(key=lambda m: _parse_ts(m.get('timestamp')) or 0)

            def _write_fresh(f, _msgs=flat_messages, _total=total_messages, _date=date):
                write_markdown_header(f, "Claude Code", _total, _date)
                idx = 1
                for msg in _msgs:
                    write_message_block(
                        f, idx, msg['role'],
                        format_timestamp(msg['timestamp']),
                        msg.get('content'),
                        msg.get('thinking'),
                        uuid=msg.get('uuid'),
                    )
                    idx += 1

            write_atomic(output_path, _write_fresh)

            if rebuild:
                # Now that the fresh flat file is confirmed written, back
                # aside anything old that could otherwise shadow or
                # duplicate it: any stray flat copy of this filename found
                # elsewhere in the tree (mirrors get_output_path()'s walk
                # step, applied manually here since output_path was
                # resolved explicitly above, not via get_output_path()),
                # and the stale {date}/ split subfolder itself. Neither is
                # touched until this point, so a failure during the write
                # above would have left both fully intact.
                for root, dirs, files in os.walk(OUTPUT_DIR):
                    dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'scripts']
                    if filename in files:
                        stray_path = os.path.join(root, filename)
                        if os.path.abspath(stray_path) != os.path.abspath(output_path):
                            backup_aside(stray_path)
                if os.path.isdir(split_dir):
                    backup_aside(split_dir)

            # Check size limits and split if needed
            split_parts = split_file_if_oversized(output_path)
            if split_parts:
                action = "Overwrote" if file_has_content else "Created"
                results.append(f"{action} {filename}: split into {len(split_parts)} parts in {date}/ subfolder{backup_msg}")
            elif file_has_content:
                results.append(f"Overwrote {filename} with {total_messages} messages{backup_msg}")
            else:
                results.append(f"Created {filename} with {total_messages} messages")

    return results

def split_claude_md(md_path):
    """
    Parses an existing Claude Markdown export and splits it into daily files.
    """
    if not os.path.exists(md_path):
        return [f"Error: File {md_path} not found."]

    all_sessions = []
    current_messages = []
    current_date = None
    current_ts = None
    
    with open(md_path, 'r') as f:
        content = f.read()
    
    # Split by message markers
    # Matches: ### Message N: User\n\n**Timestamp:** 2026-01-22T19:20:35
    msg_blocks = re.split(r'### Message \d+: (User|Assistant)', content)
    
    # The split leaves the role in the list, so we reconstruct
    # msg_blocks[0] is the header
    # msg_blocks[1] is role, msg_blocks[2] is content, etc.
    
    for i in range(1, len(msg_blocks), 2):
        role_label = msg_blocks[i].lower()
        role = 'user' if 'user' in role_label else 'assistant'
        block_text = msg_blocks[i+1]
        
        # Extract timestamp
        ts_match = re.search(r'\*\*Timestamp:\*\* ([\d\-T:]+)', block_text)
        if ts_match:
            ts_val = ts_match.group(1)
            try:
                dt = datetime.fromisoformat(ts_val.replace("Z", "+00:00"))
                msg_date = dt.strftime("%Y-%m-%d")
                msg_ts = dt.strftime("%H%M%S")
            except:
                msg_date, msg_ts = "Unknown", "000000"
        else:
            msg_date, msg_ts = "Unknown", "000000"
            
        # Extract content
        # Content is after **Content:** or just the rest of the block
        content_match = re.search(r'\*\*Content:\*\*\n\n(.*?)(?=\n\n---|\Z)', block_text, re.DOTALL)
        msg_content = content_match.group(1).strip() if content_match else ""
        
        # Extract thinking if present
        thinking_match = re.search(r'\*\*Thinking Block:\*\*\n\n```\n(.*?)\n```', block_text, re.DOTALL)
        msg_thinking = thinking_match.group(1).strip() if thinking_match else ""

        # Group by session (rough heuristic: a session is a sequence of messages close in time)
        # Actually, the user asked to "break it into separate days".
        # We can just collect all messages and use our existing sessions_by_date logic.
        all_sessions.append({
            'date': msg_date,
            'ts_str': msg_ts,
            'role': role,
            'content': msg_content,
            'thinking': msg_thinking,
            'timestamp': ts_val if ts_match else None
        })

    # Regroup into the format extract_claude_sessions expects
    from collections import defaultdict
    sessions_by_date = defaultdict(list)
    
    # For Markdown splitting, we treat one continuous day as one session for simplicity, 
    # or we can try to find session gaps. Let's just group by date.
    daily_messages = defaultdict(list)
    for msg in all_sessions:
        daily_messages[msg['date']].append(msg)
    
    results = []
    for date, messages in daily_messages.items():
        if date == "Unknown": continue
        
        filename = f"{date}-claude.md"
        output_path = get_output_path(filename)
        
        with open(output_path, 'w') as f:
            write_markdown_header(f, "Claude Code (Reprocessed)", len(messages), date)
            for i, msg in enumerate(messages, 1):
                write_message_block(
                    f, i, msg['role'], 
                    msg['timestamp'], 
                    msg['content'], 
                    msg['thinking']
                )
        results.append(f"Split {len(messages)} messages into {filename}")
        
    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Claude History Extractor")
    parser.add_argument("--file", help="Specific Markdown file to split into days")
    args = parser.parse_args()
    
    if args.file:
        res = split_claude_md(args.file)
        for r in res: print(r)
    else:
        res = extract_claude_sessions()
        for r in res: print(r)
