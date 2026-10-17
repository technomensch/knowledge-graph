export interface FmLocation { end: number }
export interface KeyBlock { key: string; start: number; end: number }
export type ListStyle = "flow" | "block";
export interface ParsedList { items: string[]; style: ListStyle }

const KEY_RE = /^([A-Za-z0-9_-]+):(.*)$/;

export function locateFrontmatter(lines: string[]): FmLocation | null {
  if (lines[0] !== "---") return null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") return { end: i };
  }
  return null;
}

/** issue-46 corruption: a second frontmatter block directly after the first. */
export function isDoubledFrontmatter(lines: string[], end: number): boolean {
  if (lines[end + 1] !== "---") return false;
  if (!/^[A-Za-z0-9_-]+:/.test(lines[end + 2] ?? "")) return false;
  return lines.slice(end + 2).some((l) => l === "---");
}

export function topLevelBlocks(lines: string[], fmEnd: number): KeyBlock[] {
  const blocks: KeyBlock[] = [];
  for (let i = 1; i < fmEnd; i++) {
    const m = KEY_RE.exec(lines[i]);
    if (m) blocks.push({ key: m[1], start: i, end: fmEnd });
  }
  for (let b = 0; b < blocks.length - 1; b++) blocks[b].end = blocks[b + 1].start;
  return blocks;
}

/** Index just past the block's last content line (trailing blank/comment lines excluded). */
export function contentEnd(lines: string[], block: KeyBlock): number {
  let e = block.end;
  while (e - 1 > block.start && (lines[e - 1].trim() === "" || lines[e - 1].trim().startsWith("#"))) e--;
  return e;
}

export function unquote(s: string): string {
  const t = s.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    try { return JSON.parse(t) as string; } catch { return t.slice(1, -1); }
  }
  if (t.length >= 2 && t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1).replace(/''/g, "'");
  return t;
}

function splitFlow(inner: string): string[] {
  const items: string[] = [];
  let cur = "";
  let quote: string | null = null;
  for (const ch of inner) {
    if (quote) { cur += ch; if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (ch === ",") { items.push(cur); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim() !== "") items.push(cur);
  return items.map((s) => unquote(s)).filter((s) => s !== "");
}

/**
 * Cut a trailing ` # comment`, but only when the # is outside quotes. A quote only opens a quoted
 * scalar at the start of a value or right after `[` or `,` (YAML rule), so an apostrophe inside
 * unquoted text does not hide a real comment.
 */
export function stripComment(s: string): string {
  let quote: string | null = null;
  let prevNonSpace = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quote) {
      if (ch === quote) quote = null;
      prevNonSpace = ch;
      continue;
    }
    if ((ch === '"' || ch === "'") && (prevNonSpace === "" || prevNonSpace === "[" || prevNonSpace === ",")) {
      quote = ch;
      prevNonSpace = ch;
      continue;
    }
    if (ch === "#" && i > 0 && /\s/.test(s[i - 1])) return s.slice(0, i).replace(/\s+$/, "");
    if (!/\s/.test(ch)) prevNonSpace = ch;
  }
  return s;
}

function valueAfterColon(line: string): string {
  return stripComment(line.slice(line.indexOf(":") + 1)).trim();
}

export function readList(lines: string[], block: KeyBlock): ParsedList | null {
  const rest = valueAfterColon(lines[block.start]);
  if (rest.startsWith("[") && rest.endsWith("]")) {
    return { items: splitFlow(rest.slice(1, -1)), style: "flow" };
  }
  if (rest === "" || rest === "null" || rest === "~") {
    const items: string[] = [];
    for (let i = block.start + 1; i < block.end; i++) {
      const m = /^\s*-\s+(.*)$/.exec(lines[i]);
      if (m) items.push(unquote(stripComment(m[1])));
      else if (lines[i].trim() === "" || /^\s*#/.test(lines[i])) continue;
      else return null;
    }
    return { items, style: items.length > 0 ? "block" : "flow" };
  }
  return null;
}

export function readScalar(lines: string[], block: KeyBlock): string | null {
  const rest = valueAfterColon(lines[block.start]);
  return rest === "" ? null : unquote(rest);
}

export function renderList(key: string, items: string[], style: ListStyle): string[] {
  if (items.length === 0) return [`${key}: []`];
  const q = items.map((s) => JSON.stringify(s));
  if (style === "flow") return [`${key}: [${q.join(", ")}]`];
  return [`${key}:`, ...q.map((s) => `  - ${s}`)];
}

export function replaceLines(lines: string[], start: number, end: number, replacement: string[]): string[] {
  return [...lines.slice(0, start), ...replacement, ...lines.slice(end)];
}
