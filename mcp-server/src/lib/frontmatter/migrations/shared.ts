import { isDoubledFrontmatter, locateFrontmatter } from "../parse.js";
import type { StepResult } from "./types.js";

export function inDirs(relPath: string, dirs: string[]): boolean {
  return dirs.some((d) => relPath.startsWith(`${d}/`));
}

export function withFrontmatter(
  text: string,
  fn: (lines: string[], end: number) => { lines: string[]; notes: string[]; skip?: string; attention?: string[] }
): StepResult {
  const lines = text.split("\n");
  const loc = locateFrontmatter(lines);
  if (!loc) return { text, notes: [] };
  if (isDoubledFrontmatter(lines, loc.end)) {
    return { text, notes: [], skip: "doubled frontmatter block (issue-46); run the capture-corruption repair first" };
  }
  const r = fn(lines, loc.end);
  if (r.skip) return { text, notes: r.notes, skip: r.skip, attention: r.attention };
  return { text: r.lines.join("\n"), notes: r.notes, attention: r.attention };
}
