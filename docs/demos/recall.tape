# KMGraph — recall demo
# Records a simulated /kmgraph:recall search workflow
# Run: vhs docs/demos/recall.tape

Output static/img/demos/recall.gif

Set Shell "bash"
Set FontSize 14
Set Width 800
Set Height 480
Set Theme "Dracula"
Set Padding 20
Set Framerate 24
Set PlaybackSpeed 1.0

Type "# Search the knowledge graph for a past solution"
Sleep 500ms
Enter
Sleep 300ms

Type "echo '> /kmgraph:recall redis-timeout'"
Sleep 300ms
Enter
Sleep 800ms

Type "echo ''"
Enter
Type "echo 'Searching knowledge graph...'"
Sleep 600ms
Enter

Type "echo ''"
Enter
Type "echo '🔍 Found 2 results for: redis timeout'"
Sleep 300ms
Enter

Type "echo ''"
Enter
Type "echo '1. [debugging] Redis connection timeout on cold start'"
Sleep 200ms
Enter
Type "echo '   2026-03-15 · branch: fix/redis-cold-start'"
Sleep 200ms
Enter
Type "echo '   Root cause: Connection pool not initialized before first request.'"
Sleep 400ms
Enter

Type "echo ''"
Enter
Type "echo '2. [patterns] Always pre-warm connection pools on startup'"
Sleep 200ms
Enter
Type "echo '   2026-03-20 · cross-project pattern'"
Sleep 500ms
Enter

Sleep 2000ms
