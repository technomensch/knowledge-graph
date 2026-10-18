import { contentEnd, crossCheckList, hasComments, readList, renderList, replaceLines, stripComment, topLevelBlocks, yamlEntryCount, type KeyBlock } from "../parse.js";
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
// Only values that are clearly an ID (prefix and number) are treated as one in a plain list.
const PREFIXED_ID: Array<{ re: RegExp; kind: RefKind }> = [
  { re: /^ENH-\d+$/i, kind: "enh" },
  { re: /^ADR-\d+$/i, kind: "adr" },
  { re: /^issue-\d+$/i, kind: "issue" },
];

export const step3: Migration = {
  step: 3,
  id: "flatten-related",
  title: "Flatten nested related: maps",
  introducedIn: "0.7.11",
  requires: [2],
  touchedKeys: ["related", ...FLAT],
  scope: (p) => inDirs(p, ["decisions", "lessons-learned"]),
  transform: (text, relPath, ctx) =>
    withFrontmatter(text, (lines, end, doc) => {
      const notes: string[] = [];
      const attention: string[] = [];
      const leftAsIs = () => ({ lines, notes, attention });
      const blocks = topLevelBlocks(lines, end);
      const rel = blocks.find((b) => b.key === "related");
      if (!rel) return { lines, notes };
      if (blocks.some((b) => FLAT.includes(b.key) || FLAT_OLD_SPELLING.includes(b.key))) {
        attention.push('"related:" left as is: flat related_* keys are already present next to it');
        return leftAsIs();
      }
      if (hasComments(lines, rel)) {
        attention.push('"related:" left as is: it has comments, which would be lost');
        return leftAsIs();
      }
      const relDoc = doc.related;
      const relObj = relDoc && typeof relDoc === "object" && !Array.isArray(relDoc) ? (relDoc as Record<string, unknown>) : {};
      const isAdr = relPath.startsWith("decisions/");
      const first = lines[rel.start];
      const rest = stripComment(first.slice(first.indexOf(":") + 1)).trim();
      const rEnd = contentEnd(lines, rel);

      // Look at the lines under "related:": sub-keys (a map) and/or plain "- item" lines (a list).
      const subs: KeyBlock[] = [];
      let subIndent = -1;
      let plainItems = 0;
      for (let i = rel.start + 1; i < rEnd; i++) {
        const m = /^(\s+)([A-Za-z0-9_-]+):/.exec(lines[i]);
        if (m) {
          if (subIndent === -1) subIndent = m[1].length;
          if (m[1].length === subIndent) subs.push({ key: m[2], start: i, end: rEnd });
          continue;
        }
        if (/^\s*-\s+/.test(lines[i]) && subs.length === 0) plainItems++;
      }
      for (let s = 0; s < subs.length - 1; s++) subs[s].end = subs[s + 1].start;

      const mapped = new Map<string, string[]>();

      const resolvePlain = (v: string): string => {
        const id = PREFIXED_ID.find((p) => p.re.test(v.trim()));
        const raw = id ? (normalizeId(id.kind, v) ?? v) : v;
        const r = id ? resolveRef(ctx.index, id.kind, raw) : resolveRef(ctx.index, "path", raw);
        if ("link" in r) return r.link;
        notes.push(`related: unresolved "${r.unresolved}" (no unique note found), kept as plain text`);
        return raw;
      };

      const isFlowList = rest.startsWith("[") && rest.endsWith("]");
      if (isFlowList || (rest === "" && plainItems > 0 && subs.length === 0)) {
        // A plain list (not a map): every entry goes to related_docs, nothing is dropped.
        const list = readList(lines, rel);
        if (!list || !crossCheckList(list.items, relDoc)) {
          attention.push('"related:" left as is: unrecognized list shape');
          return leftAsIs();
        }
        mapped.set("related_docs", list.items.map(resolvePlain));
      } else if (rest !== "" && !["null", "~", "{}"].includes(rest)) {
        attention.push('"related:" left as is: unrecognized shape');
        return leftAsIs();
      } else if (plainItems > 0 && subs.length > 0) {
        attention.push('"related:" left as is: mixes plain list items with named groups');
        return leftAsIs();
      } else {
        for (const sb of subs) {
          const spec = SUBKEYS[sb.key];
          if (!spec) {
            attention.push(`"related:" left as is: unknown group "${sb.key}"`);
            return leftAsIs();
          }
          const list = readList(lines, sb);
          if (!list || !crossCheckList(list.items, relObj[sb.key])) {
            attention.push(`"related:" left as is: group "${sb.key}" has an unrecognized shape`);
            return leftAsIs();
          }
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
      }

      // Entry count as a real YAML parser sees it must equal what is being written out.
      const totalIn = yamlEntryCount(relDoc);
      const totalOut = [...mapped.values()].reduce((n, v) => n + v.length, 0);
      if (totalOut !== totalIn) {
        attention.push('"related:" left as is: the number of entries would change');
        return leftAsIs();
      }

      const out: string[] = [];
      for (const key of FLAT) {
        const vals = mapped.get(key);
        if (vals === undefined && !(isAdr && ADR_ALWAYS.includes(key))) continue;
        const items = vals ?? [];
        out.push(...renderList(key, items, items.length > 0 ? "block" : "flow"));
      }
      if (out.length === 0) return { lines, notes, attention };
      return { lines: replaceLines(lines, rel.start, rEnd, out), notes, attention };
    }),
};
