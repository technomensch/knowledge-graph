---
title: "Lesson: Two CHANGELOG Files Exist — Both Must Be Updated on Every Release"
created: 2026-03-28T00:00:00Z
author: Claude Sonnet 4.6
email: noreply@anthropic.com
git:
  branch: v0.2.1-beta-mcp-write-and-portability
  commit: ac1ac7be
tags:
  - changelog
  - release
  - documentation
  - process
  - kmgraph
category: process
---

# Lesson: Two CHANGELOG Files Exist — Both Must Be Updated on Every Release

**Date:** 2026-03-28
**Category:** Process (Release Documentation)
**Discovered during:** v0.2.1-beta wrap-up review

---

## Problem

During v0.2.1-beta, a new `CHANGELOG.md` was created at the project root with the full v0.2.1-beta release entry. However, `docs/CHANGELOG.md` — the user-facing changelog served by MkDocs — was not updated.

**Result:** As of v0.2.1-beta, the user-facing docs site shows a changelog that stops at v0.1.2-beta. Users navigating the documentation site see no record of v0.2.0-beta or v0.2.1-beta changes.

**What was missed:** `docs/CHANGELOG.md` is not a generated artifact — it is a hand-maintained file that must be updated on every release alongside the root `CHANGELOG.md`.

---

## Two Changelog Files in This Project

| File | Purpose | Audience |
|---|---|---|
| `CHANGELOG.md` (root) | GitHub-facing; shown on repo landing page | Contributors, GitHub visitors |
| `docs/CHANGELOG.md` | MkDocs-served; shown in the documentation site | Plugin users reading the docs site |

Neither file is generated from the other. Both must be kept in sync on every release.

---

## Root Cause

The v0.2.1-beta wrap-up process created `CHANGELOG.md` as a new file (it didn't exist before). Creating it as a net-new root file made it easy to miss that `docs/CHANGELOG.md` already existed with the full history and also needed updating.

This is a variant of the DRY documentation problem: the same information must exist in two places, and without an explicit rule, one gets missed.

---

## Solution

**Immediate:** Add `docs/CHANGELOG.md` to the release checklist as a mandatory update target alongside root `CHANGELOG.md`.

**Long-term (tracked in ADR-023):** Establish root `CHANGELOG.md` as the single source of truth and configure MkDocs to include it directly — eliminating the dual-maintenance requirement.

---

## When to Apply

On every version release, the following files must both be updated in the same commit:
1. `CHANGELOG.md` (root)
2. `docs/CHANGELOG.md`

Verify with: `grep -n "0\.\(current version\)" CHANGELOG.md docs/CHANGELOG.md` — both should return matches.

---

## Related

- **ADR-023:** Single source of truth for CHANGELOG — root file included by MkDocs
- **ADR-021:** Single Source of Truth (DRY) for Documentation
- **STYLE-GUIDE.md** — Section 4f: Changelog entry format (TL;DR first)

---

**Category:** process
**Status:** Discovered during v0.2.1-beta wrap-up; docs/CHANGELOG.md fixed in same commit
**Last Updated:** 2026-03-28
