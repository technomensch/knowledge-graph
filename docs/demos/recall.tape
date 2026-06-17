# KMGraph — recall demo
# Run: vhs docs/demos/recall.tape

Output static/img/demos/recall.gif

Set Shell "bash"
Set FontSize 14
Set Width 900
Set Height 480
Set Theme "Dracula"
Set Padding 20
Set Framerate 24
Set PlaybackSpeed 1.0

Type "# Search for past solutions before solving a problem"
Sleep 500ms
Enter
Sleep 300ms

Type "echo '> /kmgraph:kmg-recall connection pooling'"
Sleep 300ms
Enter
Sleep 800ms

Type "echo ''"
Enter
Type "echo 'Searching knowledge graph for: connection pooling...'"
Sleep 600ms
Enter

Type "echo ''"
Enter
Type "echo 'Found 3 results'"
Sleep 300ms
Enter

Type "echo ''"
Enter
Type "echo '[debugging] lessons-learned/debugging/api-rate-limit-handling.md'"
Sleep 200ms
Enter
Type "echo '  API Rate Limit Handling — Exponential Backoff with Jitter'"
Sleep 150ms
Enter
Type "echo '  Tags: api, rate-limit, retry · Branch: fix/api-client'"
Sleep 400ms
Enter

Type "echo ''"
Enter
Type "echo '[patterns] lessons-learned/patterns/connection-pool-pre-warm.md'"
Sleep 200ms
Enter
Type "echo '  Always Pre-Warm Connection Pools on Startup'"
Sleep 150ms
Enter
Type "echo '  Tags: connection-pool, redis, database · Branch: fix/redis-cold-start'"
Sleep 400ms
Enter

Type "echo ''"
Enter
Type "echo '[decisions] decisions/ADR-001-connection-pooling.md'"
Sleep 200ms
Enter
Type "echo '  ADR-001: Use Connection Pooling for All Database Clients'"
Sleep 150ms
Enter
Type "echo '  Status: accepted · Date: 2026-04-06'"
Sleep 500ms
Enter

Sleep 2500ms
