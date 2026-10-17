import { parse } from "yaml";
import { locateFrontmatter } from "./parse.js";

function split(text: string): { fm: string; body: string } | null {
  const lines = text.split("\n");
  const loc = locateFrontmatter(lines);
  if (!loc) return null;
  return { fm: lines.slice(1, loc.end).join("\n"), body: lines.slice(loc.end + 1).join("\n") };
}

function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(v) ?? "null";
}

/** Number of string/number entries under every relationship key (related, related_*, related-*). */
function relationshipEntryCount(obj: Record<string, unknown>): number {
  let n = 0;
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v as Record<string, unknown>).forEach(walk);
    else if (typeof v === "string" || typeof v === "number") n++;
  };
  for (const [k, v] of Object.entries(obj)) if (/^related([_-]|$)/.test(k)) walk(v);
  return n;
}

/** ADR-063: null when the rewrite is safe, otherwise the reason it must be refused. */
export function verifyEquivalent(before: string, after: string, touched: string[]): string | null {
  const b = split(before);
  const a = split(after);
  if (!b || !a) return "frontmatter missing";
  if (b.body !== a.body) return "body changed";
  let pb: unknown;
  let pa: unknown;
  try {
    pb = parse(b.fm) ?? {};
    pa = parse(a.fm) ?? {};
  } catch (err) {
    return `frontmatter does not parse: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`;
  }
  if (typeof pb !== "object" || typeof pa !== "object" || Array.isArray(pb) || Array.isArray(pa)) {
    return "frontmatter is not a mapping";
  }
  const ob = { ...(pb as Record<string, unknown>) };
  const oa = { ...(pa as Record<string, unknown>) };
  // Safety net: a step that touches relationship keys must keep exactly as many entries as it found.
  if (touched.some((k) => k.startsWith("related")) && relationshipEntryCount(ob) !== relationshipEntryCount(oa)) {
    return "relationship entries were lost or added";
  }
  for (const k of touched) {
    delete ob[k];
    delete oa[k];
  }
  return stable(ob) === stable(oa) ? null : "keys outside the migration changed";
}
