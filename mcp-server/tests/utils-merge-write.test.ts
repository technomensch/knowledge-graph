import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("updateConfig merge-on-conflict", () => {
  let dir: string;
  let originalConfigPath: string | undefined;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "merge-write-"));
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

  it("preserves a disjoint concurrent write: session A registers X, session B archives Y", () => {
    const { writeConfig, updateConfig } = require("../src/utils.js") as typeof import("../src/utils.js");
    writeConfig({
      version: "1.0.0",
      graphs: {
        y: { name: "y", path: "/y", type: "project-local", categories: [], createdAt: "x", status: "active", statusChangedAt: "x", graphId: "id-y" },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });

    updateConfig((config) => {
      // Simulate "session B" landing on disk mid-flight, after A already read.
      const onDisk = { ...config };
      onDisk.graphs.y.status = "archived";
      fs.writeFileSync(process.env.KG_CONFIG_PATH!, JSON.stringify(onDisk, null, 2));

      // "session A" mutates a disjoint key.
      config.graphs.x = { name: "x", path: "/x", type: "project-local", categories: [], createdAt: "x", status: "active", statusChangedAt: "x", graphId: "id-x" };
      return config;
    });

    const final = JSON.parse(fs.readFileSync(process.env.KG_CONFIG_PATH!, "utf-8"));
    expect(final.graphs.x).toBeDefined();
    expect(final.graphs.y.status).toBe("archived");
  });

  it("intentful writes throw a clear error after exhausting retries on a genuinely contested key", () => {
    const { writeConfig, updateConfig } = require("../src/utils.js") as typeof import("../src/utils.js");
    writeConfig({
      version: "1.0.0",
      graphs: { x: { name: "x", path: "/x", type: "project-local", categories: [], createdAt: "x", status: "active", statusChangedAt: "x", graphId: "id-x" } },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });

    expect(() =>
      updateConfig(
        (config) => {
          // Every attempt, something else rewrites the SAME key A is touching.
          const onDisk = { ...config };
          onDisk.graphs.x.status = "archived";
          fs.writeFileSync(process.env.KG_CONFIG_PATH!, JSON.stringify(onDisk, null, 2));
          config.graphs.x.status = "deleted";
          return config;
        },
        { intentful: true }
      )
    ).toThrow();
  });

  it("non-intentful writes silently skip (no throw) after a conflict on the same key", () => {
    const { writeConfig, updateConfig } = require("../src/utils.js") as typeof import("../src/utils.js");
    writeConfig({
      version: "1.0.0",
      graphs: { x: { name: "x", path: "/x", type: "project-local", categories: [], createdAt: "x", status: "active", statusChangedAt: "x", graphId: "id-x" } },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });

    expect(() =>
      updateConfig(
        (config) => {
          const onDisk = { ...config };
          onDisk.graphs.x.statusChangedAt = "conflicting-write";
          fs.writeFileSync(process.env.KG_CONFIG_PATH!, JSON.stringify(onDisk, null, 2));
          config.graphs.x.statusChangedAt = "bookkeeping-write";
          return config;
        },
        { intentful: false }
      )
    ).not.toThrow();
  });

  it("preserves a disjoint concurrent top-level change (sanitization) alongside a graphs write", () => {
    // findings doc #7: mergeGraphs must not silently drop changes outside `.graphs`.
    const { writeConfig, updateConfig } = require("../src/utils.js") as typeof import("../src/utils.js");
    writeConfig({
      version: "1.0.0",
      graphs: {},
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });

    updateConfig((config) => {
      // "session B" lands a concurrent, disjoint top-level edit mid-flight.
      const onDisk = { ...config };
      onDisk.sanitization = { enabled: true, patterns: ["secret"], action: "block" } as any;
      fs.writeFileSync(process.env.KG_CONFIG_PATH!, JSON.stringify(onDisk, null, 2));

      // "session A" mutates a disjoint key (`graphs`, not `sanitization`).
      config.graphs.x = { name: "x", path: "/x", type: "project-local", categories: [], createdAt: "x", status: "active", statusChangedAt: "x", graphId: "id-x" };
      return config;
    });

    const final = JSON.parse(fs.readFileSync(process.env.KG_CONFIG_PATH!, "utf-8"));
    expect(final.graphs.x).toBeDefined();
    expect(final.sanitization.enabled).toBe(true);
    expect(final.sanitization.action).toBe("block");
  });

  it("mutator purity: a mutator that mints an id outside the closure doesn't re-mint on retry", () => {
    // findings doc #8: minting must happen once, before updateConfig, not
    // inside the mutator — otherwise a retry re-runs the mint.
    const { writeConfig, updateConfig } = require("../src/utils.js") as typeof import("../src/utils.js");
    writeConfig({
      version: "1.0.0",
      graphs: { x: { name: "x", path: "/x", type: "project-local", categories: [], createdAt: "x", status: "active", statusChangedAt: "x", graphId: "id-x" } },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });

    let mintCount = 0;
    const mintedIdOnce = `minted-${++mintCount}`; // minted exactly once, outside the mutator
    let attempts = 0;

    updateConfig((config) => {
      attempts++;
      if (attempts === 1) {
        // Force one retry by landing a concurrent disjoint change.
        const onDisk = { ...config };
        onDisk.graphs.y = { name: "y", path: "/y", type: "project-local", categories: [], createdAt: "x", status: "active", statusChangedAt: "x", graphId: "id-y" };
        fs.writeFileSync(process.env.KG_CONFIG_PATH!, JSON.stringify(onDisk, null, 2));
      }
      config.graphs.z = { name: "z", path: "/z", type: "project-local", categories: [], createdAt: "x", status: "active", statusChangedAt: "x", graphId: mintedIdOnce };
      return config;
    });

    expect(mintCount).toBe(1); // the id was minted exactly once, regardless of how many mutator retries ran
    const final = JSON.parse(fs.readFileSync(process.env.KG_CONFIG_PATH!, "utf-8"));
    expect(final.graphs.z.graphId).toBe(mintedIdOnce);
    expect(final.graphs.y).toBeDefined(); // the concurrent disjoint write also survived
  });
});
