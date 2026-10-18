import * as fs from "fs";
import * as path from "path";

let counter = 0;

/** ADR-063: write to a temp file in the same directory, then rename over the target. */
export function writeFileAtomic(target: string, content: string): void {
  const tmp = path.join(path.dirname(target), `.${path.basename(target)}.tmp.${process.pid}.${counter++}`);
  try {
    fs.writeFileSync(tmp, content, "utf-8");
    fs.renameSync(tmp, target);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* temp file may not exist */ }
    throw err;
  }
}
