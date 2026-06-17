# KMGraph — capture-lesson demo
# Run: vhs docs/demos/capture-lesson.tape

Output static/img/demos/capture-lesson.gif

Set Shell "bash"
Set FontSize 14
Set Width 900
Set Height 480
Set Theme "Dracula"
Set Padding 20
Set Framerate 24
Set PlaybackSpeed 1.0

Type "# Capture a lesson after solving a bug"
Sleep 500ms
Enter
Sleep 300ms

Type "echo '> /kmgraph:kmg-capture-lesson'"
Sleep 300ms
Enter
Sleep 600ms

Type "echo ''"
Enter
Type "echo 'What problem did you solve or pattern did you implement?'"
Sleep 400ms
Enter
Type "echo '> API client threw unhandled errors on 429 rate-limit responses'"
Sleep 500ms
Enter

Type "echo ''"
Enter
Type "echo 'What was the root cause or key insight?'"
Sleep 400ms
Enter
Type "echo '> No retry logic — need exponential backoff with jitter'"
Sleep 500ms
Enter

Type "echo ''"
Enter
Type "echo 'Category: debugging'"
Sleep 200ms
Enter
Type "echo 'Tags:     api, rate-limit, retry, exponential-backoff'"
Sleep 200ms
Enter
Type "echo 'Branch:   fix/api-client · Commit: b7d3a21'"
Sleep 400ms
Enter

Type "echo ''"
Enter
Type "echo 'Saving lesson...'"
Sleep 700ms
Enter

Type "echo ''"
Enter
Type "echo '✅ Lesson saved!'"
Sleep 200ms
Enter
Type "echo ''"
Enter
Type "echo '  File:   lessons-learned/debugging/api-rate-limit-handling.md'"
Sleep 200ms
Enter
Type "echo '  Index:  FTS5 updated — lesson is now searchable'"
Sleep 500ms
Enter

Sleep 2500ms
