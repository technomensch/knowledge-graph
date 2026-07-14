import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// End-to-end: this file deliberately does NOT mock ../src/utils.js, so handleUpgrade()
// exercises the real readConfig(). It proves the config-location migration is reachable:
// a user whose only config lives at the legacy ~/.claude/kg-config.json path must no
// longer hit "No active knowledge graph configured" before the migration check runs.

describe("handleUpgrade with config only at legacy ~/.claude path (integration)", () => {
  const ORIGINAL_ENV = process.env.KG_CONFIG_PATH;
  const ORIGINAL_HOME = process.env.HOME;
  const tempDirs: string[] = [];

  function makeTempDir(prefix: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `upgrade-legacy-${prefix}-`));
    tempDirs.push(dir);
    return dir;
  }

  function scaffoldKg(root: string): void {
    for (const dir of ["templates", "lessons-learned", "decisions", "sessions", "chat-history", "tmp"]) {
      fs.mkdirSync(path.join(root, dir), { recursive: true });
    }
  }

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) delete process.env.KG_CONFIG_PATH;
    else process.env.KG_CONFIG_PATH = ORIGINAL_ENV;
    if (ORIGINAL_HOME === undefined) delete process.env.HOME;
    else process.env.HOME = ORIGINAL_HOME;
    for (const dir of tempDirs) {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
    }
    tempDirs.length = 0;
    jest.resetModules();
  });

  it("does NOT return 'No active knowledge graph configured' when config is only at the legacy path", async () => {
    const home = makeTempDir("home");
    const kgRoot = makeTempDir("kg");
    scaffoldKg(kgRoot);

    // Default resolution path (no KG_CONFIG_PATH override): CONFIG_PATH resolves to
    // $HOME/.kmgraph/kg-config.json (does not exist) → read-only legacy fallback applies.
    // The legacy fallback only fires when KG_CONFIG_PATH is unset, matching
    // checkConfigLocation()/applyConfigLocation() which skip legacy logic when it is set.
    delete process.env.KG_CONFIG_PATH;
    process.env.HOME = home;

    // Only the legacy config exists, with a valid active KG.
    const legacyDir = path.join(home, ".claude");
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(
      path.join(legacyDir, "kg-config.json"),
      JSON.stringify({
        version: "1.0.0",
        active: "legacy-kg",
        graphs: {
          "legacy-kg": {
            name: "legacy-kg",
            path: kgRoot,
            type: "project-local",
            categories: [],
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString(),
            platforms: [],
            autoSwitch: false,
            notification: "none",
          },
        },
        sanitization: { enabled: false, patterns: [], action: "warn" },
      }),
      "utf-8"
    );

    // Under jest, os.homedir() ignores $HOME (returns the real home), so mock it to
    // the temp home. That keeps readConfig()'s CONFIG_PATH (which uses raw os.homedir())
    // under the temp tree so the real dev-machine config cannot leak in and the
    // read-only legacy fallback (only active when KG_CONFIG_PATH is unset) fires.
    jest.resetModules();
    jest.doMock("os", () => ({ ...jest.requireActual("os"), homedir: () => home }));
    const { handleUpgrade } = require("../src/tools/upgrade.js") as typeof import("../src/tools/upgrade.js");
    jest.dontMock("os");

    const result = await handleUpgrade({});

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).not.toContain("No active knowledge graph configured");
    // Inspect output is JSON; the active KG resolved so we get an upgrades/warnings report.
    const parsed = JSON.parse(result.content[0].text);
    expect(Array.isArray(parsed.upgrades)).toBe(true);
  });
});
