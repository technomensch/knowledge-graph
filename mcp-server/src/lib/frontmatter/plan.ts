import * as fs from "fs";
import * as path from "path";
import { buildNoteIndex } from "./links.js";
import { MIGRATIONS } from "./migrations/index.js";

export interface PlannedChange { relPath: string; before: string; after: string; steps: number[] }
export interface SkippedFile { relPath: string; step: number; reason: string }
export interface PlanResult { scanned: number; changes: PlannedChange[]; skipped: SkippedFile[]; notes: string[] }

/** Pure read: computes what the requested steps would change. Never writes. relPath has no ".md". */
export function planMigrations(kgPath: string, steps: number[]): PlanResult {
  const ordered = MIGRATIONS.filter((m) => steps.includes(m.step)).sort((a, b) => a.step - b.step);
  const index = buildNoteIndex(kgPath);
  const result: PlanResult = { scanned: 0, changes: [], skipped: [], notes: [] };
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
    let text = before;
    const used: number[] = [];
    let skipped = false;
    for (const m of applicable) {
      const r = m.transform(text, relPath, { index });
      result.notes.push(...r.notes.map((n) => `${relPath}: ${n}`));
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
    if (!skipped && text !== before) result.changes.push({ relPath, before, after: text, steps: used });
  }
  return result;
}
