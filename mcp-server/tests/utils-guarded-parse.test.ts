import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("readConfig guarded parse", () => {
  let dir: string;
  let originalConfigPath: string | undefined;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "guarded-parse-"));
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

  it("throws an error naming the file path when the config is truncated/invalid JSON", () => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(process.env.KG_CONFIG_PATH!, '{"version": "1.0.0", "graphs": {'); // truncated
    const { readConfig } = require("../src/utils.js") as typeof import("../src/utils.js");
    expect(() => readConfig()).toThrow(process.env.KG_CONFIG_PATH!);
  });
});
