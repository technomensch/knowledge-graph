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
  searchFts5: jest.fn(),
  resolveDbPath: jest.fn().mockReturnValue("/nonexistent/db/path/for-tests.db"),
}));

// gate()'s real interactive ask() transport doesn't exist yet (spec §12) --
// search.ts's own interactive-mode calls hardcode a stub ask() that never
// resolves, so there's no way to drive the interactive branch through
// handleSearch's public params alone. Mocking gate() itself (defaulting to
// the real implementation, so automated-mode behavior -- which never calls
// gate() for this branch -- and any other gate() call sites are unaffected)
// lets these tests supply controlled answers and actually exercise the
// exclude-parsing code that the High-severity review finding caught.
jest.mock("../src/interaction.js", () => {
  const actual = jest.requireActual("../src/interaction.js") as Record<string, unknown>;
  return { ...actual, gate: jest.fn(actual.gate as (...args: unknown[]) => unknown) };
});

import { handleSearch } from "../src/tools/search.js";
import { CrossKgSearchSession, PersonalScopeSession } from "../src/resolution.js";
import { readConfig, KgConfig } from "../src/utils.js";
import { gate } from "../src/interaction.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `scope-all-test-${prefix}-`));
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
// CrossKgSearchSession (Step 1 skeleton from the brief, verbatim)
// ---------------------------------------------------------------------------

describe("CrossKgSearchSession", () => {
  it("is not confirmed for the session before any confirmation", () => {
    const session = new CrossKgSearchSession();
    expect(session.isConfirmedForSession()).toBe(false);
  });

  it("becomes confirmed after confirmSession, and remembers exclusions", () => {
    const session = new CrossKgSearchSession();
    session.confirmSession(["personal-notes"]);
    expect(session.isConfirmedForSession()).toBe(true);
    expect(session.excludedNames()).toEqual(["personal-notes"]);
  });
});

// ---------------------------------------------------------------------------
// kg_search scope:all confirmation gate
// ---------------------------------------------------------------------------

describe("kg_search scope:all confirmation gate", () => {
  it("automated mode without confirmCrossKgSearch returns KMG_INPUT_REQUIRED naming the candidate KGs", async () => {
    const rootA = makeTempDir("a");
    const rootB = makeTempDir("b");
    tempDirs.push(rootA, rootB);
    scaffoldKg(rootA);
    scaffoldKg(rootB);

    (readConfig as jest.Mock).mockReturnValue(
      makeConfig({
        "kg-a": { path: rootA, type: "project-local" },
        "kg-b": { path: rootB, type: "project-local" },
      })
    );
    process.cwd = () => rootA;

    const session = new CrossKgSearchSession();
    const result = await handleSearch(
      { query: "widgets", searchScope: "all", interaction: "automated" },
      new PersonalScopeSession(),
      session
    );

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("KMG_INPUT_REQUIRED");
    expect(parsed.reason).toBe("cross_kg_search_confirmation");
    expect(parsed.resolveWith.param).toBe("confirmCrossKgSearch");
    expect(parsed.detail.candidates).toEqual(expect.arrayContaining(["kg-a", "kg-b"]));
    // Session must not have been marked confirmed by a declined/unanswered call.
    expect(session.isConfirmedForSession()).toBe(false);
  });

  it("automated mode with confirmCrossKgSearch:true and excludeKgs runs the search excluding those names", async () => {
    const rootA = makeTempDir("a2");
    const rootB = makeTempDir("b2");
    tempDirs.push(rootA, rootB);
    scaffoldKg(rootA);
    scaffoldKg(rootB);

    writeMd(path.join(rootA, "lessons-learned"), "a-note.md", "---\ntitle: A Note\n---\n\nsome shared-term content.");
    writeMd(path.join(rootB, "lessons-learned"), "b-note.md", "---\ntitle: B Note\n---\n\nsome shared-term content.");

    (readConfig as jest.Mock).mockReturnValue(
      makeConfig({
        "kg-a": { path: rootA, type: "project-local" },
        "kg-b": { path: rootB, type: "project-local" },
      })
    );
    process.cwd = () => rootA;

    const session = new CrossKgSearchSession();
    const result = await handleSearch(
      {
        query: "shared-term",
        searchScope: "all",
        interaction: "automated",
        confirmCrossKgSearch: true,
        excludeKgs: ["kg-b"],
      },
      new PersonalScopeSession(),
      session
    );

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;
    expect(text).toContain("a-note.md");
    expect(text).not.toContain("b-note.md");
  });

  it("does not re-ask once the session is already confirmed, honoring its remembered exclusions", async () => {
    const rootA = makeTempDir("a3");
    const rootB = makeTempDir("b3");
    tempDirs.push(rootA, rootB);
    scaffoldKg(rootA);
    scaffoldKg(rootB);

    writeMd(path.join(rootA, "lessons-learned"), "a-note.md", "---\ntitle: A Note\n---\n\nsome unique-term content.");
    writeMd(path.join(rootB, "lessons-learned"), "b-note.md", "---\ntitle: B Note\n---\n\nsome unique-term content.");

    (readConfig as jest.Mock).mockReturnValue(
      makeConfig({
        "kg-a": { path: rootA, type: "project-local" },
        "kg-b": { path: rootB, type: "project-local" },
      })
    );
    process.cwd = () => rootA;

    const session = new CrossKgSearchSession();
    session.confirmSession(["kg-b"]);

    const result = await handleSearch(
      { query: "unique-term", searchScope: "all", interaction: "automated" },
      new PersonalScopeSession(),
      session
    );

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;
    expect(text).toContain("a-note.md");
    expect(text).not.toContain("b-note.md");
  });

  it("interactive mode: an 'exclude:<name>' gate() answer actually excludes that KG (one-shot, session left unconfirmed)", async () => {
    const rootA = makeTempDir("a4");
    const rootB = makeTempDir("b4");
    tempDirs.push(rootA, rootB);
    scaffoldKg(rootA);
    scaffoldKg(rootB);

    writeMd(path.join(rootA, "lessons-learned"), "a-note.md", "---\ntitle: A Note\n---\n\nsome interactive-term content.");
    writeMd(path.join(rootB, "lessons-learned"), "b-note.md", "---\ntitle: B Note\n---\n\nsome interactive-term content.");

    (readConfig as jest.Mock).mockReturnValue(
      makeConfig({
        "kg-a": { path: rootA, type: "project-local" },
        "kg-b": { path: rootB, type: "project-local" },
      })
    );
    process.cwd = () => rootA;

    // First gate() call answers the confirm/exclude/cancel question with a
    // free-form exclude answer; second answers the one-shot-vs-sticky
    // follow-up. Prior to the fix, gate()'s own accepts:["all","cancel"]
    // check rejected "exclude:kg-b" with an _invalid_answer error before
    // this parsing code ever ran.
    (gate as jest.Mock)
      .mockImplementationOnce(async () => ({ answer: "exclude:kg-b" }))
      .mockImplementationOnce(async () => ({ answer: "one-shot" }));

    const session = new CrossKgSearchSession();
    const result = await handleSearch(
      { query: "interactive-term", searchScope: "all", interaction: "interactive" },
      new PersonalScopeSession(),
      session
    );

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;
    expect(text).toContain("a-note.md");
    expect(text).not.toContain("b-note.md");
    // one-shot: the session must not remember this exclusion for later calls.
    expect(session.isConfirmedForSession()).toBe(false);
  });

  it("interactive mode: an 'exclude:<name>' answer paired with 'sticky' persists the exclusion on the session", async () => {
    const rootA = makeTempDir("a5");
    const rootB = makeTempDir("b5");
    tempDirs.push(rootA, rootB);
    scaffoldKg(rootA);
    scaffoldKg(rootB);

    (readConfig as jest.Mock).mockReturnValue(
      makeConfig({
        "kg-a": { path: rootA, type: "project-local" },
        "kg-b": { path: rootB, type: "project-local" },
      })
    );
    process.cwd = () => rootA;

    (gate as jest.Mock)
      .mockImplementationOnce(async () => ({ answer: "exclude:kg-b" }))
      .mockImplementationOnce(async () => ({ answer: "sticky" }));

    const session = new CrossKgSearchSession();
    await handleSearch(
      { query: "irrelevant", searchScope: "all", interaction: "interactive" },
      new PersonalScopeSession(),
      session
    );

    expect(session.isConfirmedForSession()).toBe(true);
    expect(session.excludedNames()).toEqual(["kg-b"]);
  });

  it("interactive mode: an answer gate() shouldn't have accepted (not all/exclude:.../cancel) returns KMG_INPUT_REQUIRED instead of silently searching", async () => {
    const rootA = makeTempDir("a6");
    tempDirs.push(rootA);
    scaffoldKg(rootA);

    (readConfig as jest.Mock).mockReturnValue(
      makeConfig({ "kg-a": { path: rootA, type: "project-local" } })
    );
    process.cwd = () => rootA;

    (gate as jest.Mock).mockImplementationOnce(async () => ({ answer: "banana" }));

    const session = new CrossKgSearchSession();
    const result = await handleSearch(
      { query: "irrelevant", searchScope: "all", interaction: "interactive" },
      new PersonalScopeSession(),
      session
    );

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("KMG_INPUT_REQUIRED");
    expect(parsed.reason).toBe("cross_kg_search_confirmation_invalid_answer");
  });
});
