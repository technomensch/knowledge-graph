
"""
Base utilities for Chat History Extraction
"""
import os
import re
from datetime import datetime

# Allow override via environment variable (set by skills) or CLI arg (set by run_extraction.py)
# Falls back to script directory for non-plugin use
OUTPUT_DIR = os.environ.get('KG_OUTPUT_DIR',
                             os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ""))

def get_output_path(filename):
    """
    Returns the full path for an output file.
    1. Checks if file exists in any subdirectory -> returns that path.
    2. If new, parses YYYY-MM derived from filename (expected YYYY-MM-DD...) -> returns path in YYYY-MM subfolder.
    3. Fallback to root if date parsing fails.
    """
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

def write_message_block(f, index, role, timestamp, content, thinking=None, tool_calls=None):
    """Writes a single message block to the markdown file."""
    f.write(f"### Message {index}: {role.capitalize()}\n\n")
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
