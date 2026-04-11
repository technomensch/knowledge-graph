---
title: "Lesson: KG Index Naming — kg- Prefix and -global Scope Suffix"
date: 2026-04-10
version: v1.0
last-updated: 2026-04-10
tags: [patterns, naming-conventions, index-files, scope]
git-branch: v0.3.0-beta
git-author: technomensch
related-enhancement: ENH-010
---

# Lesson: KG Index Naming — kg- Prefix and -global Scope Suffix

## Problem
KG index files named `index.md` collide silently with documentation site root files (MkDocs, Docusaurus, GitHub Pages). Additionally, project-level and user-level KG index files needed distinct names to be referenceable in docs and commands without ambiguity.

## Root Cause
Two separate naming problems:

1. `index.md` is claimed by every major static site generator — a KG file with that name at the project root disappears into the site.
2. No convention existed for distinguishing project-scoped vs user/global-scoped KG files when both live in different directories but need to be referenced by name in docs and commands.

## Solution
- `kg-` prefix on all KG index files avoids the `index.md` collision.
- Adopt git's `--local`/`--global` scope convention for the user-level variants:
  - Project KG: `kg-index.md`, `kg-category-index.md`
  - Personal/global KG: `kg-index-global.md`, `kg-category-index-global.md`
- Template source files can be shared (`kg-category-index.md` template serves both); the `-global` suffix is applied at deploy time, not in the template itself.

## How to Replicate Elsewhere
Whenever a tool writes files into a project directory that may also be a documentation site root:

1. Namespace the filename with a tool-specific prefix (e.g., `kg-`).
2. If the tool has multiple scopes (project vs user/global), use a scope suffix that mirrors a convention developers already know (git `--local`/`--global`, npm `--save`/`--save-dev`, editor `.workspace`/`.user` settings).

The `-global` suffix pattern is readable, searchable, and avoids the "where does this file live?" ambiguity that a directory-only distinction creates.

## Changelog
- v1.0 (2026-04-10) — Initial capture
