
"""
Extract Gemini Chat History from JSON Logs and Protobuf Files
"""
import os
import json
import glob
import re
from datetime import datetime
try:
    import blackboxprotobuf
    HAS_BBP = True
except ImportError:
    HAS_BBP = False
    print("Warning: blackboxprotobuf not found. Protobuf extraction will be limited.")

# Common English words to filter out binary noise
COMMON_WORDS = {' the ', ' you ', ' and ', ' that ', ' have ', ' for ', ' not ', ' with ', ' this ', ' from '}

from chat_extractor_base import get_output_path, format_timestamp, write_markdown_header, write_message_block

GEMINI_TMP_DIR = os.path.expanduser("~/.gemini/tmp")
GEMINI_CONV_DIR = os.path.expanduser("~/.gemini/antigravity/conversations")

def extract_gemini_json_sessions(limit=None):
    """Returns a list of recent sessions from JSON files."""
    all_json_sessions = []
    # Recursively find session-*.json files
    json_files = glob.glob(os.path.join(GEMINI_TMP_DIR, "**", "session-*.json"), recursive=True)
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

def extract_gemini_pb_sessions(limit=None):
    """Returns a list of archived sessions from Protobuf files using blackboxprotobuf or fallback."""
    all_pb_sessions = []
    pb_files = glob.glob(os.path.join(GEMINI_CONV_DIR, "*.pb"))
    if limit:
        pb_files = pb_files[:limit]
    print(f"DEBUG: Found {len(pb_files)} PB files in {GEMINI_CONV_DIR}")
    
    for pb_path in pb_files:
        try:
            # Get file mod time
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
                        # Success with BBP
                        all_pb_sessions.append({
                            'date': file_date,
                            'ts': file_ts_str,
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

def extract_all_gemini(limit=None):
    """Main controller to aggregate all Gemini sessions and write merged daily files."""
    results = []
    
    json_sessions = extract_gemini_json_sessions(limit=limit)
    pb_sessions = extract_gemini_pb_sessions(limit=limit)
    
    from collections import defaultdict
    sessions_by_date = defaultdict(list)
    
    for s in json_sessions + pb_sessions:
        sessions_by_date[s['date']].append(s)
        
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
            
            results.append(f"Merged {len(sessions)} sessions ({total_items} items) into {filename}")
            
    return results
