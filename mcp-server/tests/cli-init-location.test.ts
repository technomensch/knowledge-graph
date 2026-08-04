import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { resolveInitLocation } from "../src/cli.js";
import { resolveRegistrationGuard, scaffoldGraphDirectory } from "../src/tools/config.js";
import { KgConfig } from "../src/utils.js";

// ---------------------------------------------------------------------------
// resolveInitLocation — storage-location menu resolution
// ---------------------------------------------------------------------------
//
// Covers the v0.6.20 fix: choice "2" (home) previously collided with a new
// named "global topic" KG because there was no dedicated location option
// that included the KG name in the path — any second KG created via "home"
// would overlay the personal KG's own directories at bare ~/.kmgraph/.

describe("resolveInitLocation", () => {
  test('choice "1" resolves to ./knowledge relative to cwd', () => {
    const resolved = resolveInitLocation("1", "my-kg");
    expect(resolved).toBe(path.resolve("knowledge"));
  });

  test('choice "2" (home/personal) resolves to bare ~/.kmgraph with no name subfolder', () => {
    const resolved = resolveInitLocation("2", "my-kg");
    expect(resolved).toBe(path.join("~", ".kmgraph"));
    expect(resolved).not.toContain("my-kg");
  });

  test('choice "3" (global topic) includes the KG name as its own subfolder, not overlaying the personal KG', () => {
    const resolved = resolveInitLocation("3", "ai-research");
    expect(resolved).toBe(path.join("~", ".kmgraph", "knowledge-graphs", "ai-research"));
    expect(resolved).not.toBe(path.join("~", ".kmgraph"));
  });

  test('choice "3" produces a distinct path per KG name (no collision between two global-topic KGs)', () => {
    const first = resolveInitLocation("3", "ai-research");
    const second = resolveInitLocation("3", "career-prism");
    expect(first).not.toBe(second);
  });

  test('choice "4" (custom) returns null, signaling the caller must prompt interactively', () => {
    expect(resolveInitLocation("4", "my-kg")).toBeNull();
  });

  test("unrecognized choice defaults to ./knowledge", () => {
    const resolved = resolveInitLocation("9", "my-kg");
    expect(resolved).toBe(path.resolve("knowledge"));
  });
});

// ---------------------------------------------------------------------------
// resolveRegistrationGuard / scaffoldGraphDirectory — ENH-051 dedup
// (ADR-067 Task 8.2)
// ---------------------------------------------------------------------------
//
// Task 4.1 added the broad-ancestor/hard-block guard directly to cli.ts (it
// landed before this dedup could happen and couldn't wait). This task folds
// that duplicated guard call, plus the near-identical path-resolution and
// directory/template-scaffolding logic, into two shared functions exported
// from tools/config.ts that both cli.ts's interactive `runInit()` and this
// file's `kg_config_init` handler now call -- proving the two entry points
// can no longer silently diverge, since there is exactly one implementation
// left for either of them to call.

function makeGraph(p: string, overrides: Partial<KgConfig["graphs"][string]> = {}): KgConfig["graphs"][string] {
  const now = new Date().toISOString();
  return {
    name: "existing",
    path: p,
    type: "project-local",
    categories: [],
    createdAt: now,
    status: "active",
    statusChangedAt: now,
    graphId: "existing-id",
    ...overrides,
  };
}

function makeEmptyConfig(): KgConfig {
  return { version: "1.0.0", graphs: {}, sanitization: { enabled: false, patterns: [], action: "warn" } };
}

describe("resolveRegistrationGuard", () => {
  test("hard-blocks the home directory, expanding a leading ~ to the real home path", () => {
    const config = makeEmptyConfig();
    const result = resolveRegistrationGuard(config, "~");
    expect(result.expandedPath).toBe(os.homedir());
    expect(result.hardBlocked).toBe(true);
    expect(result.broadWarning).toBeNull();
  });

  test("hard-blocks the filesystem root", () => {
    const config = makeEmptyConfig();
    const result = resolveRegistrationGuard(config, "/");
    expect(result.hardBlocked).toBe(true);
  });

  test("flags a broad-ancestor warning identically to calling findBroadAncestorWarning directly", () => {
    const wrapper = fs.mkdtempSync(path.join(os.tmpdir(), "cli-init-guard-"));
    try {
      const existingPath = path.join(wrapper, "workspace", "proj-a", "knowledge");
      fs.mkdirSync(existingPath, { recursive: true });
      const config: KgConfig = {
        version: "1.0.0",
        graphs: { a: makeGraph(existingPath, { name: "a" }) },
        sanitization: { enabled: false, patterns: [], action: "warn" },
      };
      const candidate = path.join(wrapper, "workspace");

      const result = resolveRegistrationGuard(config, candidate);

      expect(result.hardBlocked).toBe(false);
      expect(result.expandedPath).toBe(candidate);
      expect(result.broadWarning).not.toBeNull();
      expect(result.broadWarning).toEqual({ isAncestorOfCount: 1, ancestorOfNames: ["a"] });
    } finally {
      fs.rmSync(wrapper, { recursive: true, force: true });
    }
  });

  test("returns no block/warning for an ordinary, unrelated project path", () => {
    const config = makeEmptyConfig();
    const result = resolveRegistrationGuard(config, "/tmp/some-unrelated-project/knowledge");
    expect(result.hardBlocked).toBe(false);
    expect(result.broadWarning).toBeNull();
  });
});

describe("scaffoldGraphDirectory", () => {
  test("creates the standard directory tree plus per-category lessons-learned subdirs", () => {
    const wrapper = fs.mkdtempSync(path.join(os.tmpdir(), "cli-init-scaffold-"));
    try {
      const kgPath = path.join(wrapper, "kg");
      const templatesCopied = scaffoldGraphDirectory(kgPath, [{ name: "architecture" }, { name: "process" }]);

      for (const dir of ["knowledge", "lessons-learned", "decisions", "sessions", "chat-history", "tmp"]) {
        expect(fs.existsSync(path.join(kgPath, dir))).toBe(true);
      }
      expect(fs.existsSync(path.join(kgPath, "lessons-learned", "architecture"))).toBe(true);
      expect(fs.existsSync(path.join(kgPath, "lessons-learned", "process"))).toBe(true);
      expect(typeof templatesCopied).toBe("number");
      expect(templatesCopied).toBeGreaterThanOrEqual(0);
    } finally {
      fs.rmSync(wrapper, { recursive: true, force: true });
    }
  });

  test("is idempotent -- calling it twice on the same path does not throw or duplicate directories", () => {
    const wrapper = fs.mkdtempSync(path.join(os.tmpdir(), "cli-init-scaffold-idem-"));
    try {
      const kgPath = path.join(wrapper, "kg");
      scaffoldGraphDirectory(kgPath, [{ name: "architecture" }]);
      expect(() => scaffoldGraphDirectory(kgPath, [{ name: "architecture" }])).not.toThrow();
      expect(fs.existsSync(path.join(kgPath, "lessons-learned", "architecture"))).toBe(true);
    } finally {
      fs.rmSync(wrapper, { recursive: true, force: true });
    }
  });
});

describe("cli.ts / kg_config_init dedup -- single implementation, not a third copy", () => {
  // Source-level guard (same pattern as tests/search.test.ts's readFileSync
  // checks): proves cli.ts's runInit() no longer has its own inline
  // isHardBlockedRegistrationPath(...)/findBroadAncestorWarning(...) call
  // pair or its own directory/template-copy block -- both are Task 4.1's
  // and the pre-dedup runInit's duplicated logic, which this task folds into
  // resolveRegistrationGuard/scaffoldGraphDirectory. A regression here (a
  // future edit reintroducing an inline copy in cli.ts) would fail this test
  // even though cli.ts's interactive flow itself isn't otherwise unit-tested.
  test("cli.ts imports the shared guard/scaffold functions instead of reimplementing them", () => {
    const source = fs.readFileSync(path.join(__dirname, "../src/cli.ts"), "utf-8");

    expect(source).toMatch(/import\s*\{\s*resolveRegistrationGuard,\s*scaffoldGraphDirectory\s*\}\s*from\s*"\.\/tools\/config\.js"/);
    expect(source).toContain("resolveRegistrationGuard(config, kgPath)");
    expect(source).toContain("scaffoldGraphDirectory(expandedPath, categories)");

    // No standalone inline calls to the two guard primitives left in cli.ts --
    // they're only reachable now through resolveRegistrationGuard inside config.ts.
    expect(source).not.toMatch(/isHardBlockedRegistrationPath\(/);
    expect(source).not.toMatch(/findBroadAncestorWarning\(/);
  });

  test("config.ts's handleConfigInit calls the same shared functions, not its own inline copies", () => {
    const source = fs.readFileSync(path.join(__dirname, "../src/tools/config.ts"), "utf-8");

    expect(source).toContain("resolveRegistrationGuard(config, kgPath)");
    expect(source).toContain("scaffoldGraphDirectory(expandedPath, categories)");
  });
});
