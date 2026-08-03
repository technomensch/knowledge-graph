
# /kmgraph:kmg-check-sensitive — Scan for Sensitive Data

Scan the active knowledge graph for potentially sensitive information using regex patterns from config or defaults.

## What This Does

Scans all markdown files in active KG for:
- Email addresses
- API keys/tokens (common patterns)
- URLs (http://, https://)
- Custom patterns from `.claude/sanitization-config.json`

## Syntax

```bash
/kmgraph:kmg-check-sensitive
/kmgraph:kmg-check-sensitive --fix-suggestions
```

## Implementation

Call the `kg_check_sensitive` MCP tool directly — it already resolves the target graph
from your current directory (`scope: "project"`, the default) or the personal graph
(`scope: "user"`, if `--user` was passed), scans for the same email/API-key/URL/custom
patterns this command used to reimplement in bash, and reports results in the same shape.
No separate path-resolution step is needed (issue-41: this command previously resolved
its own scan path via `jq -r '.graphs[.active].path'`, a pre-ADR-067 pattern that no
longer reflects how any graph is actually selected).

```
kg_check_sensitive scope="project"
```

Pass through `patterns` (additional regexes) if the user supplied any beyond
`.claude/sanitization-config.json`'s configured set — the tool already merges configured
and runtime patterns itself.

## Output Example

```
⚠️  Potential sensitive data found:

- patterns.md:42 — email: user@example.com
- debugging-auth.md:15 — URL: https://api.internal.company.com
- lesson-template.md:8 — api-key: API_KEY=abc123def456

Review these entries before pushing to public repository.

Run with --fix-suggestions to see recommended fixes.
```

## See Also

- `/kmgraph:kmg-config-sanitization` — Set up automated pre-commit scanning
