
"""
Extract Gemini Chat History from JSON Logs and Protobuf Files
"""
import os
import json
import glob
import re
import time
from datetime import datetime
try:
    import blackboxprotobuf
    HAS_BBP = True
except ImportError:
    HAS_BBP = False
    print("Warning: blackboxprotobuf not found. Protobuf extraction will be limited.")

# Common English words to filter out binary noise
COMMON_WORDS = {' the ', ' you ', ' and ', ' that ', ' have ', ' for ', ' not ', ' with ', ' this ', ' from '}

from chat_extractor_base import get_output_path, format_timestamp, write_markdown_header, write_message_block, split_file_if_oversized

GEMINI_TMP_DIR = os.path.expanduser("~/.gemini/tmp")
GEMINI_CONV_DIR = os.path.expanduser("~/.gemini/antigravity/conversations")

def extract_gemini_json_sessions(limit=None, project_filter=None):
    """Returns a list of recent sessions from JSON files."""
    all_json_sessions = []
    project_dirs = glob.glob(os.path.join(GEMINI_TMP_DIR, "*"))
    if project_filter:
        project_dirs = [d for d in project_dirs
                        if project_filter.lower() in os.path.basename(d).lower()]
    json_files = []
    for project_dir in project_dirs:
        json_files.extend(glob.glob(os.path.join(project_dir, "**", "session-*.json"), recursive=True))
    if limit:
        json_files = json_files[:limit]
    
    for json_path in json_files:
        try:
            with open(json_path, 'r') as f:
                data = json.load(f)
                
            messages = []
            session_start = data.get('startTime')
            if session_start:
                 dt = datetime.fromisoformat(session_start.replace("Z", "+00:00"))
                 session_date = dt.strftime("%Y-%m-%d")
                 session_ts = dt.strftime("%H%M%S")
            else:
                 # Fallback
                 match = re.search(r"session-(\d{4}-\d{2}-\d{2})", os.path.basename(json_path))
                 session_date = match.group(1) if match else "Unknown-Date"
                 session_ts = "000000"

            for msg in data.get('messages', []):
                msg_type = msg.get('type')
                if msg_type == 'user':
                    messages.append({
                        'role': 'user', 
                        'content': msg.get('content', ''), 
                        'timestamp': msg.get('timestamp')
                    })
                elif msg_type == 'gemini':
                    thinking = '\n'.join([t.get('description', '') for t in msg.get('thoughts', [])])
                    text = msg.get('content', '')
                    tool_calls = msg.get('toolCalls', [])
                    
                    messages.append({
                        'role': 'assistant', 
                        'thinking': thinking, 
                        'content': text, 
                        'tool_calls': tool_calls,
                        'timestamp': msg.get('timestamp')
                    })

            if messages:
                all_json_sessions.append({
                    'date': session_date,
                    'ts': session_ts,
                    'messages': messages,
                    'count': len(messages),
                    'method': 'Gemini (JSON)'
                })

        except Exception as e:
            print(f"Error processing JSON {json_path}: {e}")
            
    return all_json_sessions

def extract_gemini_stream_sessions(limit=None, project_filter=None):
    """Returns a list of recent sessions from the post-2026-05-13 streaming
    .jsonl session format (line-delimited: one header line, then per-turn
    events interleaved with {"$set": ...} checkpoint patches). Turns sharing
    the same `id` are progressively completed writes — the last occurrence
    wins. A `type:"gemini"` turn whose final content is still empty falls
    back to resultDisplay (top-level, then toolCalls[].resultDisplay) rather
    than emitting a blank message.
    """
    all_stream_sessions = []
    project_dirs = glob.glob(os.path.join(GEMINI_TMP_DIR, "*"))
    if project_filter:
        project_dirs = [d for d in project_dirs
                        if project_filter.lower() in os.path.basename(d).lower()]
    jsonl_files = []
    for project_dir in project_dirs:
        jsonl_files.extend(glob.glob(os.path.join(project_dir, "**", "session-*.jsonl"), recursive=True))
    if limit:
        jsonl_files = jsonl_files[:limit]

    for jsonl_path in jsonl_files:
        try:
            turns_by_id = {}
            turn_order = []
            session_start = None

            with open(jsonl_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        obj = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    if 'id' not in obj:
                        # Header line or a {"$set": ...} checkpoint patch — no turn id.
                        if session_start is None and obj.get('startTime'):
                            session_start = obj['startTime']
                        continue

                    turn_id = obj['id']
                    if turn_id not in turns_by_id:
                        turn_order.append(turn_id)
                    turns_by_id[turn_id] = obj  # last occurrence wins

            if session_start:
                dt = datetime.fromisoformat(session_start.replace("Z", "+00:00"))
                session_date = dt.strftime("%Y-%m-%d")
                session_ts = dt.strftime("%H%M%S")
            else:
                match = re.search(r"session-(\d{4}-\d{2}-\d{2})", os.path.basename(jsonl_path))
                session_date = match.group(1) if match else "Unknown-Date"
                session_ts = "000000"

            messages = []
            skipped_empty = 0
            for turn_id in turn_order:
                turn = turns_by_id[turn_id]
                turn_type = turn.get('type')

                if turn_type == 'user':
                    content_list = turn.get('content', [])
                    if isinstance(content_list, list):
                        text = ''.join(i.get('text', '') for i in content_list if isinstance(i, dict))
                    else:
                        text = content_list or ''
                    if text.strip():
                        messages.append({
                            'role': 'user',
                            'content': text,
                            'timestamp': turn.get('timestamp'),
                        })
                elif turn_type == 'gemini':
                    text = turn.get('content') or ''
                    if not text:
                        text = turn.get('resultDisplay') or ''
                    if not text:
                        for tc in turn.get('toolCalls', []):
                            if tc.get('resultDisplay'):
                                text = tc['resultDisplay']
                                break
                    if text:
                        messages.append({
                            'role': 'assistant',
                            'thinking': '',
                            'content': text,
                            'tool_calls': turn.get('toolCalls', []),
                            'timestamp': turn.get('timestamp'),
                        })
                    else:
                        skipped_empty += 1

            if skipped_empty:
                print(f"Warning: {jsonl_path} — {skipped_empty} gemini turn(s) had no content, resultDisplay, or toolCalls text; skipped")

            if messages:
                all_stream_sessions.append({
                    'date': session_date,
                    'ts': session_ts,
                    'messages': messages,
                    'count': len(messages),
                    'method': 'Gemini (Stream)'
                })

        except Exception as e:
            print(f"Error processing stream {jsonl_path}: {e}")

    return all_stream_sessions

def _find_epoch_hint(obj, now=None):
    """Heuristically searches a schemaless-decoded protobuf structure (a
    dict/list tree from blackboxprotobuf.decode_message) for a plausible
    Unix-epoch timestamp, so a .pb session's date can be derived from its own
    content instead of the file's mtime.

    File mtime is unreliable whenever the .pb file has been copied, moved, or
    restored from a backup after the conversation actually happened -- the OS
    updates mtime to the copy/restore time, silently mis-dating real content
    (ENH-046). There is no .proto schema available for these files (decoded
    schemaless via blackboxprotobuf), so this can't identify a specific
    "timestamp" field by name -- it looks for any integer value that plausibly
    represents an epoch (seconds or milliseconds) within roughly the last 10
    years, the same best-effort heuristic style already used by
    find_content_strings() in this file for message text. Returns the
    earliest plausible value found (a session's start time is a safer choice
    than a later "last updated" field also present in the same structure), or
    None if nothing plausible is found -- callers should fall back to mtime.
    """
    if now is None:
        now = time.time()
    window_start = now - (10 * 365 * 86400)
    window_end = now + 86400  # small forward slack for clock skew
    candidates = []

    def walk(o):
        if isinstance(o, dict):
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for item in o:
                walk(item)
        elif isinstance(o, bool):
            return  # bool is an int subclass in Python; not a timestamp
        elif isinstance(o, int):
            if window_start < o < window_end:
                candidates.append(float(o))
            elif window_start < (o / 1000) < window_end:
                candidates.append(o / 1000)

    walk(obj)
    return min(candidates) if candidates else None

def extract_gemini_pb_sessions(limit=None, project_filter=None):
    """Returns a list of archived sessions from Protobuf files using blackboxprotobuf or fallback.

    project_filter is accepted for signature parity with the .json/.jsonl
    paths (extract_all_gemini calls all three uniformly) but not yet applied
    here: .pb files live flat under GEMINI_CONV_DIR with no per-project
    subdirectory to filter on, unlike GEMINI_TMP_DIR's per-project layout —
    see ENH-044's Explicitly Out of Scope section. Filtering .pb by project
    would need a different mechanism (e.g. a field inside the decoded
    payload), not yet implemented.
    """
    all_pb_sessions = []
    pb_files = glob.glob(os.path.join(GEMINI_CONV_DIR, "*.pb"))
    if limit:
        pb_files = pb_files[:limit]
    print(f"DEBUG: Found {len(pb_files)} PB files in {GEMINI_CONV_DIR}")
    
    for pb_path in pb_files:
        try:
            # File mtime is the last-resort date source -- unreliable
            # whenever this .pb file has been copied, moved, or restored
            # from a backup after the conversation happened (ENH-046). Used
            # only if no plausible timestamp can be found inside the decoded
            # content itself, below.
            mtime = os.path.getmtime(pb_path)
            dt_mtime = datetime.fromtimestamp(mtime)
            file_date = dt_mtime.strftime("%Y-%m-%d")
            file_ts_str = dt_mtime.strftime("%H%M%S")

            # Try to decode with blackboxprotobuf first
            try:
                if HAS_BBP:
                    with open(pb_path, 'rb') as f:
                        data = f.read()
                    
                    # Decode without schema
                    message, typedef = blackboxprotobuf.decode_message(data)
                    
                    # Heuristic extraction from the structural decode
                    def find_content_strings(obj):
                        found_text = []
                        if isinstance(obj, dict):
                            for k, v in obj.items():
                                found_text.extend(find_content_strings(v))
                        elif isinstance(obj, list):
                            for item in obj:
                                found_text.extend(find_content_strings(item))
                        elif isinstance(obj, (str, bytes)):
                            if isinstance(obj, bytes):
                                try:
                                    # Use 's' as internal var
                                    val = obj.decode('utf-8')
                                    # Stricter filter for decoded bytes
                                    if len(val) > 20 and ' ' in val: 
                                        found_text.append(val)
                                except: pass
                            elif isinstance(obj, str):
                                if len(obj) > 20 and ' ' in obj:
                                    found_text.append(obj)
                        return found_text

                    decoded_segments = find_content_strings(message)
                    if decoded_segments:
                        # Prefer a timestamp found inside the decoded content
                        # over file mtime -- mtime reflects when this .pb
                        # file was last touched on disk (copy/restore/sync),
                        # not when the conversation happened (ENH-046).
                        epoch_hint = _find_epoch_hint(message)
                        if epoch_hint is not None:
                            dt_content = datetime.fromtimestamp(epoch_hint)
                            entry_date = dt_content.strftime("%Y-%m-%d")
                            entry_ts = dt_content.strftime("%H%M%S")
                        else:
                            entry_date = file_date
                            entry_ts = file_ts_str
                        all_pb_sessions.append({
                            'date': entry_date,
                            'ts': entry_ts,
                            'segments': decoded_segments,
                            'count': len(decoded_segments),
                            'method': 'Gemini (Protobuf Decode)'
                        })
                        continue # Skip fallback
            except Exception as e_bbp:
                print(f"DEBUG: BBP failed for {pb_path}: {e_bbp}")

            # Fallback path (if BBP failed or not installed)
            clean_strings = []
            try:
                with open(pb_path, 'rb') as f:
                    raw_data = f.read()
                
                text_content = raw_data.decode('utf-8', errors='ignore')
                potential_strings = re.findall(r'[\x20-\x7E\n]{30,}', text_content)
                
                for s in potential_strings:
                    s_clean = s.strip()
                    if ' ' in s_clean:
                        lower_s = s_clean.lower()
                        # Count how many distinct common words are present
                        common_count = sum(1 for word in COMMON_WORDS if word in lower_s)
                        if common_count >= 3:
                            clean_strings.append(s_clean)
            except: pass

            if clean_strings:
                all_pb_sessions.append({
                    'date': file_date,
                    'ts': file_ts_str,
                    'segments': clean_strings,
                    'count': len(clean_strings),
                    'method': 'Gemini (Raw Heuristic Fallback)'
                })

        except Exception as e:
            print(f"Error processing PB {pb_path}: {e}")

    return all_pb_sessions

def extract_all_gemini(limit=None, date_filter=None, after_date=None, before_date=None, project_filter=None):
    """Main controller to aggregate all Gemini sessions and write merged daily files."""
    results = []

    json_sessions = extract_gemini_json_sessions(limit=limit, project_filter=project_filter)
    stream_sessions = extract_gemini_stream_sessions(limit=limit, project_filter=project_filter)
    pb_sessions = extract_gemini_pb_sessions(limit=limit, project_filter=project_filter)

    from collections import defaultdict
    sessions_by_date = defaultdict(list)

    for s in json_sessions + stream_sessions + pb_sessions:
        sessions_by_date[s['date']].append(s)

    # Apply date filtering (mirrors Claude extraction logic)
    if date_filter:
        sessions_by_date = {k: v for k, v in sessions_by_date.items() if k == date_filter}
    else:
        if after_date:
            sessions_by_date = {k: v for k, v in sessions_by_date.items() if k >= after_date}
        if before_date:
            sessions_by_date = {k: v for k, v in sessions_by_date.items() if k <= before_date}

    for date, sessions in sessions_by_date.items():
        # Sort sessions by timestamp within the day
        sessions.sort(key=lambda x: x['ts'])
        
        filename = f"{date}-gemini.md"
        output_path = get_output_path(filename)
        
        total_items = sum(s['count'] for s in sessions)
        
        with open(output_path, 'w') as f:
            write_markdown_header(f, "Gemini (Aggregated)", total_items, date)
            
            global_item_index = 1
            for session_index, s in enumerate(sessions, 1):
                method = s.get('method', 'Unknown')
                if len(sessions) > 1:
                    f.write(f"## Session {session_index} [{method}] (Started: {s['ts']})\n\n")
                
                if 'messages' in s:
                    # JSON messages
                    for msg in s['messages']:
                        write_message_block(
                            f, global_item_index, msg['role'], 
                            format_timestamp(msg['timestamp']), 
                            msg.get('content'), 
                            msg.get('thinking'),
                            msg.get('tool_calls')
                        )
                        global_item_index += 1
                else:
                    # PB segments
                    if 'Fallback' in method:
                        f.write("> **Note:** Extracted using RAW HEURISTICS. Output may be fragmented.\n\n")
                    else:
                        f.write("> **Note:** Extracted from binary Protobuf. Structure is flattened.\n\n")
                        
                    for text in s['segments']:
                        f.write(f"### Fragment {global_item_index}\n\n")
                        f.write(f"{text}\n\n")
                        f.write("---\n\n")
                        global_item_index += 1
                
                if session_index < len(sessions):
                    f.write("\n---\n\n")

        split_parts = split_file_if_oversized(output_path)
        if split_parts:
            results.append(f"Merged {len(sessions)} sessions ({total_items} items) into {filename} — split into {len(split_parts)} parts in {date}/ subfolder")
        else:
            results.append(f"Merged {len(sessions)} sessions ({total_items} items) into {filename}")
            
    return results
