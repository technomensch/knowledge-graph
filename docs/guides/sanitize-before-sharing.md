---
id: sanitize-before-sharing
title: Sanitize a KG Before Sharing
sidebar_label: Sanitize before sharing
description: Remove sensitive data from the knowledge graph before sharing with teammates or making it public
---

# Sanitize a KG Before Sharing

This guide walks through scanning a knowledge graph for sensitive data and cleaning it before sharing with teammates or publishing publicly.

---

## Goal

Remove credentials, personal information, internal infrastructure details, and company-specific data from the knowledge graph so it can be shared safely without leaking secrets or private context.

---

## Prerequisites

- An active knowledge graph (run `/kmgraph:status` to confirm)
- KMGraph v0.0.6 or later
- Write access to `kg-config.json` in the knowledge graph root

---

## Steps

### 1. Run the automated scan

The `/kmgraph:check-sensitive` command scans all knowledge graph files for known sensitive patterns.

```bash
/kmgraph:check-sensitive
```

The command checks for:

| Category | Examples detected |
|---|---|
| API keys and tokens | `API_KEY=`, `Bearer <token>`, `sk_live_…`, AWS `AKIA…` keys |
| Passwords and secrets | `password=`, `passwd=`, `DB_PASSWORD=`, private key blocks |
| Personal paths | `/Users/<name>/`, `/home/<name>/`, `C:\Users\` |
| Internal hostnames | `*.internal`, `staging.*`, `dev.*` domain patterns |
| Email addresses | Any `user@domain.com` pattern |
| Internal IPs | RFC 1918 ranges: `10.x`, `172.16-31.x`, `192.168.x` |

The output lists each match by file, line number, and pattern category.

### 2. Fix findings

**Option A — Automatic fix (recommended for bulk replacements)**

```bash
/kmgraph:check-sensitive --fix
```

The `--fix` flag replaces detected values with safe placeholders in-place:

- API keys → `<your-api-key>`
- Passwords → `your_secure_password`
- Absolute paths → relative equivalents or `~/<path>`
- Internal IPs → RFC 5737 documentation IPs (`192.0.2.x`)
- Internal hostnames → `<internal-host>`

Review the diff after running `--fix` before committing. Auto-fix handles common patterns; manual review catches edge cases.

**Option B — Manual edit**

Open each flagged file and apply replacements by hand. Use standard placeholders for consistency:

| Sensitive value type | Placeholder to use |
|---|---|
| Domains | `example.com` |
| IPs | `192.0.2.1` (RFC 5737) |
| Emails | `user@example.com` |
| Credentials | `<your-value-here>` |
| Internal hostnames | `<internal-host>` |
| Absolute paths | `~/<relative-path>` or `./path` |

### 3. Configure sanitization rules in `kg-config.json`

The `kg-config.json` file in the knowledge graph root controls which patterns are checked and what `--fix` substitutes. Add or extend the `sanitization` block:

```json
{
  "sanitization": {
    "patterns": [
      {
        "name": "company-name",
        "regex": "Acme Corp|MegaCorp",
        "replacement": "Example Corp",
        "severity": "warn"
      },
      {
        "name": "project-codename",
        "regex": "Project Falcon|FLCN-[0-9]+",
        "replacement": "Project X",
        "severity": "block"
      }
    ],
    "excludePaths": [
      "docs/plans/",
      "docs/examples/"
    ]
  }
}
```

**Severity levels:**

- `block` — `/kmgraph:check-sensitive` exits non-zero; pre-commit hook blocks the commit
- `warn` — reported but does not block
- `info` — logged only; no user-visible alert

Run `/kmgraph:check-sensitive` again after editing `kg-config.json` to confirm custom patterns are picked up.

### 4. Install the pre-commit hook

The pre-commit hook auto-blocks commits that contain sensitive patterns, catching issues before they reach the remote.

```bash
cp core/examples-hooks/pre-commit-sanitization.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

The hook reads the same patterns from `kg-config.json`. Patterns with `"severity": "block"` will abort the commit; `"severity": "warn"` patterns print a warning but allow the commit through.

---

## Verify

After applying fixes, re-run the scan to confirm a clean result:

```bash
/kmgraph:check-sensitive
```

Expected output when clean:

```
Scan complete. No sensitive patterns detected.
```

Then do a final manual spot-check on files that contain real project data:

- Lesson files in `docs/lessons-learned/`
- ADRs in `docs/decisions/`
- Session summaries in `docs/sessions/`
- Any example configs or code snippets

Add a brief privacy note to the repository README before publishing:

```markdown
## Privacy note

This knowledge graph has been sanitized for sharing. Company names,
internal IPs, credentials, and personal paths have been replaced with
generic placeholders. Patterns and lessons remain intact.
```

---

## Next steps

- See [Sanitization Checklist](../reference/SANITIZATION-CHECKLIST.md) for an exhaustive category-by-category reference, including scan commands for each pattern type
- Use `/kmgraph:config-sanitization` to run the interactive wizard that configures `kg-config.json` sanitization rules
- Consider running `/kmgraph:check-sensitive` as part of CI to enforce cleanliness on every push
