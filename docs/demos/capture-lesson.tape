# KMGraph — capture-lesson demo
# Records a simulated /kmgraph:capture-lesson workflow
# Run: vhs docs/demos/capture-lesson.tape

Output static/img/demos/capture-lesson.gif

Set Shell "bash"
Set FontSize 14
Set Width 800
Set Height 480
Set Theme "Dracula"
Set Padding 20
Set Framerate 24
Set PlaybackSpeed 1.0

Type "# Capture a lesson after solving a bug"
Sleep 500ms
Enter
Sleep 300ms

Type "# Imagine Claude Code is open and you just fixed a Redis timeout bug"
Sleep 500ms
Enter
Sleep 300ms

Type "echo '> /kmgraph:capture-lesson'"
Sleep 300ms
Enter
Sleep 800ms

Type "echo ''"
Enter
Type "echo 'Capturing lesson...'"
Sleep 300ms
Enter

Type "echo ''"
Enter
Type "echo '📝 Title: Redis connection timeout on cold start'"
Sleep 400ms
Enter
Type "echo '📁 Category: debugging'"
Sleep 300ms
Enter
Type "echo '🏷  Tags: redis, connection, timeout, cold-start'"
Sleep 300ms
Enter
Type "echo '🌿 Branch: fix/redis-cold-start  |  Commit: a3f2b91'"
Sleep 400ms
Enter

Type "echo ''"
Enter
Type "echo '✅ Lesson saved to:'"
Sleep 300ms
Enter
Type "echo '   docs/lessons-learned/debugging/redis-connection-timeout-on-cold-start.md'"
Sleep 500ms
Enter

Sleep 2000ms
