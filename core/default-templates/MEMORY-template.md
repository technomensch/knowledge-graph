# Memory Index — [Project Name]

A lightweight table of contents loaded at session start. Pointers only — content lives in the authoritative files below.

---

## Authoritative behavioral stores

All behavioral rules and preferences are written directly to these four files. Do NOT write content into this MEMORY.md — it is a pointer/index file only.

| Scope | Rules/Behavior | Identity/Preferences |
|---|---|---|
| Personal (cross-project) | `~/.kmgraph/rules.md` | `~/.kmgraph/me.md` |
| Project-specific | `knowledge/rules.md` | `knowledge/me.md` |

---

## Pointers

Add one-line pointers below as lessons, ADRs, or KG entries land. Each entry links to a file in the knowledge graph — the full content stays there.

### Recent lessons

- [Pointer description](path/to/lesson.md) — one-line summary `[→ lessons-learned]`

### Active decisions

- [Pointer description](decisions/ADR-NNN.md) — one-line summary `[→ ADR]`

### Open plans

- [Plan name](docs/plans/v{ver}-{description}.md) — current status `[→ plan]`

---

## Usage notes

- **Purpose:** Scannable index loaded at session start so the AI knows what knowledge exists. Reads underlying files when their content becomes relevant.
- **Update behavior:** New rules go to the four profile files above via `/kmgraph:rules-capture`. Pointers here are added when an entry warrants top-of-mind visibility.
- **What this file is NOT:** A content store. Never write behavioral rules, preferences, or knowledge directly here. Use the authoritative files.

