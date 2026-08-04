import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("writeConfig atomicity", () => {
  let dir: string;
  let originalConfigPath: string | undefined;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "atomic-write-"));
    originalConfigPath = process.env.KG_CONFIG_PATH;
    process.env.KG_CONFIG_PATH = path.join(dir, "kg-config.json");
    jest.resetModules();
  });

  afterEach(() => {
    if (originalConfigPath === undefined) delete process.env.KG_CONFIG_PATH;
    else process.env.KG_CONFIG_PATH = originalConfigPath;
    fs.rmSync(dir, { recursive: true, force: true });
    jest.resetModules();
  });

  it("leaves no .tmp files behind after a successful write", () => {
    const { writeConfig } = require("../src/utils.js") as typeof import("../src/utils.js");
    writeConfig({ version: "1.0.0", graphs: {}, sanitization: { enabled: false, patterns: [], action: "warn" } });
    const leftovers = fs.readdirSync(dir).filter((f) => f.includes(".tmp."));
    expect(leftovers).toEqual([]);
  });

  it("target file is complete valid JSON immediately after write returns (no partial-write window observable)", () => {
    const { writeConfig } = require("../src/utils.js") as typeof import("../src/utils.js");
    const cfg = { version: "1.0.0", graphs: { a: { name: "a", path: "/a", type: "project-local" as const, categories: [], createdAt: "x", status: "active" as const, statusChangedAt: "x", graphId: "id" } }, sanitization: { enabled: false, patterns: [], action: "warn" as const } };
    writeConfig(cfg);
    const raw = fs.readFileSync(process.env.KG_CONFIG_PATH!, "utf-8");
    expect(() => JSON.parse(raw)).not.toThrow();
    expect(JSON.parse(raw).graphs.a.name).toBe("a");
  });

  it("preserves an existing file's permissions across rewrite", () => {
    const { writeConfig } = require("../src/utils.js") as typeof import("../src/utils.js");
    const target = process.env.KG_CONFIG_PATH!;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "{}", { mode: 0o600 });
    writeConfig({ version: "1.0.0", graphs: {}, sanitization: { enabled: false, patterns: [], action: "warn" } });
    const mode = fs.statSync(target).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("uses a monotonic counter, not just pid+timestamp, in the temp filename (two writes in the same tick don't collide)", () => {
    const { writeConfig } = require("../src/utils.js") as typeof import("../src/utils.js");
    const seenTmpNames = new Set<string>();
    const realRename = fs.renameSync;
    // Spy on the raw `require("fs")` module object rather than the `import *`
    // binding above: under this repo's TS/jest config, `import * as fs` compiles
    // to a namespace object whose properties are non-configurable getters, which
    // jest.spyOn cannot redefine ("Cannot redefine property"). The getters proxy
    // to the real fs module, so spying on the raw require("fs") object is still
    // observed by code (including utils.ts) that accesses fs via `import *`.
    const rawFs = require("fs") as typeof fs;
    const renameSpy = jest.spyOn(rawFs, "renameSync").mockImplementation((src: fs.PathLike, dest: fs.PathLike) => {
      seenTmpNames.add(String(src));
      return realRename(src as string, dest as string);
    });
    // Two writes back-to-back, same millisecond in practice on fast hardware.
    writeConfig({ version: "1.0.0", graphs: {}, sanitization: { enabled: false, patterns: [], action: "warn" } });
    writeConfig({ version: "1.0.0", graphs: {}, sanitization: { enabled: false, patterns: [], action: "warn" } });
    renameSpy.mockRestore();
    expect(seenTmpNames.size).toBe(2);
    for (const name of seenTmpNames) {
      expect(path.basename(name)).toMatch(/^\.kg-config\.json\.tmp\.\d+\.\d+$/);
    }
    // The two counter suffixes must differ even though pid is identical within one test process.
    const suffixes = [...seenTmpNames].map((n) => path.basename(n).split(".").pop());
    expect(new Set(suffixes).size).toBe(2);
  });

  it("does not leak a temp file when the rename ultimately fails", () => {
    const { writeConfig } = require("../src/utils.js") as typeof import("../src/utils.js");
    const rawFs = require("fs") as typeof fs;
    const renameSpy = jest.spyOn(rawFs, "renameSync").mockImplementation(() => {
      throw new Error("simulated rename failure");
    });
    expect(() =>
      writeConfig({ version: "1.0.0", graphs: {}, sanitization: { enabled: false, patterns: [], action: "warn" } })
    ).toThrow("simulated rename failure");
    renameSpy.mockRestore();
    const leftovers = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.includes(".tmp.")) : [];
    expect(leftovers).toEqual([]);
  });
});
