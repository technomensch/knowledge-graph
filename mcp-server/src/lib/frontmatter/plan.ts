import * as fs from "fs";
import * as path from "path";
import { buildNoteIndex } from "./links.js";
import { locateFrontmatter } from "./parse.js";
import { verifyEquivalent } from "./verify.js";
import { MIGRATIONS } from "./migrations/index.js";

export interface PlannedChange { relPath: string; before: string; after: string; steps: number[] }
/** The whole file is left alone (corrupt or conflicting frontmatter). */
export interface SkippedFile { relPath: string; step: number; reason: string }
/** One field the step could not handle; it is left as it is and reported to the user. */
export interface AttentionItem { relPath: string; step: number; reason: string }
/** In-scope files the migration cannot read as frontmatter at all. */
export interface IgnoredFile { relPath: string; reason: string }
export interface PlanResult {
  scanned: number;
  changes: PlannedChange[];
  skipped: SkippedFile[];
  attention: AttentionItem[];
  ignored: IgnoredFile[];
  notes: string[];
}

/** Pure read: computes what the requested steps would change. Never writes. relPath has no ".md". */
export function planMigrations(kgPath: string, steps: number[]): PlanResult {
  const ordered = MIGRATIONS.filter((m) => steps.includes(m.step)).sort((a, b) => a.step - b.step);
  const index = buildNoteIndex(kgPath);
  const result: PlanResult = { scanned: 0, changes: [], skipped: [], attention: [], ignored: [], notes: [] };
  for (const relPath of index.paths) {
    const applicable = ordered.filter((m) => m.scope(relPath));
    if (applicable.length === 0) continue;
    let before: string;
    try {
      before = fs.readFileSync(path.join(kgPath, `${relPath}.md`), "utf-8");
    } catch {
      continue;
    }
    result.scanned++;
    if (before.charCodeAt(0) === 0xfeff) {
      result.ignored.push({ relPath, reason: "BOM at the start of the file (not handled)" });
      continue;
    }
    if (before.includes("\r")) {
      result.ignored.push({ relPath, reason: "CRLF line endings (not handled)" });
      continue;
    }
    if (!locateFrontmatter(before.split("\n"))) {
      result.ignored.push({ relPath, reason: "no frontmatter" });
      continue;
    }
    let text = before;
    const used: number[] = [];
    let skipped = false;
    for (const m of applicable) {
      const r = m.transform(text, relPath, { index });
      result.notes.push(...r.notes.map((n) => `${relPath}: ${n}`));
      for (const a of r.attention ?? []) result.attention.push({ relPath, step: m.step, reason: a });
      if (r.skip) {
        result.skipped.push({ relPath, step: m.step, reason: r.skip });
        skipped = true;
        break;
      }
      if (r.text !== text) {
        text = r.text;
        used.push(m.step);
      }
    }
    if (!skipped && text !== before) {
      // Run the same safety check apply runs, now, so a file that would be refused is reported as needing
      // attention instead of staying "pending" forever and blocking the later steps.
      const touched = [...new Set(ordered.filter((m) => used.includes(m.step)).flatMap((m) => m.touchedKeys))];
      const problem = verifyEquivalent(before, text, touched);
      if (problem) {
        result.skipped.push({ relPath, step: used[used.length - 1], reason: `would be refused by the safety check (${problem}); left as it is` });
      } else {
        result.changes.push({ relPath, before, after: text, steps: used });
      }
    }
  }
  return result;
}
