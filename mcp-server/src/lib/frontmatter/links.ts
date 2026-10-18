import * as fs from "fs";
import * as path from "path";
import { normalizeId, type RefKind } from "./ids.js";

const SKIP_DIRS = new Set(["chat-history", "plans", "tmp", "node_modules", ".git", ".obsidian"]);

export interface NoteIndex { paths: string[] }
export type Resolved = { link: string } | { unresolved: string };

export function buildNoteIndex(kgPath: string): NoteIndex {
  const paths: string[] = [];
  const walk = (dir: string, rel: string): void => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isSymbolicLink()) continue;
      const childRel = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name) || e.name.startsWith(".kg-archive")) continue;
        walk(path.join(dir, e.name), childRel);
      } else if (e.isFile() && e.name.endsWith(".md")) {
        paths.push(childRel.slice(0, -3));
      }
    }
  };
  walk(kgPath, "");
  return { paths: paths.sort() };
}

const lower = (s: string): string => s.toLowerCase();

/** Shortest trailing path (whole segments, case-insensitive) that matches exactly one note. Null if the note is not indexed. */
export function uniqueTarget(index: NoteIndex, notePath: string): string | null {
  if (!index.paths.includes(notePath)) return null;
  const segs = notePath.split("/");
  for (let k = 1; k <= segs.length; k++) {
    const suffix = lower(segs.slice(-k).join("/"));
    const hits = index.paths.filter((p) => lower(p) === suffix || lower(p).endsWith(`/${suffix}`));
    if (hits.length === 1) return segs.slice(-k).join("/");
  }
  return notePath;
}

export function wikilink(target: string, label: string): string {
  return label === target ? `[[${target}]]` : `[[${target}|${label}]]`;
}

function notePathForId(index: NoteIndex, kind: RefKind, id: string): string | null {
  if (kind === "issue") {
    const p = `issues/${id}/${id}-description`;
    return index.paths.includes(p) ? p : null;
  }
  if (kind === "enh") {
    const p = `enhancements/${id}/${id}-specification`;
    return index.paths.includes(p) ? p : null;
  }
  const hits = index.paths.filter((p) => p.startsWith(`decisions/${id}-`) && !p.slice("decisions/".length).includes("/"));
  return hits.length === 1 ? hits[0] : null;
}

const base = (p: string): string => p.split("/").pop() as string;

export function resolveRef(index: NoteIndex, kind: RefKind | "path", raw: string): Resolved {
  const v = raw.trim();
  if (v.startsWith("[[")) return { link: v };
  if (kind !== "path") {
    const id = normalizeId(kind, v);
    if (id) {
      const notePath = notePathForId(index, kind, id);
      const target = notePath ? uniqueTarget(index, notePath) : null;
      return target ? { link: wikilink(target, id) } : { unresolved: v };
    }
  }
  const rel = v.replace(/^knowledge\//, "").replace(/\.md$/, "");
  let notePath: string | null = index.paths.includes(rel) ? rel : null;
  if (!notePath && !rel.includes("/")) {
    const hits = index.paths.filter((p) => lower(base(p)) === lower(rel));
    if (hits.length === 1) notePath = hits[0];
  }
  if (!notePath) return { unresolved: v };
  const target = uniqueTarget(index, notePath);
  return target ? { link: wikilink(target, base(notePath)) } : { unresolved: v };
}
