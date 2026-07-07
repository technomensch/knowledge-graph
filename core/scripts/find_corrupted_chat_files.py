#!/usr/bin/env python3
"""Read-only discovery helper for ENH-043's one-time repair run.

Scans a chat-history directory tree for `*-claude*.md` files whose header
`**Total Messages:** N` count disagrees with the actual `### Message` block
count, OR that still contain leftover pre-fix `## Session N` blocks. Never
writes or modifies anything. Used by the v0.6.17 repair run (as a dry-run
list of what needs rebuilding) and exercised against synthetic fixtures by
tests/test-extraction-discovery.sh — so the discovery logic is no longer
only ever validated against real production data.
"""
import re
import glob
import os
import argparse


def check_file(path):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    header_m = re.search(r'\*\*Total Messages:\*\*\s*(\d+)', text)
    header_count = int(header_m.group(1)) if header_m else None
    actual_count = len(re.findall(r'^### Message', text, re.MULTILINE))
    session_blocks = len(re.findall(r'^## Session \d+', text, re.MULTILINE))
    return header_count, actual_count, session_blocks


def find_flagged(chat_history):
    flagged = []
    for path in sorted(glob.glob(os.path.join(chat_history, "**", "*-claude*.md"), recursive=True)):
        if path.endswith(".backup"):
            continue
        header_count, actual_count, session_blocks = check_file(path)
        if session_blocks > 0 or (header_count is not None and header_count != actual_count):
            flagged.append((path, header_count, actual_count, session_blocks))
    return flagged


def main():
    ap = argparse.ArgumentParser(description="Discover chat-history files needing --rebuild (ENH-043)")
    ap.add_argument("chat_history", help="Path to the chat-history directory to scan")
    ap.add_argument("--dates-only", action="store_true",
                    help="Print just the sorted, de-duplicated YYYY-MM-DD list the repair loop consumes")
    args = ap.parse_args()

    flagged = find_flagged(args.chat_history)

    if args.dates_only:
        seen = set()
        for path, *_ in flagged:
            m = re.search(r'(\d{4}-\d{2}-\d{2})', os.path.basename(path))
            if m:
                seen.add(m.group(1))
        for d in sorted(seen):
            print(d)
    else:
        print(f"=== {len(flagged)} files flagged for rebuild ===")
        for path, hdr, act, blocks in flagged:
            print(f"{path}: header={hdr} actual={act} session_blocks={blocks}")


if __name__ == "__main__":
    main()
