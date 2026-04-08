# KMGraph — session-summary demo
# Run: vhs docs/demos/session-summary.tape

Output static/img/demos/session-summary.gif

Set Shell "bash"
Set FontSize 14
Set Width 900
Set Height 500
Set Theme "Dracula"
Set Padding 20
Set Framerate 24
Set PlaybackSpeed 1.0

Type "echo '> /kmgraph:session-summary'"
Sleep 300ms
Enter
Sleep 500ms

Type "echo ''"
Enter
Type "echo 'Let me pull together what we worked on today...'"
Sleep 700ms
Enter

Type "echo ''"
Enter
Type "echo 'Session Summary — 2026-04-08'"
Sleep 200ms
Enter
Type "echo 'Branch: fix/api-client'"
Sleep 200ms
Enter
Type "echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'"
Sleep 200ms
Enter

Type "echo ''"
Enter
Type "echo 'What we worked on:'"
Sleep 200ms
Enter
Type "echo '  Fixed API rate limit handling — added exponential backoff'"
Sleep 150ms
Enter
Type "echo '  with jitter to prevent thundering herd on 429 responses.'"
Sleep 300ms
Enter

Type "echo ''"
Enter
Type "echo 'Changes:'"
Sleep 150ms
Enter
Type "echo '  • src/api/client.ts      — retry logic (3 attempts, exp backoff)'"
Sleep 150ms
Enter
Type "echo '  • tests/api/client.test.ts — rate limit test cases'"
Sleep 300ms
Enter

Type "echo ''"
Enter
Type "echo 'Lessons captured:  1'"
Sleep 150ms
Enter
Type "echo 'ADRs created:      0'"
Sleep 150ms
Enter
Type "echo 'Open plans:        0'"
Sleep 400ms
Enter

Type "echo ''"
Enter
Type "echo '✅ Summary saved: sessions/2026-04-08-fix-api-client.md'"
Sleep 500ms
Enter

Sleep 2500ms
