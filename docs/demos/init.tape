# KMGraph — init demo
# Run: vhs docs/demos/init.tape

Output static/img/demos/init.gif

Set Shell "bash"
Set FontSize 14
Set Width 900
Set Height 540
Set Theme "Dracula"
Set Padding 20
Set Framerate 24
Set PlaybackSpeed 1.0

Type "# Starting KMGraph initialization wizard"
Sleep 400ms
Enter
Sleep 300ms

Type "echo '> /kmgraph:kmg-init'"
Sleep 300ms
Enter
Sleep 500ms

Type "echo ''"
Enter
Type "echo 'Where should this knowledge graph be stored?'"
Sleep 400ms
Enter
Type "echo ''"
Enter
Type "echo '  1. Project-local (./docs/)'"
Sleep 200ms
Enter
Type "echo '  2. Global personal (~/.claude/knowledge-graphs/)'"
Sleep 200ms
Enter
Type "echo '  3. Custom path'"
Sleep 500ms
Enter

Type "echo ''"
Enter
Type "echo '> 1'"
Sleep 300ms
Enter
Sleep 300ms

Type "echo ''"
Enter
Type "echo 'KG name: demo-project'"
Sleep 400ms
Enter

Type "echo ''"
Enter
Type "echo 'Categories (defaults selected):'"
Sleep 200ms
Enter
Type "echo '  ✅ architecture   ✅ process   ✅ patterns   ✅ debugging'"
Sleep 400ms
Enter

Type "echo ''"
Enter
Type "echo 'Git strategy: selective'"
Sleep 200ms
Enter
Type "echo '  architecture: commit   process: ignore'"
Sleep 200ms
Enter
Type "echo '  patterns: commit       debugging: ignore'"
Sleep 500ms
Enter

Type "echo ''"
Enter
Type "echo 'Creating knowledge graph structure...'"
Sleep 700ms
Enter

Type "echo ''"
Enter
Type "echo '✅ Knowledge graph demo-project initialized!'"
Sleep 300ms
Enter
Type "echo ''"
Enter
Type "echo 'Location:      ~/demo-kg/docs/'"
Sleep 200ms
Enter
Type "echo 'Categories:    architecture, process, patterns, debugging'"
Sleep 200ms
Enter
Type "echo 'Git strategy:  selective'"
Sleep 200ms
Enter
Type "echo 'Active:        Yes'"
Sleep 300ms
Enter

Type "echo ''"
Enter
Type "echo 'Directory Structure:'"
Sleep 200ms
Enter
Type "echo '  knowledge/       — Quick-reference knowledge entries'"
Sleep 150ms
Enter
Type "echo '  lessons-learned/ — Full lesson documentation'"
Sleep 150ms
Enter
Type "echo '  decisions/       — Architecture Decision Records'"
Sleep 150ms
Enter
Type "echo '  sessions/        — Session summaries (gitignored)'"
Sleep 150ms
Enter
Type "echo '  chat-history/    — Chat extraction output (gitignored)'"
Sleep 400ms
Enter

Type "echo ''"
Enter
Type "echo 'Next steps:'"
Sleep 200ms
Enter
Type "echo '  /kmgraph:kmg-status         — View KG info and quick reference'"
Sleep 150ms
Enter
Type "echo '  /kmgraph:kmg-capture-lesson — Document your first lesson'"
Sleep 150ms
Enter
Type "echo '  /kmgraph:kmg-recall query   — Search across KG'"
Sleep 500ms
Enter

Sleep 2500ms
