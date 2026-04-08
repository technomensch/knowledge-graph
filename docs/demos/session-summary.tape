# KMGraph — session-summary demo
# Run: vhs docs/demos/session-summary.tape

Output static/img/demos/session-summary.gif

Set Shell "bash"
Set FontSize 14
Set Width 800
Set Height 480
Set Theme "Dracula"
Set Padding 20
Set Framerate 24
Set PlaybackSpeed 1.0

Type "echo '> /kmgraph:session-summary'"
Sleep 300ms
Enter
Sleep 600ms

Type "echo ''"
Enter
Type "echo 'Generating session summary...'"
Sleep 700ms
Enter

Type "echo ''"
Enter
Type "echo '📸 Session Summary — 2026-04-08'"
Sleep 300ms
Enter
Type "echo '═══════════════════════════════'"
Sleep 200ms
Enter
Type "echo 'Branch:  fix/redis-cold-start'"
Sleep 200ms
Enter
Type "echo 'Commits: 3'"
Sleep 200ms
Enter
Type "echo '───────────────────────────────'"
Sleep 200ms
Enter
Type "echo 'Lessons captured:  1'"
Sleep 200ms
Enter
Type "echo 'ADRs created:      0'"
Sleep 200ms
Enter
Type "echo 'Open plans:        1  (docs/plans/redis-fix.md)'"
Sleep 400ms
Enter

Type "echo ''"
Enter
Type "echo '✅ Summary saved: docs/sessions/2026-04-08-fix-redis-cold-start.md'"
Sleep 500ms
Enter

Sleep 2000ms
