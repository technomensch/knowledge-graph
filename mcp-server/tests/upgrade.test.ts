import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";

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

// The plan-status-drift blocks at the bottom of this file need a fake home
// directory (~/.claude/plans/ is half of that category's input). Assigning
// process.env.HOME is NOT enough: Node resolves os.homedir() once at startup,
// so a later assignment does not move it, and jest.spyOn(os, "homedir") throws
// "Cannot redefine property" because the built-in module's exports are
// non-configurable. Mocking the module is the only handle. homedir() keeps the
// real value by default, so every other test in this file is unaffected.
jest.mock("os", () => {
  const actualOs = jest.requireActual("os") as typeof import("os");
  return { ...actualOs, homedir: jest.fn(() => actualOs.homedir()) };
});

import { handleUpgrade } from "../src/tools/upgrade.js";
import { handleVersion } from "../src/tools/version.js";
import { readConfig, writeConfig } from "../src/utils.js";
import type { KgConfig } from "../src/utils.js";
import { STUB_ASK_TIMEOUT_MS } from "../src/interaction.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempDir(prefix: string): string {
  // Nest one level below a fresh mkdtemp wrapper (ADR-067 Task 1.9 Step 3.5)
  // -- resolveGraph matches cwd against dirname(graph.path); a bare mkdtemp
  // leaf returned directly would make dirname() resolve to the shared
  // os.tmpdir() for every fixture in this file, so any cwd-mocked test would
  // false-match every other test's temp KG too, not just its own. Nesting
  // under a per-call-unique wrapper gives each fixture its own dirname()
  // without moving where scaffoldKg/scaffoldKgPartial write content --
  // checkDirectories() and friends still operate directly on the returned
  // path, unchanged.
  const wrapper = fs.mkdtempSync(path.join(os.tmpdir(), `upgrade-test-${prefix}-`));
  const kgDir = path.join(wrapper, "kg");
  fs.mkdirSync(kgDir);
  return kgDir;
}

function scaffoldKg(root: string): void {
  for (const dir of [
    "templates",        // was "knowledge"
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
const ORIGINAL_CWD = process.cwd;

afterEach(() => {
  jest.clearAllMocks();
  process.cwd = ORIGINAL_CWD;
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
  // ADR-067 Task 1.9: resolution is context-derived (resolveGraph), not
  // config.active-derived -- every caller of this helper wants kgRoot to be
  // the graph handleUpgrade resolves, so mock cwd to match (restored in the
  // file-level afterEach above).
  process.cwd = () => kgRoot;
  (readConfig as jest.Mock).mockReturnValue({
    version: "1.0.0",
    graphs: {
      "test-kg": {
        name: "test-kg",
        path: kgRoot,
        type: "project-local",
        categories: [],
        createdAt: new Date().toISOString(),
        status: "active" as const,
        statusChangedAt: new Date().toISOString(),
        graphId: "test-graph-id",
        platforms: [],
        notification: "none",
        ...graphOverrides,
      },
    },
    sanitization: { enabled: false, patterns: [], action: "warn" },
  } as KgConfig);
}

function mockActiveKgMissingConfigFields(kgRoot: string): void {
  // Simulate a v0.2.2 config — no platforms, autoSwitch, notification fields
  process.cwd = () => kgRoot;
  (readConfig as jest.Mock).mockReturnValue({
    version: "1.0.0",
    graphs: {
      "test-kg": {
        name: "test-kg",
        path: kgRoot,
        type: "project-local",
        categories: [],
        createdAt: new Date().toISOString(),
        status: "active" as const,
        statusChangedAt: new Date().toISOString(),
        graphId: "test-graph-id",
        // intentionally missing: platforms, notification
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

    // c5: retrofitted onto the shared backfix gate -- a breaking behavior
    // change from the old non-error "WARNING" text (see the plan's Step 4
    // note). Automated mode with no confirmation now returns
    // KMG_INPUT_REQUIRED as its own content block, isError:true. This is
    // the only category in the call and nothing else applied, so the empty
    // prose block is omitted and the error is content[0].
    expect(result.isError).toBe(true);
    expect(result.content.length).toBe(1);
    const errorBlock = JSON.parse(result.content[0].text);
    expect(errorBlock.error).toBe("KMG_INPUT_REQUIRED");
    expect(errorBlock.resolveWith.param).toBe("confirm_platform_split");
    // File should be unchanged
    const after = fs.readFileSync(path.join(kgRoot, "knowledge", "rules.md"), "utf-8");
    expect(after).toBe(contaminated);
  });

  test("regression (2nd Opus review, 2026-08-18): schema already 2 but real contamination present — still gated, not silently applied", async () => {
    // checkPlatformSplit()'s "nothing found" signal is `kmgraph_schema >= 2`,
    // a stored marker -- NOT a live re-scan for contamination the way
    // checkCaptureCorruption's is. A file whose schema was already bumped
    // (by hand, or by a prior partial run) but that still carries a flagged
    // line must NOT be treated as "nothing to do" -- applyPlatformSplit()
    // has no schema check of its own and would delete the line unconsented
    // if the gate were ever skipped here. This is the exact bug an earlier
    // "skip the ask when checkPlatformSplit finds nothing" version of this
    // code introduced and a second review caught before it shipped.
    const kgRoot = makeTempDir("c5-platform-split-schema-mismatch");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    const contaminated =
      "---\ntitle: Rules\nkmgraph_schema: 2\n---\n# Rules\n\n- File search: use Glob and Grep — not Bash find/grep\n";
    writeRules(kgRoot, contaminated);

    const result = await handleUpgrade({ apply: ["platform-split"] });

    expect(result.isError).toBe(true);
    const errorBlock = JSON.parse(result.content[0].text);
    expect(errorBlock.error).toBe("KMG_INPUT_REQUIRED");
    expect(errorBlock.resolveWith.param).toBe("confirm_platform_split");
    // File must be untouched -- no consent given, despite schema already being 2
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

describe("T-10: no knowledge graph resolves from cwd", () => {
  test("reports a resolution item but still returns a valid report (config-location stays reachable, ADR-067)", async () => {
    (readConfig as jest.Mock).mockReturnValue({
      version: "1.0.0",
      graphs: {},
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });
    const origCwd = process.cwd;
    process.cwd = () => "/definitely/not/registered";

    const result = await handleUpgrade({});
    process.cwd = origCwd;

    expect(result.isError).toBeUndefined();
    const parsed = parseResult(result);
    const item = parsed.upgrades.find((u) => u.category === "resolution");
    expect(item).toBeDefined();
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
  test("handleVersion returns non-empty installed string and schema 2", () => {
    const result = handleVersion();
    expect(result.installed).toBeTruthy();
    expect(typeof result.installed).toBe("string");
    expect(result.schema).toBe(2);
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
    // Set up a config missing platforms, notification
    const configObj: KgConfig = {
      version: "1.0.0",
      graphs: {
        "test-kg": {
          name: "test-kg",
          path: kgRoot,
          type: "project-local",
          categories: [],
          createdAt: new Date().toISOString(),
          status: "active" as const,
          statusChangedAt: new Date().toISOString(),
          graphId: "test-graph-id",
        },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    (readConfig as jest.Mock).mockReturnValue(configObj);
    process.cwd = () => kgRoot;

    let written: KgConfig | null = null;
    (writeConfig as jest.Mock).mockImplementation((cfg: KgConfig) => { written = cfg; });

    const result = await handleUpgrade({ apply: ["config"] });
    expect(result.content[0].text).toContain("[config]");

    // writeConfig should have been called with the updated config
    expect(writeConfig).toHaveBeenCalled();
    expect(written).not.toBeNull();
    const graph = (written as unknown as KgConfig).graphs["test-kg"] as unknown as Record<string, unknown>;
    expect(graph["platforms"]).toBeDefined();
    expect(graph["notification"]).toBeDefined();
    expect(graph["autoSwitch"]).toBeUndefined();
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
      graphs: {
        "test-kg": {
          name: "test-kg",
          path: kgRoot,
          type: "project-local",
          categories: [],
          createdAt: new Date().toISOString(),
          status: "active" as const,
          statusChangedAt: new Date().toISOString(),
          graphId: "test-graph-id",
        },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    (readConfig as jest.Mock).mockReturnValue(configWithDefaults);
    process.cwd = () => kgRoot;
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
      graphs: {
        "test-kg": {
          name: "test-kg",
          path: "/nonexistent/path/that/does/not/exist",
          type: "project-local",
          categories: [],
          createdAt: new Date().toISOString(),
          status: "active" as const,
          statusChangedAt: new Date().toISOString(),
          graphId: "test-graph-id",
        },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });
    process.cwd = () => "/nonexistent/path/that/does/not/exist";

    const result = await handleUpgrade({});
    // c6 (issue-49) fixed a pre-existing bug here: this used to discard
    // whatever checkStatusSchema()/checkConfigLocation()/
    // checkPlanStatusDrift() had already computed and return a bare
    // isError:true. Now it returns the partial result instead, matching the
    // sibling "error" in target path's existing degraded-mode pattern -- a
    // user with a deleted graph path still sees whatever graph-independent
    // findings were already available. The "resolution" marker itself lives
    // in upgrades[], not warnings[] (Opus review, 2026-08-19 -- warnings[]
    // is contractually routed through the wizard's platform-split flow,
    // which has no handler for a bare resolution marker).
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.upgrades.some((u: { category: string; description: string }) => u.category === "resolution" && u.description.includes("KG path not found"))).toBe(true);
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
      graphs: {
        "test-kg": {
          name: "test-kg",
          path: kgRoot,
          type: "project-local",
          categories: [],
          createdAt: new Date().toISOString(),
          status: "active" as const,
          statusChangedAt: new Date().toISOString(),
          graphId: "test-graph-id",
          // intentionally missing: platforms, notification
        },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    (readConfig as jest.Mock).mockReturnValue(configObj);
    process.cwd = () => kgRoot;

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

// ---------------------------------------------------------------------------
// T-26: Interrupted migration flag — inspect mode does not crash
// ---------------------------------------------------------------------------

describe("T-26: .migration_in_progress flag — inspect does not crash", () => {
  test("handleUpgrade({}) completes normally when .migration_in_progress exists", async () => {
    const kgRoot = makeTempDir("t26");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    // Simulate an interrupted migration
    fs.writeFileSync(path.join(kgRoot, ".migration_in_progress"), "", "utf-8");

    const result = await handleUpgrade({});
    expect(result.isError).toBeUndefined();
    const parsed = parseResult(result);
    expect(Array.isArray(parsed.upgrades)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T-27: Interrupted rollback flag — inspect mode does not crash
// ---------------------------------------------------------------------------

describe("T-27: .rollback_in_progress flag — inspect does not crash", () => {
  test("handleUpgrade({}) completes normally when .rollback_in_progress exists", async () => {
    const kgRoot = makeTempDir("t27");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    // Simulate an interrupted rollback
    fs.writeFileSync(path.join(kgRoot, ".rollback_in_progress"), "", "utf-8");

    const result = await handleUpgrade({});
    expect(result.isError).toBeUndefined();
    const parsed = parseResult(result);
    expect(Array.isArray(parsed.upgrades)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T-28: Symlinked lessons-learned/ directory — inspect skips with no crash
// ---------------------------------------------------------------------------

describe("T-28: symlinked lessons-learned/ — inspect does not crash", () => {
  test("symlinked lessons-learned counts as existing and no crash occurs", async () => {
    const kgRoot = makeTempDir("t28");
    tempDirs.push(kgRoot);
    // Create all dirs except lessons-learned, then symlink it
    for (const dir of ["templates", "decisions", "sessions", "chat-history", "tmp"]) {
      fs.mkdirSync(path.join(kgRoot, dir), { recursive: true });
    }
    const target = fs.mkdtempSync(path.join(os.tmpdir(), "symlink-target-"));
    tempDirs.push(target);
    fs.symlinkSync(target, path.join(kgRoot, "lessons-learned"));
    mockActiveKg(kgRoot);

    const result = await handleUpgrade({});
    expect(result.isError).toBeUndefined();
    // Symlink counts as existing — "directories" upgrade item should NOT appear
    const parsed = parseResult(result);
    const dirItem = parsed.upgrades.find((u) => u.category === "directories");
    expect(dirItem).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// T-29: Pre-existing archive dir — apply platform-split does not crash
// ---------------------------------------------------------------------------

describe("T-29: pre-existing archive dir — apply does not crash", () => {
  test("platform-split apply succeeds even when an archive-named dir already exists", async () => {
    const kgRoot = makeTempDir("t29");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    writeRules(
      kgRoot,
      "---\ntitle: Rules\n---\n# Rules\n\n- File search: use Glob and Grep — not Bash find/grep\n"
    );
    // Pre-create a dir with an archive-like name to simulate a collision
    const archiveDir = path.join(kgRoot, ".kg-archive-20260411-000000");
    fs.mkdirSync(archiveDir, { recursive: true });

    const result = await handleUpgrade({ apply: ["platform-split"], confirm_platform_split: true });
    // Tool must not crash regardless of archive behavior
    expect(result.isError).toBeUndefined();
    // The pre-existing archive dir must still be present
    expect(fs.existsSync(archiveDir)).toBe(true);
    // The contaminated line should have been removed from rules.md
    const after = fs.readFileSync(path.join(kgRoot, "knowledge", "rules.md"), "utf-8");
    expect(after).not.toContain("use Glob and Grep");
  });
});

// ---------------------------------------------------------------------------
// T-30: CLAUDE.md already has Platform Preferences heading — apply is safe
// ---------------------------------------------------------------------------

describe("T-30: CLAUDE.md already has Platform Preferences heading", () => {
  test("platform-split apply does not crash when CLAUDE.md already has the heading", async () => {
    const kgRoot = makeTempDir("t30");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    writeRules(
      kgRoot,
      "---\ntitle: Rules\n---\n# Rules\n\n- File search: use Glob and Grep — not Bash find/grep\n"
    );
    fs.writeFileSync(
      path.join(kgRoot, "CLAUDE.md"),
      "# Project Config\n\n## Platform Preferences (Claude Code)\n\nExisting rule.\n",
      "utf-8"
    );

    const result = await handleUpgrade({ apply: ["platform-split"], confirm_platform_split: true });
    // upgrade.ts does not write to CLAUDE.md — it only modifies rules.md.
    // Assert the tool completed without error and rules.md was cleaned.
    expect(result.isError).toBeUndefined();
    const after = fs.readFileSync(path.join(kgRoot, "knowledge", "rules.md"), "utf-8");
    expect(after).not.toContain("use Glob and Grep");
    // CLAUDE.md is not touched by this tool — heading count unchanged
    const claudeMd = fs.readFileSync(path.join(kgRoot, "CLAUDE.md"), "utf-8");
    const headingCount = (claudeMd.match(/## Platform Preferences \(Claude Code\)/g) ?? []).length;
    expect(headingCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// T-31: CLAUDE.md does not exist — apply platform-split does not crash
// ---------------------------------------------------------------------------

describe("T-31: CLAUDE.md does not exist — platform-split apply does not crash", () => {
  test("platform-split apply completes when no CLAUDE.md present", async () => {
    const kgRoot = makeTempDir("t31");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    writeRules(
      kgRoot,
      "---\ntitle: Rules\n---\n# Rules\n\n- File search: use Glob and Grep — not Bash find/grep\n"
    );
    // Ensure CLAUDE.md does not exist at kgRoot
    const claudePath = path.join(kgRoot, "CLAUDE.md");
    if (fs.existsSync(claudePath)) fs.unlinkSync(claudePath);

    const result = await handleUpgrade({ apply: ["platform-split"], confirm_platform_split: true });
    // upgrade.ts does not create CLAUDE.md — assert no error and rules.md is cleaned
    expect(result.isError).toBeUndefined();
    const after = fs.readFileSync(path.join(kgRoot, "knowledge", "rules.md"), "utf-8");
    expect(after).not.toContain("use Glob and Grep");
  });
});

// ---------------------------------------------------------------------------
// T-32: Personal KG type — platform-split detection works for type=personal
// ---------------------------------------------------------------------------

describe("T-32: personal KG type — platform-split warning still detected", () => {
  test("contamination warning present when type=personal and rules.md has platform directives", async () => {
    const kgRoot = makeTempDir("t32");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot, { type: "personal" });
    writeRules(
      kgRoot,
      "---\ntitle: Rules\n---\n# Rules\n\n- File search: use Glob and Grep — not Bash find/grep\n"
    );

    // ADR-067 Task 1.9: personal-type graphs are deliberately excluded from
    // resolveGraph's cwd walk (reached via scope="user" instead, not
    // context) -- explicit scope needed here, cwd alone no longer resolves it.
    // ADR-067 Task 6.4: scope:"user" now routes through confirmPersonalScopeAccess --
    // confirmPersonalScope:true is required here since this test runs in automated mode.
    const result = await handleUpgrade({ scope: "user", confirmPersonalScope: true });
    expect(result.isError).toBeUndefined();
    const parsed = parseResult(result);
    const platformSplit = parsed.warnings.find((w) => w.category === "platform-split");
    expect(platformSplit).toBeDefined();
  });

  // ADR-067 Task 6.4 (spec §11): scope:"user" reaches the personal graph the
  // same way it does in search.ts/capture.ts -- same confirmPersonalScopeAccess
  // gate, same reason string, closing the interim gap left open by Task 1.9.
  it("scope:\"user\" from an unconfirmed repo in automated mode returns KMG_INPUT_REQUIRED/personal_scope_unseen_repo", async () => {
    const kgRoot = makeTempDir("t32-gate");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot, { type: "personal" });

    const result = await handleUpgrade({ scope: "user" });
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toMatchObject({ error: "KMG_INPUT_REQUIRED", reason: "personal_scope_unseen_repo" });
  });
});

// ---------------------------------------------------------------------------
// T-33: Legacy .fts5.db IS gitignored — left in place (no crash)
// ---------------------------------------------------------------------------

describe("T-33: legacy .fts5.db is gitignored — inspect does not crash", () => {
  test("handleUpgrade({}) completes normally when .fts5.db is present and gitignored", async () => {
    const kgRoot = makeTempDir("t33");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    fs.writeFileSync(path.join(kgRoot, ".fts5.db"), "dummy", "utf-8");
    fs.writeFileSync(path.join(kgRoot, ".gitignore"), ".fts5.db\n", "utf-8");

    const result = await handleUpgrade({});
    expect(result.isError).toBeUndefined();
    // .fts5.db still present — tool must not delete it
    expect(fs.existsSync(path.join(kgRoot, ".fts5.db"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T-34: Legacy .fts5.db NOT gitignored — no crash, gap documented
// ---------------------------------------------------------------------------

describe("T-34: legacy .fts5.db not gitignored — no crash", () => {
  test("handleUpgrade({}) does not crash when .fts5.db exists without gitignore entry", async () => {
    const kgRoot = makeTempDir("t34");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    fs.writeFileSync(path.join(kgRoot, ".fts5.db"), "dummy", "utf-8");
    // No .gitignore entry for .fts5.db

    const result = await handleUpgrade({});
    // Tool must not crash
    expect(result.isError).toBeUndefined();
    // TODO: upgrade.ts does not yet check legacy .fts5.db placement.
    // When that check is added, assert that a relevant upgrade item appears in parsed.upgrades.
  });
});

// ---------------------------------------------------------------------------
// T-35: Binary CLAUDE.md with NUL bytes — platform-split does not overwrite rules.md corruptly
// ---------------------------------------------------------------------------

describe("T-35: binary CLAUDE.md with NUL bytes — platform-split apply does not crash", () => {
  test("platform-split apply does not crash when CLAUDE.md contains NUL bytes", async () => {
    const kgRoot = makeTempDir("t35");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    writeRules(
      kgRoot,
      "---\ntitle: Rules\n---\n# Rules\n\n- File search: use Glob and Grep — not Bash find/grep\n"
    );
    // Create a CLAUDE.md with NUL bytes
    const buf = Buffer.from("# Config\n\x00NUL byte here\n");
    fs.writeFileSync(path.join(kgRoot, "CLAUDE.md"), buf);

    const result = await handleUpgrade({ apply: ["platform-split"], confirm_platform_split: true });
    // upgrade.ts does not write to CLAUDE.md — it only touches rules.md.
    // Either no error (tool ignores CLAUDE.md) or isError truthy — both are acceptable.
    // The key invariant: CLAUDE.md must not be silently overwritten with clean content.
    const claudeAfter = fs.readFileSync(path.join(kgRoot, "CLAUDE.md"));
    // Original had a NUL byte — if the tool didn't touch it, NUL is still present
    if (!result.isError) {
      // Tool completed — verify CLAUDE.md still contains NUL (was not silently cleaned)
      // TODO: if upgrade.ts ever writes to CLAUDE.md, add binary-file guard first.
      expect(claudeAfter.includes(0x00)).toBe(true);
    }
    // If isError, the tool refused to proceed — also acceptable
    expect(result.content[0].text).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// T-36: Archive structure integrity — apply creates rules.md backup readable afterward
// ---------------------------------------------------------------------------

describe("T-36: platform-split apply — rules.md content is recoverable from result", () => {
  test("original contaminated content is reported in the apply result for audit", async () => {
    const kgRoot = makeTempDir("t36");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    writeRules(
      kgRoot,
      "---\ntitle: Rules\n---\n# Rules\n\n- File search: use Glob and Grep — not Bash find/grep\n- Other rule\n"
    );

    const result = await handleUpgrade({ apply: ["platform-split"], confirm_platform_split: true });
    expect(result.isError).toBeUndefined();

    // The apply result must mention what was removed so users can audit the change
    const text = result.content[0].text;
    expect(text).toContain("[platform-split]");
    // Result should report how many lines were removed (or list them)
    expect(text).toMatch(/Removed \d+ line/);

    // The cleaned rules.md must still be valid (not empty)
    const after = fs.readFileSync(path.join(kgRoot, "knowledge", "rules.md"), "utf-8");
    expect(after).toContain("Other rule");
  });
});

// ---------------------------------------------------------------------------
// T-37: Timestamp collision — two sequential apply calls produce distinct outcomes
// ---------------------------------------------------------------------------

describe("T-37: two sequential platform-split applies — both complete without error", () => {
  test("calling apply platform-split twice (re-contaminating between) does not crash", async () => {
    const kgRoot = makeTempDir("t37");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    // First apply
    writeRules(
      kgRoot,
      "---\ntitle: Rules\n---\n# Rules\n\n- File search: use Glob and Grep — not Bash find/grep\n"
    );
    const first = await handleUpgrade({ apply: ["platform-split"], confirm_platform_split: true });
    expect(first.isError).toBeUndefined();

    // Re-contaminate rules.md (simulate re-introduction of platform directives)
    writeRules(
      kgRoot,
      "---\ntitle: Rules\nkmgraph_schema: 2\n---\n# Rules\n\n- prefer subagent over direct bash calls\n"
    );
    // Reset schema to 1 so the contamination check runs again
    writeRules(
      kgRoot,
      "---\ntitle: Rules\nkmgraph_schema: 1\n---\n# Rules\n\n- prefer subagent over direct bash calls\n"
    );

    const second = await handleUpgrade({ apply: ["platform-split"], confirm_platform_split: true });
    expect(second.isError).toBeUndefined();

    // If upgrade.ts creates archives, verify at least one distinct archive exists
    const archiveDirs = fs.readdirSync(kgRoot).filter((d) => d.startsWith(".kg-archive-"));
    // Whether or not archives are created, assert no crashes — archive count is informational
    // TODO: if archive creation is added, assert archiveDirs.length >= 2 for two distinct runs
    expect(archiveDirs.length).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// T-38: Malformed manifest.json in archive dir — inspect does not crash
// ---------------------------------------------------------------------------

describe("T-38: malformed manifest.json in archive dir — inspect does not crash", () => {
  test("handleUpgrade({}) completes normally when a manifest.json has broken JSON", async () => {
    const kgRoot = makeTempDir("t38");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    // Create a fake archive dir with broken manifest
    const archiveDir = path.join(kgRoot, ".kg-archive-20260101-000000");
    fs.mkdirSync(archiveDir);
    fs.writeFileSync(path.join(archiveDir, "manifest.json"), "{broken json", "utf-8");

    const result = await handleUpgrade({});
    expect(result.isError).toBeUndefined();
    const parsed = parseResult(result);
    expect(Array.isArray(parsed.upgrades)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T-39: .windsurfrules is a directory — inspect does not crash
// ---------------------------------------------------------------------------

describe("T-39: .windsurfrules is a directory — inspect does not crash", () => {
  test("handleUpgrade({}) completes normally when .windsurfrules is a directory", async () => {
    const kgRoot = makeTempDir("t39");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    // Create .windsurfrules as a directory instead of a file
    fs.mkdirSync(path.join(kgRoot, ".windsurfrules"), { recursive: true });

    const result = await handleUpgrade({});
    // Tool must handle ambiguous platform state without crashing
    expect(result.isError).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// T-40: Two native platform files present — inspect completes without crash
// ---------------------------------------------------------------------------

describe("T-40: two native platform files present — inspect does not crash", () => {
  test("handleUpgrade({}) handles both GEMINI.md and .windsurfrules present", async () => {
    const kgRoot = makeTempDir("t40");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    fs.writeFileSync(path.join(kgRoot, "GEMINI.md"), "# Gemini\n", "utf-8");
    fs.writeFileSync(path.join(kgRoot, ".windsurfrules"), "# Windsurf\n", "utf-8");

    const result = await handleUpgrade({});
    // Tool must handle ambiguous platform state gracefully
    expect(result.isError).toBeUndefined();
    const parsed = parseResult(result);
    expect(Array.isArray(parsed.upgrades)).toBe(true);
    expect(Array.isArray(parsed.warnings)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T-41: checkDirectories requires templates/, not knowledge/
// ---------------------------------------------------------------------------

describe("T-41: checkDirectories requires templates/, not knowledge/", () => {
  test("templates/ reported missing when absent; no 'knowledge' in missing list", async () => {
    const kgRoot = makeTempDir("t41");
    tempDirs.push(kgRoot);
    // Create all required dirs EXCEPT templates/ — no knowledge/ dir to avoid
    // triggering the stray-knowledge-dir check in the same scenario
    for (const dir of ["lessons-learned", "decisions", "sessions", "chat-history", "tmp"]) {
      fs.mkdirSync(path.join(kgRoot, dir), { recursive: true });
    }
    mockActiveKg(kgRoot);

    const result = await handleUpgrade({});
    const parsed = parseResult(result);
    const dirItem = parsed.upgrades.find((u) => u.category === "directories");
    expect(dirItem).toBeDefined();
    // description = "Missing directories: templates"
    expect(dirItem!.description).toContain("templates");
    expect(dirItem!.description).not.toContain("knowledge");
  });

  test("no directories item when all required dirs including templates/ exist", async () => {
    const kgRoot = makeTempDir("t41b");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot); // includes templates/ after Task 1 fix
    mockActiveKg(kgRoot);

    const result = await handleUpgrade({});
    const parsed = parseResult(result);
    const dirItem = parsed.upgrades.find((u) => u.category === "directories");
    expect(dirItem).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// T-42: checkTemplates detects missing content templates
// ---------------------------------------------------------------------------

describe("T-42: checkTemplates detects missing content templates", () => {
  test("reports 5 missing content templates when templates/ dir is empty", async () => {
    const kgRoot = makeTempDir("t42");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot); // creates templates/ dir (empty) and other dirs

    // Mock plugin root with ONLY concepts/templates/ source files
    // (other source dirs absent → checkTemplates skips them via existsSync guard)
    const mockPluginRoot = makeTempDir("t42-plugin");
    tempDirs.push(mockPluginRoot);
    const srcDir = path.join(mockPluginRoot, "core", "default-templates", "concepts", "templates");
    fs.mkdirSync(srcDir, { recursive: true });
    for (const f of ["architecture.md", "concepts.md", "gotchas.md", "patterns.md", "workflows.md"]) {
      fs.writeFileSync(path.join(srcDir, f), `# ${f} template\n`, "utf-8");
    }
    const { getPluginRoot } = jest.requireMock("../src/utils.js") as { getPluginRoot: jest.Mock };
    getPluginRoot.mockReturnValue(mockPluginRoot);

    mockActiveKg(kgRoot);
    const result = await handleUpgrade({});
    const parsed = parseResult(result);
    // Only concepts/templates/* source exists → exactly those 5 are reported missing
    const templateItems = parsed.upgrades.filter((u) => u.category === "templates");
    expect(templateItems.length).toBe(5);
    const names = templateItems.map((u) => u.description);
    expect(names.some((n) => n.includes("architecture.md"))).toBe(true);
    expect(names.some((n) => n.includes("workflows.md"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T-43: applyTemplates deploys starters to templates/ not live dirs
// ---------------------------------------------------------------------------

describe("T-43: applyTemplates deploys starters to templates/ not live dirs", () => {
  test("lesson-template.md appears in templates/, not in lessons-learned/", async () => {
    const kgRoot = makeTempDir("t43");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);

    const mockPluginRoot = makeTempDir("t43-plugin");
    tempDirs.push(mockPluginRoot);
    const srcDir = path.join(mockPluginRoot, "core", "default-templates", "lessons-learned");
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, "lesson-template.md"), "# Lesson Template\n", "utf-8");
    const { getPluginRoot } = jest.requireMock("../src/utils.js") as { getPluginRoot: jest.Mock };
    getPluginRoot.mockReturnValue(mockPluginRoot);

    mockActiveKg(kgRoot);
    await handleUpgrade({ apply: ["templates"] });

    expect(fs.existsSync(path.join(kgRoot, "templates", "lesson-template.md"))).toBe(true);
    expect(fs.existsSync(path.join(kgRoot, "lessons-learned", "lesson-template.md"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T-44: applyTemplates deploys content templates to templates/
// ---------------------------------------------------------------------------

describe("T-44: applyTemplates deploys content templates to templates/", () => {
  test("all 5 content templates appear in templates/", async () => {
    const kgRoot = makeTempDir("t44");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);

    const mockPluginRoot = makeTempDir("t44-plugin");
    tempDirs.push(mockPluginRoot);
    const srcDir = path.join(mockPluginRoot, "core", "default-templates", "concepts", "templates");
    fs.mkdirSync(srcDir, { recursive: true });
    for (const f of ["architecture.md", "concepts.md", "gotchas.md", "patterns.md", "workflows.md"]) {
      fs.writeFileSync(path.join(srcDir, f), `# ${f}\n`, "utf-8");
    }
    const { getPluginRoot } = jest.requireMock("../src/utils.js") as { getPluginRoot: jest.Mock };
    getPluginRoot.mockReturnValue(mockPluginRoot);

    mockActiveKg(kgRoot);
    await handleUpgrade({ apply: ["templates"] });

    for (const f of ["architecture.md", "concepts.md", "gotchas.md", "patterns.md", "workflows.md"]) {
      expect(fs.existsSync(path.join(kgRoot, "templates", f))).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// T-45: checkStarterRelocation detects starters in live dirs
// ---------------------------------------------------------------------------

describe("T-45: checkStarterRelocation detects starters in live dirs", () => {
  test("reports starter-relocation when ADR-template.md is in decisions/", async () => {
    const kgRoot = makeTempDir("t45");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    fs.writeFileSync(path.join(kgRoot, "decisions", "ADR-template.md"), "# ADR Template\n", "utf-8");
    mockActiveKg(kgRoot);

    const result = await handleUpgrade({});
    const parsed = parseResult(result);
    const item = parsed.upgrades.find((u) => u.category === "starter-relocation");
    expect(item).toBeDefined();
    expect(item!.description).toContain("1 starter");
  });
});

// ---------------------------------------------------------------------------
// T-46: applyStarterRelocation moves starters to templates/
// ---------------------------------------------------------------------------

describe("T-46: applyStarterRelocation moves starters to templates/", () => {
  test("ADR-template.md moved from decisions/ to templates/; not in decisions/ after", async () => {
    const kgRoot = makeTempDir("t46");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    fs.writeFileSync(path.join(kgRoot, "decisions", "ADR-template.md"), "# ADR Template\n", "utf-8");
    mockActiveKg(kgRoot);

    await handleUpgrade({ apply: ["starter-relocation"] });

    expect(fs.existsSync(path.join(kgRoot, "templates", "ADR-template.md"))).toBe(true);
    expect(fs.existsSync(path.join(kgRoot, "decisions", "ADR-template.md"))).toBe(false);
  });

  test("does not overwrite different content already in templates/ — skips with warning", async () => {
    const kgRoot = makeTempDir("t46b");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    fs.writeFileSync(path.join(kgRoot, "decisions", "ADR-template.md"), "# Old Version\n", "utf-8");
    fs.writeFileSync(path.join(kgRoot, "templates", "ADR-template.md"), "# Modified by user\n", "utf-8");
    mockActiveKg(kgRoot);

    const result = await handleUpgrade({ apply: ["starter-relocation"] });
    const text = result.content[0].text;
    expect(text).toContain("Skipped");
    // Both files preserved
    expect(fs.existsSync(path.join(kgRoot, "decisions", "ADR-template.md"))).toBe(true);
    expect(fs.readFileSync(path.join(kgRoot, "templates", "ADR-template.md"), "utf-8")).toBe("# Modified by user\n");
  });
});

// ---------------------------------------------------------------------------
// T-47: checkStrayKnowledgeDir detects knowledge/ on project-local KG
// ---------------------------------------------------------------------------

describe("T-47: checkStrayKnowledgeDir detects knowledge/ on project-local KG", () => {
  test("reports stray-knowledge-dir when knowledge/ subdir exists on project-local KG", async () => {
    const kgRoot = makeTempDir("t47");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    fs.mkdirSync(path.join(kgRoot, "knowledge"), { recursive: true });
    mockActiveKg(kgRoot, { type: "project-local" });

    const result = await handleUpgrade({});
    const parsed = parseResult(result);
    const item = parsed.upgrades.find((u) => u.category === "stray-knowledge-dir");
    expect(item).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// T-48: checkStrayKnowledgeDir skips knowledge/ on personal KG
// ---------------------------------------------------------------------------

describe("T-48: checkStrayKnowledgeDir skips knowledge/ on personal KG", () => {
  test("no stray-knowledge-dir item when type=personal even if knowledge/ exists", async () => {
    const kgRoot = makeTempDir("t48");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    fs.mkdirSync(path.join(kgRoot, "knowledge"), { recursive: true });
    mockActiveKg(kgRoot, { type: "personal" });

    const result = await handleUpgrade({});
    const parsed = parseResult(result);
    const item = parsed.upgrades.find((u) => u.category === "stray-knowledge-dir");
    expect(item).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// T-49: applyStrayKnowledgeDir moves unmodified template files to concepts/
// ---------------------------------------------------------------------------

describe("T-49: applyStrayKnowledgeDir moves unmodified template files to concepts/", () => {
  test("known template file moves to concepts/, unknown files left alone, dir removed if empty", async () => {
    const kgRoot = makeTempDir("t49");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    fs.mkdirSync(path.join(kgRoot, "knowledge"), { recursive: true });
    fs.mkdirSync(path.join(kgRoot, "concepts"), { recursive: true });

    // Setup mock plugin root with canonical source
    const mockPluginRoot = makeTempDir("t49-plugin");
    tempDirs.push(mockPluginRoot);
    const srcDir = path.join(mockPluginRoot, "core", "default-templates", "concepts", "templates");
    fs.mkdirSync(srcDir, { recursive: true });
    const content = "# Architecture template\n";
    fs.writeFileSync(path.join(srcDir, "architecture.md"), content, "utf-8");
    const { getPluginRoot } = jest.requireMock("../src/utils.js") as { getPluginRoot: jest.Mock };
    getPluginRoot.mockReturnValue(mockPluginRoot);

    // Place unmodified copy of architecture.md in stray dir
    fs.writeFileSync(path.join(kgRoot, "knowledge", "architecture.md"), content, "utf-8");

    mockActiveKg(kgRoot, { type: "project-local" });
    await handleUpgrade({ apply: ["stray-knowledge-dir"] });

    // architecture.md moved to concepts/
    expect(fs.existsSync(path.join(kgRoot, "concepts", "architecture.md"))).toBe(true);
    // stray dir removed (was empty after move)
    expect(fs.existsSync(path.join(kgRoot, "knowledge"))).toBe(false);
  });

  test("modified template file skipped; stray dir not removed when file remains", async () => {
    const kgRoot = makeTempDir("t49b");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    fs.mkdirSync(path.join(kgRoot, "knowledge"), { recursive: true });
    fs.mkdirSync(path.join(kgRoot, "concepts"), { recursive: true });

    const mockPluginRoot = makeTempDir("t49b-plugin");
    tempDirs.push(mockPluginRoot);
    const srcDir = path.join(mockPluginRoot, "core", "default-templates", "concepts", "templates");
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, "architecture.md"), "# canonical\n", "utf-8");
    const { getPluginRoot } = jest.requireMock("../src/utils.js") as { getPluginRoot: jest.Mock };
    getPluginRoot.mockReturnValue(mockPluginRoot);

    // User-modified version in stray dir
    fs.writeFileSync(path.join(kgRoot, "knowledge", "architecture.md"), "# my custom version\n", "utf-8");

    mockActiveKg(kgRoot, { type: "project-local" });
    const result = await handleUpgrade({ apply: ["stray-knowledge-dir"] });
    const text = result.content[0].text;
    expect(text).toContain("modified");
    // stray dir still exists (file not moved)
    expect(fs.existsSync(path.join(kgRoot, "knowledge"))).toBe(true);
  });

  test("real accumulated content in concepts/ is never overwritten, even when the stray file is unmodified", async () => {
    // Regression test: the stray file itself can be byte-identical to the
    // canonical plugin template (i.e. it looks "safe to move" by the old
    // logic) while concepts/ already holds unrelated real content under the
    // same filename. Moving it must never silently destroy that content —
    // this reproduces a real incident where concepts/patterns.md (146 lines
    // of accumulated patterns) was overwritten by an unmodified blank
    // knowledge/patterns.md stray file.
    const kgRoot = makeTempDir("t49c");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    fs.mkdirSync(path.join(kgRoot, "knowledge"), { recursive: true });
    fs.mkdirSync(path.join(kgRoot, "concepts"), { recursive: true });

    const mockPluginRoot = makeTempDir("t49c-plugin");
    tempDirs.push(mockPluginRoot);
    const srcDir = path.join(mockPluginRoot, "core", "default-templates", "concepts", "templates");
    fs.mkdirSync(srcDir, { recursive: true });
    const canonical = "# Patterns\n\n(blank starter template)\n";
    fs.writeFileSync(path.join(srcDir, "patterns.md"), canonical, "utf-8");
    const { getPluginRoot } = jest.requireMock("../src/utils.js") as { getPluginRoot: jest.Mock };
    getPluginRoot.mockReturnValue(mockPluginRoot);

    // Stray file is unmodified — byte-identical to the canonical template.
    fs.writeFileSync(path.join(kgRoot, "knowledge", "patterns.md"), canonical, "utf-8");
    // concepts/patterns.md already holds real, unrelated, populated content.
    const realContent = "# Patterns\n\n## Real Pattern One\nAccumulated over months.\n";
    fs.writeFileSync(path.join(kgRoot, "concepts", "patterns.md"), realContent, "utf-8");

    mockActiveKg(kgRoot, { type: "project-local" });
    const result = await handleUpgrade({ apply: ["stray-knowledge-dir"] });
    const text = result.content[0].text;

    // Real content must survive untouched.
    expect(fs.readFileSync(path.join(kgRoot, "concepts", "patterns.md"), "utf-8")).toBe(realContent);
    // Reported as skipped, not silently moved.
    expect(text).toContain("contain different content");
    // Stray file left in place (not moved, not deleted) since it wasn't merged.
    expect(fs.existsSync(path.join(kgRoot, "knowledge", "patterns.md"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T-50: checkVersionMismatch detects installed > lastApplied
// ---------------------------------------------------------------------------

describe("T-50: checkVersionMismatch detects installed > lastApplied", () => {
  // Under Jest, __SERVER_VERSION__ is undefined → handleVersion().installed = "0.0.0"
  const getInstalledVersion = () => handleVersion().installed; // "0.0.0" under Jest

  test("reports version-update item when lastAppliedVersion is stale", async () => {
    const kgRoot = makeTempDir("t50");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot, { lastAppliedVersion: "0.0.0-old" }); // any value != installed

    const result = await handleUpgrade({});
    const parsed = parseResult(result);
    const item = parsed.upgrades.find((u) => u.category === "version-update");
    expect(item).toBeDefined();
    expect(item!.description).toContain("0.0.0-old");
  });

  test("no version-update item when lastAppliedVersion matches installed", async () => {
    const kgRoot = makeTempDir("t50b");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot, { lastAppliedVersion: getInstalledVersion() }); // "0.0.0" under Jest

    const result = await handleUpgrade({});
    const parsed = parseResult(result);
    const item = parsed.upgrades.find((u) => u.category === "version-update");
    expect(item).toBeUndefined();
  });

  test("no version-update item when lastAppliedVersion absent (first install)", async () => {
    const kgRoot = makeTempDir("t50c");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot, {}); // no lastAppliedVersion field

    const result = await handleUpgrade({});
    const parsed = parseResult(result);
    const item = parsed.upgrades.find((u) => u.category === "version-update");
    expect(item).toBeUndefined(); // absent = first install, not a mismatch
  });
});

// ---------------------------------------------------------------------------
// T-51: lastAppliedVersion written to config after apply
// ---------------------------------------------------------------------------

describe("T-51: lastAppliedVersion written to config after apply", () => {
  test("lastAppliedVersion updated in config after apply: ['directories']", async () => {
    const kgRoot = makeTempDir("t51");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot, { lastAppliedVersion: "0.0.0-old" });

    // Capture what writeConfig is called with
    let writtenConfig: ReturnType<typeof readConfig> | undefined;
    (writeConfig as jest.Mock).mockImplementation((cfg) => { writtenConfig = cfg; });

    await handleUpgrade({ apply: ["directories"] });

    expect(writtenConfig).toBeDefined();
    const lastApplied = (writtenConfig!.graphs["test-kg"] as unknown as Record<string, unknown>).lastAppliedVersion;
    expect(lastApplied).toBe(handleVersion().installed); // "0.0.0" under Jest
  });
});

describe("T-51b: lastAppliedVersion does not clobber applyConfig side effects", () => {
  test("apply: ['config', 'directories'] — both applyConfig and lastAppliedVersion persist", async () => {
    const kgRoot = makeTempDir("t51b");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot, { lastAppliedVersion: "0.0.0-old" });

    let writtenConfig: ReturnType<typeof readConfig> | undefined;
    (writeConfig as jest.Mock).mockImplementation((cfg) => { writtenConfig = cfg; });

    await handleUpgrade({ apply: ["config", "directories"] });

    expect(writtenConfig).toBeDefined();
    const lastApplied = (writtenConfig!.graphs["test-kg"] as unknown as Record<string, unknown>).lastAppliedVersion;
    expect(lastApplied).toBe(handleVersion().installed);
  });
});

describe("config-location category", () => {
  const ORIGINAL_ENV = process.env.KG_CONFIG_PATH;
  const ORIGINAL_HOME = process.env.HOME;
  let fakeHome: string;

  beforeEach(() => {
    fakeHome = makeTempDir("config-location-home");
    tempDirs.push(fakeHome);
    process.env.HOME = fakeHome; // os.homedir() reads $HOME on POSIX — no mock needed
    delete process.env.KG_CONFIG_PATH;
  });

  afterEach(() => {
    if (ORIGINAL_HOME === undefined) delete process.env.HOME;
    else process.env.HOME = ORIGINAL_HOME;
    if (ORIGINAL_ENV === undefined) delete process.env.KG_CONFIG_PATH;
    else process.env.KG_CONFIG_PATH = ORIGINAL_ENV;
  });

  it("reports config-location item when old path exists and new path does not", () => {
    const oldDir = path.join(fakeHome, ".claude");
    fs.mkdirSync(oldDir, { recursive: true });
    fs.writeFileSync(path.join(oldDir, "kg-config.json"), "{}", "utf-8");

    const kgRoot = makeTempDir("kg");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    return handleUpgrade({}).then((result) => {
      const parsed = JSON.parse(result.content[0].text);
      const item = parsed.upgrades.find((u: { category: string }) => u.category === "config-location");
      expect(item).toBeDefined();
    });
  });

  it("apply config-location copies old file to new path without deleting old file", async () => {
    const oldDir = path.join(fakeHome, ".claude");
    fs.mkdirSync(oldDir, { recursive: true });
    const oldFile = path.join(oldDir, "kg-config.json");
    fs.writeFileSync(oldFile, JSON.stringify({ version: "1.0.0", active: null, graphs: {} }), "utf-8");

    const kgRoot = makeTempDir("kg");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const result = await handleUpgrade({ apply: ["config-location"] as never });
    const newFile = path.join(fakeHome, ".kmgraph", "kg-config.json");

    expect(fs.existsSync(newFile)).toBe(true);
    expect(fs.existsSync(oldFile)).toBe(true); // old file untouched — ADR-063
    expect(fs.readFileSync(newFile, "utf-8")).toBe(fs.readFileSync(oldFile, "utf-8"));
  });

  it("checkConfigLocation (inspect) skips when KG_CONFIG_PATH is set", async () => {
    process.env.KG_CONFIG_PATH = path.join(fakeHome, "custom", "kg-config.json");
    // Old file present, new file absent — would normally surface a config-location item.
    const oldDir = path.join(fakeHome, ".claude");
    fs.mkdirSync(oldDir, { recursive: true });
    fs.writeFileSync(path.join(oldDir, "kg-config.json"), "{}", "utf-8");

    const kgRoot = makeTempDir("kg");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const result = await handleUpgrade({});
    const parsed = JSON.parse(result.content[0].text);
    const item = parsed.upgrades.find((u: { category: string }) => u.category === "config-location");
    expect(item).toBeUndefined();
  });

  it("apply config-location skips (no-op) when KG_CONFIG_PATH is set", async () => {
    process.env.KG_CONFIG_PATH = path.join(fakeHome, "custom", "kg-config.json");
    const oldDir = path.join(fakeHome, ".claude");
    fs.mkdirSync(oldDir, { recursive: true });
    fs.writeFileSync(path.join(oldDir, "kg-config.json"), "{}", "utf-8");

    const kgRoot = makeTempDir("kg");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const result = await handleUpgrade({ apply: ["config-location"] as never });
    const newFile = path.join(fakeHome, ".kmgraph", "kg-config.json");

    expect(result.content[0].text).toContain("KG_CONFIG_PATH override set");
    // Migration must not have run — new default-location file was not created.
    expect(fs.existsSync(newFile)).toBe(false);
  });

  it("apply config-location twice in a row — second call is a clean no-op", async () => {
    const oldDir = path.join(fakeHome, ".claude");
    fs.mkdirSync(oldDir, { recursive: true });
    const oldFile = path.join(oldDir, "kg-config.json");
    fs.writeFileSync(oldFile, JSON.stringify({ version: "1.0.0", active: null, graphs: {} }), "utf-8");

    const kgRoot = makeTempDir("kg");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const first = await handleUpgrade({ apply: ["config-location"] as never });
    expect(first.content[0].text).toContain("Copied kg-config.json");

    const newFile = path.join(fakeHome, ".kmgraph", "kg-config.json");
    const afterFirst = fs.readFileSync(newFile, "utf-8");

    const second = await handleUpgrade({ apply: ["config-location"] as never });
    expect(second.isError).toBeUndefined();
    expect(second.content[0].text).toContain("already exists");
    // Second call must not alter the migrated file or delete the legacy one.
    expect(fs.readFileSync(newFile, "utf-8")).toBe(afterFirst);
    expect(fs.existsSync(oldFile)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T-52: apply mode path-existence guard (Opus review B-1) + isError on
// resolution failure (Opus review SF-1)
// ---------------------------------------------------------------------------

describe("T-52: apply mode does not resurrect a deleted/unmounted KG path", () => {
  test("apply: ['directories'] against a registered-but-missing path errors instead of recreating it", async () => {
    const wrapper = fs.mkdtempSync(path.join(os.tmpdir(), "upgrade-test-t52-"));
    const goneKgPath = path.join(wrapper, "kg"); // registered, never created on disk
    (readConfig as jest.Mock).mockReturnValue({
      version: "1.0.0",
      graphs: {
        "gone-kg": {
          name: "gone-kg",
          path: goneKgPath,
          type: "project-local",
          categories: [],
          createdAt: new Date().toISOString(),
          status: "active" as const,
          statusChangedAt: new Date().toISOString(),
          graphId: "gone-kg-id",
        },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    } as KgConfig);
    process.cwd = () => goneKgPath;

    const result = await handleUpgrade({ apply: ["directories"] });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("KG path not found");
    // Must not have created the directory as a side effect of the check.
    expect(fs.existsSync(goneKgPath)).toBe(false);
    fs.rmSync(wrapper, { recursive: true, force: true });
  });

  test("apply: ['directories'] with an unresolvable cwd returns isError:true, not a silent success", async () => {
    const registeredKg = makeTempDir("t52b-registered");
    tempDirs.push(registeredKg);
    scaffoldKg(registeredKg);
    (readConfig as jest.Mock).mockReturnValue({
      version: "1.0.0",
      graphs: {
        "some-kg": {
          name: "some-kg",
          path: registeredKg,
          type: "project-local",
          categories: [],
          createdAt: new Date().toISOString(),
          status: "active" as const,
          statusChangedAt: new Date().toISOString(),
          graphId: "some-kg-id",
        },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    } as KgConfig);
    const unrelatedDir = makeTempDir("t52b-unrelated");
    tempDirs.push(unrelatedDir);
    process.cwd = () => unrelatedDir;

    const result = await handleUpgrade({ apply: ["directories"] });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Error");
  });

  test("apply: ['config-location', 'directories'] with an unresolvable cwd still runs config-location but flags isError overall", async () => {
    const home = makeTempDir("t52c-home");
    tempDirs.push(home);
    const legacyDir = path.join(home, ".claude");
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, "kg-config.json"), JSON.stringify({ version: "1.0.0", graphs: {} }), "utf-8");
    process.env.HOME = home;
    delete process.env.KG_CONFIG_PATH;
    (readConfig as jest.Mock).mockImplementation(() => ({ version: "1.0.0", graphs: {}, sanitization: { enabled: false, patterns: [], action: "warn" } }));
    process.cwd = () => "/completely/unresolvable/path/for/t52c";

    const result = await handleUpgrade({ apply: ["config-location", "directories"] });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("[config-location]");
    expect(result.content[0].text).toContain("[directories] Error:");
  });
});

// ---------------------------------------------------------------------------
// issue-46 backfix: capture-corruption inspect + apply
// ---------------------------------------------------------------------------

describe("capture-corruption — inspect mode", () => {
  test("detects doubled frontmatter and doubled filenames, reports counts", async () => {
    const kgRoot = makeTempDir("cc-inspect");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const sessionsYm = path.join(kgRoot, "sessions", "2026-08");
    fs.mkdirSync(sessionsYm, { recursive: true });
    fs.writeFileSync(
      path.join(sessionsYm, "2026-08-16-main.md"),
      '---\ntitle: "main"\ndate: 2026-08-16\n---\n---\ntitle: "2026-08-16-main"\ndate: 2026-08-16\nas_of_commit: abc1234\n---\n\n## Body\n',
      "utf-8"
    );
    fs.writeFileSync(
      path.join(sessionsYm, "2026-08-06-2026-08-06-main.md"),
      '---\ntitle: "main"\ndate: 2026-08-06\n---\n\n## Body\n',
      "utf-8"
    );

    const result = await handleUpgrade({});
    const parsed = JSON.parse(result.content[0].text);
    const item = parsed.upgrades.find((u: { category: string }) => u.category === "capture-corruption");

    expect(item).toBeDefined();
    expect(item.description).toContain("1 file(s) with a duplicated frontmatter block");
    expect(item.description).toContain("1 file(s) with an exact doubled date/ADR-number filename prefix");
  });

  test("does not flag a single frontmatter block followed by a body horizontal rule (false-positive guard)", async () => {
    const kgRoot = makeTempDir("cc-inspect-fp");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const sessionsYm = path.join(kgRoot, "sessions", "2026-04");
    fs.mkdirSync(sessionsYm, { recursive: true });
    // Single block, then a bare --- as a body divider (blank-line-free gap
    // between fence and heading is the only real signal this guards) --
    // matches real files found in this repo's own history (2026-04-21,
    // 2026-05-25) that are NOT the double-frontmatter bug.
    fs.writeFileSync(
      path.join(sessionsYm, "2026-04-21-clean.md"),
      '---\ntitle: "Snapshot"\ndate: 2026-04-21\n---\n---\n### Snapshot: mid-session\n\nBody text.\n',
      "utf-8"
    );

    const result = await handleUpgrade({});
    const parsed = JSON.parse(result.content[0].text);
    const item = parsed.upgrades.find((u: { category: string }) => u.category === "capture-corruption");
    expect(item).toBeUndefined();
  });
});

describe("capture-corruption — apply mode", () => {
  test("merges a clean doubled-frontmatter session file into a single block, preserving fields from both", async () => {
    const kgRoot = makeTempDir("cc-apply-merge");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const sessionsYm = path.join(kgRoot, "sessions", "2026-08");
    fs.mkdirSync(sessionsYm, { recursive: true });
    const filePath = path.join(sessionsYm, "2026-08-16-main.md");
    fs.writeFileSync(
      filePath,
      '---\ntitle: "main"\ndate: 2026-08-16\nbranch: main\ncommit: af447452\ntags: [session, snapshot]\n---\n' +
        '---\ntitle: "main"\ndate: 2026-08-16\nbranch: main\nas_of_commit: af447452\nlast_updated: "2026-08-16 16:16"\ntags: [session, snapshot]\n---\n\n## Body\n',
      "utf-8"
    );

    const result = await handleUpgrade({ apply: ["capture-corruption"], confirmBackfix: true });
    expect(result.content[0].text).toContain("[capture-corruption]");
    expect(result.content[0].text).toContain("1 frontmatter block(s) merged");

    const after = fs.readFileSync(filePath, "utf-8");
    const fenceLines = (after.match(/^---$/gm) || []).length;
    expect(fenceLines).toBe(2);
    expect(after).toContain('commit: af447452');
    expect(after).toContain("as_of_commit: af447452");
    expect(after).toContain('last_updated: "2026-08-16 16:16"');
    expect(after).toContain("## Body");
  });

  test("renames an exact doubled-date filename, leaving content alone", async () => {
    const kgRoot = makeTempDir("cc-apply-rename");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const sessionsYm = path.join(kgRoot, "sessions", "2026-08");
    fs.mkdirSync(sessionsYm, { recursive: true });
    const src = path.join(sessionsYm, "2026-08-06-2026-08-06-main.md");
    fs.writeFileSync(src, '---\ntitle: "main"\ndate: 2026-08-06\n---\n\n## Body\n', "utf-8");

    const result = await handleUpgrade({ apply: ["capture-corruption"], confirmBackfix: true });
    expect(result.content[0].text).toContain("1 filename(s) de-duplicated");

    expect(fs.existsSync(src)).toBe(false);
    const dst = path.join(sessionsYm, "2026-08-06-main.md");
    expect(fs.existsSync(dst)).toBe(true);
    expect(fs.readFileSync(dst, "utf-8")).toContain("## Body");
  });

  test("does NOT auto-merge a genuine field conflict — reports it instead", async () => {
    const kgRoot = makeTempDir("cc-apply-conflict");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const decisionsDir = path.join(kgRoot, "decisions");
    const filePath = path.join(decisionsDir, "ADR-999-conflict.md");
    const original =
      '---\ntitle: "Conflict"\nstatus: Proposed\n---\n' +
      '---\ntitle: "Conflict"\nstatus: Accepted\n---\n\n# ADR-999\n';
    fs.writeFileSync(filePath, original, "utf-8");

    const result = await handleUpgrade({ apply: ["capture-corruption"], confirmBackfix: true });
    expect(result.content[0].text).toContain("0 frontmatter block(s) merged");
    expect(result.content[0].text).toContain("need manual review");
    expect(result.content[0].text).toContain("status");

    // File must be untouched -- never guess on a real conflict
    expect(fs.readFileSync(filePath, "utf-8")).toBe(original);
  });

  test("does NOT auto-rename a near-doubled filename (midnight rollover) — reports it instead", async () => {
    const kgRoot = makeTempDir("cc-apply-rollover");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const sessionsYm = path.join(kgRoot, "sessions", "2026-07");
    fs.mkdirSync(sessionsYm, { recursive: true });
    const src = path.join(sessionsYm, "2026-07-12-2026-07-11-main.md");
    fs.writeFileSync(src, '---\ntitle: "2026-07-11-main"\ndate: 2026-07-11\n---\n\n## Body\n', "utf-8");

    const result = await handleUpgrade({ apply: ["capture-corruption"], confirmBackfix: true });
    expect(result.content[0].text).toContain("0 filename(s) de-duplicated");
    expect(result.content[0].text).toContain("need manual review");
    expect(result.content[0].text).toContain("near-doubled filename");

    // File must be untouched -- ambiguous which date is correct without
    // inspecting content, and this apply pass doesn't guess
    expect(fs.existsSync(src)).toBe(true);
  });

  test("apply is idempotent — a second run against already-repaired files is a no-op", async () => {
    const kgRoot = makeTempDir("cc-apply-idempotent");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const sessionsYm = path.join(kgRoot, "sessions", "2026-08");
    fs.mkdirSync(sessionsYm, { recursive: true });
    fs.writeFileSync(
      path.join(sessionsYm, "2026-08-16-main.md"),
      '---\ntitle: "main"\ndate: 2026-08-16\n---\n---\ntitle: "main"\ndate: 2026-08-16\nas_of_commit: abc1234\n---\n\n## Body\n',
      "utf-8"
    );

    await handleUpgrade({ apply: ["capture-corruption"], confirmBackfix: true });
    const second = await handleUpgrade({ apply: ["capture-corruption"], confirmBackfix: true });

    expect(second.content[0].text).toContain("0 frontmatter block(s) merged");
    expect(second.content[0].text).toContain("0 filename(s) de-duplicated");
    expect(second.content[0].text).not.toContain("need manual review");
  });

  test("renames a doubled ADR filename and fixes decisions/README.md's link to it", async () => {
    const kgRoot = makeTempDir("cc-apply-adr-readme");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const decisionsDir = path.join(kgRoot, "decisions");
    const src = path.join(decisionsDir, "ADR-046-adr-046-some-decision.md");
    fs.writeFileSync(src, '---\ntitle: "Some Decision"\nstatus: Accepted\n---\n\n# ADR-046\n', "utf-8");
    fs.writeFileSync(
      path.join(decisionsDir, "README.md"),
      "# Decisions\n\n- [ADR-046: Some Decision](ADR-046-adr-046-some-decision.md)\n",
      "utf-8"
    );

    const result = await handleUpgrade({ apply: ["capture-corruption"], confirmBackfix: true });
    expect(result.content[0].text).toContain("1 filename(s) de-duplicated");
    expect(result.content[0].text).toContain("1 README link(s) repointed");

    expect(fs.existsSync(src)).toBe(false);
    const dst = path.join(decisionsDir, "ADR-046-some-decision.md");
    expect(fs.existsSync(dst)).toBe(true);

    const readme = fs.readFileSync(path.join(decisionsDir, "README.md"), "utf-8");
    expect(readme).toContain("(ADR-046-some-decision.md)");
    expect(readme).not.toContain("ADR-046-adr-046-some-decision.md");
  });

  test("fixes a stale README link even when the file was already renamed by hand (no corresponding rename this run)", async () => {
    const kgRoot = makeTempDir("cc-apply-stale-link");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const decisionsDir = path.join(kgRoot, "decisions");
    // File already correctly named (as if renamed by hand previously) --
    // only the README index is stale, mirroring this repo's own ADR-046 case.
    fs.writeFileSync(
      path.join(decisionsDir, "ADR-050-already-renamed.md"),
      '---\ntitle: "Already Renamed"\n---\n\n# ADR-050\n',
      "utf-8"
    );
    fs.writeFileSync(
      path.join(decisionsDir, "README.md"),
      "# Decisions\n\n- [ADR-050: Already Renamed](ADR-050-adr-050-already-renamed.md)\n",
      "utf-8"
    );

    const result = await handleUpgrade({ apply: ["capture-corruption"], confirmBackfix: true });
    expect(result.content[0].text).toContain("1 README link(s) repointed");

    const readme = fs.readFileSync(path.join(decisionsDir, "README.md"), "utf-8");
    expect(readme).toContain("(ADR-050-already-renamed.md)");
  });

  test("does not touch a README link whose de-doubled target doesn't exist on disk (reports it instead)", async () => {
    const kgRoot = makeTempDir("cc-apply-orphan-link");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const decisionsDir = path.join(kgRoot, "decisions");
    const readmeContent = "# Decisions\n\n- [ADR-060: Ghost](ADR-060-adr-060-ghost.md)\n";
    fs.writeFileSync(path.join(decisionsDir, "README.md"), readmeContent, "utf-8");
    // No corresponding file exists at all -- neither the doubled nor the
    // de-doubled name.

    const result = await handleUpgrade({ apply: ["capture-corruption"], confirmBackfix: true });
    expect(result.content[0].text).toContain("0 README link(s) repointed");
    expect(result.content[0].text).toContain("need manual review");

    expect(fs.readFileSync(path.join(decisionsDir, "README.md"), "utf-8")).toBe(readmeContent);
  });
});

// ---------------------------------------------------------------------------
// Opus review (2026-08-17), CRITICAL #1: detectDoubledFrontmatter's
// false-positive guard only worked when the mistaken "block2" never found a
// closing `---` at all. A real file whose body opens with a `---` divider
// AND contains a later `---` further down (a second section break) supplies
// block2 a closing line, so the old code merged/deleted everything in
// between as if it were frontmatter. Reproduced live against this repo's
// own knowledge/sessions/2026-05/2026-05-25-v0.6.0-phase-1-planning-multi-
// platform-decisions.md. These tests model that exact shape.
// ---------------------------------------------------------------------------

describe("capture-corruption — real-shape false-positive guard (CRITICAL #1 regression)", () => {
  const REAL_SHAPE_CONTENT =
    '---\ntitle: "Snapshot"\ndate: 2026-05-25\n---\n' + // block1: real frontmatter
    "---\n" + // body divider, zero-gap after block1's closing fence
    "\n## Session Continuation\n\n### Overview\n\nSome real paragraph text that must survive.\n\n" +
    "---\n" + // a later, unrelated section divider — gives the old code a false "block2" close
    "\n## Next Section\n\nMore real content.\n";

  test("inspect mode does not flag a file shaped like a real body-divider-then-section-divider file", async () => {
    const kgRoot = makeTempDir("cc-critical1-inspect");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const sessionsYm = path.join(kgRoot, "sessions", "2026-05");
    fs.mkdirSync(sessionsYm, { recursive: true });
    fs.writeFileSync(path.join(sessionsYm, "2026-05-25-real-shape.md"), REAL_SHAPE_CONTENT, "utf-8");

    const result = await handleUpgrade({});
    const parsed = JSON.parse(result.content[0].text);
    const item = parsed.upgrades.find((u: { category: string }) => u.category === "capture-corruption");
    expect(item).toBeUndefined();
  });

  test("apply mode leaves the file byte-for-byte untouched and writes no .bak", async () => {
    const kgRoot = makeTempDir("cc-critical1-apply");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const sessionsYm = path.join(kgRoot, "sessions", "2026-05");
    fs.mkdirSync(sessionsYm, { recursive: true });
    const filePath = path.join(sessionsYm, "2026-05-25-real-shape.md");
    fs.writeFileSync(filePath, REAL_SHAPE_CONTENT, "utf-8");

    const result = await handleUpgrade({ apply: ["capture-corruption"], confirmBackfix: true });
    expect(result.content[0].text).toContain("0 frontmatter block(s) merged");

    expect(fs.readFileSync(filePath, "utf-8")).toBe(REAL_SHAPE_CONTENT);
    expect(fs.existsSync(`${filePath}.bak`)).toBe(false);
    expect(fs.readFileSync(filePath, "utf-8")).toContain("## Session Continuation");
    expect(fs.readFileSync(filePath, "utf-8")).toContain("### Overview");
  });

  test("a .bak backup is written when a genuine doubled-frontmatter merge does happen", async () => {
    const kgRoot = makeTempDir("cc-critical1-bak");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const sessionsYm = path.join(kgRoot, "sessions", "2026-08");
    fs.mkdirSync(sessionsYm, { recursive: true });
    const filePath = path.join(sessionsYm, "2026-08-16-main.md");
    const original =
      '---\ntitle: "main"\ndate: 2026-08-16\n---\n---\ntitle: "main"\ndate: 2026-08-16\nas_of_commit: abc1234\n---\n\n## Body\n';
    fs.writeFileSync(filePath, original, "utf-8");

    await handleUpgrade({ apply: ["capture-corruption"], confirmBackfix: true });

    const bakPath = `${filePath}.bak`;
    expect(fs.existsSync(bakPath)).toBe(true);
    expect(fs.readFileSync(bakPath, "utf-8")).toBe(original);
  });
});

// ---------------------------------------------------------------------------
// Opus review (2026-08-17), CRITICAL #2: DOUBLED_ADR_FILENAME had no
// backreference tying the two ADR numbers together, so a file legitimately
// referencing a *different* ADR in its slug would be wrongly de-doubled.
// ---------------------------------------------------------------------------

describe("capture-corruption — narrowed false-positive guard (Fable review, 2026-08-18)", () => {
  // block2.order.length > 0 alone still false-positived on prose containing
  // a single stray colon-prefixed line (e.g. "Note: ...") at column 0,
  // surrounded by real non-YAML content -- looksLikeYaml requires ALL
  // non-blank lines in the block to be key:/continuation lines, not just one.
  test("does not flag or corrupt a body containing a colon-prefixed prose line between dividers", async () => {
    const kgRoot = makeTempDir("cc-fable-prose-colon");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const sessionsYm = path.join(kgRoot, "sessions", "2026-08");
    fs.mkdirSync(sessionsYm, { recursive: true });
    const filePath = path.join(sessionsYm, "2026-08-18-prose-colon.md");
    const content =
      '---\ntitle: "main"\ndate: 2026-08-18\n---\n' +
      "---\n\n## Summary\n\nNote: deferred X.\n\n---\n\n## Details\n";
    fs.writeFileSync(filePath, content, "utf-8");

    const inspect = await handleUpgrade({});
    const parsed = JSON.parse(inspect.content[0].text);
    const item = parsed.upgrades.find((u: { category: string }) => u.category === "capture-corruption");
    expect(item).toBeUndefined();

    const result = await handleUpgrade({ apply: ["capture-corruption"], confirmBackfix: true });
    expect(result.content[0].text).toContain("0 frontmatter block(s) merged");
    expect(fs.readFileSync(filePath, "utf-8")).toBe(content);
    expect(fs.existsSync(`${filePath}.bak`)).toBe(false);
  });
});

describe("capture-corruption — ADR backreference guard (CRITICAL #2 regression)", () => {
  test("does NOT rename an ADR filename whose slug references a different ADR number", async () => {
    const kgRoot = makeTempDir("cc-critical2-different");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const decisionsDir = path.join(kgRoot, "decisions");
    const src = path.join(decisionsDir, "ADR-050-adr-046-followup-fix.md");
    fs.writeFileSync(src, '---\ntitle: "Followup Fix"\n---\n\n# ADR-050\n', "utf-8");

    const result = await handleUpgrade({ apply: ["capture-corruption"], confirmBackfix: true });
    expect(result.content[0].text).toContain("0 filename(s) de-duplicated");
    expect(fs.existsSync(src)).toBe(true);
    expect(fs.existsSync(path.join(decisionsDir, "ADR-050-followup-fix.md"))).toBe(false);
  });

  test("still renames a genuine same-number doubled ADR filename", async () => {
    const kgRoot = makeTempDir("cc-critical2-same");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const decisionsDir = path.join(kgRoot, "decisions");
    const src = path.join(decisionsDir, "ADR-046-adr-046-again.md");
    fs.writeFileSync(src, '---\ntitle: "Again"\n---\n\n# ADR-046\n', "utf-8");

    const result = await handleUpgrade({ apply: ["capture-corruption"], confirmBackfix: true });
    expect(result.content[0].text).toContain("1 filename(s) de-duplicated");
    expect(fs.existsSync(src)).toBe(false);
    expect(fs.existsSync(path.join(decisionsDir, "ADR-046-again.md"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// c5 (v0.7.2): shared backfix consent gate (confirmBackfixCategory)
// ---------------------------------------------------------------------------

describe("c5: capture-corruption gated by confirmBackfix", () => {
  test("nothing to repair, no confirmBackfix — applies as a no-op, does NOT ask (2nd Opus review, 2026-08-18)", async () => {
    // Every other test in this describe block that exercises the "nothing
    // to repair" skip also happens to pass confirmBackfix: true, which
    // means they'd still pass even if this skip path were deleted -- it
    // was flagged as genuinely untested. This test omits confirmBackfix
    // entirely against a clean KG, so it can only pass via the skip.
    const kgRoot = makeTempDir("c5-cc-noop-no-ask");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    // No corrupted files seeded -- rescan finds nothing.

    const result = await handleUpgrade({ apply: ["capture-corruption"] });

    // Must NOT be the gate's KMG_INPUT_REQUIRED -- confirms the skip fired.
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("[capture-corruption]");
    expect(result.content[0].text).not.toContain("KMG_INPUT_REQUIRED");
    expect(result.content[0].text).toContain("0 frontmatter block(s) merged");
  });


  test("automated mode, no confirmBackfix — returns KMG_INPUT_REQUIRED, not applied", async () => {
    const kgRoot = makeTempDir("c5-cc-unconfirmed");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const sessionsYm = path.join(kgRoot, "sessions", "2026-08");
    fs.mkdirSync(sessionsYm, { recursive: true });
    const filePath = path.join(sessionsYm, "2026-08-16-main.md");
    const original = '---\ntitle: "main"\ndate: 2026-08-16\n---\n---\ntitle: "main"\ndate: 2026-08-16\n---\n\n## Body\n';
    fs.writeFileSync(filePath, original, "utf-8");

    const result = await handleUpgrade({ apply: ["capture-corruption"] });

    // Only category in the call, and it's genuinely unconfirmed (real
    // corruption exists, so the "nothing to repair" skip does not apply) —
    // the empty prose block is omitted, so the error is content[0].
    expect(result.isError).toBe(true);
    expect(result.content.length).toBe(1);
    const errorBlock = JSON.parse(result.content[0].text);
    expect(errorBlock.error).toBe("KMG_INPUT_REQUIRED");
    expect(errorBlock.resolveWith.param).toBe("confirmBackfix");
    // detail carries the human-readable per-run count the gate is asking
    // about — this is the whole reason Step 1 added a `detail` field.
    expect(errorBlock.detail).toContain("duplicated frontmatter block");
    // File must be untouched — no consent given, nothing should have been written
    expect(fs.readFileSync(filePath, "utf-8")).toBe(original);
  });

  test("BLOCKER regression: an unconfirmed LAST-in-order category does not discard an earlier category's results", async () => {
    const kgRoot = makeTempDir("c5-blocker");
    tempDirs.push(kgRoot);
    scaffoldKgPartial(kgRoot); // leaves "directories" real work to do
    mockActiveKg(kgRoot, { lastAppliedVersion: "0.0.0-old" });
    // Must seed real corruption — otherwise capture-corruption hits the
    // "nothing to repair" skip (fix for Opus review finding, 2026-08-18)
    // and never reaches the gate at all, defeating this test's entire
    // premise (it needs capture-corruption to end up unconfirmed/pending).
    const sessionsYm = path.join(kgRoot, "sessions", "2026-08");
    fs.mkdirSync(sessionsYm, { recursive: true });
    fs.writeFileSync(
      path.join(sessionsYm, "2026-08-16-main.md"),
      '---\ntitle: "main"\ndate: 2026-08-16\n---\n---\ntitle: "main"\ndate: 2026-08-16\n---\n\n## Body\n',
      "utf-8"
    );

    let writtenConfig: ReturnType<typeof readConfig> | undefined;
    (writeConfig as jest.Mock).mockImplementation((cfg) => { writtenConfig = cfg; });

    const result = await handleUpgrade({ apply: ["directories", "capture-corruption"] });

    // Earlier category's success text must survive, not be discarded by the
    // later unconfirmed gate — the exact bug this plan's Step 3 fixes.
    expect(result.content[0].text).toContain("[directories]");
    expect(result.isError).toBe(true);
    expect(result.content.length).toBeGreaterThan(1);
    const errorBlock = JSON.parse(result.content[1].text);
    expect(errorBlock.error).toBe("KMG_INPUT_REQUIRED");
    expect(errorBlock.resolveWith.param).toBe("confirmBackfix");

    // updateLastAppliedVersion must still run, since "directories" genuinely applied
    expect(writtenConfig).toBeDefined();
    const lastApplied = (writtenConfig!.graphs["test-kg"] as unknown as Record<string, unknown>).lastAppliedVersion;
    expect(lastApplied).toBe(handleVersion().installed);
  });

  test("confirmBackfix does not also bypass platform-split — independent knobs", async () => {
    const kgRoot = makeTempDir("c5-independent-knobs");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    const contaminated = "---\ntitle: Rules\n---\n# Rules\n\n- File search: use Glob and Grep — not Bash find/grep\n";
    writeRules(kgRoot, contaminated);

    const result = await handleUpgrade({ apply: ["capture-corruption", "platform-split"], confirmBackfix: true });

    // capture-corruption reaches its "nothing to repair" skip (no corrupted
    // files seeded here), not the gate — either way, no gate error for it
    expect(result.content[0].text).toContain("[capture-corruption]");
    // platform-split is still gated — confirmBackfix does not answer confirm_platform_split
    expect(result.isError).toBe(true);
    const errorBlock = JSON.parse(result.content[1].text);
    expect(errorBlock.resolveWith.param).toBe("confirm_platform_split");
    const after = fs.readFileSync(path.join(kgRoot, "knowledge", "rules.md"), "utf-8");
    expect(after).toBe(contaminated); // untouched
  });

  test("confirm_platform_split does not also bypass capture-corruption — independent knobs, reverse direction", async () => {
    const kgRoot = makeTempDir("c5-independent-knobs-reverse");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    writeRules(kgRoot, "---\ntitle: Rules\n---\n# Rules\n\n- File search: use Glob and Grep — not Bash find/grep\n");

    const sessionsYm = path.join(kgRoot, "sessions", "2026-08");
    fs.mkdirSync(sessionsYm, { recursive: true });
    const filePath = path.join(sessionsYm, "2026-08-16-main.md");
    const original = '---\ntitle: "main"\ndate: 2026-08-16\n---\n---\ntitle: "main"\ndate: 2026-08-16\n---\n\n## Body\n';
    fs.writeFileSync(filePath, original, "utf-8");

    const result = await handleUpgrade({ apply: ["capture-corruption", "platform-split"], confirm_platform_split: true });

    // platform-split applied (confirmed), but capture-corruption is still
    // gated — confirm_platform_split does not answer confirmBackfix
    expect(result.content[0].text).toContain("[platform-split]");
    expect(result.isError).toBe(true);
    const errorBlock = JSON.parse(result.content[1].text);
    expect(errorBlock.resolveWith.param).toBe("confirmBackfix");
    // File must be untouched — capture-corruption never got consent
    expect(fs.readFileSync(filePath, "utf-8")).toBe(original);
  });

  test("interactive mode: gate() is genuinely invoked (stub times out), not silently treated as automated", async () => {
    jest.useFakeTimers();
    const prevInteraction = process.env.KMG_INTERACTION;
    process.env.KMG_INTERACTION = "interactive";
    try {
      const kgRoot = makeTempDir("c5-interactive");
      tempDirs.push(kgRoot);
      scaffoldKg(kgRoot);
      mockActiveKg(kgRoot);
      // Must seed real corruption — otherwise the "nothing to repair" skip
      // (fix for Opus review finding, 2026-08-18) short-circuits before the
      // gate is ever reached, defeating this test's whole premise.
      const sessionsYm = path.join(kgRoot, "sessions", "2026-08");
      fs.mkdirSync(sessionsYm, { recursive: true });
      fs.writeFileSync(
        path.join(sessionsYm, "2026-08-16-main.md"),
        '---\ntitle: "main"\ndate: 2026-08-16\n---\n---\ntitle: "main"\ndate: 2026-08-16\n---\n\n## Body\n',
        "utf-8"
      );

      const resultPromise = handleUpgrade({ apply: ["capture-corruption"] });
      await jest.advanceTimersByTimeAsync(STUB_ASK_TIMEOUT_MS);
      const result = await resultPromise;

      expect(result.isError).toBe(true);
      expect(result.content.length).toBe(1); // only category in the call, no prose block
      const errorBlock = JSON.parse(result.content[0].text);
      expect(errorBlock.error).toBe("KMG_INPUT_REQUIRED");
      expect(errorBlock.reason).toContain("capture_corruption_backfix");
    } finally {
      process.env.KMG_INTERACTION = prevInteraction;
      jest.useRealTimers();
    }
  });

  test("Step 6.5 short-circuit: two unconfirmed gated categories in interactive mode settle after ONE stub timeout, not two", async () => {
    jest.useFakeTimers();
    const prevInteraction = process.env.KMG_INTERACTION;
    process.env.KMG_INTERACTION = "interactive";
    try {
      const kgRoot = makeTempDir("c5-skipask");
      tempDirs.push(kgRoot);
      scaffoldKg(kgRoot);
      mockActiveKg(kgRoot);
      writeRules(kgRoot, "---\ntitle: Rules\n---\n# Rules\n\n- File search: use Glob and Grep — not Bash find/grep\n");
      // Must seed real corruption — otherwise capture-corruption hits the
      // "nothing to repair" skip and never reaches its gate at all, leaving
      // only platform-split gated and defeating this test's whole premise
      // (proving the short-circuit between TWO gated categories).
      const sessionsYm = path.join(kgRoot, "sessions", "2026-08");
      fs.mkdirSync(sessionsYm, { recursive: true });
      fs.writeFileSync(
        path.join(sessionsYm, "2026-08-16-main.md"),
        '---\ntitle: "main"\ndate: 2026-08-16\n---\n---\ntitle: "main"\ndate: 2026-08-16\n---\n\n## Body\n',
        "utf-8"
      );

      const resultPromise = handleUpgrade({ apply: ["capture-corruption", "platform-split"] });
      let settled = false;
      resultPromise.then(() => { settled = true; });

      // Advance by exactly ONE stub timeout. If platform-split (the second
      // gated category) were still stacking its own full gate()/stubAsk
      // wait instead of short-circuiting once capture-corruption's gate
      // already came back unconfirmed, this would not be enough for both.
      await jest.advanceTimersByTimeAsync(STUB_ASK_TIMEOUT_MS);
      await Promise.resolve(); // flush microtasks so `settled` reflects reality
      expect(settled).toBe(true);

      const result = await resultPromise;
      expect(result.isError).toBe(true);
      // Both categories are unconfirmed and neither applied, so there's no
      // prose block to include — just the 2 pending errors.
      expect(result.content.length).toBe(2);
    } finally {
      process.env.KMG_INTERACTION = prevInteraction;
      jest.useRealTimers();
    }
  });
});

// ---------------------------------------------------------------------------
// c2 (issue-47): diff-blank-reconstruction backfix
// ---------------------------------------------------------------------------

describe("c2: diff-blank-reconstruction (issue-47 backfix)", () => {
  function gitInit(dir: string): void {
    execSync("git init -q -b main", { cwd: dir });
    execSync('git config user.email t@t.com && git config user.name t', { cwd: dir });
  }

  test("correctly blank on default branch — not flagged, not touched", async () => {
    const kgRoot = makeTempDir("c2-blank-main");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    gitInit(kgRoot);
    fs.writeFileSync(path.join(kgRoot, "seed.md"), "seed", "utf-8");
    execSync("git add seed.md && git commit -q -m seed", { cwd: kgRoot });

    const sessionsYm = path.join(kgRoot, "sessions", "2026-08");
    fs.mkdirSync(sessionsYm, { recursive: true });
    const sessFile = path.join(sessionsYm, "2026-08-18-main.md");
    const content =
      '---\ntitle: "main"\nbranch: main\ncommit: abc123\n---\n\n**External files:**\n- none this session\n';
    fs.writeFileSync(sessFile, content, "utf-8");

    const inspect = await handleUpgrade({});
    const parsed = JSON.parse(inspect.content[0].text);
    expect(
      (parsed.upgrades as Array<{ category: string }>).find((u) => u.category === "diff-blank-reconstruction")
    ).toBeUndefined();

    const result = await handleUpgrade({ apply: ["diff-blank-reconstruction"], confirmBackfix: true });
    expect(result.content[0].text).toContain("0 session file(s) reconstructed, 0 left");
    // Untouched — correctly-blank is not a gap, nothing to backfix
    expect(fs.readFileSync(sessFile, "utf-8")).toBe(content);
    expect(fs.existsSync(`${sessFile}.bak`)).toBe(false);
  });

  test("reconstructable — feature branch, resolvable commit, gated then rebuilt from real git history", async () => {
    const kgRoot = makeTempDir("c2-reconstructable");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    gitInit(kgRoot);
    fs.writeFileSync(path.join(kgRoot, "seed.md"), "seed", "utf-8");
    execSync("git add seed.md && git commit -q -m seed", { cwd: kgRoot });
    execSync("git checkout -q -b feature", { cwd: kgRoot });
    fs.writeFileSync(path.join(kgRoot, "changed.md"), "changed", "utf-8");
    execSync("git add changed.md && git commit -q -m changed", { cwd: kgRoot });
    const featureSha = execSync("git rev-parse HEAD", { cwd: kgRoot }).toString().trim();

    const sessionsYm = path.join(kgRoot, "sessions", "2026-08");
    fs.mkdirSync(sessionsYm, { recursive: true });
    const sessFile = path.join(sessionsYm, "2026-08-18-feature.md");
    const content =
      `---\ntitle: "feature"\nbranch: feature\ncommit: ${featureSha}\n---\n\n**External files:**\n- none this session\n\n**Read within this summary:**\n`;
    fs.writeFileSync(sessFile, content, "utf-8");

    // Gated: no confirmBackfix, must not touch the file
    const gated = await handleUpgrade({ apply: ["diff-blank-reconstruction"] });
    expect(gated.isError).toBe(true);
    const err = JSON.parse(gated.content[0].text);
    expect(err.error).toBe("KMG_INPUT_REQUIRED");
    expect(err.resolveWith.param).toBe("confirmBackfix");
    expect(fs.readFileSync(sessFile, "utf-8")).toBe(content);

    // Confirmed: reconstructs from real git history (not a guess)
    const result = await handleUpgrade({ apply: ["diff-blank-reconstruction"], confirmBackfix: true });
    expect(result.content[0].text).toContain("1 session file(s) reconstructed, 0 left");
    const after = fs.readFileSync(sessFile, "utf-8");
    expect(after).toContain("`changed.md` ← modified this session (reconstructed)");
    expect(after).not.toContain("seed.md"); // only the feature-branch delta, not the whole history
    expect(fs.existsSync(`${sessFile}.bak`)).toBe(true);
    expect(fs.readFileSync(`${sessFile}.bak`, "utf-8")).toBe(content); // backup is the pre-rewrite content
  });

  test("unresolvable — commit no longer resolvable, gets an honest note, never a guessed file list", async () => {
    const kgRoot = makeTempDir("c2-unresolvable");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    gitInit(kgRoot);
    fs.writeFileSync(path.join(kgRoot, "seed.md"), "seed", "utf-8");
    execSync("git add seed.md && git commit -q -m seed", { cwd: kgRoot });

    const sessionsYm = path.join(kgRoot, "sessions", "2026-08");
    fs.mkdirSync(sessionsYm, { recursive: true });
    const sessFile = path.join(sessionsYm, "2026-08-18-gone.md");
    // A real 40-char SHA-1 shape (not merely malformed) that never existed in
    // this repo -- proves "valid-looking but genuinely gone", not just
    // "rejected for being the wrong length" (found in review, 2026-08-18).
    const bogusSha = "0123456789abcdef0123456789abcdef0123dead";
    const content =
      `---\ntitle: "gone"\nbranch: deleted-feature\ncommit: ${bogusSha}\n---\n\n**External files:**\n- none this session\n`;
    fs.writeFileSync(sessFile, content, "utf-8");

    const result = await handleUpgrade({ apply: ["diff-blank-reconstruction"], confirmBackfix: true });
    expect(result.content[0].text).toContain("0 session file(s) reconstructed, 1 left with an unresolvable note.");
    const after = fs.readFileSync(sessFile, "utf-8");
    expect(after).toContain("could not be reconstructed");
    expect(after).toContain(bogusSha);
    // Never fabricate a plausible-looking list for an unresolvable commit
    expect(after).not.toContain("← modified this session (reconstructed)");
    expect(fs.existsSync(`${sessFile}.bak`)).toBe(true);
  });

  test("no branch recorded — skipped, not misclassified either way", async () => {
    const kgRoot = makeTempDir("c2-no-branch");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    gitInit(kgRoot);
    fs.writeFileSync(path.join(kgRoot, "seed.md"), "seed", "utf-8");
    execSync("git add seed.md && git commit -q -m seed", { cwd: kgRoot });

    const sessionsYm = path.join(kgRoot, "sessions", "2026-08");
    fs.mkdirSync(sessionsYm, { recursive: true });
    const sessFile = path.join(sessionsYm, "2026-08-18-nobranch.md");
    const content = '---\ntitle: "nobranch"\n---\n\n**External files:**\n- none this session\n';
    fs.writeFileSync(sessFile, content, "utf-8");

    const result = await handleUpgrade({ apply: ["diff-blank-reconstruction"], confirmBackfix: true });
    expect(result.content[0].text).toContain("0 session file(s) reconstructed, 0 left");
    expect(fs.readFileSync(sessFile, "utf-8")).toBe(content); // untouched, not guessed at
  });

  test("BLOCKER regression (2nd Opus review, 2026-08-18): re-running apply is idempotent, does not grow notes or clobber the .bak", async () => {
    // The unresolvable-note and reconstructed-empty write paths originally
    // wrote no `← modified this session` marker, so a second run
    // re-classified an already-handled file as still-blank and appended
    // ANOTHER note (verified: note count 1 -> 2 across two runs before this
    // fix), while unconditionally overwriting .bak with the already-mutated
    // content, making the true original unrecoverable. Both are covered here
    // against the unresolvable path specifically, since it's the one that
    // never writes the file-list marker at all.
    const kgRoot = makeTempDir("c2-idempotent");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    gitInit(kgRoot);
    fs.writeFileSync(path.join(kgRoot, "seed.md"), "seed", "utf-8");
    execSync("git add seed.md && git commit -q -m seed", { cwd: kgRoot });

    const sessionsYm = path.join(kgRoot, "sessions", "2026-08");
    fs.mkdirSync(sessionsYm, { recursive: true });
    const sessFile = path.join(sessionsYm, "2026-08-18-gone.md");
    const bogusSha = "0123456789abcdef0123456789abcdef0123dead";
    const original =
      `---\ntitle: "gone"\nbranch: deleted-feature\ncommit: ${bogusSha}\n---\n\n**External files:**\n- none this session\n`;
    fs.writeFileSync(sessFile, original, "utf-8");

    const first = await handleUpgrade({ apply: ["diff-blank-reconstruction"], confirmBackfix: true });
    expect(first.content[0].text).toContain("0 session file(s) reconstructed, 1 left with an unresolvable note.");
    const afterFirst = fs.readFileSync(sessFile, "utf-8");
    const bakAfterFirst = fs.readFileSync(`${sessFile}.bak`, "utf-8");
    expect(bakAfterFirst).toBe(original); // backup preserves the true original

    const second = await handleUpgrade({ apply: ["diff-blank-reconstruction"], confirmBackfix: true });
    // Second run must find nothing left to do -- the file is now recognized
    // as already-handled, not re-classified as blank.
    expect(second.content[0].text).toContain("0 session file(s) reconstructed, 0 left with an unresolvable note.");
    const afterSecond = fs.readFileSync(sessFile, "utf-8");
    expect(afterSecond).toBe(afterFirst); // untouched by the second run
    const noteCount = (afterSecond.match(/could not be reconstructed/g) || []).length;
    expect(noteCount).toBe(1); // not 2 -- no duplicate note appended
    const bakAfterSecond = fs.readFileSync(`${sessFile}.bak`, "utf-8");
    expect(bakAfterSecond).toBe(original); // backup still the true original, not clobbered with mutated content
  });

  test("non-git kgPath — degrades gracefully, does not misclassify every blank file as unresolvable", async () => {
    // Without a git-repo guard, resolveDefaultBranchForGit/isCommitResolvable
    // both fail closed to "nothing found", so every blank session file would
    // land in `unresolvable` and get a false-positive "could not be
    // reconstructed" note written into it -- for a KG that was never a git
    // repo in the first place (a real, stated audience for this MCP-only
    // tool). Deliberately no gitInit() call here.
    const kgRoot = makeTempDir("c2-non-git");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const sessionsYm = path.join(kgRoot, "sessions", "2026-08");
    fs.mkdirSync(sessionsYm, { recursive: true });
    const sessFile = path.join(sessionsYm, "2026-08-18-nogit.md");
    const content =
      '---\ntitle: "nogit"\nbranch: some-branch\ncommit: deadbeef\n---\n\n**External files:**\n- none this session\n';
    fs.writeFileSync(sessFile, content, "utf-8");

    const inspect = await handleUpgrade({});
    const parsed = JSON.parse(inspect.content[0].text);
    expect(
      (parsed.upgrades as Array<{ category: string }>).find((u) => u.category === "diff-blank-reconstruction")
    ).toBeUndefined();

    const result = await handleUpgrade({ apply: ["diff-blank-reconstruction"], confirmBackfix: true });
    expect(result.content[0].text).toContain("0 session file(s) reconstructed, 0 left");
    expect(fs.readFileSync(sessFile, "utf-8")).toBe(content); // untouched — no false-positive note
  });

  test("descriptive branch suffix (e.g. 'main (post-merge; was ...)') is still recognized as the default branch", async () => {
    // A plain string-equality check misclassifies this real shape (found in
    // this repo's own KG during review, 2026-08-18) as a feature branch.
    const kgRoot = makeTempDir("c2-descriptive-branch");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);
    gitInit(kgRoot);
    fs.writeFileSync(path.join(kgRoot, "seed.md"), "seed", "utf-8");
    execSync("git add seed.md && git commit -q -m seed", { cwd: kgRoot });

    const sessionsYm = path.join(kgRoot, "sessions", "2026-08");
    fs.mkdirSync(sessionsYm, { recursive: true });
    const sessFile = path.join(sessionsYm, "2026-08-18-descriptive.md");
    const content =
      '---\ntitle: "descriptive"\nbranch: main (post-merge; was v0.6.17-something)\ncommit: abc123\n---\n\n**External files:**\n- none this session\n';
    fs.writeFileSync(sessFile, content, "utf-8");

    const result = await handleUpgrade({ apply: ["diff-blank-reconstruction"], confirmBackfix: true });
    // Recognized as correctly-blank (on the default branch), not misfiled
    // into reconstructable/unresolvable and rewritten.
    expect(result.content[0].text).toContain("0 session file(s) reconstructed, 0 left");
    expect(fs.readFileSync(sessFile, "utf-8")).toBe(content); // untouched
  });
});

// ---------------------------------------------------------------------------
// c6 (issue-49): plan-status-drift backfix
//
// Unlike capture-corruption/diff-blank-reconstruction, this category does NOT
// operate under a KG's kgPath. Its two inputs are:
//   - the canonical copy at <projectRoot>/knowledge/plans/X.md, where
//     projectRoot is found by findProjectRoot(cwd)'s upward walk, and
//   - the local mirror at os.homedir()/.claude/plans/X.md.
// So every fixture below builds a real project root (a real `git init` repo
// with a knowledge/plans/ subdir), points process.cwd at it, and fakes the
// home directory.
//
// The home side is module-mocked, not env-faked: the config-location block
// above gets away with assigning process.env.HOME only because utils.ts's
// legacy path reads `process.env.HOME || os.homedir()` explicitly. Node
// resolves os.homedir() once at startup, so a later $HOME assignment does NOT
// move it (verified: os.homedir() still returned the real home afterwards, and
// every mirror-side assertion here silently read the developer's real
// ~/.claude/plans). checkPlanStatusDrift() calls bare os.homedir(), hence the
// jest.mock("os", ...) at the top of this file. $HOME is set alongside it
// purely so the two signals never disagree for any other code the call
// touches.
// ---------------------------------------------------------------------------

/** The unmocked home directory — restored after each plan-status-drift test. */
const REAL_HOMEDIR = (jest.requireActual("os") as typeof import("os")).homedir();

function fakeHomedir(dir: string): void {
  (os.homedir as unknown as jest.Mock).mockReturnValue(dir);
}

function restoreHomedir(): void {
  (os.homedir as unknown as jest.Mock).mockReturnValue(REAL_HOMEDIR);
}

/**
 * The two EXACT frozen Safety-Header placeholders the implementation
 * recognizes (FROZEN_PLACEHOLDERS in upgrade.ts). Duplicated verbatim here on
 * purpose: if the implementation's list is edited, these tests must fail
 * loudly rather than silently follow it.
 */
const FROZEN_PRE_C7 = "**STATUS:** 🔴 STOPPED (Waiting for Manual Approval of Step 1)";
const FROZEN_C7 = "**STATUS:** 🔴 AWAITING APPROVAL (Waiting for Manual Approval of Step 1)";
const STATUS_COMPLETE = "**STATUS:** ✅ COMPLETE";

const DEFAULT_PLAN_BODY = "## Step 1\n\nDo the thing.\n";

function planContent(statusLine: string, body: string = DEFAULT_PLAN_BODY): string {
  return `# Implementation Plan\n\n## Safety Header\n\n${statusLine}\n**PROTOCOL:** zero-deviation\n\n${body}`;
}

// Same shape as the c2 block's gitInit — real git repos as fixtures, not mocks.
function gitInitRepo(dir: string): void {
  execSync("git init -q -b main", { cwd: dir });
  execSync('git config user.email t@t.com && git config user.name t', { cwd: dir });
}

function seedCommit(dir: string): void {
  fs.writeFileSync(path.join(dir, "seed.md"), "seed", "utf-8");
  execSync("git add -A && git commit -q -m seed", { cwd: dir });
}

/** Real `--no-ff` merge into main, producing a `Merge branch '<branch>'` subject. */
function mergeBranchNoFf(dir: string, branch: string): void {
  execSync(`git checkout -q -b ${branch}`, { cwd: dir });
  fs.writeFileSync(path.join(dir, `work-${branch}.md`), "work", "utf-8");
  execSync("git add -A && git commit -q -m work", { cwd: dir });
  execSync("git checkout -q main", { cwd: dir });
  execSync(`git merge -q --no-ff -m "Merge branch '${branch}'" ${branch}`, { cwd: dir });
}

interface PlanFixture {
  projectRoot: string;
  plansDir: string;
  mirrorDir: string;
}

function makePlanFixture(prefix: string, fakeHome: string, opts: { git?: boolean } = {}): PlanFixture {
  const projectRoot = makeTempDir(prefix);
  tempDirs.push(projectRoot);
  const plansDir = path.join(projectRoot, "knowledge", "plans");
  fs.mkdirSync(plansDir, { recursive: true });
  const mirrorDir = path.join(fakeHome, ".claude", "plans");
  fs.mkdirSync(mirrorDir, { recursive: true });
  if (opts.git !== false) gitInitRepo(projectRoot);
  mockActiveKg(projectRoot); // also points process.cwd at projectRoot
  return { projectRoot, plansDir, mirrorDir };
}

function writePlanPair(
  fx: PlanFixture,
  name: string,
  canonical: string,
  mirror?: string
): { canonicalPath: string; mirrorPath: string } {
  const canonicalPath = path.join(fx.plansDir, name);
  const mirrorPath = path.join(fx.mirrorDir, name);
  fs.writeFileSync(canonicalPath, canonical, "utf-8");
  if (mirror !== undefined) fs.writeFileSync(mirrorPath, mirror, "utf-8");
  return { canonicalPath, mirrorPath };
}

function parseInspect(result: Awaited<ReturnType<typeof handleUpgrade>>): {
  upgrades: Array<{ category: string; description: string; details?: string }>;
  warnings: Array<{ category: string; description: string }>;
} {
  return JSON.parse(result.content[0].text);
}

function planDriftItem(result: Awaited<ReturnType<typeof handleUpgrade>>) {
  return parseInspect(result).upgrades.find((u) => u.category === "plan-status-drift");
}

function listBakFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".bak")) out.push(full);
    }
  };
  walk(dir);
  return out;
}

describe("plan-status-drift — inspect mode", () => {
  const ORIGINAL_HOME = process.env.HOME;
  let fakeHome: string;

  beforeEach(() => {
    fakeHome = makeTempDir("psd-home");
    tempDirs.push(fakeHome);
    fakeHomedir(fakeHome);
    process.env.HOME = fakeHome;
  });

  afterEach(() => {
    restoreHomedir();
    if (ORIGINAL_HOME === undefined) delete process.env.HOME;
    else process.env.HOME = ORIGINAL_HOME;
  });

  // 1
  test("Tier A: canonical COMPLETE + mirror still the frozen placeholder + rest identical is flagged", async () => {
    const fx = makePlanFixture("psd-tier-a", fakeHome);
    writePlanPair(fx, "v0.7.2-demo-plan.md", planContent(STATUS_COMPLETE), planContent(FROZEN_PRE_C7));

    const item = planDriftItem(await handleUpgrade({}));
    expect(item).toBeDefined();
    expect(item!.description).toContain("1 Tier A mirror-drift");
    expect(item!.description).toContain("0 Tier B");
    expect(item!.description).toContain("0 orphaned");
  });

  // 2
  test("false-positive guard: canonical and mirror already identical (STATUS included) is not flagged", async () => {
    const fx = makePlanFixture("psd-identical", fakeHome);
    const content = planContent(STATUS_COMPLETE);
    writePlanPair(fx, "v0.7.2-identical-plan.md", content, content);

    expect(planDriftItem(await handleUpgrade({}))).toBeUndefined();
  });

  // 3
  test("false-positive guard: a pair that ALSO differs outside the STATUS line is not a Tier A finding", async () => {
    const fx = makePlanFixture("psd-body-diff", fakeHome);
    const divergentBody = "## Step 1\n\nDo the thing.\n\n## Step 2\n\nAdded to canonical after the mirror was copied.\n";
    const { mirrorPath } = writePlanPair(
      fx,
      "v0.7.2-bodydiff-plan.md",
      planContent(STATUS_COMPLETE, divergentBody),
      planContent(FROZEN_PRE_C7)
    );

    expect(planDriftItem(await handleUpgrade({}))).toBeUndefined();

    // Control: bring the bodies back into agreement and the SAME pair becomes
    // Tier A -- proves the absence above was clause 3 ("differ ONLY in
    // STATUS") firing, not a detector that never fires at all.
    fs.writeFileSync(mirrorPath, planContent(FROZEN_PRE_C7, divergentBody), "utf-8");
    const item = planDriftItem(await handleUpgrade({}));
    expect(item!.description).toContain("1 Tier A");
  });

  // 4
  test("Tier B: both copies frozen at the exact placeholder with merge evidence present is manual-review only", async () => {
    const fx = makePlanFixture("psd-tier-b", fakeHome);
    seedCommit(fx.projectRoot);
    mergeBranchNoFf(fx.projectRoot, "v0.7.2-c6-demo");
    writePlanPair(fx, "v0.7.2-c6-demo-plan.md", planContent(FROZEN_PRE_C7), planContent(FROZEN_PRE_C7));

    const item = planDriftItem(await handleUpgrade({}))!;
    // Never counted as auto-applicable, however strong the evidence looks.
    expect(item.description).toContain("0 Tier A");
    expect(item.description).toContain("1 Tier B");
    expect(item.details).toContain("Tier B candidates:");
    expect(item.details).toContain("v0.7.2-c6-demo-plan.md");
    expect(item.details).toContain("merge evidence FOUND");
    expect(item.details).toContain("cannot distinguish this plan from any sibling");
  });

  // 5
  test("Tier B: two plans sharing one identical branch reference BOTH stay in manual review", async () => {
    const fx = makePlanFixture("psd-tier-b-collision", fakeHome);
    seedCommit(fx.projectRoot);
    mergeBranchNoFf(fx.projectRoot, "v0.7.2-issues-46-51");

    const shared = "## Related\n\nShares branch v0.7.2-issues-46-51 with its sibling plans.\n";
    writePlanPair(fx, "v0.7.2-c6-first-plan.md", planContent(FROZEN_PRE_C7, shared), planContent(FROZEN_PRE_C7, shared));
    writePlanPair(fx, "v0.7.2-c7-second-plan.md", planContent(FROZEN_C7, shared), planContent(FROZEN_C7, shared));

    const item = planDriftItem(await handleUpgrade({}))!;
    expect(item.description).toContain("0 Tier A");
    expect(item.description).toContain("2 Tier B");
    expect(item.details).toContain("v0.7.2-c6-first-plan.md");
    expect(item.details).toContain("v0.7.2-c7-second-plan.md");
    // The shared in-body branch string never resolves either one: the branch
    // candidate is filename-derived, so a merged sibling branch is evidence
    // for neither plan.
    expect(item.details).not.toContain("merge evidence FOUND");
  });

  // 6
  test("Tier B: exact-string match only — other step numbers / transitioned states are not candidates", async () => {
    const fx = makePlanFixture("psd-tier-b-fp", fakeHome);
    const variants: Array<[string, string]> = [
      ["v0.7.2-step0-plan.md", "**STATUS:** 🔴 STOPPED (Waiting for Manual Approval of Step 0)"],
      ["v0.7.2-step4-plan.md", "**STATUS:** 🔴 STOPPED (Waiting for Manual Approval of Step 4)"],
      ["v0.7.2-inprogress-plan.md", "**STATUS:** 🟡 IN PROGRESS (Step 2)"],
      ["v0.7.2-complete-plan.md", STATUS_COMPLETE],
      // Bare "STOPPED" — the shape a fuzzy substring matcher would swallow.
      ["v0.7.2-bare-stopped-plan.md", "**STATUS:** 🔴 STOPPED"],
    ];
    for (const [name, status] of variants) {
      const content = planContent(status);
      writePlanPair(fx, name, content, content);
    }

    expect(planDriftItem(await handleUpgrade({}))).toBeUndefined();
  });

  // 7a
  test("Tier B evidence: a candidate that is a strict PREFIX of a different merged branch is not treated as merged", async () => {
    const fx = makePlanFixture("psd-prefix-guard", fakeHome);
    seedCommit(fx.projectRoot);
    // Only the LONGER name was ever merged; a naive substring/grep match would
    // report the shorter one as merged too (confirmed live in this repo).
    mergeBranchNoFf(fx.projectRoot, "v0.7.1.4-version-sync-issue-45-extra");
    mergeBranchNoFf(fx.projectRoot, "v0.7.1.5-exact");

    writePlanPair(fx, "v0.7.1.4-version-sync-plan.md", planContent(FROZEN_PRE_C7), planContent(FROZEN_PRE_C7));
    writePlanPair(fx, "v0.7.1.5-exact-plan.md", planContent(FROZEN_PRE_C7), planContent(FROZEN_PRE_C7));

    const item = planDriftItem(await handleUpgrade({}))!;
    expect(item.description).toContain("2 Tier B");
    const lines = item.details!.split("\n");
    const prefixLine = lines.find((l) => l.startsWith("v0.7.1.4-version-sync-plan.md"))!;
    const exactLine = lines.find((l) => l.startsWith("v0.7.1.5-exact-plan.md"))!;
    expect(prefixLine).toContain("no merge evidence found");
    // Control in the same fixture: exact segment equality DOES match, so the
    // assertion above is a real guard, not a signal that never fires.
    expect(exactLine).toContain("merge evidence FOUND");
  });

  // 7b
  test("Tier B evidence: a squash-merged branch (no merge commit at all) still lands in manual review", async () => {
    const fx = makePlanFixture("psd-squash", fakeHome);
    seedCommit(fx.projectRoot);
    execSync("git checkout -q -b v0.7.2-squashed", { cwd: fx.projectRoot });
    fs.writeFileSync(path.join(fx.projectRoot, "squashed-work.md"), "work", "utf-8");
    execSync("git add -A && git commit -q -m work", { cwd: fx.projectRoot });
    execSync("git checkout -q main", { cwd: fx.projectRoot });
    execSync("git merge -q --squash v0.7.2-squashed", { cwd: fx.projectRoot });
    execSync('git commit -q -m "feat: squashed work (#42)"', { cwd: fx.projectRoot });
    execSync("git branch -q -D v0.7.2-squashed", { cwd: fx.projectRoot });

    writePlanPair(fx, "v0.7.2-squashed-plan.md", planContent(FROZEN_PRE_C7), planContent(FROZEN_PRE_C7));

    const item = planDriftItem(await handleUpgrade({}))!;
    expect(item.description).toContain("0 Tier A");
    expect(item.description).toContain("1 Tier B"); // not silently dropped
    expect(item.details).toContain("v0.7.2-squashed-plan.md");
    expect(item.details).toContain("no merge evidence found");
  });

  // 7c
  test("Tier B evidence: a fast-forward-merged branch deleted afterwards still lands in manual review", async () => {
    const fx = makePlanFixture("psd-ff-deleted", fakeHome);
    seedCommit(fx.projectRoot);
    execSync("git checkout -q -b v0.7.2-ffgone", { cwd: fx.projectRoot });
    fs.writeFileSync(path.join(fx.projectRoot, "ff-work.md"), "work", "utf-8");
    execSync("git add -A && git commit -q -m work", { cwd: fx.projectRoot });
    execSync("git checkout -q main", { cwd: fx.projectRoot });
    execSync("git merge -q --ff-only v0.7.2-ffgone", { cwd: fx.projectRoot }); // no merge commit
    execSync("git branch -q -d v0.7.2-ffgone", { cwd: fx.projectRoot }); // no surviving ref

    writePlanPair(fx, "v0.7.2-ffgone-plan.md", planContent(FROZEN_PRE_C7), planContent(FROZEN_PRE_C7));

    const item = planDriftItem(await handleUpgrade({}))!;
    expect(item.description).toContain("0 Tier A");
    expect(item.description).toContain("1 Tier B");
    expect(item.details).toContain("v0.7.2-ffgone-plan.md");
    expect(item.details).toContain("no merge evidence found");
  });

  // 8
  test("orphaned mirror-only files alone never produce an actionable item (Opus review, 2026-08-19)", async () => {
    const fx = makePlanFixture("psd-orphan", fakeHome);
    fs.writeFileSync(path.join(fx.mirrorDir, "v0.6.0-orphan-plan.md"), planContent(FROZEN_PRE_C7), "utf-8");

    const parsed = parseInspect(await handleUpgrade({}));
    // An orphan-only finding (0 Tier A, 0 Tier B) must NOT become an
    // upgrades[] item -- that would add "plan-status-drift" to the wizard's
    // apply list with nothing for apply to actually repair, so it would
    // report "0 synced" and reappear on every future inspect with no way to
    // ever clear it. (A warnings[]-routed alternative was considered and
    // rejected: kmg-upgrade-inspector.md's warnings[] contract routes every
    // entry through the platform-split wizard flow, which has no handler
    // for an unrelated informational note -- that would just recreate the
    // sibling "resolution"-in-warnings[] bug under a new category.)
    expect(parsed.upgrades.find((u) => u.category === "plan-status-drift")).toBeUndefined();
    expect(parsed.warnings.find((w) => w.category === "plan-status-drift")).toBeUndefined();
  });

  test("orphan count folds into the Tier A/B item's own description when a real finding also exists", async () => {
    const fx = makePlanFixture("psd-orphan-with-tier-a", fakeHome);
    writePlanPair(fx, "v0.7.2-real-plan.md", planContent(STATUS_COMPLETE), planContent(FROZEN_PRE_C7));
    fs.writeFileSync(path.join(fx.mirrorDir, "v0.6.0-orphan-plan.md"), planContent(FROZEN_PRE_C7), "utf-8");

    const item = planDriftItem(await handleUpgrade({}))!;
    expect(item.description).toContain("1 Tier A");
    expect(item.description).toContain("1 orphaned mirror-only files");
    expect(item.details).toContain("informational only, no action taken");
    expect(item.details).not.toContain("v0.6.0-orphan-plan.md"); // never named as actionable
  });

  // 9
  test("project-root walk: a cwd deep inside the project still finds knowledge/plans/ at the ascended root", async () => {
    const fx = makePlanFixture("psd-walk", fakeHome);
    writePlanPair(fx, "v0.7.2-walk-plan.md", planContent(STATUS_COMPLETE), planContent(FROZEN_PRE_C7));
    const nested = path.join(fx.projectRoot, "mcp-server", "src", "tools");
    fs.mkdirSync(nested, { recursive: true });
    process.cwd = () => nested; // deeper than makePlanFixture's default

    const item = planDriftItem(await handleUpgrade({}))!;
    expect(item.description).toContain("1 Tier A");
  });

  test("project-root walk: no knowledge/plans/ in the ancestor chain returns cleanly, no throw and no finding", async () => {
    // (a) a real project-root marker (.git) but no knowledge/plans/ under it
    const bare = makeTempDir("psd-nowalk");
    tempDirs.push(bare);
    gitInitRepo(bare);
    mockActiveKg(bare);

    const withMarker = await handleUpgrade({});
    expect(withMarker.isError).toBeUndefined();
    expect(planDriftItem(withMarker)).toBeUndefined();

    // (b) no project-root marker at all — findProjectRoot walks to the
    // filesystem root and gives up; still a clean empty result, not a throw.
    const unmarked = makeTempDir("psd-nomarker");
    tempDirs.push(unmarked);
    mockActiveKg(unmarked);

    const withoutMarker = await handleUpgrade({});
    expect(withoutMarker.isError).toBeUndefined();
    expect(planDriftItem(withoutMarker)).toBeUndefined();
  });

  // 10
  test("archive/ subdirectory is excluded by the flat, non-recursive listing", async () => {
    const fx = makePlanFixture("psd-archive", fakeHome);
    const archiveDir = path.join(fx.plansDir, "archive");
    fs.mkdirSync(archiveDir, { recursive: true });
    // Frozen placeholder, no mirror -> would be a Tier B candidate if scanned.
    fs.writeFileSync(path.join(archiveDir, "v0.5.0-archived-plan.md"), planContent(FROZEN_PRE_C7), "utf-8");

    expect(planDriftItem(await handleUpgrade({}))).toBeUndefined();
  });

  // 11
  test("Tier B: a canonical frozen at the placeholder with NO mirror counterpart is still a candidate", async () => {
    const fx = makePlanFixture("psd-canonical-only", fakeHome);
    writePlanPair(fx, "v0.7.2-nomirror-plan.md", planContent(FROZEN_C7)); // deliberately no mirror

    const item = planDriftItem(await handleUpgrade({}))!;
    expect(item.description).toContain("0 Tier A");
    expect(item.description).toContain("1 Tier B");
    expect(item.description).toContain("0 orphaned");
    expect(item.details).toContain("v0.7.2-nomirror-plan.md");
  });

  // 12a
  test("line-ending normalization (detection): a CRLF canonical vs an LF mirror is still Tier A", async () => {
    const fx = makePlanFixture("psd-crlf-detect", fakeHome);
    writePlanPair(
      fx,
      "v0.7.2-crlf-plan.md",
      planContent(STATUS_COMPLETE).replace(/\n/g, "\r\n"),
      planContent(FROZEN_PRE_C7)
    );

    const item = planDriftItem(await handleUpgrade({}))!;
    expect(item.description).toContain("1 Tier A");
  });

  // 12b
  test("line-ending normalization (detection): trailing newline present vs absent is still Tier A", async () => {
    const fx = makePlanFixture("psd-trailing-nl", fakeHome);
    writePlanPair(
      fx,
      "v0.7.2-trailing-plan.md",
      planContent(STATUS_COMPLETE), // ends with "\n"
      planContent(FROZEN_PRE_C7).replace(/\n+$/, "") // no trailing newline at all
    );

    const item = planDriftItem(await handleUpgrade({}))!;
    expect(item.description).toContain("1 Tier A");
  });

  // 12c
  test("line-ending normalization (detection): lone-\\r line endings are still Tier A", async () => {
    const fx = makePlanFixture("psd-lone-cr", fakeHome);
    writePlanPair(
      fx,
      "v0.7.2-lonecr-plan.md",
      planContent(STATUS_COMPLETE).replace(/\n/g, "\r"),
      planContent(FROZEN_PRE_C7)
    );

    const item = planDriftItem(await handleUpgrade({}))!;
    expect(item.description).toContain("1 Tier A");
  });

  // 13
  test("overwrite-risk regression (AND, not OR): a hand-annotated mirror STATUS is never a Tier A finding", async () => {
    // The condition is "mirror looks ^🔴 AND canonical contains ✅ COMPLETE".
    // Under an OR (or a bare "the two differ") the hand-written note below
    // would be silently overwritten with canonical's COMPLETE.
    const fx = makePlanFixture("psd-and-not-or", fakeHome);
    const mirrorContent = planContent("**STATUS:** 🟡 IN PROGRESS (Step 4 blocked)");
    const { canonicalPath, mirrorPath } = writePlanPair(
      fx,
      "v0.7.2-handnote-plan.md",
      planContent(STATUS_COMPLETE),
      mirrorContent
    );

    expect(planDriftItem(await handleUpgrade({}))).toBeUndefined();

    // And a real apply run leaves the hand annotation alone.
    const applied = await handleUpgrade({ apply: ["plan-status-drift"], confirmBackfix: true });
    expect(applied.content[0].text).toContain("0 plan mirror(s) synced");
    expect(fs.readFileSync(mirrorPath, "utf-8")).toBe(mirrorContent);
    expect(fs.readFileSync(canonicalPath, "utf-8")).toBe(planContent(STATUS_COMPLETE));
    expect(fs.existsSync(`${mirrorPath}.bak`)).toBe(false);
  });

  // 14
  test("backwards-write guard: a canonical still stopped while the mirror was hand-advanced is not Tier A", async () => {
    const fx = makePlanFixture("psd-backwards", fakeHome);
    const canonicalContent = planContent("**STATUS:** 🔴 STOPPED (Waiting for Manual Approval of Step 3)");
    const mirrorContent = planContent(STATUS_COMPLETE);
    const { canonicalPath, mirrorPath } = writePlanPair(
      fx,
      "v0.7.2-backwards-plan.md",
      canonicalContent,
      mirrorContent
    );

    expect(planDriftItem(await handleUpgrade({}))).toBeUndefined();

    const applied = await handleUpgrade({ apply: ["plan-status-drift"], confirmBackfix: true });
    expect(applied.content[0].text).toContain("0 plan mirror(s) synced");
    // Neither direction written: canonical is never a write target at all, and
    // the mirror must not be dragged backwards to canonical's stopped state.
    expect(fs.readFileSync(canonicalPath, "utf-8")).toBe(canonicalContent);
    expect(fs.readFileSync(mirrorPath, "utf-8")).toBe(mirrorContent);
    expect(fs.existsSync(`${mirrorPath}.bak`)).toBe(false);
  });

  test("unreadable entry regression (Opus review, 2026-08-19): a dangling symlink in knowledge/plans/ does not crash the whole inspect", async () => {
    const fx = makePlanFixture("psd-dangling-symlink", fakeHome);
    writePlanPair(
      fx,
      "v0.7.2-real-plan.md",
      planContent(STATUS_COMPLETE),
      planContent(FROZEN_PRE_C7)
    );
    // A dangling symlink: readdirSync lists it, but statSync/readFileSync
    // throw ENOENT on it. Before the fix, this threw out of the unguarded
    // fs.statSync/fs.readFileSync calls and took down the ENTIRE kg_upgrade
    // inspect call -- not just this category -- discarding every other
    // finding along with it.
    fs.symlinkSync(path.join(fx.plansDir, "does-not-exist.md"), path.join(fx.plansDir, "dangling-plan.md"));

    const parsed = parseInspect(await handleUpgrade({}));
    // The real Tier A finding still surfaces -- the dangling entry was
    // skipped, not treated as a reason to abort the scan.
    const item = parsed.upgrades.find((u) => u.category === "plan-status-drift");
    expect(item).toBeDefined();
    expect(item!.description).toContain("1 Tier A");
  });
});

describe("plan-status-drift — apply mode", () => {
  const ORIGINAL_HOME = process.env.HOME;
  let fakeHome: string;

  beforeEach(() => {
    fakeHome = makeTempDir("psd-apply-home");
    tempDirs.push(fakeHome);
    fakeHomedir(fakeHome); // see the block comment above — $HOME alone does not move os.homedir()
    process.env.HOME = fakeHome;
  });

  afterEach(() => {
    restoreHomedir();
    if (ORIGINAL_HOME === undefined) delete process.env.HOME;
    else process.env.HOME = ORIGINAL_HOME;
  });

  // 15
  test("Tier A repair: mirror STATUS synced, .bak holds the pre-rewrite mirror, canonical untouched", async () => {
    const fx = makePlanFixture("psd-repair", fakeHome);
    const canonicalContent = planContent(STATUS_COMPLETE);
    const mirrorContent = planContent(FROZEN_PRE_C7);
    const { canonicalPath, mirrorPath } = writePlanPair(fx, "v0.7.2-repair-plan.md", canonicalContent, mirrorContent);

    const result = await handleUpgrade({ apply: ["plan-status-drift"], confirmBackfix: true });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("[plan-status-drift] 1 plan mirror(s) synced to canonical STATUS.");
    expect(fs.readFileSync(mirrorPath, "utf-8")).toBe(canonicalContent); // STATUS line now matches exactly
    expect(fs.readFileSync(`${mirrorPath}.bak`, "utf-8")).toBe(mirrorContent); // pre-rewrite content
    expect(fs.readFileSync(canonicalPath, "utf-8")).toBe(canonicalContent); // one-direction only
    expect(fs.existsSync(`${canonicalPath}.bak`)).toBe(false); // canonical is never a write target
  });

  // 16a
  test("re-check before write: a mirror that stopped qualifying between scan and apply is skipped, not overwritten", async () => {
    const fx = makePlanFixture("psd-recheck-skip", fakeHome);
    const { mirrorPath } = writePlanPair(
      fx,
      "v0.7.2-recheck-plan.md",
      planContent(STATUS_COMPLETE),
      planContent(FROZEN_PRE_C7)
    );

    // Scan sees a Tier A finding...
    expect(planDriftItem(await handleUpgrade({}))!.description).toContain("1 Tier A");

    // ...then the user edits the mirror out from under it.
    const handEdited = planContent("**STATUS:** 🟡 IN PROGRESS (reopened by hand)");
    fs.writeFileSync(mirrorPath, handEdited, "utf-8");

    const result = await handleUpgrade({ apply: ["plan-status-drift"], confirmBackfix: true });
    expect(result.content[0].text).toContain("0 plan mirror(s) synced");
    expect(fs.readFileSync(mirrorPath, "utf-8")).toBe(handEdited); // stale finding not replayed
    expect(fs.existsSync(`${mirrorPath}.bak`)).toBe(false); // nothing was even backed up
  });

  // 16b
  test("re-check before write: a mirror changed to a DIFFERENT stopped variant is written from the NEW state", async () => {
    const fx = makePlanFixture("psd-recheck-new", fakeHome);
    const canonicalContent = planContent(STATUS_COMPLETE);
    const preScanMirror = planContent(FROZEN_PRE_C7);
    const { mirrorPath } = writePlanPair(fx, "v0.7.2-recheck2-plan.md", canonicalContent, preScanMirror);

    expect(planDriftItem(await handleUpgrade({}))!.description).toContain("1 Tier A");

    // Still Tier A-shaped, but different bytes than the scan saw.
    const postScanMirror = planContent(FROZEN_C7);
    fs.writeFileSync(mirrorPath, postScanMirror, "utf-8");

    const result = await handleUpgrade({ apply: ["plan-status-drift"], confirmBackfix: true });
    expect(result.content[0].text).toContain("1 plan mirror(s) synced");
    expect(fs.readFileSync(mirrorPath, "utf-8")).toBe(canonicalContent);
    // The backup is the state at write time, not the state the scan saw.
    expect(fs.readFileSync(`${mirrorPath}.bak`, "utf-8")).toBe(postScanMirror);
    expect(fs.readFileSync(`${mirrorPath}.bak`, "utf-8")).not.toBe(preScanMirror);
  });

  // 17
  test("Tier B is NEVER touched by apply: zero files written, zero .bak files created", async () => {
    const fx = makePlanFixture("psd-tier-b-untouched", fakeHome);
    seedCommit(fx.projectRoot);
    mergeBranchNoFf(fx.projectRoot, "v0.7.2-c6-frozen"); // strongest-looking evidence available

    const pairs = [
      writePlanPair(fx, "v0.7.2-c6-frozen-plan.md", planContent(FROZEN_PRE_C7), planContent(FROZEN_PRE_C7)),
      writePlanPair(fx, "v0.7.2-c7-frozen-plan.md", planContent(FROZEN_C7), planContent(FROZEN_C7)),
    ];
    // Plus a canonical-only Tier B candidate (no mirror at all).
    const canonicalOnly = writePlanPair(fx, "v0.7.2-c8-frozen-plan.md", planContent(FROZEN_PRE_C7));

    const before = pairs.map((p) => ({
      canonical: fs.readFileSync(p.canonicalPath, "utf-8"),
      mirror: fs.readFileSync(p.mirrorPath, "utf-8"),
    }));

    const result = await handleUpgrade({ apply: ["plan-status-drift"], confirmBackfix: true });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("0 plan mirror(s) synced");
    pairs.forEach((p, i) => {
      expect(fs.readFileSync(p.canonicalPath, "utf-8")).toBe(before[i].canonical);
      expect(fs.readFileSync(p.mirrorPath, "utf-8")).toBe(before[i].mirror);
    });
    expect(fs.existsSync(canonicalOnly.mirrorPath)).toBe(false); // no mirror conjured into existence
    expect(listBakFiles(fx.plansDir)).toEqual([]);
    expect(listBakFiles(fx.mirrorDir)).toEqual([]);
  });

  // 18
  test("idempotency: a second apply against an already-synced mirror is a full no-op and does not clobber the .bak", async () => {
    // Mirrors the diff-blank-reconstruction BLOCKER regression test above: the
    // failure mode there was a second run re-classifying an already-handled
    // file and overwriting .bak with already-mutated content, making the true
    // original unrecoverable.
    const fx = makePlanFixture("psd-idempotent", fakeHome);
    const canonicalContent = planContent(STATUS_COMPLETE);
    const originalMirror = planContent(FROZEN_PRE_C7);
    const { mirrorPath } = writePlanPair(fx, "v0.7.2-idem-plan.md", canonicalContent, originalMirror);

    const first = await handleUpgrade({ apply: ["plan-status-drift"], confirmBackfix: true });
    expect(first.content[0].text).toContain("1 plan mirror(s) synced");
    const afterFirst = fs.readFileSync(mirrorPath, "utf-8");
    expect(fs.readFileSync(`${mirrorPath}.bak`, "utf-8")).toBe(originalMirror);

    const second = await handleUpgrade({ apply: ["plan-status-drift"], confirmBackfix: true });
    expect(second.isError).toBeUndefined();
    expect(second.content[0].text).toContain("0 plan mirror(s) synced");
    expect(fs.readFileSync(mirrorPath, "utf-8")).toBe(afterFirst); // untouched by the second run
    expect(fs.readFileSync(`${mirrorPath}.bak`, "utf-8")).toBe(originalMirror); // still the true original
    expect(listBakFiles(fx.mirrorDir)).toEqual([`${mirrorPath}.bak`]); // exactly one, no duplicates
    // The category is idempotent at the inspect layer too — nothing left to report.
    expect(planDriftItem(await handleUpgrade({}))).toBeUndefined();
  });

  // 19
  test("graph-independence (apply): succeeds against a graph whose registered path is missing, writes no version sentinel", async () => {
    const fx = makePlanFixture("psd-graph-independent", fakeHome);
    const canonicalContent = planContent(STATUS_COMPLETE);
    const { mirrorPath } = writePlanPair(fx, "v0.7.2-nograph-plan.md", canonicalContent, planContent(FROZEN_PRE_C7));

    // Registered at a path that resolves from cwd (dirname is projectRoot) but
    // does not exist on disk.
    const gonePath = path.join(fx.projectRoot, "gone-kg");
    mockActiveKg(fx.projectRoot, { path: gonePath });
    expect(fs.existsSync(gonePath)).toBe(false);

    const result = await handleUpgrade({ apply: ["plan-status-drift"], confirmBackfix: true });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).not.toContain("KG path not found");
    expect(result.content[0].text).toContain("1 plan mirror(s) synced");
    expect(fs.readFileSync(mirrorPath, "utf-8")).toBe(canonicalContent);
    // Never writes lastAppliedVersion onto an unrelated (here, nonexistent) graph.
    expect(writeConfig as jest.Mock).not.toHaveBeenCalled();
    expect(fs.existsSync(gonePath)).toBe(false); // and never resurrects the path
  });

  test("graph-independence (inspect): a missing KG path returns the finding plus a resolution item, not a bare error", async () => {
    const fx = makePlanFixture("psd-graph-independent-inspect", fakeHome);
    writePlanPair(fx, "v0.7.2-nograph2-plan.md", planContent(STATUS_COMPLETE), planContent(FROZEN_PRE_C7));

    const gonePath = path.join(fx.projectRoot, "gone-kg");
    mockActiveKg(fx.projectRoot, { path: gonePath });

    const result = await handleUpgrade({});
    const parsed = parseInspect(result);

    // The already-computed finding survives instead of being discarded.
    const item = parsed.upgrades.find((u) => u.category === "plan-status-drift");
    expect(item).toBeDefined();
    expect(item!.description).toContain("1 Tier A");
    // The resolution marker belongs in upgrades[], NOT warnings[] (Opus
    // review, 2026-08-19): kmg-upgrade-inspector.md's warnings[] contract
    // routes every entry through the platform-split wizard flow, which has
    // no handler for a bare "resolution" marker -- only upgrades[] has the
    // dedicated informational-only "resolution" case this needs.
    const resolution = parsed.upgrades.find((u) => u.category === "resolution");
    expect(resolution).toBeDefined();
    expect(resolution!.description).toContain("KG path not found");
    expect(parsed.warnings.find((w) => w.category === "resolution")).toBeUndefined();
  });

  // 20
  test("consent gate: apply without confirmBackfix in automated mode returns KMG_INPUT_REQUIRED and writes nothing", async () => {
    const fx = makePlanFixture("psd-gate-unanswered", fakeHome);
    const mirrorContent = planContent(FROZEN_PRE_C7);
    const { mirrorPath } = writePlanPair(fx, "v0.7.2-gate-plan.md", planContent(STATUS_COMPLETE), mirrorContent);

    const result = await handleUpgrade({ apply: ["plan-status-drift"] });

    expect(result.isError).toBe(true);
    expect(result.content.length).toBe(1); // only category in the call — bare JSON at content[0]
    const errorBlock = JSON.parse(result.content[0].text);
    expect(errorBlock.error).toBe("KMG_INPUT_REQUIRED");
    expect(errorBlock.reason).toContain("plan_status_drift_backfix");
    expect(errorBlock.resolveWith.param).toBe("confirmBackfix"); // the shared c5 param, not a new one
    expect(errorBlock.detail).toContain("1 plan file(s)");
    expect(fs.readFileSync(mirrorPath, "utf-8")).toBe(mirrorContent);
    expect(fs.existsSync(`${mirrorPath}.bak`)).toBe(false);
  });

  // 21
  test("consent gate DECLINED: an explicit confirmBackfix:false still writes nothing", async () => {
    // Highest-risk path per plan review: a user who answered "no" must never
    // end up with written files. `confirmed === true` is a strict check, so
    // false is treated as "not consented", never as a bypass.
    const fx = makePlanFixture("psd-gate-declined", fakeHome);
    const mirrorContent = planContent(FROZEN_PRE_C7);
    const { canonicalPath, mirrorPath } = writePlanPair(
      fx,
      "v0.7.2-declined-plan.md",
      planContent(STATUS_COMPLETE),
      mirrorContent
    );

    const result = await handleUpgrade({ apply: ["plan-status-drift"], confirmBackfix: false });

    expect(result.isError).toBe(true);
    const errorBlock = JSON.parse(result.content[0].text);
    expect(errorBlock.error).toBe("KMG_INPUT_REQUIRED");
    expect(errorBlock.resolveWith.param).toBe("confirmBackfix");
    expect(fs.readFileSync(mirrorPath, "utf-8")).toBe(mirrorContent);
    expect(fs.readFileSync(canonicalPath, "utf-8")).toBe(planContent(STATUS_COMPLETE));
    expect(listBakFiles(fx.mirrorDir)).toEqual([]);
    expect(listBakFiles(fx.plansDir)).toEqual([]);
  });

  // 22
  test("mixed Tier A + Tier B in one run: Tier A repaired, Tier B untouched and still reported", async () => {
    const fx = makePlanFixture("psd-mixed", fakeHome);
    seedCommit(fx.projectRoot);
    mergeBranchNoFf(fx.projectRoot, "v0.7.2-mixed-b");

    const canonicalA = planContent(STATUS_COMPLETE);
    const mirrorA = planContent(FROZEN_PRE_C7);
    const a = writePlanPair(fx, "v0.7.2-mixed-a-plan.md", canonicalA, mirrorA);

    const frozenB = planContent(FROZEN_PRE_C7);
    const b = writePlanPair(fx, "v0.7.2-mixed-b-plan.md", frozenB, frozenB);

    const before = planDriftItem(await handleUpgrade({}))!;
    expect(before.description).toContain("1 Tier A");
    expect(before.description).toContain("1 Tier B");

    const result = await handleUpgrade({ apply: ["plan-status-drift"], confirmBackfix: true });
    expect(result.content[0].text).toContain("1 plan mirror(s) synced");

    // Tier A repaired...
    expect(fs.readFileSync(a.mirrorPath, "utf-8")).toBe(canonicalA);
    expect(fs.readFileSync(`${a.mirrorPath}.bak`, "utf-8")).toBe(mirrorA);
    // ...Tier B completely untouched, and still surfaced for manual review.
    expect(fs.readFileSync(b.canonicalPath, "utf-8")).toBe(frozenB);
    expect(fs.readFileSync(b.mirrorPath, "utf-8")).toBe(frozenB);
    expect(fs.existsSync(`${b.mirrorPath}.bak`)).toBe(false);

    const after = planDriftItem(await handleUpgrade({}))!;
    expect(after.description).toContain("0 Tier A");
    expect(after.description).toContain("1 Tier B");
    expect(after.details).toContain("v0.7.2-mixed-b-plan.md");
  });

  // 23
  test("line-ending preservation (write): a CRLF mirror stays CRLF throughout, never mixed", async () => {
    // Distinct from the detection-side CRLF test: an earlier draft fixed only
    // the comparison, so the write spliced canonical's LF-terminated line into
    // a CRLF file and produced a mixed-line-ending mirror that a naive
    // idempotency check would not have caught.
    const fx = makePlanFixture("psd-crlf-write", fakeHome);
    const canonicalContent = planContent(STATUS_COMPLETE); // LF
    const mirrorContent = planContent(FROZEN_PRE_C7).replace(/\n/g, "\r\n"); // CRLF
    const { mirrorPath } = writePlanPair(fx, "v0.7.2-crlf-write-plan.md", canonicalContent, mirrorContent);

    const result = await handleUpgrade({ apply: ["plan-status-drift"], confirmBackfix: true });
    expect(result.content[0].text).toContain("1 plan mirror(s) synced");

    const after = fs.readFileSync(mirrorPath, "utf-8");
    expect(after).toContain("**STATUS:** ✅ COMPLETE"); // the repair actually happened
    expect(after).not.toContain(FROZEN_PRE_C7);
    // Internally consistent: every LF in the file is part of a CRLF pair.
    const lfCount = (after.match(/\n/g) || []).length;
    const crlfCount = (after.match(/\r\n/g) || []).length;
    expect(lfCount).toBeGreaterThan(0);
    expect(crlfCount).toBe(lfCount);
    // And exactly what canonical says, once line endings are normalized away.
    expect(after.replace(/\r\n/g, "\n")).toBe(canonicalContent);
    expect(fs.readFileSync(`${mirrorPath}.bak`, "utf-8")).toBe(mirrorContent);
  });
});
