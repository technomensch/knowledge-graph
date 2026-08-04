import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("readConfig legacy-path reconciliation", () => {
  let home: string, legacyPath: string, primaryPath: string;
  let originalConfigPath: string | undefined;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-reconcile-"));
    legacyPath = path.join(home, ".claude", "kg-config.json");
    primaryPath = path.join(home, ".kmgraph", "kg-config.json");
    fs.mkdirSync(path.dirname(legacyPath), { recursive: true });
    originalConfigPath = process.env.KG_CONFIG_PATH;
    delete process.env.KG_CONFIG_PATH; // exercise the real default-path branch, not the override
    process.env.HOME = home;
    jest.resetModules();
  });

  afterEach(() => {
    if (originalConfigPath !== undefined) process.env.KG_CONFIG_PATH = originalConfigPath;
    fs.rmSync(home, { recursive: true, force: true });
    jest.dontMock("os");
    jest.resetModules();
  });

  // os.homedir() reads the real OS-level environment via the native binding,
  // not Jest's JS-level process.env — setting process.env.HOME alone does not
  // redirect it here (confirmed: unrelated real files were nearly touched
  // during TDD without this mock).
  function loadUtils() {
    jest.doMock("os", () => ({
      ...jest.requireActual("os"),
      homedir: () => home,
    }));
    const utils = require("../src/utils.js") as typeof import("../src/utils.js");
    jest.dontMock("os");
    return utils;
  }

  it("writes the legacy file's content forward to the primary path on first read", () => {
    fs.writeFileSync(legacyPath, JSON.stringify({ version: "1.0.0", active: "x", graphs: {}, sanitization: { enabled: false, patterns: [], action: "warn" } }));
    const utils = loadUtils();
    const result = utils.readConfig();
    expect(result.version).toBe("1.0.0");
    expect(fs.existsSync(primaryPath)).toBe(true);
  });

  it("does not re-read the legacy file once the primary path exists (single source of truth)", () => {
    fs.writeFileSync(legacyPath, JSON.stringify({ version: "1.0.0", active: "old", graphs: {}, sanitization: { enabled: false, patterns: [], action: "warn" } }));
    const utils = loadUtils();
    utils.readConfig(); // triggers reconciliation, primary now exists
    // Mutate the legacy file directly — a correctly-reconciled readConfig must ignore it now.
    fs.writeFileSync(legacyPath, JSON.stringify({ version: "1.0.0", active: "new-and-wrong", graphs: {}, sanitization: { enabled: false, patterns: [], action: "warn" } }));
    const second = utils.readConfig();
    expect((second as any).active).toBe("old"); // read from primary, not the mutated legacy file
  });

  it("leaves the legacy file on disk untouched (deletion is Task 8.1's job, not this one's)", () => {
    fs.writeFileSync(legacyPath, JSON.stringify({ version: "1.0.0", active: "x", graphs: {}, sanitization: { enabled: false, patterns: [], action: "warn" } }));
    const utils = loadUtils();
    utils.readConfig();
    expect(fs.existsSync(legacyPath)).toBe(true);
  });
});
