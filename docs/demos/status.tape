# KMGraph — status demo
# Run: vhs docs/demos/status.tape

Output static/img/demos/status.gif

Set Shell "bash"
Set FontSize 14
Set Width 900
Set Height 540
Set Theme "Dracula"
Set Padding 20
Set Framerate 24
Set PlaybackSpeed 1.0

Type "echo '> /kmgraph:kmg-status'"
Sleep 300ms
Enter
Sleep 600ms

Type "echo ''"
Enter
Type "echo 'Knowledge Graph Status'"
Sleep 200ms
Enter
Type "echo '━━━━━━━━━━━━━━━━━━━━━'"
Sleep 200ms
Enter

Type "echo ''"
Enter
Type "echo 'Active KG:  demo-project'"
Sleep 200ms
Enter
Type "echo 'Location:   ~/demo-kg/docs/'"
Sleep 200ms
Enter
Type "echo 'Categories: architecture, process, patterns, debugging'"
Sleep 200ms
Enter
Type "echo 'Git:        selective (architecture/patterns committed, process/debugging gitignored)'"
Sleep 200ms
Enter
Type "echo 'Last sync:  2026-04-08 09:15'"
Sleep 300ms
Enter

Type "echo ''"
Enter
Type "echo 'Stats:'"
Sleep 150ms
Enter
Type "echo '  Lessons:    3'"
Sleep 150ms
Enter
Type "echo '  KG Entries: 2 patterns, 1 concepts, 0 gotchas'"
Sleep 150ms
Enter
Type "echo '  ADRs:       1'"
Sleep 150ms
Enter
Type "echo '  Sessions:   1'"
Sleep 400ms
Enter

Type "echo ''"
Enter
Type "echo 'Quick Commands:'"
Sleep 150ms
Enter
Type "echo '  /kmgraph:kmg-capture-lesson   — Document a lesson'"
Sleep 150ms
Enter
Type "echo '  /kmgraph:kmg-recall query    — Search across all KG'"
Sleep 150ms
Enter
Type "echo '  /kmgraph:kmg-sync-all         — Run full sync pipeline'"
Sleep 150ms
Enter
Type "echo '  /kmgraph:kmg-update-graph     — Extract KG entries from lessons'"
Sleep 150ms
Enter
Type "echo '  /kmgraph:kmg-session-summary  — Summarize this session'"
Sleep 500ms
Enter

Sleep 2500ms
