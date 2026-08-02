import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { checkGraphPathHealth, GraphConfig } from "../src/utils.js";

function makeGraph(p: string): GraphConfig {
  return { name: "g", path: p, type: "project-local", categories: [], createdAt: "x", lastUsed: "x", status: "active", statusChangedAt: "x", graphId: "id" };
}

describe("checkGraphPathHealth", () => {
  let dir: string;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "pathhealth-")); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it("returns ok when the path exists and is non-empty", () => {
    const kgDir = path.join(dir, "knowledge");
    fs.mkdirSync(kgDir);
    fs.writeFileSync(path.join(kgDir, "me.md"), "x");
    expect(checkGraphPathHealth(makeGraph(kgDir))).toBe("ok");
  });

  it("returns content-missing when parent exists but the KG dir is empty/absent", () => {
    expect(checkGraphPathHealth(makeGraph(path.join(dir, "knowledge")))).toBe("content-missing");
  });

  it("returns parent-unreachable when the parent directory itself doesn't exist", () => {
    expect(checkGraphPathHealth(makeGraph(path.join(dir, "nope", "deeper", "knowledge")))).toBe("parent-unreachable");
  });
});
