import * as fs from "fs";
import * as path from "path";

// Port of the relationship-scan bash block in skills/kmg-paperwork-audit/SKILL.md Step 7
// (ENH-062). Flags pairs of issue/enhancement notes that mention the same file but declare
// no relationship in their frontmatter. Flag only: nothing is ever written.
//
// Behavior matches the bash block (LC_ALL=C byte ordering, same ignore list, same hub rule),
// with one deliberate difference: the bash `frontmatter | grep -q` under `pipefail` reports
// "not declared" for very large frontmatter (SIGPIPE); this port does not.

export const DEFAULT_HUB_MAX = 4;

const IGNORE_RE = /^(README\.md|CHANGELOG\.md|package\.json|CLAUDE\.md|AGENTS\.md|knowledge\/rules\.md)$/;
const ID_RE = /^(issue-[0-9]+|ENH-[0-9]+)/;
const TOKEN_RE = /`([A-Za-z0-9_./-]+\.(?:md|ts|sh|json|ya?ml))`/g;
const NAME_RE = /^(?:issue-.*-description\.md|ENH-.*-specification\.md)$/;

export interface RelationshipPair {
  a: string;
  b: string;
  sharedPath: string;
  /** Graph-relative path of the note carrying id `a` (from the surviving row). */
  fileA: string;
  /** Graph-relative path of the note carrying id `b` (from the surviving row). */
  fileB: string;
}

export interface RelationshipScanResult {
  /** False when neither issues/ nor enhancements/ is a directory: nothing to scan. */
  scannable: boolean;
  scanned: { issues: number; enhancements: number };
  pairs: RelationshipPair[];
}

interface Row {
  p: string;
  id: string;
  file: string; // graph-relative, forward slashes
}

// Byte-order comparison (LC_ALL=C). All keys here are ASCII, so JS code-unit order matches.
const cmp = (x: string, y: string): number => (x < y ? -1 : x > y ? 1 : 0);

function isDirectory(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory(); // follows symlinks, like `[ -d ]`
  } catch {
    return false;
  }
}

/** `find <dir> -type f`: no symlinks followed anywhere, including `dir` itself. */
function findFiles(root: string, rel: string, out: string[]): void {
  const abs = path.join(root, rel);
  let top: fs.Stats;
  try {
    top = fs.lstatSync(abs);
  } catch {
    return;
  }
  if (!top.isDirectory()) return; // a symlinked top folder is not descended into
  const walk = (dirAbs: string, dirRel: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dirAbs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const entryRel = `${dirRel}/${e.name}`;
      if (e.isDirectory()) walk(path.join(dirAbs, e.name), entryRel);
      else if (e.isFile()) out.push(entryRel);
    }
  };
  walk(abs, rel);
}

/** awk: lines after a first-line `---` up to (not including) the next `---`; else empty. */
function frontmatterLines(content: string): string[] {
  const lines = content.split("\n");
  if (lines[lines.length - 1] === "") lines.pop(); // a trailing newline is not a record
  if (lines.length === 0 || lines[0] !== "---") return [];
  const out: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") break;
    out.push(lines[i]);
  }
  return out;
}

// latin1: one char per byte, as grep sees it under LC_ALL=C (a BOM stays non-`---`).
// An unreadable note is skipped, as the bash block does (its reads are `2>/dev/null`).
function readNote(graphPath: string, relFile: string): string | null {
  try {
    return fs.readFileSync(path.join(graphPath, relFile), "latin1");
  } catch {
    return null;
  }
}

/** Each note's frontmatter is read at most once, however many pairs it appears in. */
function makeFrontmatterReader(graphPath: string): (relFile: string) => string[] {
  const cache = new Map<string, string[]>();
  return (relFile) => {
    let lines = cache.get(relFile);
    if (!lines) {
      const content = readNote(graphPath, relFile);
      lines = content === null ? [] : frontmatterLines(content);
      cache.set(relFile, lines);
    }
    return lines;
  };
}

function mentionsId(lines: string[], otherId: string): boolean {
  const re = new RegExp(`(^|[^A-Za-z0-9])${otherId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^0-9]|$)`);
  return lines.some((l) => re.test(l));
}

export function scanRelationships(graphPath: string, opts: { hubMax?: number } = {}): RelationshipScanResult {
  const hubMax = opts.hubMax ?? DEFAULT_HUB_MAX;
  const result: RelationshipScanResult = { scannable: true, scanned: { issues: 0, enhancements: 0 }, pairs: [] };

  if (!isDirectory(path.join(graphPath, "issues")) && !isDirectory(path.join(graphPath, "enhancements"))) {
    result.scannable = false;
    return result;
  }

  const files: string[] = [];
  findFiles(graphPath, "issues", files);
  findFiles(graphPath, "enhancements", files);

  const rows: Row[] = [];
  for (const file of files.filter((f) => NAME_RE.test(path.posix.basename(f))).sort(cmp)) {
    const idMatch = ID_RE.exec(path.posix.basename(file));
    if (!idMatch) continue;
    const id = idMatch[1];
    if (file.startsWith("issues/")) result.scanned.issues++;
    else result.scanned.enhancements++;
    const content = readNote(graphPath, file);
    if (content === null) continue; // counted as scanned, contributes no mentions
    const tokens = new Set<string>();
    for (const m of content.matchAll(TOKEN_RE)) tokens.add(m[1]);
    for (const p of tokens) {
      if (IGNORE_RE.test(p)) continue;
      rows.push({ p, id, file });
    }
  }

  // sort -t TAB -k1,1 -k2,2 (ties fall back to the whole line, i.e. the file path)
  rows.sort((x, y) => cmp(x.p, y.p) || cmp(x.id, y.id) || cmp(x.file, y.file));

  // awk: group by path; a path shared by more than hubMax rows is a hub; bare filenames
  // (no "/") are too generic. Pairs are emitted in row order, one per two different ids.
  const emitted: Array<{ a: string; b: string; p: string; fa: string; fb: string }> = [];
  for (let start = 0; start < rows.length; ) {
    let end = start;
    while (end < rows.length && rows[end].p === rows[start].p) end++;
    const group = rows.slice(start, end);
    const n = group.length;
    if (n >= 2 && n <= hubMax && group[0].p.includes("/")) {
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++)
          if (group[i].id !== group[j].id)
            emitted.push({ a: group[i].id, b: group[j].id, p: group[0].p, fa: group[i].file, fb: group[j].file });
    }
    start = end;
  }

  // sort -u -k1,2: stable sort on (a, b), keep the first row of each pair, so the reported
  // path is the alphabetically first shared one. Duplicates are dropped BEFORE the
  // frontmatter check, exactly as in the bash block.
  const ordered = emitted
    .map((e, i) => ({ e, i }))
    .sort((x, y) => cmp(x.e.a, y.e.a) || cmp(x.e.b, y.e.b) || x.i - y.i)
    .map((x) => x.e);
  const frontmatterOf = makeFrontmatterReader(graphPath);
  let last = "";
  for (const e of ordered) {
    const key = `${e.a}\t${e.b}`;
    if (key === last) continue;
    last = key;
    if (mentionsId(frontmatterOf(e.fa), e.b) || mentionsId(frontmatterOf(e.fb), e.a)) continue;
    result.pairs.push({ a: e.a, b: e.b, sharedPath: e.p, fileA: e.fa, fileB: e.fb });
  }
  return result;
}
