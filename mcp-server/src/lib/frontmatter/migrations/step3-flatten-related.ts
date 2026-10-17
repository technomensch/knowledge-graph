import { contentEnd, readList, renderList, replaceLines, stripComment, topLevelBlocks, type KeyBlock } from "../parse.js";
import { resolveRef } from "../links.js";
import { normalizeId, type RefKind } from "../ids.js";
import { inDirs, withFrontmatter } from "./shared.js";
import type { Migration } from "./types.js";

const SUBKEYS: Record<string, { key: string; kind: RefKind | "path" }> = {
  adrs: { key: "related_adrs", kind: "adr" },
  enhancements: { key: "related_enhs", kind: "enh" },
  issues: { key: "related_issues", kind: "issue" },
  lessons: { key: "related_lessons", kind: "path" },
  kg_entries: { key: "related_docs", kind: "path" },
};
const FLAT = ["related_adrs", "related_enhs", "related_issues", "related_lessons", "related_docs"];
// Old hyphen spellings count as "flat keys already present" too, so a file never ends up with both.
const FLAT_OLD_SPELLING = ["related-adrs", "related-enhs", "related-issues"];
const ADR_ALWAYS = ["related_adrs", "related_lessons", "related_docs"];

export const step3: Migration = {
  step: 3,
  id: "flatten-related",
  title: "Flatten nested related: maps",
  introducedIn: "0.7.11",
  requires: [2],
  touchedKeys: ["related", ...FLAT],
  scope: (p) => inDirs(p, ["decisions", "lessons-learned"]),
  transform: (text, relPath, ctx) =>
    withFrontmatter(text, (lines, end) => {
      const notes: string[] = [];
      const blocks = topLevelBlocks(lines, end);
      const rel = blocks.find((b) => b.key === "related");
      if (!rel) return { lines, notes };
      if (blocks.some((b) => FLAT.includes(b.key) || FLAT_OLD_SPELLING.includes(b.key))) {
        return { lines, notes, skip: 'flat related_* keys already present next to "related:"' };
      }
      const isAdr = relPath.startsWith("decisions/");
      const first = lines[rel.start];
      const rest = stripComment(first.slice(first.indexOf(":") + 1)).trim();
      if (!["", "null", "~", "{}"].includes(rest)) return { lines, notes, skip: 'unrecognized "related:" shape' };

      const rEnd = contentEnd(lines, rel);
      const subs: KeyBlock[] = [];
      let subIndent = -1;
      for (let i = rel.start + 1; i < rEnd; i++) {
        const m = /^(\s+)([A-Za-z0-9_-]+):/.exec(lines[i]);
        if (!m) continue;
        if (subIndent === -1) subIndent = m[1].length;
        if (m[1].length === subIndent) subs.push({ key: m[2], start: i, end: rEnd });
      }
      for (let s = 0; s < subs.length - 1; s++) subs[s].end = subs[s + 1].start;

      const mapped = new Map<string, string[]>();
      for (const sb of subs) {
        const spec = SUBKEYS[sb.key];
        if (!spec) return { lines, notes, skip: `unknown related sub-key "${sb.key}"` };
        const list = readList(lines, sb);
        if (!list) return { lines, notes, skip: `related.${sb.key}: unrecognized shape` };
        const items = list.items.map((v) => {
          // Normalize plain IDs first (as step 1 does) so an unresolved ID is still canonical and the steps converge.
          const raw = spec.kind === "path" ? v : (normalizeId(spec.kind, v) ?? v);
          const r = resolveRef(ctx.index, spec.kind, raw);
          if ("link" in r) return r.link;
          notes.push(`related.${sb.key}: unresolved "${r.unresolved}" (no unique note found), kept as plain text`);
          return raw;
        });
        mapped.set(spec.key, [...(mapped.get(spec.key) ?? []), ...items]);
      }

      const out: string[] = [];
      for (const key of FLAT) {
        const vals = mapped.get(key);
        if (vals === undefined && !(isAdr && ADR_ALWAYS.includes(key))) continue;
        const items = vals ?? [];
        out.push(...renderList(key, items, items.length > 0 ? "block" : "flow"));
      }
      if (out.length === 0) return { lines, notes };
      return { lines: replaceLines(lines, rel.start, rEnd, out), notes };
    }),
};
