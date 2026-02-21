
"""
Master Controller for Chat History Extraction
Usage: python3 core/scripts/run_extraction.py [options]
"""
import sys
import os
import argparse
from datetime import datetime

def main():
    parser = argparse.ArgumentParser(description="Extract Chat History from Local Sources")
    parser.add_argument("--source", choices=['all', 'claude', 'gemini'], default='all', help="Source to extract from")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of samples for testing")
    parser.add_argument("--output-dir", type=str, default=None, help="Override output directory (default: auto-detect from active KG)")

    # Date filtering options
    parser.add_argument("--date", type=str, default=None, help="Extract only sessions from specific date (YYYY-MM-DD)")
    parser.add_argument("--after", type=str, default=None, help="Extract only sessions after this date (YYYY-MM-DD)")
    parser.add_argument("--today", action="store_true", help="Extract only today's sessions (convenience flag)")
    parser.add_argument("--before", type=str, default=None, help="Extract only sessions on or before this date (YYYY-MM-DD)")
    parser.add_argument("--project", type=str, default=None, help="Filter to sessions from a specific project (path fragment match against ~/.claude/projects/<name>/)")
    parser.add_argument("--incremental", action="store_true", help="Only extract new sessions (skip if file already exists and is current)")

    args = parser.parse_args()

    # Handle --today convenience flag
    if args.today:
        args.date = datetime.now().strftime("%Y-%m-%d")

    # Set output directory via environment variable BEFORE importing extractors
    # This allows chat_extractor_base.py to pick up the custom output directory
    if args.output_dir:
        os.environ['KG_OUTPUT_DIR'] = args.output_dir

    # Ensure we can import from local directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    if current_dir not in sys.path:
        sys.path.append(current_dir)

    # Import AFTER setting environment variable
    from extract_claude import extract_claude_sessions
    from extract_gemini import extract_all_gemini
    from chat_extractor_base import get_output_path

    # Interactive prompt for --today if file exists (only if running in terminal)
    if args.today and sys.stdin.isatty():
        date_str = args.date
        filename = f"{date_str}-claude.md" if args.source in ['all', 'claude'] else f"{date_str}-gemini.md"
        output_path = get_output_path(filename)

        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            file_time = datetime.fromtimestamp(os.path.getmtime(output_path)).strftime("%H:%M")
            size_kb = file_size // 1024

            print(f"Found existing file: {os.path.basename(output_path)} ({size_kb}K, modified {file_time})")
            response = input("Update with latest session data? [y/N]: ").strip().lower()

            if response not in ['y', 'yes']:
                print("Extraction cancelled.")
                return
    elif args.today and not sys.stdin.isatty():
        # Non-interactive mode: just show info and proceed
        date_str = args.date
        filename = f"{date_str}-claude.md" if args.source in ['all', 'claude'] else f"{date_str}-gemini.md"
        output_path = get_output_path(filename)
        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            size_kb = file_size // 1024
            print(f"Note: Updating existing file: {os.path.basename(output_path)} ({size_kb}K)")

    print(f"Starting Extraction... (Source: {args.source}, Limit: {args.limit})")
    print("-" * 40)
    
    results = []

    if args.source in ['all', 'claude']:
        print("Processing Claude projects...")
        claude_res = extract_claude_sessions(
            date_filter=args.date,
            after_date=args.after,
            before_date=args.before,
            project_filter=args.project,
            incremental=args.incremental
        )
        results.extend(claude_res)
        
    if args.source in ['all', 'gemini']:
        print("Processing Gemini sessions (JSON & Protobuf)...")
        gemini_res = extract_all_gemini(
            limit=args.limit,
            date_filter=args.date,
            after_date=args.after,
            before_date=args.before
        )
        results.extend(gemini_res)

        
    print("-" * 40)
    print("Extraction Complete.")
    print(f"Total sessions processed: {len(results)}")
    for res in results:
        print(f"- {res}")

if __name__ == "__main__":
    main()
