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

      for (const dir of ["concepts", "templates", "lessons-learned", "decisions", "sessions", "chat-history", "tmp"]) {
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

  // Regression coverage for the wizard-parity drift fix: scaffoldGraphDirectory's
  // copy destinations had fallen out of sync with the canonical routing in
  // commands/kmg-init-shared/kmg-template-seed.md (starter templates were
  // landing in their live dirs instead of templates/, and the root profile
  // files were being sourced from the wrong -- much longer -- concepts/*.md
  // files instead of concepts/templates/project/*.md).
  test("routes starter templates to templates/, not into their live dirs, matching the wizard", () => {
    const wrapper = fs.mkdtempSync(path.join(os.tmpdir(), "cli-init-scaffold-routing-"));
    try {
      const kgPath = path.join(wrapper, "kg");
      scaffoldGraphDirectory(kgPath, []);

      const templatesDir = path.join(kgPath, "templates");
      const expectedTemplateFiles = [
        "patterns.md",
        "gotchas.md",
        "concepts.md",
        "architecture.md",
        "workflows.md",
        "entry-template.md",
        "lesson-template.md",
        "ADR-template.md",
        "session-template.md",
      ];
      for (const f of expectedTemplateFiles) {
        expect(fs.existsSync(path.join(templatesDir, f))).toBe(true);
      }
      expect(fs.readdirSync(templatesDir).sort()).toEqual([...expectedTemplateFiles].sort());

      // lessons-learned/ and decisions/ keep only their live READMEs --
      // the starter templates that used to also land there are gone.
      expect(fs.readdirSync(path.join(kgPath, "lessons-learned"))).toEqual(["README.md"]);
      expect(fs.readdirSync(path.join(kgPath, "decisions"))).toEqual(["README.md"]);

      // sessions/ has no starter file at all now (moved to templates/).
      expect(fs.existsSync(path.join(kgPath, "sessions", "session-template.md"))).toBe(false);

      // Root-level profile files land at the KG root under their final
      // names, not the old knowledge/kg-index.md naming.
      for (const f of ["me.md", "rules.md", "triggers.md", "index.md"]) {
        expect(fs.existsSync(path.join(kgPath, f))).toBe(true);
      }
      expect(fs.existsSync(path.join(kgPath, "kg-index.md"))).toBe(false);

      // kg-category-index.md lives under concepts/, not knowledge/.
      expect(fs.existsSync(path.join(kgPath, "concepts", "kg-category-index.md"))).toBe(true);
      expect(fs.existsSync(path.join(kgPath, "knowledge"))).toBe(false);
    } finally {
      fs.rmSync(wrapper, { recursive: true, force: true });
    }
  });

  test("root me.md/rules.md/triggers.md come from the project profile starters, not the longer concepts/*.md files", () => {
    const wrapper = fs.mkdtempSync(path.join(os.tmpdir(), "cli-init-scaffold-profile-"));
    try {
      const kgPath = path.join(wrapper, "kg");
      scaffoldGraphDirectory(kgPath, [{ name: "architecture" }]);

      const pluginRoot = path.join(__dirname, "..", "..");
      for (const f of ["me.md", "rules.md", "triggers.md"]) {
        const expectedSrc = path.join(pluginRoot, "core", "default-templates", "concepts", "templates", "project", f);
        expect(fs.readFileSync(path.join(kgPath, f), "utf-8")).toBe(fs.readFileSync(expectedSrc, "utf-8"));
      }
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

    // Opus validation review fix #4: cli.ts's runInit() now also calls the
    // shared registerGraphConfig (config.ts) for its final registry write
    // instead of duplicating the GraphConfig-build + writeConfig sequence
    // inline, so this import line grew a third named import -- the regex
    // below only pins that all three shared functions come from one import
    // statement out of "./tools/config.js", not their exact ordering.
    expect(source).toMatch(/import\s*\{[^}]*resolveRegistrationGuard[^}]*\}\s*from\s*"\.\/tools\/config\.js"/);
    expect(source).toMatch(/import\s*\{[^}]*scaffoldGraphDirectory[^}]*\}\s*from\s*"\.\/tools\/config\.js"/);
    expect(source).toMatch(/import\s*\{[^}]*registerGraphConfig[^}]*\}\s*from\s*"\.\/tools\/config\.js"/);
    expect(source).toContain("resolveRegistrationGuard(config, kgPath)");
    expect(source).toContain("scaffoldGraphDirectory(expandedPath, categories)");
    expect(source).toContain("registerGraphConfig(config, {");

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

// ---------------------------------------------------------------------------
// Opus validation review fix #4: cli.ts's runInit() blind-scaffolded over a
// folder with decisions/ or lessons-learned/ content and no marker -- the
// same data-safety gap fix #1 (config.ts's handleConfigInit) already closed
// for the MCP path was still open here. runInit() is not exported (it's an
// interactive readline wizard), so this is a source-level guard in the same
// style as the dedup tests above: it pins that the refusal check exists, is
// gated on `!existingMarkerId` the same way config.ts's is, and -- the part
// that actually matters -- appears BEFORE the scaffoldGraphDirectory(...)
// call in source order, so a future edit can't silently reorder them back
// into the same scaffold-then-refuse leak this fix wave closed in config.ts.
// ---------------------------------------------------------------------------

describe("cli.ts runInit -- unregistered-content refusal (Opus validation review fix #4)", () => {
  test("refuses to scaffold over decisions/ or lessons-learned/ content with no marker, checked before scaffoldGraphDirectory", () => {
    const source = fs.readFileSync(path.join(__dirname, "../src/cli.ts"), "utf-8");

    expect(source).toContain("!existingMarkerId &&");
    expect(source).toContain('path.join(expandedPath, "decisions")');
    expect(source).toContain('path.join(expandedPath, "lessons-learned")');
    expect(source).toContain('apply: ["connect-unregistered-graph"]');

    const refusalIdx = source.indexOf('path.join(expandedPath, "decisions")');
    const scaffoldCallIdx = source.indexOf("scaffoldGraphDirectory(expandedPath, categories)");
    expect(refusalIdx).toBeGreaterThan(-1);
    expect(scaffoldCallIdx).toBeGreaterThan(-1);
    expect(refusalIdx).toBeLessThan(scaffoldCallIdx);
  });
});
