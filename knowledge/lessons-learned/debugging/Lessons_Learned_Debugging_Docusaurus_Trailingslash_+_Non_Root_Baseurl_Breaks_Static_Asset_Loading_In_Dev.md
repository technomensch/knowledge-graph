---
title: "Lesson: Docusaurus trailingSlash + Non-Root baseUrl Breaks Static Asset Loading In Dev"
created: 2026-04-08T00:00:00Z
last-updated: 2026-08-04T00:00:00Z
author: technomensch
tags: [debugging, docusaurus, trailingSlash, baseUrl, static-assets, dev-server]
category: debugging
version: 1.0
---

# Lesson: Docusaurus trailingSlash + Non-Root baseUrl Breaks Static Asset Loading In Dev

**Date:** 2026-04-08
**Category:** Debugging
**Version:** 1.0

---

## Problem

Docusaurus's `trailingSlash` config setting, combined with a non-root `baseUrl`, breaks static asset loading in the dev server — assets fail to resolve correctly when the two settings interact under a project that is served from a subpath rather than the domain root.

## Root Cause

This matches a known upstream Docusaurus issue (docusaurus/docusaurus#5974): when `trailingSlash` is left at its default/unset behavior (or misconfigured) while `baseUrl` is a non-root path, generated asset URLs can resolve incorrectly in the dev server, since the trailing-slash normalization and the base-path prefix interact in ways that aren't correctly reconciled for non-root deployments.

## Solution

This repo's `docusaurus.config.js` runs with a non-root `baseUrl: '/knowledge-graph/'` (the site is served under GitHub Pages at `/knowledge-graph/`, not domain root) and `trailingSlash: undefined` — explicitly set to `undefined` rather than left absent from the config object, which reads as a deliberate acknowledgment of the upstream issue rather than an oversight. No inline comment ties the setting to #5974 in the current config, so that connection is preserved here for future readers.

## When to Apply

- Any Docusaurus site deployed under a non-root `baseUrl` (subpath deployment, e.g. GitHub Pages project sites) that sees static assets failing to load specifically in the dev server, not necessarily in production builds.
- Before changing `trailingSlash` in a non-root-`baseUrl` Docusaurus project, check upstream issue #5974 for the current state of the interaction and confirm the change doesn't reintroduce the asset-loading break.

## Context

Reconstructed from chat-history evidence during a 2026-08-04 KG-index audit. `2026-04-08-claude.md` (~line 7275) contains a system-generated `<ide_opened_file>` tag — not model narrative, this only fires when the user's real IDE actually opens a real file — showing this exact lesson file path was opened, which is the strongest evidence among the three reconstructed lessons that the original was real. The original file was created under `knowledge/lessons-learned/debugging/` (gitignored since creation) and never itself touched git, so there is no original text to recover; the Root Cause/Solution detail above is grounded in this repo's current `docusaurus.config.js` (`baseUrl: '/knowledge-graph/'`, `trailingSlash: undefined`, checked 2026-08-04) plus the matching public upstream Docusaurus issue, not in the lost original wording.
