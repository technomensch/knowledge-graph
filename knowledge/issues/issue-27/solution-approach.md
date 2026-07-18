# issue-27: Solution Approach

**Status:** Resolved — this is what was actually implemented.

Added a destination-existence-and-content check to `applyStrayKnowledgeDir` in `mcp-server/src/tools/upgrade.ts`, ahead of the existing canonical-template check:

```ts
const dest = path.join(destConcepts, entry);
if (fs.existsSync(dest)) {
  const srcContent = fs.readFileSync(src, "utf-8");
  const destContent = fs.readFileSync(dest, "utf-8");
  if (srcContent !== destContent) {
    skipped.push(`${entry} (concepts/${entry} already exists with different content — manual review required, not moved)`);
    continue;
  }
  fs.unlinkSync(src);
  moved.push(`${entry} (duplicate removed, concepts/${entry} unchanged)`);
  continue;
}
// ...existing canonical-template check, then copy, only reached if dest didn't exist
```

Mirrors the pattern already correct in `applyTemplates` and `applyStarterRelocation` in the same file — this was the one function that didn't have it.

## Why not a full rewrite / archive-before-write instead

Considered adding a timestamped archive (the `.kg-archive-*/` pattern used elsewhere in this project) before any `stray-knowledge-dir` write, as an extra safety layer beyond the skip-on-conflict check. Decided against it for this fix: the skip-on-conflict check makes the destructive path unreachable in the first place (never writes when content would change unexpectedly), so an archive would only add value for the identical-content dedup case, where there's nothing at risk to archive. Kept the fix minimal and targeted at the actual gap.
