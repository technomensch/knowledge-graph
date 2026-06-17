---
title: 'Lesson: Default KG Path Collision With Docs Convention'
---

# Default KG Path Collision With Docs Convention

## Problem

When `docs/` is the default KG root, it collides silently with MkDocs, Docusaurus, Jekyll, and GitHub Pages documentation site roots. Users discover the collision only after investing in setup - their knowledge graph files land inside their docs site, polluting the build output, breaking navigation, and in some cases getting published to the web. The correct default is `knowledge/` - semantically clear, aligns with Obsidian/Foam/Logseq conventions, and never conflicts with a docs site.

## Root Cause

The path `docs/` was chosen as an intuitive default without auditing whether it was already claimed by ecosystem conventions. Every major static site generator (MkDocs, Docusaurus, Jekyll, Sphinx, VitePress, Astro) treats `docs/` as either the source directory or the output directory. Choosing it as a default meant KMGraph was guaranteed to conflict with any project that uses one of these tools. The collision is silent because neither tool warns about the other's files - both just process what they find.

## Solution

Change the default KG root from `docs/` to `knowledge/`. The path `knowledge/` is:

- Unclaimed by any major framework or build tool convention
- Semantically correct - it describes what the directory contains
- Consistent with personal knowledge management tools (Obsidian vaults, Foam workspaces, Logseq graphs)
- Safe to gitignore or include without affecting build pipelines

When users are already on the old default, provide an explicit migration path (e.g., `kmgraph init --migrate`) before removing support for the old layout. Migration cost compounds as users invest in the old layout - offer it early and make it automated.

## How to Replicate Elsewhere

In any config-driven tool that writes files into a project directory:

1. Check if the proposed default conflicts with common ecosystem conventions. High-risk paths include `src/`, `docs/`, `public/`, `static/`, `dist/`, `build/`, `out/`, `lib/`, `.github/`.
2. If the proposed default is claimed, pick a semantically-distinct alternative that describes the tool's purpose, not the output type.
3. If users are already on the old default, provide a migration path before changing. Announce it at least one minor version in advance.
4. Add a guard in the init command: if the target path already exists and contains files that look like a docs site (e.g., `mkdocs.yml`, `docusaurus.config.js`), warn the user before writing.

## Changelog

- v1.0 (2026-04-10) - Initial capture
