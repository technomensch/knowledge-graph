import * as fs from "fs";
import * as path from "path";
import { writeFileAtomic } from "./atomic.js";

export const SCHEMA_MARKER_FILE = ".kmgraph-frontmatter-schema";

export function readSchemaMarker(kgPath: string): number | null {
  try {
    const raw = fs.readFileSync(path.join(kgPath, SCHEMA_MARKER_FILE), "utf-8").trim();
    return /^\d+$/.test(raw) ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function writeSchemaMarker(kgPath: string, step: number): void {
  writeFileAtomic(path.join(kgPath, SCHEMA_MARKER_FILE), `${step}\n`);
}
