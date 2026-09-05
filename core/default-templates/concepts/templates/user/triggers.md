# Triggers — User Level

> Always-loaded at session start alongside me.md. Each entry must be self-contained.
> Gate: is executable (no lookup of rules.md required).
> Apply: is a pointer to rules.md section.
> Project-level triggers.md extends this file — never replaces it.

---

## Before committing or pushing code

- Gate: about to run `git commit` or `git push`
- Apply: `rules.md § Git Workflow`

## When making an architecture or process decision

- Gate: a structural choice has been made that affects multiple files or future work
- Apply: `rules.md § Knowledge Capture > When to create an ADR`

## When using an unrecognized model name

- Gate: model name invoked does not resolve to any tier in me.md YAML frontmatter
- Apply: `rules.md § Profile > Adding a model`
- Flow: prompt for tier assignment; update me.md YAML; optional host/port for local models

## At session end

- Gate: do not close session until backfill has been considered
- Apply: `rules.md § Knowledge Capture`
- Run: `/kmgraph:kmg-backfill`
