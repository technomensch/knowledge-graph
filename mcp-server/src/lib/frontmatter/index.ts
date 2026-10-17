import * as fs from "fs";
import * as path from "path";
import { writeFileAtomic } from "./atomic.js";
import { readSchemaMarker, writeSchemaMarker } from "./marker.js";
import { locateFrontmatter } from "./parse.js";
import { planMigrations, type PlanResult } from "./plan.js";
import { verifyEquivalent } from "./verify.js";
import { FRONTMATTER_SCHEMA_FLOOR, MIGRATIONS } from "./migrations/index.js";

export { FRONTMATTER_SCHEMA_FLOOR };
export const LATEST_STEP = MIGRATIONS.reduce((m, s) => Math.max(m, s.step), 0);
const ALL_STEPS = MIGRATIONS.map((m) => m.step).sort((a, b) => a - b);

export interface FrontmatterFinding {
  category: "frontmatter-schema";
  description: string;
  details: string;
}

export function frontmatterDiff(before: string, after: string): string[] {
  const fm = (t: string): string[] => {
    const l = t.split("\n");
    const loc = locateFrontmatter(l);
    return loc ? l.slice(1, loc.end) : [];
  };
  const b = fm(before);
  const a = fm(after);
  const bSet = new Set(b);
  const aSet = new Set(a);
  return [
    ...b.filter((x) => !aSet.has(x)).map((x) => `-  ${x}`),
    ...a.filter((x) => !bSet.has(x)).map((x) => `+  ${x}`),
  ];
}

function perStepCounts(plan: PlanResult): Map<number, number> {
  const counts = new Map<number, number>();
  for (const s of ALL_STEPS) counts.set(s, plan.changes.filter((c) => c.steps.includes(s)).length);
  return counts;
}

function needsAttentionItems(plan: PlanResult): Array<{ relPath: string; reason: string }> {
  return [
    ...plan.skipped.map((s) => ({ relPath: s.relPath, reason: `step ${s.step}: ${s.reason}` })),
    ...plan.attention.map((a) => ({ relPath: a.relPath, reason: `step ${a.step}: ${a.reason}` })),
  ];
}

function needsAttentionFiles(plan: PlanResult): number {
  return new Set(needsAttentionItems(plan).map((i) => i.relPath)).size;
}

function needsAttentionLines(plan: PlanResult, max: number): string[] {
  const items = needsAttentionItems(plan);
  if (items.length === 0) return [];
  const out = [`needs your attention (these notes are left exactly as they are): ${needsAttentionFiles(plan)} file(s)`];
  for (const i of items.slice(0, max)) out.push(`  - ${i.relPath}: ${i.reason}`);
  if (items.length > max) out.push(`  ... and ${items.length - max} more`);
  return out;
}

export function checkFrontmatterSchema(kgPath: string): FrontmatterFinding[] {
  const marker = readSchemaMarker(kgPath);
  if (marker !== null && marker < FRONTMATTER_SCHEMA_FLOOR) {
    return [{
      category: "frontmatter-schema",
      description: `frontmatter schema marker (${marker}) is below the supported floor (${FRONTMATTER_SCHEMA_FLOOR})`,
      details: "This graph is older than the oldest schema this release can upgrade. Upgrade it with an earlier release first (see CHANGELOG), then run kg_upgrade again. Nothing was changed.",
    }];
  }
  const plan = planMigrations(kgPath, ALL_STEPS);
  // Nothing to apply: stay quiet. Notes that need a person are shown while there is pending work, and in the apply summary.
  if (plan.changes.length === 0) return [];

  const counts = perStepCounts(plan);
  const lines: string[] = [];
  for (const m of MIGRATIONS) {
    lines.push(`step ${m.step} (${m.title}): ${counts.get(m.step) ?? 0} file(s)${m.requires.length ? `, requires step ${m.requires.join(", ")}` : ""}`);
  }
  lines.push(`marker: ${marker === null ? "absent" : marker} (floor ${FRONTMATTER_SCHEMA_FLOOR})`);
  lines.push(...needsAttentionLines(plan, 8));
  if (plan.ignored.length > 0) {
    lines.push(`ignored, no frontmatter or CRLF line endings (left alone): ${plan.ignored.length} file(s)`);
  }
  const unresolved = plan.notes.filter((n) => n.includes("unresolved"));
  if (unresolved.length > 0) {
    lines.push(`unresolved references (kept as plain text): ${unresolved.length}`);
    for (const n of unresolved.slice(0, 5)) lines.push(`  - ${n}`);
  }
  lines.push("sample changes (dry run, first 5 files):");
  for (const c of plan.changes.slice(0, 5)) {
    lines.push(`  ${c.relPath}.md (steps ${c.steps.join(",")})`);
    for (const d of frontmatterDiff(c.before, c.after)) lines.push(`    ${d}`);
  }
  lines.push(
    'Run with apply: ["frontmatter-schema"], frontmatterSteps: [<steps you approve>], confirmFrontmatterSchema: true. Steps are approved separately; a .bak copy is kept next to every rewritten file.'
  );
  return [{
    category: "frontmatter-schema",
    description: `frontmatter schema: ${plan.changes.length} file(s) pending, ${needsAttentionFiles(plan)} need your attention`,
    details: lines.join("\n"),
  }];
}

export function applyFrontmatterSchema(kgPath: string, steps: number[]): string {
  const wanted = [...new Set(steps)].sort((a, b) => a - b);
  if (wanted.length === 0) throw new Error("frontmatter-schema: name at least one step in frontmatterSteps");
  for (const s of wanted) {
    if (!ALL_STEPS.includes(s)) throw new Error(`frontmatter-schema: unknown step ${s} (known: ${ALL_STEPS.join(", ")})`);
  }
  const marker = readSchemaMarker(kgPath);
  if (marker !== null && marker < FRONTMATTER_SCHEMA_FLOOR) {
    throw new Error(`frontmatter-schema: marker ${marker} is below the supported floor ${FRONTMATTER_SCHEMA_FLOOR}; upgrade with an earlier release first`);
  }
  for (const m of MIGRATIONS.filter((x) => wanted.includes(x.step))) {
    for (const req of m.requires) {
      if (wanted.includes(req)) continue;
      // Transitive: any pending work at or below the required step blocks, not just work for that step alone.
      const pending = planMigrations(kgPath, ALL_STEPS.filter((s) => s <= req)).changes.length;
      if (pending > 0) throw new Error(`frontmatter-schema: step ${m.step} requires step ${req} first (${pending} file(s) still pending)`);
    }
  }

  const plan = planMigrations(kgPath, wanted);
  const touched = [...new Set(MIGRATIONS.filter((m) => wanted.includes(m.step)).flatMap((m) => m.touchedKeys))];
  let written = 0;
  const failed: string[] = [];
  for (const c of plan.changes) {
    const abs = path.join(kgPath, `${c.relPath}.md`);
    const current = fs.readFileSync(abs, "utf-8");
    if (current !== c.before) {
      failed.push(`${c.relPath}: file changed since the plan was computed`);
      continue;
    }
    const problem = verifyEquivalent(c.before, c.after, touched);
    if (problem) {
      failed.push(`${c.relPath}: ${problem}`);
      continue;
    }
    const bak = `${abs}.bak`;
    if (!fs.existsSync(bak)) fs.writeFileSync(bak, c.before, "utf-8");
    writeFileAtomic(abs, c.after);
    written++;
  }

  // Marker = highest step N such that steps 1..N have nothing left to apply. Notes that need a person are
  // reported but do not hold the marker back; they are left exactly as they are.
  const after = planMigrations(kgPath, ALL_STEPS);
  const counts = perStepCounts(after);
  let reached = 0;
  for (const s of ALL_STEPS) {
    if ((counts.get(s) ?? 0) === 0) reached = s;
    else break;
  }
  const previous = marker ?? 0;
  if (reached > previous) writeSchemaMarker(kgPath, reached);

  const parts = [
    `Applied steps ${wanted.join(", ")}: ${written} file(s) rewritten, ${failed.length} refused by verification.`,
    `A .bak copy of each rewritten file sits next to it (delete them after review).`,
    `Schema marker now ${Math.max(previous, reached)}.`,
  ];
  for (const f of failed.slice(0, 5)) parts.push(`  refused: ${f}`);
  const attentionLines = needsAttentionLines(after, 10);
  if (attentionLines.length > 0) {
    parts.push(...attentionLines, "  Fix these by hand if you want them migrated; nothing was changed in them.");
  }
  return parts.join("\n");
}
