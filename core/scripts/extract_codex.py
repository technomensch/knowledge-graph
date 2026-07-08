import os
import json
import glob
from datetime import datetime, timezone
from typing import List, Optional
from collections import defaultdict
from chat_extractor_base import (
    get_output_path, format_timestamp, write_markdown_header,
    write_message_block, split_file_if_oversized,
)

CODEX_SESSIONS_DIR = os.path.expanduser("~/.codex/sessions")


def _parse_ts_utc(ts: str) -> Optional[float]:
    """Parse UTC ISO timestamp to epoch float."""
    if not ts:
        return None
    for fmt in (
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
    ):
        try:
            return datetime.strptime(ts, fmt).replace(tzinfo=timezone.utc).timestamp()
        except ValueError:
            continue
    return None


def _utc_to_local_date(ts: str) -> Optional[str]:
    epoch = _parse_ts_utc(ts)
    if epoch is None:
        return None
    return datetime.fromtimestamp(epoch).strftime("%Y-%m-%d")


def _utc_to_local_hms(ts: str) -> Optional[str]:
    epoch = _parse_ts_utc(ts)
    if epoch is None:
        return None
    return datetime.fromtimestamp(epoch).strftime("%H%M%S")


_INJECTION_PREFIXES = (
    "# AGENTS.md instructions",
    "<environment_context>",
    "<permissions instructions>",
    "<INSTRUCTIONS>",
)


def _extract_text(content_list) -> str:
    """Join all input_text/output_text parts from a content array."""
    if not content_list:
        return ""
    return "".join(
        item.get("text", "")
        for item in content_list
        if isinstance(item, dict) and item.get("type") in ("input_text", "output_text")
    )


def _is_system_injection(text: str) -> bool:
    """True if text is a platform-injected context block (not a real human turn)."""
    stripped = text.lstrip()
    return any(stripped.startswith(p) for p in _INJECTION_PREFIXES)


def extract_codex_sessions(
    date_filter: Optional[str] = None,
    after_date: Optional[str] = None,
    before_date: Optional[str] = None,
    project_filter: Optional[str] = None,
    incremental: bool = False,
    limit: Optional[int] = None,
) -> List[str]:
    """
    Scans ~/.codex/sessions/YYYY/MM/DD/ for rollout-*.jsonl files and extracts
    user/assistant turns into per-date markdown files (YYYY-MM-DD-codex.md).

    Date keys are derived from session_meta.timestamp converted to local time,
    not from the directory path (which is UTC-based and causes midnight skew).

    Not included in --source all until date semantics are validated across platforms.
    Use --source codex explicitly.
    """
    if not os.path.isdir(CODEX_SESSIONS_DIR):
        return [f"Skipped: {CODEX_SESSIONS_DIR} not found"]

    results = []
    all_sessions = []

    jsonl_files = glob.glob(
        os.path.join(CODEX_SESSIONS_DIR, "**", "rollout-*.jsonl"), recursive=True
    )

    for jsonl_path in jsonl_files:
        if os.path.getsize(jsonl_path) == 0:
            continue

        meta = {}
        messages = []
        session_ts = None

        try:
            with open(jsonl_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        obj = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    event_type = obj.get("type", "")

                    if event_type == "session_meta":
                        payload = obj.get("payload") or {}
                        meta = {
                            "cwd": payload.get("cwd", ""),
                            "branch": (payload.get("git") or {}).get("branch", ""),
                            "cli_version": payload.get("cli_version", ""),
                        }
                        session_ts = obj.get("timestamp") or payload.get("timestamp")

                    elif event_type == "response_item":
                        payload = obj.get("payload") or {}
                        role = payload.get("role")
                        # Skip developer (system injections) and encrypted tool calls
                        if role not in ("user", "assistant"):
                            continue
                        content_list = payload.get("content") or []
                        text = _extract_text(content_list)
                        if not text.strip() or _is_system_injection(text):
                            continue
                        ts = obj.get("timestamp") or session_ts
                        messages.append({
                            "role": role,
                            "content": text,
                            "timestamp": ts,
                        })

        except Exception as e:
            print(f"Error reading {jsonl_path}: {e}")
            continue

        if not messages or not session_ts:
            continue

        # Derive local date from session_meta UTC timestamp (not directory path)
        session_date = _utc_to_local_date(session_ts)
        session_hms = _utc_to_local_hms(session_ts) or "000000"
        if not session_date:
            continue

        # --project filter via session_meta.cwd substring (case-insensitive)
        if project_filter and project_filter.lower() not in meta.get("cwd", "").lower():
            continue

        messages.sort(key=lambda m: m.get("timestamp") or "")

        all_sessions.append({
            "date": session_date,
            "ts_str": session_hms,
            "messages": messages,
            "count": len(messages),
            "meta": meta,
        })

    if limit:
        all_sessions = all_sessions[:limit]

    sessions_by_date = defaultdict(list)
    for session in all_sessions:
        sessions_by_date[session["date"]].append(session)

    # Date filtering
    if date_filter:
        sessions_by_date = {k: v for k, v in sessions_by_date.items() if k == date_filter}
    else:
        if after_date:
            sessions_by_date = {k: v for k, v in sessions_by_date.items() if k >= after_date}
        if before_date:
            sessions_by_date = {k: v for k, v in sessions_by_date.items() if k <= before_date}

    for date, sessions in sessions_by_date.items():
        sessions.sort(key=lambda s: s["ts_str"])

        filename = f"{date}-codex.md"
        output_path = get_output_path(filename)

        # Note: incremental mode used to skip a date entirely if its output
        # file's mtime was under an hour old, on the assumption that a recent
        # mtime meant the file was already synced -- the exact anti-pattern
        # already identified and removed from extract_claude.py in 22c7559d
        # (v0.6.16). That assumption is false for an active session, and it
        # silently dropped real incremental syncs run twice inside an hour.
        # Unlike Claude's extractor, this writer always fully overwrites the
        # output file (no append/dedup path), so there is no replacement
        # logic needed -- removing the skip alone is a complete, safe fix.

        total_messages = sum(s["count"] for s in sessions)

        with open(output_path, "w", encoding="utf-8") as f:
            write_markdown_header(f, "Codex CLI", total_messages, date)

            global_idx = 1
            for sess_idx, session in enumerate(sessions, 1):
                if len(sessions) > 1:
                    m = session["meta"]
                    parts = []
                    if m.get("cwd"):
                        parts.append(f"cwd: {m['cwd']}")
                    if m.get("branch"):
                        parts.append(f"branch: {m['branch']}")
                    label = f"({', '.join(parts)})" if parts else ""
                    f.write(f"## Session {sess_idx} {label}\n\n")

                for msg in session["messages"]:
                    write_message_block(
                        f, global_idx, msg["role"],
                        format_timestamp(msg["timestamp"]),
                        msg["content"],
                    )
                    global_idx += 1

                if sess_idx < len(sessions):
                    f.write("\n---\n\n")

        split_parts = split_file_if_oversized(output_path)
        if split_parts:
            results.append(
                f"Created {filename}: split into {len(split_parts)} parts in {date}/ subfolder"
            )
        else:
            results.append(f"Created {filename} with {total_messages} messages")

    return results
