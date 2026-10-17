import { parse } from "yaml";
import { isDoubledFrontmatter, locateFrontmatter } from "../parse.js";
import type { StepResult } from "./types.js";

export function inDirs(relPath: string, dirs: string[]): boolean {
  return dirs.some((d) => relPath.startsWith(`${d}/`));
}

export function withFrontmatter(
  text: string,
  fn: (lines: string[], end: number, doc: Record<string, unknown>) => { lines: string[]; notes: string[]; skip?: string; attention?: string[] }
): StepResult {
  const lines = text.split("\n");
  const loc = locateFrontmatter(lines);
  if (!loc) return { text, notes: [] };
  if (isDoubledFrontmatter(lines, loc.end)) {
    return { text, notes: [], skip: "doubled frontmatter block (issue-46); run the capture-corruption repair first" };
  }
  let doc: Record<string, unknown>;
  try {
    const parsed = parse(lines.slice(1, loc.end).join("\n")) ?? {};
    if (typeof parsed !== "object" || Array.isArray(parsed)) {
      return { text, notes: [], skip: "frontmatter is not a mapping; left alone" };
    }
    doc = parsed as Record<string, unknown>;
  } catch (err) {
    return { text, notes: [], skip: `frontmatter does not parse as YAML (${err instanceof Error ? err.message.split("\n")[0] : String(err)}); left alone` };
  }
  const r = fn(lines, loc.end, doc);
  if (r.skip) return { text, notes: r.notes, skip: r.skip, attention: r.attention };
  return { text: r.lines.join("\n"), notes: r.notes, attention: r.attention };
}
