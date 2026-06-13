# Templates — Source Directory

This is the **canonical source** for all KMGraph templates. Edit templates here.

---

## Why two locations?

| Location | Purpose | Committed? |
|----------|---------|------------|
| `core/templates/` | Canonical source (this folder) | ✅ Yes |
| `docs/templates/` | Published template reference for the Docusaurus docs site | ✅ Yes |

**Do not edit files in `docs/templates/` directly.** Make changes here in `core/templates/` and sync to `docs/templates/` as part of the release.

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
