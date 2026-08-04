import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ---------------------------------------------------------------------------
// Mocks must be declared before imports that use them
// ---------------------------------------------------------------------------

jest.mock("../src/utils.js", () => {
  const actual = jest.requireActual("../src/utils.js") as Record<string, unknown>;
  return {
    ...actual,
    readConfig: jest.fn(),
  };
});

jest.mock("../src/tools/fts5.js", () => ({
  rebuildIndex: jest.fn().mockReturnValue({
    indexed: 1,
    skipped: 0,
    removed: 0,
    duration_ms: 5,
    db_path: "/tmp/test.db",
  }),
  // search.ts imports these directly; falling back to "no db present" (empty
  // string never exists) drives it down the real linear-scan path, which is
  // what these tests want to exercise against real fixture files.
  searchFts5: jest.fn(),
  resolveDbPath: jest.fn().mockReturnValue("/nonexistent/db/path/for-tests.db"),
}));

import { handleSearch } from "../src/tools/search.js";
import { handleCapture } from "../src/tools/capture.js";
import { PersonalScopeSession } from "../src/resolution.js";
import { readConfig, KgConfig } from "../src/utils.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempDir(prefix: string): string {
  // Nest the returned dir one level below a fresh mkdtemp wrapper (ADR-067
  // Task 1.8) -- resolveGraph matches cwd against dirname(graph.path), so if
  // this returned a bare mkdtemp leaf directly under the shared os.tmpdir(),
  // sibling graphs registered in the same test (e.g. my-personal/my-project)
  // would both collapse to the same dirname() boundary (os.tmpdir() itself),
  // causing resolveGraph to see them as tied at the same depth and return
  // "ambiguous-tie" instead of resolving cleanly. Nesting under a
  // per-call-unique wrapper gives each fixture its own dirname().
  const wrapper = fs.mkdtempSync(path.join(os.tmpdir(), `scope-marker-test-${prefix}-`));
  const contentDir = path.join(wrapper, "knowledge");
  fs.mkdirSync(contentDir);
  return contentDir;
}

function scaffoldKg(root: string): void {
  for (const dir of ["lessons-learned", "decisions", "sessions"]) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
}

function writeMd(dir: string, name: string, content: string): void {
  fs.writeFileSync(path.join(dir, name), content, "utf-8");
}

function makeConfig(graphs: Record<string, { path: string; type: "personal" | "project-local" }>): KgConfig {
  const graphEntries: KgConfig["graphs"] = {};
  for (const [name, g] of Object.entries(graphs)) {
    graphEntries[name] = {
      name,
      path: g.path,
      type: g.type,
      categories: [],
      createdAt: new Date().toISOString(),
      status: "active" as const,
      statusChangedAt: new Date().toISOString(),
      graphId: `test-graph-id-${name}`,
    };
  }
  return {
    version: "1.0.0",
    graphs: graphEntries,
    sanitization: { enabled: false, patterns: [], action: "warn" },
  };
}

const tempDirs: string[] = [];
let origCwd: () => string;

beforeEach(() => {
  origCwd = process.cwd;
});

afterEach(() => {
  jest.clearAllMocks();
  process.cwd = origCwd;
  for (const dir of tempDirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
  tempDirs.length = 0;
});

// ---------------------------------------------------------------------------
// kg_search: [personal]/[project] marker wiring
// ---------------------------------------------------------------------------

describe("[personal]/[project] marker wiring in kg_search", () => {
  it("a [personal] prefixed query is stripped before the search text is used, and routes scope=personal", async () => {
    const personalRoot = makeTempDir("personal");
    const projectRoot = makeTempDir("project");
    tempDirs.push(personalRoot, projectRoot);
    scaffoldKg(personalRoot);
    scaffoldKg(projectRoot);

    writeMd(
      path.join(personalRoot, "lessons-learned"),
      "widgets.md",
      "---\ntitle: Widget Notes\n---\n\nA private note about widgets."
    );
    writeMd(
      path.join(projectRoot, "lessons-learned"),
      "unrelated.md",
      "---\ntitle: Unrelated\n---\n\nNothing about the marker's own bracket text here."
    );

    (readConfig as jest.Mock).mockReturnValue(
      makeConfig({
        "my-personal": { path: personalRoot, type: "personal" },
        "my-project": { path: projectRoot, type: "project-local" },
      })
    );
    process.cwd = () => projectRoot;

    const session = new PersonalScopeSession();
    // confirmPersonalScopeAccess's interactive-mode branch always routes
    // through gate()'s real ask() (no shortcut via confirmPersonalScope,
    // which only short-circuits the automated branch) -- pre-confirming the
    // repo here simulates "this repo was already confirmed earlier this
    // process," the same hasConfirmedRepo() fast path production code hits
    // on any call after the first successful confirmation.
    session.confirmRepo(projectRoot);
    const result = await handleSearch(
      {
        query: "[personal] widgets",
        interaction: "interactive",
        sticky: true,
      },
      session
    );

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;
    // Marker bracket syntax must never reach the actual search text.
    expect(text).not.toContain("[personal]");
    // Routed to the personal KG only -- found the personal-only match.
    expect(text).toContain("widgets.md");
    expect(text).not.toContain("unrelated.md");
    // The session now reflects the resolved scope (sticky:true).
    expect(session.currentScopeFor(false)).toBe("personal");
  });

  it("honors a scope set sticky by an earlier call with no marker on this call (spec §11: no read/write asymmetry)", async () => {
    const personalRoot = makeTempDir("personal-sticky");
    const projectRoot = makeTempDir("project-sticky");
    tempDirs.push(personalRoot, projectRoot);
    scaffoldKg(personalRoot);
    scaffoldKg(projectRoot);

    writeMd(
      path.join(personalRoot, "lessons-learned"),
      "sticky-note.md",
      "---\ntitle: Sticky Note\n---\n\nContent about sticky-note unique to the personal graph."
    );

    (readConfig as jest.Mock).mockReturnValue(
      makeConfig({
        "my-personal": { path: personalRoot, type: "personal" },
        "my-project": { path: projectRoot, type: "project-local" },
      })
    );
    process.cwd = () => projectRoot;

    const session = new PersonalScopeSession();
    session.confirmRepo(projectRoot);
    // First call applies a sticky [personal] marker.
    await handleSearch(
      { query: "[personal] sticky-note", interaction: "interactive", sticky: true },
      session
    );

    // Second call has no marker at all, but the shared session still routes
    // it to the personal graph.
    const result = await handleSearch(
      { query: "sticky-note", interaction: "interactive" },
      session
    );

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("sticky-note.md");
  });

  it("an automated-mode scope:personal-only search against an unconfirmed repo returns KMG_INPUT_REQUIRED", async () => {
    const personalRoot = makeTempDir("personal-gate");
    tempDirs.push(personalRoot);
    scaffoldKg(personalRoot);
    writeMd(path.join(personalRoot, "lessons-learned"), "x.md", "---\ntitle: X\n---\n\nsome text");

    (readConfig as jest.Mock).mockReturnValue(
      makeConfig({ "my-personal": { path: personalRoot, type: "personal" } })
    );

    const session = new PersonalScopeSession();
    const result = await handleSearch(
      { query: "x", searchScope: "personal-only", interaction: "automated" },
      session
    );

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("KMG_INPUT_REQUIRED");
    expect(parsed.reason).toBe("personal_scope_unseen_repo");
  });

  it("a confirmed repo (confirmPersonalScope:true) is not re-asked on a later automated call", async () => {
    const personalRoot = makeTempDir("personal-reconfirm");
    tempDirs.push(personalRoot);
    scaffoldKg(personalRoot);
    writeMd(path.join(personalRoot, "lessons-learned"), "y.md", "---\ntitle: Y\n---\n\nfindable text");

    (readConfig as jest.Mock).mockReturnValue(
      makeConfig({ "my-personal": { path: personalRoot, type: "personal" } })
    );

    const session = new PersonalScopeSession();
    const first = await handleSearch(
      { query: "findable", searchScope: "personal-only", interaction: "automated", confirmPersonalScope: true },
      session
    );
    expect(first.isError).toBeFalsy();

    const second = await handleSearch(
      { query: "findable", searchScope: "personal-only", interaction: "automated" },
      session
    );
    expect(second.isError).toBeFalsy();
    expect(second.content[0].text).toContain("y.md");
  });
});

// ---------------------------------------------------------------------------
// kg_capture: [personal]/[project] marker wiring
// ---------------------------------------------------------------------------

describe("[personal]/[project] marker wiring in kg_capture", () => {
  it("a [personal] prefixed metadata.title is stripped and routes the write to the personal KG", async () => {
    const personalRoot = makeTempDir("capture-personal");
    const projectRoot = makeTempDir("capture-project");
    tempDirs.push(personalRoot, projectRoot);
    scaffoldKg(personalRoot);
    scaffoldKg(projectRoot);

    (readConfig as jest.Mock).mockReturnValue(
      makeConfig({
        "my-personal": { path: personalRoot, type: "personal" },
        "my-project": { path: projectRoot, type: "project-local" },
      })
    );
    process.cwd = () => projectRoot;

    const session = new PersonalScopeSession();
    session.confirmRepo(projectRoot);
    const result = await handleCapture(
      {
        content: "Body text.\n",
        type: "lesson",
        metadata: { title: "[personal] My Secret Note" },
      },
      undefined,
      "interactive",
      session,
      { sticky: true }
    );

    expect("error" in result).toBe(false);
    if ("error" in result) throw new Error("unexpected error result");
    expect(result.filePath.startsWith(personalRoot)).toBe(true);
    const written = fs.readFileSync(result.filePath, "utf-8");
    expect(written).toContain('title: "My Secret Note"');
    expect(written).not.toContain("[personal]");
    expect(session.currentScopeFor(false)).toBe("personal");
  });

  it("an automated-mode write to an unconfirmed personal KG (via explicit targetKg) returns KMG_INPUT_REQUIRED", async () => {
    const personalRoot = makeTempDir("capture-personal-gate");
    tempDirs.push(personalRoot);
    scaffoldKg(personalRoot);

    (readConfig as jest.Mock).mockReturnValue(
      makeConfig({ "my-personal": { path: personalRoot, type: "personal" } })
    );

    const session = new PersonalScopeSession();
    const result = await handleCapture(
      { content: "Body.\n", type: "lesson", metadata: { title: "A Title" } },
      "my-personal",
      "automated",
      session
    );

    expect("error" in result).toBe(true);
    if (!("error" in result)) throw new Error("expected error result");
    expect(result.error).toBe("KMG_INPUT_REQUIRED");
    expect(result.reason).toBe("personal_scope_unseen_repo");
  });
});

// ---------------------------------------------------------------------------
// One-shot ("sticky: false") marker expiry -- the shared session must not stay
// pinned to personal scope after a single one-shot answer.
// ---------------------------------------------------------------------------

describe("one-shot [personal] marker expiry across the shared session", () => {
  it("a later kg_capture with no marker writes to the project KG, not the personal one", async () => {
    const personalRoot = makeTempDir("oneshot-personal");
    const projectRoot = makeTempDir("oneshot-project");
    tempDirs.push(personalRoot, projectRoot);
    scaffoldKg(personalRoot);
    scaffoldKg(projectRoot);

    writeMd(
      path.join(personalRoot, "lessons-learned"),
      "oneshot-note.md",
      "---\ntitle: One Shot Note\n---\n\nContent about oneshot-note unique to the personal graph."
    );

    (readConfig as jest.Mock).mockReturnValue(
      makeConfig({
        "my-personal": { path: personalRoot, type: "personal" },
        "my-project": { path: projectRoot, type: "project-local" },
      })
    );
    process.cwd = () => projectRoot;

    const session = new PersonalScopeSession();
    session.confirmRepo(projectRoot);

    // One-shot [personal] search: this call is personal-scoped.
    const search = await handleSearch(
      { query: "[personal] oneshot-note", interaction: "interactive", sticky: false },
      session
    );
    expect(search.isError).toBeFalsy();
    expect(search.content[0].text).toContain("oneshot-note.md");

    // The next call carries no marker, so it must fall back to the project KG.
    const capture = await handleCapture(
      { content: "Ordinary project body.\n", type: "lesson", metadata: { title: "Ordinary Note" } },
      undefined,
      "interactive",
      session
    );
    expect("error" in capture).toBe(false);
    if ("error" in capture) throw new Error("unexpected error result");
    expect(capture.filePath.startsWith(projectRoot)).toBe(true);
    expect(capture.filePath.startsWith(personalRoot)).toBe(false);
  });

  it("a later kg_search with no marker searches the project KG, not the personal one", async () => {
    const personalRoot = makeTempDir("oneshot-search-personal");
    const projectRoot = makeTempDir("oneshot-search-project");
    tempDirs.push(personalRoot, projectRoot);
    scaffoldKg(personalRoot);
    scaffoldKg(projectRoot);

    writeMd(
      path.join(personalRoot, "lessons-learned"),
      "shared-term-personal.md",
      "---\ntitle: Personal\n---\n\nA note about sharedterm in the personal graph."
    );
    writeMd(
      path.join(projectRoot, "lessons-learned"),
      "shared-term-project.md",
      "---\ntitle: Project\n---\n\nA note about sharedterm in the project graph."
    );

    (readConfig as jest.Mock).mockReturnValue(
      makeConfig({
        "my-personal": { path: personalRoot, type: "personal" },
        "my-project": { path: projectRoot, type: "project-local" },
      })
    );
    process.cwd = () => projectRoot;

    const session = new PersonalScopeSession();
    session.confirmRepo(projectRoot);

    const first = await handleSearch(
      { query: "[personal] sharedterm", interaction: "interactive", sticky: false },
      session
    );
    expect(first.content[0].text).toContain("shared-term-personal.md");
    expect(first.content[0].text).not.toContain("shared-term-project.md");

    const second = await handleSearch({ query: "sharedterm", interaction: "interactive" }, session);
    expect(second.content[0].text).toContain("shared-term-project.md");
    expect(second.content[0].text).not.toContain("shared-term-personal.md");
  });
});
