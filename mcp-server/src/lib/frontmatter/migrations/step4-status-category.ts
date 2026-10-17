import { contentEnd, readScalar, replaceLines, topLevelBlocks } from "../parse.js";
import { categoryFor } from "../status.js";
import { inDirs, withFrontmatter } from "./shared.js";
import type { Migration } from "./types.js";

export const step4: Migration = {
  step: 4,
  id: "status-category",
  title: "Add status_category computed from status",
  introducedIn: "0.7.11",
  requires: [],
  touchedKeys: ["status_category"],
  scope: (p) => inDirs(p, ["issues", "enhancements", "decisions"]),
  transform: (text) =>
    withFrontmatter(text, (lines, end) => {
      const notes: string[] = [];
      const attention: string[] = [];
      const blocks = topLevelBlocks(lines, end);
      const st = blocks.find((b) => b.key === "status");
      if (!st) return { lines, notes };
      const raw = readScalar(lines, st);
      if (raw === null) {
        attention.push("status: multi-line or empty, status_category not added");
        return { lines, notes, attention };
      }
      const { category, recognized } = categoryFor(raw);
      const existing = blocks.find((b) => b.key === "status_category");
      if (existing) {
        const current = readScalar(lines, existing);
        if (current !== category) notes.push(`status_category "${current}" differs from computed "${category}", kept`);
        return { lines, notes };
      }
      if (!recognized) notes.push(`status "${raw.slice(0, 40)}" not recognized, category set to pending`);
      const at = contentEnd(lines, st);
      return { lines: replaceLines(lines, at, at, [`status_category: ${category}`]), notes };
    }),
};
