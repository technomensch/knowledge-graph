# Templates — Source Directory

This is the **canonical source** for all KMGraph templates. Edit templates here.

---

## Why two locations?

| Location | Purpose | Committed? |
|----------|---------|------------|
| `core/templates/` | Canonical source (this folder) | ✅ Yes |
| `docs/templates/` | Build-time copy for MkDocs | ❌ No (gitignored) |

`docs/templates/` is generated automatically by `docs/hooks.py` during `mkdocs serve` or `mkdocs build`. It is ephemeral — deleted and recreated on every build.

**Do not edit files in `docs/templates/`.** Changes there will be overwritten on the next build.

---

## Template categories

| Folder | Contents |
|--------|---------|
| `decisions/` | Architecture Decision Record (ADR) template |
| `documentation/` | Doc scaffolding template |
| `knowledge/` | Knowledge graph entry template |
| `lessons-learned/` | Lesson capture template |
| `meta-issue/` | Meta-issue tracking template |
| `sessions/` | Session summary template |
| `MEMORY-template.md` | MEMORY.md starting template |
