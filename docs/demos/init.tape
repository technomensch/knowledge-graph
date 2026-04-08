# KMGraph — init demo
# Run: vhs docs/demos/init.tape

Output static/img/demos/init.gif

Set Shell "bash"
Set FontSize 14
Set Width 800
Set Height 480
Set Theme "Dracula"
Set Padding 20
Set Framerate 24
Set PlaybackSpeed 1.0

Type "echo '> /kmgraph:init'"
Sleep 300ms
Enter
Sleep 600ms

Type "echo ''"
Enter
Type "echo '🧠 KMGraph Initialization Wizard'"
Sleep 300ms
Enter
Type "echo ''"
Enter
Type "echo 'Project name: my-project'"
Sleep 400ms
Enter
Type "echo 'Git tracking: enabled'"
Sleep 300ms
Enter
Type "echo 'KG type:      project-local (stored in ./docs/)'"
Sleep 400ms
Enter

Type "echo ''"
Enter
Type "echo 'Creating knowledge graph structure...'"
Sleep 600ms
Enter

Type "echo '  ✅ docs/lessons-learned/'"
Sleep 200ms
Enter
Type "echo '  ✅ docs/decisions/'"
Sleep 200ms
Enter
Type "echo '  ✅ docs/sessions/'"
Sleep 200ms
Enter
Type "echo '  ✅ docs/knowledge/'"
Sleep 200ms
Enter
Type "echo '  ✅ MEMORY.md'"
Sleep 200ms
Enter
Type "echo '  ✅ kg-config.json'"
Sleep 400ms
Enter

Type "echo ''"
Enter
Type "echo '✅ Knowledge graph initialized. Run /kmgraph:status to verify.'"
Sleep 500ms
Enter

Sleep 2000ms
