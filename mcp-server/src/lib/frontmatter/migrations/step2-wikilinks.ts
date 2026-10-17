import { contentEnd, readList, renderList, replaceLines, topLevelBlocks } from "../parse.js";
import { resolveRef } from "../links.js";
import { inDirs, withFrontmatter } from "./shared.js";
import { LIST_KEYS } from "./step1-keys-and-ids.js";
import type { Migration } from "./types.js";

export const step2: Migration = {
  step: 2,
  id: "wikilinks",
  title: "Relationship values as unambiguous wikilinks",
  introducedIn: "0.7.11",
  requires: [1],
  touchedKeys: ["related_issues", "related_enhs", "related_adrs"],
  scope: (p) => inDirs(p, ["issues", "enhancements", "decisions"]),
  transform: (text, _relPath, ctx) =>
    withFrontmatter(text, (lines, end) => {
      const notes: string[] = [];
      const attention: string[] = [];
      let work = lines;
      for (const b of [...topLevelBlocks(lines, end)].sort((x, y) => y.start - x.start)) {
        const kind = LIST_KEYS[b.key];
        if (!kind) continue;
        const list = readList(work, b);
        if (!list) {
          attention.push(`${b.key}: unrecognized shape, left as is`);
          continue;
        }
        const items = list.items.map((v) => {
          const r = resolveRef(ctx.index, kind, v);
          if ("link" in r) return r.link;
          notes.push(`${b.key}: unresolved "${r.unresolved}" (no unique note found), kept as plain text`);
          return v;
        });
        if (items.every((v, i) => v === list.items[i])) continue;
        work = replaceLines(work, b.start, contentEnd(work, b), renderList(b.key, items, list.style));
      }
      return { lines: work, notes, attention };
    }),
};
