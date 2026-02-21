import os
import argparse
import re
import json
import glob
from datetime import datetime
from typing import List, Dict, Any, Optional
import re
from chat_extractor_base import get_output_path, format_timestamp, write_markdown_header, write_message_block

CLAUDE_PROJECTS_DIR = os.path.expanduser("~/.claude/projects")

def parse_metadata_from_file(file_path: str) -> tuple[Optional[str], int]:
    """Parses the existing file to find the last message index and timestamp."""
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
            
            # Find last timestamp
            ts_matches = re.findall(r'\*\*Timestamp:\*\* ([\d\-T:]+)', tail)
            if ts_matches:
                last_ts = ts_matches[-1]
            
            # Find last message index
            idx_matches = re.findall(r'### Message (\d+):', tail)
            if idx_matches:
                last_idx = int(idx_matches[-1])
    except Exception as e:
        print(f"Warning: Could not parse metadata from {file_path}: {e}")
    return last_ts, last_idx

def extract_claude_sessions(days_back=None, date_filter=None, after_date=None,
                             before_date=None, project_filter=None, incremental=False):
    """
    Scans Claude project directories for jsonl files and extracts them.

    Args:
        days_back: Legacy parameter (not used)
        date_filter: Extract only sessions from specific date (YYYY-MM-DD)
        after_date: Extract only sessions on or after this date (YYYY-MM-DD, inclusive)
        before_date: Extract only sessions on or before this date (YYYY-MM-DD, inclusive)
        project_filter: Filter to sessions from a specific project (path fragment match)
        incremental: Skip extraction if file already exists and is current

    Returns a list of processing results.
    """
    results = []
    # Find all project directories
    project_dirs = glob.glob(os.path.join(CLAUDE_PROJECTS_DIR, "*"))

    # Filter project directories by path fragment if --project provided
    if project_filter:
        project_dirs = [d for d in project_dirs
                        if project_filter.lower() in os.path.basename(d).lower()]
    
    # Collect all sessions first
    all_sessions = []
    
    for project_dir in project_dirs:
        # Find jsonl files in each project recursively (including subagents)
        jsonl_files = glob.glob(os.path.join(project_dir, "**", "*.jsonl"), recursive=True)
        
        for jsonl_path in jsonl_files:
            # Skip empty files
            if os.path.getsize(jsonl_path) == 0:
                continue
                
            messages = []
            session_date = None
            session_ts_str = None
            
            try:
                with open(jsonl_path, 'r') as f:
                    for line in f:
                        try:
                            obj = json.loads(line)
                            
                            # Capture timestamp for filename from the first message with one
                            if not session_date and obj.get('timestamp'):
                                try:
                                    dt = datetime.fromisoformat(obj['timestamp'].replace("Z", "+00:00"))
                                    session_date = dt.strftime("%Y-%m-%d")
                                    session_ts_str = dt.strftime("%H%M%S")
                                except: pass

                            if obj.get('type') == 'user' and 'message' in obj:
                                content_list = obj['message'].get('content', [])
                                text = ''.join(i.get('text', '') for i in content_list if isinstance(i, dict))
                                if text.strip():
                                    messages.append({
                                        'role': 'user', 
                                        'content': text, 
                                        'timestamp': obj.get('timestamp')
                                    })
                            elif obj.get('type') == 'assistant' and 'message' in obj:
                                content_list = obj['message'].get('content', [])
                                thinking, text = '', ''
                                for item in content_list:
                                    if isinstance(item, dict):
                                        if 'thinking' in item: thinking = item['thinking']
                                        if 'text' in item: text = item['text']
                                if thinking or text:
                                    messages.append({
                                        'role': 'assistant', 
                                        'thinking': thinking, 
                                        'content': text, 
                                        'timestamp': obj.get('timestamp')
                                    })
                        except json.JSONDecodeError: continue
            except Exception as e:
                print(f"Error reading {jsonl_path}: {e}")
                continue

            if messages and session_date:
                # Sort messages
                messages.sort(key=lambda x: x.get('timestamp', ''))
                all_sessions.append({
                    'date': session_date,
                    'ts_str': session_ts_str or "000000",
                    'messages': messages,
                    'count': len(messages)
                })

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

    # Apply incremental mode (skip if file exists and has recent content)
    if incremental:
        filtered_dates = {}
        for date, sessions in sessions_by_date.items():
            filename = f"{date}-claude.md"
            output_path = get_output_path(filename)
            if not os.path.exists(output_path):
                filtered_dates[date] = sessions
            else:
                # Check if file is recent (modified in last hour)
                file_time = os.path.getmtime(output_path)
                age_seconds = datetime.now().timestamp() - file_time
                if age_seconds > 3600:  # Older than 1 hour
                    filtered_dates[date] = sessions
                else:
                    results.append(f"Skipped {filename} (already current, modified {int(age_seconds/60)} min ago)")
        sessions_by_date = filtered_dates

    # Write files
    for date, sessions in sessions_by_date.items():
        # Sort sessions by timestamp within the day
        sessions.sort(key=lambda x: x['ts_str'])
        
        filename = f"{date}-claude.md"
        output_path = get_output_path(filename)
        
        last_ts, last_idx = parse_metadata_from_file(output_path)
        
        if last_ts:
            # Filter for truly new messages
            filtered_sessions = []
            new_msg_count = 0
            for session in sessions:
                new_msgs = [m for m in session['messages'] if m.get('timestamp') and m['timestamp'] > last_ts]
                if new_msgs:
                    filtered_sessions.append({
                        **session,
                        'messages': new_msgs,
                        'count': len(new_msgs)
                    })
                    new_msg_count += len(new_msgs)
            
            if filtered_sessions:
                with open(output_path, 'a', encoding='utf-8') as f:
                    # Write a separator if it's new activity on the same day
                    f.write(f"\n\n---\n## [Incremental Update: {datetime.now().strftime('%H:%M:%S')}]\n\n")
                    
                    global_msg_index = last_idx + 1
                    for session in filtered_sessions:
                        for msg in session['messages']:
                            write_message_block(
                                f, global_msg_index, msg['role'], 
                                format_timestamp(msg['timestamp']), 
                                msg.get('content'), 
                                msg.get('thinking')
                            )
                            global_msg_index += 1
                results.append(f"Appended {new_msg_count} new messages to {filename}")
            else:
                results.append(f"No new activity for {filename} (last sync: {last_ts})")
        else:
            # File exists but metadata parsing failed, or file is new
            file_exists = os.path.exists(output_path)
            file_has_content = file_exists and os.path.getsize(output_path) > 0

            # Create backup if we're about to overwrite existing content
            if file_has_content:
                backup_path = output_path + ".backup"
                try:
                    import shutil
                    shutil.copy2(output_path, backup_path)
                    backup_msg = f" (backup saved to {os.path.basename(backup_path)})"
                except Exception as e:
                    backup_msg = f" (backup failed: {e})"
            else:
                backup_msg = ""

            total_messages = sum(s['count'] for s in sessions)
            with open(output_path, 'w', encoding='utf-8') as f:
                write_markdown_header(f, "Claude Code", total_messages, date)

                global_msg_index = 1
                for session_index, session in enumerate(sessions, 1):
                    if len(sessions) > 1:
                        f.write(f"## Session {session_index} (Started: {session['ts_str']})\n\n")

                    for msg in session['messages']:
                        write_message_block(
                            f, global_msg_index, msg['role'],
                            format_timestamp(msg['timestamp']),
                            msg.get('content'),
                            msg.get('thinking')
                        )
                        global_msg_index += 1

                    if session_index < len(sessions):
                        f.write("\n---\n\n")

            # Accurate output message
            if file_has_content:
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
