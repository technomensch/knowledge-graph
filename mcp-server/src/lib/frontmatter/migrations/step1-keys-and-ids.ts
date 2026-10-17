import { contentEnd, readList, renderList, replaceLines, topLevelBlocks } from "../parse.js";
import { normalizeId, type RefKind } from "../ids.js";
import { inDirs, withFrontmatter } from "./shared.js";
import type { Migration } from "./types.js";

export const RENAMES: Record<string, string> = {
  "github-issue": "github_issue",
  "related-issues": "related_issues",
  "related-enhs": "related_enhs",
  "related-adrs": "related_adrs",
};
export const LIST_KEYS: Record<string, RefKind> = {
  related_issues: "issue",
  related_enhs: "enh",
  related_adrs: "adr",
};

export const step1: Migration = {
  step: 1,
  id: "keys-and-ids",
  title: "Underscore key spelling and string IDs",
  introducedIn: "0.7.11",
  requires: [],
  touchedKeys: [
    "github-issue", "github_issue", "related-issues", "related_issues",
    "related-enhs", "related_enhs", "related-adrs", "related_adrs",
  ],
  scope: (p) => inDirs(p, ["issues", "enhancements", "decisions"]),
  transform: (text) =>
    withFrontmatter(text, (lines, end) => {
      const notes: string[] = [];
      const blocks = topLevelBlocks(lines, end);
      const keys = new Set(blocks.map((b) => b.key));
      for (const [oldK, newK] of Object.entries(RENAMES)) {
        if (keys.has(oldK) && keys.has(newK)) return { lines, notes, skip: `both "${oldK}" and "${newK}" present` };
      }
      let work = lines;
      for (const b of [...blocks].sort((x, y) => y.start - x.start)) {
        const newKey = RENAMES[b.key] ?? b.key;
        const renamed = newKey !== b.key;
        const kind = LIST_KEYS[newKey];
        const renameFirstLine = (): void => {
          work = replaceLines(work, b.start, b.start + 1, [work[b.start].replace(/^[^:]+:/, `${newKey}:`)]);
        };
        if (!kind) {
          if (renamed) renameFirstLine();
          continue;
        }
        const list = readList(work, b);
        if (!list) {
          notes.push(`${b.key}: unrecognized shape, left as is`);
          if (renamed) renameFirstLine();
          continue;
        }
        const items = list.items.map((v) => normalizeId(kind, v) ?? v);
        const changed = items.some((v, i) => v !== list.items[i]);
        if (!renamed && !changed) continue;
        work = replaceLines(work, b.start, contentEnd(work, b), renderList(newKey, items, list.style));
      }
      return { lines: work, notes };
    }),
};
