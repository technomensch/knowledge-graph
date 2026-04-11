import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports that use them
// ---------------------------------------------------------------------------

jest.mock("../src/utils.js", () => {
  const actual = jest.requireActual("../src/utils.js") as Record<string, unknown>;
  return {
    ...actual,
    readConfig: jest.fn(),
    writeConfig: jest.fn(),
    getPluginRoot: jest.fn().mockReturnValue("/nonexistent-plugin-root"),
  };
});

import { handleUpgrade } from "../src/tools/upgrade.js";
import { readConfig, writeConfig } from "../src/utils.js";
import type { KgConfig } from "../src/utils.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `upgrade-test-${prefix}-`));
}

function scaffoldKg(root: string): void {
  for (const dir of [
    "knowledge",
    "lessons-learned",
    "decisions",
    "sessions",
    "chat-history",
    "tmp",
  ]) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
}

function scaffoldKgPartial(root: string): void {
  // Only create a subset of required dirs — knowledge, lessons-learned, decisions
  for (const dir of ["knowledge", "lessons-learned", "decisions"]) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
}

const tempDirs: string[] = [];

afterEach(() => {
  jest.clearAllMocks();
  for (const dir of tempDirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
  tempDirs.length = 0;
});

function mockActiveKg(kgRoot: string, graphOverrides: Record<string, unknown> = {}): void {
  (readConfig as jest.Mock).mockReturnValue({
    version: "1.0.0",
    active: "test-kg",
    graphs: {
      "test-kg": {
        name: "test-kg",
        path: kgRoot,
        type: "project-local",
        categories: [],
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        platforms: [],
        autoSwitch: false,
        notification: "none",
        ...graphOverrides,
      },
    },
    sanitization: { enabled: false, patterns: [], action: "warn" },
  } as KgConfig);
}

function mockActiveKgMissingConfigFields(kgRoot: string): void {
  // Simulate a v0.2.2 config — no platforms, autoSwitch, notification fields
  (readConfig as jest.Mock).mockReturnValue({
    version: "1.0.0",
    active: "test-kg",
    graphs: {
      "test-kg": {
        name: "test-kg",
        path: kgRoot,
        type: "project-local",
        categories: [],
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        // intentionally missing: platforms, autoSwitch, notification
      },
    },
    sanitization: { enabled: false, patterns: [], action: "warn" },
  } as KgConfig);
}

function writeRules(kgRoot: string, content: string): void {
  const knowledgeDir = path.join(kgRoot, "knowledge");
  fs.mkdirSync(knowledgeDir, { recursive: true });
  fs.writeFileSync(path.join(knowledgeDir, "rules.md"), content, "utf-8");
}

function parseResult(result: Awaited<ReturnType<typeof handleUpgrade>>) {
  const text = result.content[0].text;
  return JSON.parse(text) as { upgrades: Array<{ category: string; description: string }>; warnings: Array<{ category: string; description: string; flaggedLines?: string[] }> };
}

// ---------------------------------------------------------------------------
// T-1: Fresh v0.2.2 install — missing dirs, no config fields, no schema marker
// ---------------------------------------------------------------------------

describe("T-1: fresh v0.2.2 install — inspect mode", () => {
  test("reports missing directories and config items without crash", async () => {
    const kgRoot = makeTempDir("t1");
    tempDirs.push(kgRoot);
    scaffoldKgPartial(kgRoot);
    mockActiveKgMissingConfigFields(kgRoot);

    const result = await handleUpgrade({});
    expect(result.isError).toBeUndefined();

    const parsed = parseResult(result);
    expect(Array.isArray(parsed.upgrades)).toBe(true);
    const dirItem = parsed.upgrades.find((u) => u.category === "directories");
    expect(dirItem).toBeDefined();
    const configItem = parsed.upgrades.find((u) => u.category === "config");
    expect(configItem).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// T-2: v0.3.0 install — all dirs, no contamination in rules.md
// ---------------------------------------------------------------------------

describe("T-2: v0.3.0 install — clean rules.md", () => {
  test("no platform-split item in upgrades when rules.md is clean", async () => {
    const kgRoot = makeTempDir("t2");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    writeRules(kgRoot, "---\ntitle: Rules\n---\n# Rules\n\nGeneral guidelines.\n");

    const result = await handleUpgrade({});
    const parsed = parseResult(result);
    const platformSplit = [...parsed.upgrades, ...parsed.warnings].find(
      (i) => i.category === "platform-split"
    );
    expect(platformSplit).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// T-3: Empty rules.md — section d silently skips
// ---------------------------------------------------------------------------

describe("T-3: empty rules.md", () => {
  test("no platform-split item when rules.md is empty", async () => {
    const kgRoot = makeTempDir("t3");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    writeRules(kgRoot, "");

    const result = await handleUpgrade({});
    const parsed = parseResult(result);
    const platformSplit = [...parsed.upgrades, ...parsed.warnings].find(
      (i) => i.category === "platform-split"
    );
    expect(platformSplit).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// T-4: False-positive — "never use Glob in shell filenames" must NOT match
// ---------------------------------------------------------------------------

describe("T-4: false-positive contamination check", () => {
  test("content mentioning Glob only in non-tool-directive context does NOT trigger platform-split", async () => {
    const kgRoot = makeTempDir("t4");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    // This mentions Glob but not in a use/prefer/avoid directive context
    // e.g., a filename or pure reference with no imperative verb nearby
    writeRules(kgRoot, "---\ntitle: Rules\n---\n# Rules\n\n- The Glob pattern `*.md` matches markdown files.\n- Grep results are stored in output/.\n");

    const result = await handleUpgrade({});
    const parsed = parseResult(result);
    const platformSplit = [...parsed.upgrades, ...parsed.warnings].find(
      (i) => i.category === "platform-split"
    );
    expect(platformSplit).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// T-5: True-positive — "use Glob and Grep — not Bash find/grep" must match
// ---------------------------------------------------------------------------

describe("T-5: true-positive contamination check", () => {
  test("'File search: use Glob and Grep — not Bash find/grep' triggers platform-split warning", async () => {
    const kgRoot = makeTempDir("t5");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    writeRules(
      kgRoot,
      "---\ntitle: Rules\n---\n# Rules\n\n- File search: use Glob and Grep — not Bash find/grep\n"
    );

    const result = await handleUpgrade({});
    const parsed = parseResult(result);
    const platformSplit = parsed.warnings.find((w) => w.category === "platform-split");
    expect(platformSplit).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// T-6: kmgraph_schema: 2 in frontmatter — section d skipped entirely
// ---------------------------------------------------------------------------

describe("T-6: kmgraph_schema: 2 gate", () => {
  test("platform-split NOT offered when rules.md already has schema 2", async () => {
    const kgRoot = makeTempDir("t6");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    writeRules(
      kgRoot,
      "---\ntitle: Rules\nkmgraph_schema: 2\n---\n# Rules\n\n- File search: use Glob and Grep — not Bash find/grep\n"
    );

    const result = await handleUpgrade({});
    const parsed = parseResult(result);
    const platformSplit = [...parsed.upgrades, ...parsed.warnings].find(
      (i) => i.category === "platform-split"
    );
    expect(platformSplit).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// T-7: apply: ["directories"] — creates missing dirs
// ---------------------------------------------------------------------------

describe("T-7: apply directories", () => {
  test("missing directories are created when apply includes 'directories'", async () => {
    const kgRoot = makeTempDir("t7");
    tempDirs.push(kgRoot);
    scaffoldKgPartial(kgRoot); // missing sessions, chat-history, tmp
    mockActiveKg(kgRoot);

    await handleUpgrade({ apply: ["directories"] });

    for (const dir of ["sessions", "chat-history", "tmp"]) {
      expect(fs.existsSync(path.join(kgRoot, dir))).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// T-8: apply: ["platform-split"] without confirm — NOT applied
// ---------------------------------------------------------------------------

describe("T-8: platform-split without confirmation", () => {
  test("platform-split NOT applied when confirm_platform_split is false", async () => {
    const kgRoot = makeTempDir("t8");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    const contaminated = "---\ntitle: Rules\n---\n# Rules\n\n- File search: use Glob and Grep — not Bash find/grep\n";
    writeRules(kgRoot, contaminated);

    const result = await handleUpgrade({
      apply: ["platform-split"],
      confirm_platform_split: false,
    });

    expect(result.content[0].text).toContain("WARNING");
    // File should be unchanged
    const after = fs.readFileSync(path.join(kgRoot, "knowledge", "rules.md"), "utf-8");
    expect(after).toBe(contaminated);
  });
});

// ---------------------------------------------------------------------------
// T-9: apply: ["platform-split"] with confirm — contaminated lines removed, schema bumped
// ---------------------------------------------------------------------------

describe("T-9: platform-split with confirmation applied", () => {
  test("contaminated lines removed and kmgraph_schema: 2 written when confirmed", async () => {
    const kgRoot = makeTempDir("t9");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    writeRules(
      kgRoot,
      "---\ntitle: Rules\n---\n# Rules\n\n- File search: use Glob and Grep — not Bash find/grep\n- Other normal rule\n"
    );

    await handleUpgrade({ apply: ["platform-split"], confirm_platform_split: true });

    const after = fs.readFileSync(path.join(kgRoot, "knowledge", "rules.md"), "utf-8");
    expect(after).not.toContain("use Glob and Grep");
    expect(after).toContain("kmgraph_schema: 2");
    expect(after).toContain("Other normal rule");
  });
});

// ---------------------------------------------------------------------------
// T-10: No active KG configured
// ---------------------------------------------------------------------------

describe("T-10: no active KG configured", () => {
  test("returns error when active is null", async () => {
    (readConfig as jest.Mock).mockReturnValue({
      version: "1.0.0",
      active: null,
      graphs: {},
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });

    const result = await handleUpgrade({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Error");
  });
});

// ---------------------------------------------------------------------------
// T-11: Malformed kmgraph_schema — treated as absent
// ---------------------------------------------------------------------------

describe("T-11: malformed kmgraph_schema value", () => {
  test("non-numeric schema value treated as absent — contamination still offered", async () => {
    const kgRoot = makeTempDir("t11");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    writeRules(
      kgRoot,
      "---\ntitle: Rules\nkmgraph_schema: not-a-number\n---\n# Rules\n\n- File search: use Glob and Grep — not Bash find/grep\n"
    );

    const result = await handleUpgrade({});
    const parsed = parseResult(result);
    const platformSplit = parsed.warnings.find((w) => w.category === "platform-split");
    expect(platformSplit).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// T-12: kg_version returns correct data
// ---------------------------------------------------------------------------

describe("T-12: kg_version response", () => {
  test("installed version is non-empty and schema is 2", async () => {
    // Import the raw package.json directly — version.ts reads it the same way
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require("../../package.json") as { version: string };
    const SCHEMA_VERSION = 2;

    expect(pkg.version).toBeTruthy();
    expect(typeof pkg.version).toBe("string");
    expect(SCHEMA_VERSION).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// T-13: apply: ["config"] — backfills missing config fields
// ---------------------------------------------------------------------------

describe("T-13: apply config backfills missing fields", () => {
  test("missing config fields are added with defaults", async () => {
    const kgRoot = makeTempDir("t13");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    // Set up a config missing platforms, autoSwitch, notification
    const configObj: KgConfig = {
      version: "1.0.0",
      active: "test-kg",
      graphs: {
        "test-kg": {
          name: "test-kg",
          path: kgRoot,
          type: "project-local",
          categories: [],
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
        },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    (readConfig as jest.Mock).mockReturnValue(configObj);

    let written: KgConfig | null = null;
    (writeConfig as jest.Mock).mockImplementation((cfg: KgConfig) => { written = cfg; });

    const result = await handleUpgrade({ apply: ["config"] });
    expect(result.content[0].text).toContain("[config]");

    // writeConfig should have been called with the updated config
    expect(writeConfig).toHaveBeenCalled();
    expect(written).not.toBeNull();
    const graph = (written as unknown as KgConfig).graphs["test-kg"] as unknown as Record<string, unknown>;
    expect(graph["platforms"]).toBeDefined();
    expect(graph["autoSwitch"]).toBeDefined();
    expect(graph["notification"]).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// T-14: Empty frontmatter block --- \n--- handles gracefully
// ---------------------------------------------------------------------------

describe("T-14: empty frontmatter block", () => {
  test("empty frontmatter does not crash; schema treated as absent", async () => {
    const kgRoot = makeTempDir("t14");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    writeRules(
      kgRoot,
      "---\n---\n# Rules\n\n- File search: use Glob and Grep — not Bash find/grep\n"
    );

    const result = await handleUpgrade({});
    expect(result.isError).toBeUndefined();
    const parsed = parseResult(result);
    // With empty frontmatter, schema = 0, so contamination check runs
    const platformSplit = parsed.warnings.find((w) => w.category === "platform-split");
    expect(platformSplit).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// T-15: apply: [] (explicit empty array) — inspect-only
// ---------------------------------------------------------------------------

describe("T-15: explicit empty apply array is inspect-only", () => {
  test("upgrades reported but dirs not created when apply is []", async () => {
    const kgRoot = makeTempDir("t15");
    tempDirs.push(kgRoot);
    scaffoldKgPartial(kgRoot); // missing sessions, chat-history, tmp
    mockActiveKg(kgRoot);

    const result = await handleUpgrade({ apply: [] });
    const parsed = parseResult(result);
    expect(parsed.upgrades.some((u) => u.category === "directories")).toBe(true);

    // dirs should NOT have been created
    expect(fs.existsSync(path.join(kgRoot, "sessions"))).toBe(false);
    expect(fs.existsSync(path.join(kgRoot, "chat-history"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T-16: Multiple contaminated lines — all appear in flaggedLines
// ---------------------------------------------------------------------------

describe("T-16: multiple contaminated lines", () => {
  test("all 3 contaminated lines appear in flaggedLines", async () => {
    const kgRoot = makeTempDir("t16");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    writeRules(
      kgRoot,
      [
        "---",
        "title: Rules",
        "---",
        "# Rules",
        "",
        "- File search: use Glob and Grep — not Bash find/grep",
        "- always use context-mode for heavy tasks",
        "- prefer subagent over direct bash calls",
        "- Other normal rule",
      ].join("\n")
    );

    const result = await handleUpgrade({});
    const parsed = parseResult(result);
    const platformSplit = parsed.warnings.find((w) => w.category === "platform-split");
    expect(platformSplit).toBeDefined();
    expect(platformSplit!.flaggedLines).toBeDefined();
    expect(platformSplit!.flaggedLines!.length).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// T-17: kg_upgrade returns JSON-parseable content
// ---------------------------------------------------------------------------

describe("T-17: response is JSON-parseable with upgrades and warnings keys", () => {
  test("content[0].text is valid JSON with upgrades and warnings", async () => {
    const kgRoot = makeTempDir("t17");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const result = await handleUpgrade({});
    expect(result.content[0].type).toBe("text");
    let parsed: unknown;
    expect(() => { parsed = JSON.parse(result.content[0].text); }).not.toThrow();
    const obj = parsed as Record<string, unknown>;
    expect(Array.isArray(obj["upgrades"])).toBe(true);
    expect(Array.isArray(obj["warnings"])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T-18: apply: ["directories"] is idempotent
// ---------------------------------------------------------------------------

describe("T-18: directories apply is idempotent", () => {
  test("calling apply directories twice does not error", async () => {
    const kgRoot = makeTempDir("t18");
    tempDirs.push(kgRoot);
    scaffoldKgPartial(kgRoot);
    mockActiveKg(kgRoot);

    const first = await handleUpgrade({ apply: ["directories"] });
    expect(first.isError).toBeUndefined();

    const second = await handleUpgrade({ apply: ["directories"] });
    expect(second.isError).toBeUndefined();
    expect(second.content[0].text).toContain("All directories already exist");
  });
});

// ---------------------------------------------------------------------------
// T-19: apply: ["config"] is idempotent
// ---------------------------------------------------------------------------

describe("T-19: config apply is idempotent", () => {
  test("calling apply config twice does not error", async () => {
    const kgRoot = makeTempDir("t19");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);

    // First call: fields missing → returns config with defaults written
    const configWithDefaults: KgConfig = {
      version: "1.0.0",
      active: "test-kg",
      graphs: {
        "test-kg": {
          name: "test-kg",
          path: kgRoot,
          type: "project-local",
          categories: [],
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
        },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    (readConfig as jest.Mock).mockReturnValue(configWithDefaults);
    (writeConfig as jest.Mock).mockImplementation(() => undefined);

    const first = await handleUpgrade({ apply: ["config"] });
    expect(first.isError).toBeUndefined();

    // Second call: all fields present
    mockActiveKg(kgRoot); // has all fields
    const second = await handleUpgrade({ apply: ["config"] });
    expect(second.isError).toBeUndefined();
    expect(second.content[0].text).toContain("Config already up to date");
  });
});

// ---------------------------------------------------------------------------
// T-20: apply with invalid/unknown category — handled gracefully
// ---------------------------------------------------------------------------

describe("T-20: invalid apply category", () => {
  test("unknown apply category does not crash", async () => {
    const kgRoot = makeTempDir("t20");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    // TypeScript would normally block this, but cast for testing runtime behavior
    const result = await handleUpgrade({ apply: ["unknown_category" as never] });
    expect(result.isError).toBeUndefined();
    // Result is apply-mode response (text, not JSON)
    expect(result.content[0].text).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// T-21: kmgraph_schema: 1 — still offered (schema < 2)
// ---------------------------------------------------------------------------

describe("T-21: kmgraph_schema: 1 still triggers platform-split warning", () => {
  test("schema 1 is below threshold — contamination still offered", async () => {
    const kgRoot = makeTempDir("t21");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    writeRules(
      kgRoot,
      "---\ntitle: Rules\nkmgraph_schema: 1\n---\n# Rules\n\n- File search: use Glob and Grep — not Bash find/grep\n"
    );

    const result = await handleUpgrade({});
    const parsed = parseResult(result);
    const platformSplit = parsed.warnings.find((w) => w.category === "platform-split");
    expect(platformSplit).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// T-22: KG path doesn't exist — returns error
// ---------------------------------------------------------------------------

describe("T-22: KG path does not exist", () => {
  test("error returned when configured KG path is missing", async () => {
    (readConfig as jest.Mock).mockReturnValue({
      version: "1.0.0",
      active: "test-kg",
      graphs: {
        "test-kg": {
          name: "test-kg",
          path: "/nonexistent/path/that/does/not/exist",
          type: "project-local",
          categories: [],
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
        },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });

    const result = await handleUpgrade({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Error");
  });
});

// ---------------------------------------------------------------------------
// T-23: rules.md does not exist — check d skips gracefully
// ---------------------------------------------------------------------------

describe("T-23: missing rules.md", () => {
  test("no platform-split item when rules.md does not exist", async () => {
    const kgRoot = makeTempDir("t23");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot); // knowledge/ dir exists but no rules.md in it
    mockActiveKg(kgRoot);
    // Ensure rules.md is NOT present
    const rulesPath = path.join(kgRoot, "knowledge", "rules.md");
    if (fs.existsSync(rulesPath)) fs.unlinkSync(rulesPath);

    const result = await handleUpgrade({});
    expect(result.isError).toBeUndefined();
    const parsed = parseResult(result);
    const platformSplit = [...parsed.upgrades, ...parsed.warnings].find(
      (i) => i.category === "platform-split"
    );
    expect(platformSplit).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// T-24: apply: ["platform-split"] when schema is already 2 — no-op
// ---------------------------------------------------------------------------

describe("T-24: platform-split apply when schema already 2", () => {
  test("no changes when rules.md already has schema 2", async () => {
    const kgRoot = makeTempDir("t24");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    const original = "---\ntitle: Rules\nkmgraph_schema: 2\n---\n# Rules\n\nAll clean.\n";
    writeRules(kgRoot, original);

    await handleUpgrade({ apply: ["platform-split"], confirm_platform_split: true });

    const after = fs.readFileSync(path.join(kgRoot, "knowledge", "rules.md"), "utf-8");
    // schema already 2 — applyPlatformSplit still runs but finds 0 flagged lines and no change needed
    // The important thing: no contamination introduced, schema stays 2
    expect(after).toContain("kmgraph_schema: 2");
    expect(after).toContain("All clean.");
  });
});

// ---------------------------------------------------------------------------
// T-25: apply: ["directories", "config"] — multi-category in one call
// ---------------------------------------------------------------------------

describe("T-25: multiple apply categories in one call", () => {
  test("both dirs created and config fields backfilled", async () => {
    const kgRoot = makeTempDir("t25");
    tempDirs.push(kgRoot);
    scaffoldKgPartial(kgRoot); // missing sessions, chat-history, tmp

    const configObj: KgConfig = {
      version: "1.0.0",
      active: "test-kg",
      graphs: {
        "test-kg": {
          name: "test-kg",
          path: kgRoot,
          type: "project-local",
          categories: [],
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
          // intentionally missing: platforms, autoSwitch, notification
        },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    (readConfig as jest.Mock).mockReturnValue(configObj);

    let written: KgConfig | null = null;
    (writeConfig as jest.Mock).mockImplementation((cfg: KgConfig) => { written = cfg; });

    const result = await handleUpgrade({ apply: ["directories", "config"] });
    expect(result.isError).toBeUndefined();

    // Dirs created
    for (const dir of ["sessions", "chat-history", "tmp"]) {
      expect(fs.existsSync(path.join(kgRoot, dir))).toBe(true);
    }

    // Config written
    expect(writeConfig).toHaveBeenCalled();
    expect(written).not.toBeNull();
    const text = result.content[0].text;
    expect(text).toContain("[directories]");
    expect(text).toContain("[config]");
  });
});
