# KMGraph — status demo
# Run: vhs docs/demos/status.tape

Output static/img/demos/status.gif

Set Shell "bash"
Set FontSize 14
Set Width 800
Set Height 480
Set Theme "Dracula"
Set Padding 20
Set Framerate 24
Set PlaybackSpeed 1.0

Type "echo '> /kmgraph:status'"
Sleep 300ms
Enter
Sleep 600ms

Type "echo ''"
Enter
Type "echo '📊 KMGraph Status'"
Sleep 200ms
Enter
Type "echo '═══════════════════════════════════════'"
Sleep 200ms
Enter
Type "echo 'Active KG:    my-project (project-local)'"
Sleep 200ms
Enter
Type "echo 'Location:     docs/'"
Sleep 200ms
Enter
Type "echo 'Git:          enabled  (branch: main)'"
Sleep 200ms
Enter
Type "echo '───────────────────────────────────────'"
Sleep 200ms
Enter
Type "echo 'Lessons:      42   (debugging: 18 · patterns: 12 · process: 8 · architecture: 4)'"
Sleep 200ms
Enter
Type "echo 'ADRs:         11'"
Sleep 200ms
Enter
Type "echo 'Sessions:     7'"
Sleep 200ms
Enter
Type "echo 'Search index: ✅ current'"
Sleep 200ms
Enter
Type "echo '───────────────────────────────────────'"
Sleep 200ms
Enter
Type "echo 'Last capture: 2026-04-08  (2 hours ago)'"
Sleep 500ms
Enter

Sleep 2000ms
