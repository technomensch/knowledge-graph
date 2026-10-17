import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/** Write a fixture graph: keys are graph-relative file paths (with .md), values are file contents. */
export function makeGraph(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fm-graph-"));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, "utf-8");
  }
  return root;
}

export function removeGraph(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}

export function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf-8");
}

/** Empty note stubs, so link targets exist. */
export function stubs(...rels: string[]): Record<string, string> {
  return Object.fromEntries(rels.map((r) => [r, "# stub\n"]));
}
