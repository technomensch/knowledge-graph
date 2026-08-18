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
    getProjectRoot: (kgPath: string) => {
      if ((kgPath as string).endsWith("/docs")) {
        return path.dirname(kgPath as string);
      }
      return kgPath;
    },
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
}));

import {
  handleCapture,
  deriveFileName,
  generateFrontmatter,
  resolveTargetPath,
  updateReadmeIndex,
  validateMetadata,
  checkExistingFile,
  displayTitleFor,
} from "../src/tools/capture.js";
import type { CaptureRequest, CaptureResponse, CaptureError } from "../src/tools/capture.js";
import { readConfig } from "../src/utils.js";
import { rebuildIndex } from "../src/tools/fts5.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempDir(prefix: string): string {
  // Nest the returned dir one level below a fresh mkdtemp wrapper (ADR-067
  // Task 1.8) -- resolveGraph matches cwd against dirname(graph.path), so if
  // this returned a bare mkdtemp leaf directly under the shared os.tmpdir(),
  // every other test's "unrelated" cwd (also a direct child of the same
  // shared tmpdir) would resolve as ancestor-or-equal too, false-passing the
  // KG_MISMATCH tests below instead of genuinely exercising them. Nesting
  // under a per-call-unique wrapper gives each fixture its own dirname().
  const wrapper = fs.mkdtempSync(path.join(os.tmpdir(), `capture-test-${prefix}-`));
  const contentDir = path.join(wrapper, "knowledge");
  fs.mkdirSync(contentDir);
  return contentDir;
}

function scaffoldKg(root: string): void {
  for (const dir of ["lessons-learned", "decisions", "sessions", "knowledge"]) {
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

function mockActiveKg(kgRoot: string): void {
  (readConfig as jest.Mock).mockReturnValue({
    version: "1.0.0",
    graphs: {
      "test-kg": {
        name: "test-kg",
        path: kgRoot,
        type: "project-local",
        categories: [],
        createdAt: new Date().toISOString(),
        status: "active",
        statusChangedAt: new Date().toISOString(),
        graphId: "test-graph-id",
      },
    },
    sanitization: { enabled: false, patterns: [], action: "warn" },
  });
}

// ---------------------------------------------------------------------------
// C-1: Successful lesson write
// ---------------------------------------------------------------------------

describe("kg_capture — lesson write", () => {
  test("creates file with correct filename, frontmatter, and triggers FTS5 rebuild", async () => {
    const kgRoot = makeTempDir("lesson");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const origCwd = process.cwd;
    process.cwd = () => kgRoot;

    const request: CaptureRequest = {
      content: "## Problem\n\nSomething broke.\n",
      type: "lesson",
      metadata: {
        title: "Auth Token Refresh",
        category: "debugging",
        tags: ["auth", "token"],
        git: { branch: "main", commit: "abc123", author: "dev" },
      },
    };

    const result = await handleCapture(request);
    process.cwd = origCwd;

    expect("error" in result).toBe(false);
    const ok = result as CaptureResponse;
    expect(ok.status).toBe("created");
    expect(ok.filePath).toContain("Lessons_Learned_Debugging_Auth_Token_Refresh.md");
    expect(fs.existsSync(ok.filePath)).toBe(true);

    const content = fs.readFileSync(ok.filePath, "utf-8");
    expect(content).toContain("title: \"Auth Token Refresh\"");
    expect(content).toContain("category: debugging");
    expect(content).toContain("tags: [auth, token]");
    expect(content).toContain("## Problem");

    expect(rebuildIndex).toHaveBeenCalledWith(kgRoot, "test-kg", "project-local");
  });
});

// ---------------------------------------------------------------------------
// C-2: Successful session write + conflict detection
// ---------------------------------------------------------------------------

describe("kg_capture — session write", () => {
  test("creates session file in date-based directory", async () => {
    const kgRoot = makeTempDir("session");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const origCwd = process.cwd;
    process.cwd = () => kgRoot;

    const request: CaptureRequest = {
      content: "# Session\n\nWork done today.\n",
      type: "session",
      metadata: { title: "Feature Work Summary", tags: ["feature"] },
    };

    const result = await handleCapture(request);
    process.cwd = origCwd;

    expect("error" in result).toBe(false);
    const ok = result as CaptureResponse;
    expect(ok.status).toBe("created");

    const today = new Date().toISOString().slice(0, 10);
    const ym = today.slice(0, 7);
    expect(ok.filePath).toContain(`sessions/${ym}/`);
    expect(ok.filePath).toContain(today);
  });

  test("returns CONFLICT when a session file for today already exists", async () => {
    const kgRoot = makeTempDir("session-conflict");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const today = new Date().toISOString().slice(0, 10);
    const ym = today.slice(0, 7);
    const sessionDir = path.join(kgRoot, "sessions", ym);
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFileSync(path.join(sessionDir, `${today}-existing-session.md`), "# Existing\n", "utf-8");

    const origCwd = process.cwd;
    process.cwd = () => kgRoot;

    const request: CaptureRequest = {
      content: "# Another\n",
      type: "session",
      metadata: { title: "Another Session" },
    };

    const result = await handleCapture(request);
    process.cwd = origCwd;

    expect("error" in result).toBe(true);
    expect((result as CaptureError).error).toBe("CONFLICT");
  });
});

// ---------------------------------------------------------------------------
// C-3: Successful ADR write — auto-increment
// ---------------------------------------------------------------------------

describe("kg_capture — ADR write", () => {
  test("auto-increments ADR number based on existing files", async () => {
    const kgRoot = makeTempDir("adr");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    fs.writeFileSync(path.join(kgRoot, "decisions", "ADR-001-first.md"), "---\n---\n", "utf-8");
    fs.writeFileSync(path.join(kgRoot, "decisions", "ADR-002-second.md"), "---\n---\n", "utf-8");

    const origCwd = process.cwd;
    process.cwd = () => kgRoot;

    const request: CaptureRequest = {
      content: "# Decision\n\nWe decided X.\n",
      type: "adr",
      metadata: { title: "Use TypeScript", tags: ["typescript", "tooling"], git: { author: "dev" } },
    };

    const result = await handleCapture(request);
    process.cwd = origCwd;

    expect("error" in result).toBe(false);
    expect((result as CaptureResponse).filePath).toContain("ADR-003-");
  });
});

// ---------------------------------------------------------------------------
// C-4: KG_MISMATCH error
// ---------------------------------------------------------------------------

describe("kg_capture — KG_MISMATCH", () => {
  test("returns structured KG_MISMATCH error when CWD is outside active KG root", async () => {
    const kgRoot = makeTempDir("mismatch-kg");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const otherDir = makeTempDir("other-project");
    tempDirs.push(otherDir);

    const origCwd = process.cwd;
    process.cwd = () => otherDir;

    const result = await handleCapture({
      content: "Some content",
      type: "lesson",
      metadata: { title: "Test Lesson" },
    });
    process.cwd = origCwd;

    expect("error" in result).toBe(true);
    const err = result as CaptureError;
    expect(err.error).toBe("KG_MISMATCH");
    // activeKgRoot is no longer populated (ADR-067 Task 1.8) -- resolution is
    // context-derived, so there is no single "active" KG root to report once
    // cwd matches nothing registered. cwd is still meaningful and preserved.
    expect(err.cwd).toBe(otherDir);
  });
});

// ---------------------------------------------------------------------------
// C-5: README index update
// ---------------------------------------------------------------------------

describe("updateReadmeIndex", () => {
  test("appends entry to existing README with correct format", () => {
    const tmpDir = makeTempDir("readme");
    tempDirs.push(tmpDir);

    const readmePath = path.join(tmpDir, "README.md");
    fs.writeFileSync(readmePath, "# Index\n\n- [Existing](existing.md)\n", "utf-8");

    updateReadmeIndex(readmePath, {
      title: "New Entry",
      relativePath: "new-entry.md",
      description: "A new test entry",
    });

    const content = fs.readFileSync(readmePath, "utf-8");
    expect(content).toContain("- [New Entry](new-entry.md) — A new test entry");
    expect(content).toContain("- [Existing](existing.md)");
  });

  test("does not add duplicate entry", () => {
    const tmpDir = makeTempDir("readme-dedup");
    tempDirs.push(tmpDir);

    const readmePath = path.join(tmpDir, "README.md");
    fs.writeFileSync(readmePath, "# Index\n\n- [Entry](entry.md)\n", "utf-8");

    updateReadmeIndex(readmePath, { title: "Entry", relativePath: "entry.md" });

    const content = fs.readFileSync(readmePath, "utf-8");
    const count = (content.match(/entry\.md/g) || []).length;
    expect(count).toBe(1);
  });

  test("creates README if it does not exist", () => {
    const tmpDir = makeTempDir("readme-create");
    tempDirs.push(tmpDir);

    const readmePath = path.join(tmpDir, "README.md");
    expect(fs.existsSync(readmePath)).toBe(false);

    updateReadmeIndex(readmePath, { title: "First Entry", relativePath: "first.md" });

    expect(fs.existsSync(readmePath)).toBe(true);
    expect(fs.readFileSync(readmePath, "utf-8")).toContain("- [First Entry](first.md)");
  });
});

// ---------------------------------------------------------------------------
// C-6: Metadata validation
// ---------------------------------------------------------------------------

describe("validateMetadata", () => {
  test("accepts metadata with only title and fills tag default", () => {
    const result = validateMetadata({ title: "Just a title" });
    expect("error" in result).toBe(false);
    expect((result as CaptureRequest["metadata"]).tags).toEqual([]);
  });

  test("returns VALIDATION_ERROR when title is empty string", () => {
    const result = validateMetadata({ title: "" });
    expect("error" in result).toBe(true);
    expect((result as CaptureError).error).toBe("VALIDATION_ERROR");
  });

  test("returns VALIDATION_ERROR when title is whitespace only", () => {
    const result = validateMetadata({ title: "   " });
    expect("error" in result).toBe(true);
    expect((result as CaptureError).error).toBe("VALIDATION_ERROR");
  });
});

// ---------------------------------------------------------------------------
// C-7: Directory creation
// ---------------------------------------------------------------------------

describe("directory creation", () => {
  test("creates nested category subdirectory for lessons automatically", async () => {
    const kgRoot = makeTempDir("dirtest");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const origCwd = process.cwd;
    process.cwd = () => kgRoot;

    const result = await handleCapture({
      content: "# Pattern\n\nDetails here.\n",
      type: "lesson",
      metadata: { title: "Observer Pattern Usage", category: "patterns" },
    });
    process.cwd = origCwd;

    expect("error" in result).toBe(false);
    const ok = result as CaptureResponse;
    expect(ok.filePath).toContain("lessons-learned/patterns/");
    expect(fs.existsSync(ok.filePath)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// C-8: existingFile routes to update-in-place
// ---------------------------------------------------------------------------

describe("kg_capture — existingFile update-in-place", () => {
  test("updates existing file content when existingFile is provided", async () => {
    const kgRoot = makeTempDir("update");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const origCwd = process.cwd;
    process.cwd = () => kgRoot;

    const existingPath = path.join(kgRoot, "lessons-learned", "Existing_Lesson.md");
    fs.writeFileSync(existingPath, "---\ntitle: Old\n---\nOld content\n", "utf-8");

    const result = await handleCapture({
      content: "## Updated content\n\nNew body.\n",
      type: "lesson",
      metadata: { title: "Updated Lesson Title", existingFile: existingPath, version: "v1.1" },
    });
    process.cwd = origCwd;

    expect("error" in result).toBe(false);
    const ok = result as CaptureResponse;
    expect(ok.status).toBe("updated");
    expect(ok.filePath).toBe(existingPath);

    const content = fs.readFileSync(existingPath, "utf-8");
    expect(content).toContain("Updated Lesson Title");
    expect(content).toContain("## Updated content");
    expect(content).not.toContain("Old content");

    expect(rebuildIndex).toHaveBeenCalledWith(kgRoot, "test-kg", "project-local");
  });

  test("returns IO_ERROR when existingFile path does not exist", async () => {
    const kgRoot = makeTempDir("update-missing");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const origCwd = process.cwd;
    process.cwd = () => kgRoot;

    const result = await handleCapture({
      content: "## Content\n",
      type: "lesson",
      metadata: { title: "Some Lesson", existingFile: path.join(kgRoot, "nonexistent.md") },
    });
    process.cwd = origCwd;

    expect("error" in result).toBe(true);
    expect((result as CaptureError).error).toBe("IO_ERROR");
  });
});

// ---------------------------------------------------------------------------
// C-9: deriveFileName unit tests
// ---------------------------------------------------------------------------

describe("deriveFileName", () => {
  test("lesson without category produces PascalCase filename", () => {
    const name = deriveFileName("lesson", { title: "auth token refresh" });
    expect(name).toBe("Lessons_Learned_Auth_Token_Refresh.md");
  });

  test("lesson with category includes category prefix", () => {
    const name = deriveFileName("lesson", { title: "retry logic", category: "patterns" });
    expect(name).toBe("Lessons_Learned_Patterns_Retry_Logic.md");
  });

  test("session filename includes today's date prefix", () => {
    const today = new Date().toISOString().slice(0, 10);
    const name = deriveFileName("session", { title: "Feature Work" });
    expect(name).toMatch(new RegExp(`^${today}-`));
    expect(name).toContain("feature-work");
  });

  test("adr filename pads number to 3 digits", () => {
    const name = deriveFileName("adr", { title: "Use TypeScript" }, 5);
    expect(name).toBe("ADR-005-use-typescript.md");
  });

  test("adr filename defaults to 001 when no adrNumber provided", () => {
    const name = deriveFileName("adr", { title: "First Decision" });
    expect(name).toBe("ADR-001-first-decision.md");
  });

  // issue-46 Manifestation A: deriveFileName does NOT detect/strip a
  // caller-supplied prefix -- it trusts the caller. These document the
  // pre-fix defect shape and confirm the contract is enforced by the caller
  // (agents/session-summary-agent.md, agents/create-adr-agent.md), not here.
  test("session filename does NOT strip a caller-supplied date prefix (trust-the-caller contract)", () => {
    const name = deriveFileName("session", { title: "2026-08-16-main" });
    expect(name).toMatch(/^\d{4}-\d{2}-\d{2}-2026-08-16-main\.md$/);
  });

  test("adr filename does NOT strip a caller-supplied ADR-number prefix (trust-the-caller contract)", () => {
    const name = deriveFileName("adr", { title: "ADR-069: My Decision" }, 69);
    expect(name).toBe("ADR-069-adr-069-my-decision.md");
  });
});

// ---------------------------------------------------------------------------
// C-10: generateFrontmatter unit tests
// ---------------------------------------------------------------------------

describe("generateFrontmatter", () => {
  test("lesson frontmatter includes title, created, updated, git, tags, category", () => {
    const fm = generateFrontmatter("lesson", {
      title: "Auth Lesson",
      category: "debugging",
      tags: ["auth", "token"],
      git: { branch: "main", commit: "abc123", author: "dev" },
    });
    expect(fm).toContain('title: "Auth Lesson"');
    expect(fm).toContain("created:");
    expect(fm).toContain("updated:");
    expect(fm).toContain("author: dev");
    expect(fm).toContain("  branch: main");
    expect(fm).toContain("  commit: abc123");
    expect(fm).toContain("tags: [auth, token]");
    expect(fm).toContain("category: debugging");
  });

  test("session frontmatter includes date, branch, commit_short, tags", () => {
    const today = new Date().toISOString().slice(0, 10);
    const fm = generateFrontmatter("session", {
      title: "My Session",
      tags: ["feature"],
      git: { branch: "dev", commit_short: "abc1234" },
    });
    // issue-46 backfix hardening: title carries the same date prefix as the
    // README index entry (displayTitleFor) -- a bare title regressed FTS5
    // title-ranked search, which relies on the date prefix as signal.
    expect(fm).toContain(`title: "${today}-My Session"`);
    expect(fm).toContain(`date: ${today}`);
    expect(fm).toContain("branch: dev");
    expect(fm).toContain("commit: abc1234");
    expect(fm).toContain("tags: [feature]");
  });

  test("session frontmatter title matches displayTitleFor's dated form used by the README index", () => {
    const fm = generateFrontmatter("session", { title: "Consistency Check" });
    const titleLine = fm.split("\n").find((l) => l.startsWith("title:"));
    expect(titleLine).toBe(`title: "${displayTitleFor("session", { title: "Consistency Check" })}"`);
  });

  test("adr frontmatter defaults to status Proposed, uses created (ISO) not date, author not deciders", () => {
    // issue-46 Manifestation B: this branch was previously a stub (callers
    // always sent their own complete block on top) — now sole owner, full
    // shape matches core/default-templates/decisions/ADR-template.md.
    const fm = generateFrontmatter("adr", {
      title: "Use Postgres",
      tags: ["db"],
      git: { author: "alice", email: "alice@example.com", branch: "main", commit: "abc123" },
    });
    expect(fm).toContain('title: "Use Postgres"');
    expect(fm).toContain("status: Proposed");
    expect(fm).toMatch(/created: \d{4}-\d{2}-\d{2}T/);
    expect(fm).not.toMatch(/^date:/m);
    expect(fm).toContain("author: alice");
    expect(fm).toContain("email: alice@example.com");
    expect(fm).not.toContain("deciders:");
    expect(fm).toContain("  branch: main");
    expect(fm).toContain("  commit: abc123");
    expect(fm).toContain("  pr: null");
    expect(fm).toContain("  issue: null");
    expect(fm).toContain("implements: null");
    expect(fm).toContain("related:");
    expect(fm).toContain("  adrs: []");
    expect(fm).toContain("tags: [db]");
  });

  test("adr frontmatter status reflects metadata.status when provided", () => {
    const fm = generateFrontmatter("adr", { title: "Accepted Decision", status: "Accepted" });
    expect(fm).toContain("status: Accepted");
    expect(fm).not.toContain("status: Proposed");
  });

  test("adr frontmatter includes number, implements, related, search_aliases, category when provided", () => {
    const fm = generateFrontmatter("adr", {
      title: "Full Fields",
      number: 69,
      implements: "v2.0.0",
      related: { adrs: ["ADR-001"], lessons: ["Some_Lesson"], kg_entries: ["concept-x"] },
      search_aliases: ["alias-one"],
      category: "architecture",
    });
    expect(fm).toContain("number: 69");
    expect(fm).toContain("implements: v2.0.0");
    expect(fm).toContain("adrs: [ADR-001]");
    expect(fm).toContain("lessons: [Some_Lesson]");
    expect(fm).toContain("kg_entries: [concept-x]");
    expect(fm).toContain("search_aliases: [alias-one]");
    expect(fm).toContain("category: architecture");
  });

  test("frontmatter opens and closes with --- delimiters", () => {
    const fm = generateFrontmatter("lesson", { title: "Simple" });
    expect(fm.startsWith("---\n")).toBe(true);
    expect(fm).toContain("\n---\n");
  });

  test("title with double quotes is escaped in frontmatter", () => {
    const fm = generateFrontmatter("lesson", { title: 'Say "hello"' });
    expect(fm).toContain('title: "Say \\"hello\\""');
  });
});

// ---------------------------------------------------------------------------
// C-11: resolveTargetPath unit tests
// ---------------------------------------------------------------------------

describe("resolveTargetPath", () => {
  test("lesson without category resolves to lessons-learned/", () => {
    const { dir, fileName } = resolveTargetPath("/kg", "lesson", { title: "Test Lesson" });
    expect(dir).toBe("/kg/lessons-learned");
    expect(fileName).toBe("Lessons_Learned_Test_Lesson.md");
  });

  test("lesson with category resolves to lessons-learned/<slug>/", () => {
    const { dir } = resolveTargetPath("/kg", "lesson", { title: "Test", category: "Architecture" });
    expect(dir).toBe("/kg/lessons-learned/architecture");
  });

  test("session resolves to sessions/<YYYY-MM>/", () => {
    const ym = new Date().toISOString().slice(0, 7);
    const { dir } = resolveTargetPath("/kg", "session", { title: "My Session" });
    expect(dir).toBe(`/kg/sessions/${ym}`);
  });
});

// ---------------------------------------------------------------------------
// C-12: checkExistingFile unit tests
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// C-7: Multi-KG capture — targetKg parameter
// ---------------------------------------------------------------------------

describe("kg_capture — targetKg (multi-KG)", () => {
  function mockMultiKgConfig(projRoot: string, globalRoot: string): void {
    (readConfig as jest.Mock).mockReturnValue({
      version: "1.0.0",
      graphs: {
        "my-project": {
          name: "my-project",
          path: projRoot,
          type: "project-local",
          categories: [],
          createdAt: new Date().toISOString(),
          status: "active",
          statusChangedAt: new Date().toISOString(),
          graphId: "test-graph-id-my-project",
        },
        "personal": {
          name: "personal",
          path: globalRoot,
          type: "personal",
          categories: [],
          createdAt: new Date().toISOString(),
          status: "active",
          statusChangedAt: new Date().toISOString(),
          graphId: "test-graph-id-personal",
        },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });
  }

  test("writes lesson to personal KG when targetKg='personal'", async () => {
    const projRoot = makeTempDir("multi-proj");
    const globalRoot = makeTempDir("multi-global");
    tempDirs.push(projRoot, globalRoot);
    scaffoldKg(projRoot);
    scaffoldKg(globalRoot);
    mockMultiKgConfig(projRoot, globalRoot);

    // CWD is in the project root (matches project KG), but we write to global
    const origCwd = process.cwd;
    process.cwd = () => projRoot;

    const request: CaptureRequest = {
      content: "## Problem\n\nCross-project pattern.\n",
      type: "lesson",
      metadata: { title: "Create vs Update Terminology", category: "process", tags: ["plans"] },
    };

    // ADR-067 Task 6.3: a write to a personal-type KG now requires
    // confirmPersonalScopeAccess (spec §11) -- confirmPersonalScope:true is
    // the automated-mode shortcut, since this test's default (unspecified)
    // interaction mode resolves to "automated".
    const result = await handleCapture(request, "personal", undefined, undefined, { confirmPersonalScope: true });
    process.cwd = origCwd;

    expect("error" in result).toBe(false);
    const ok = result as CaptureResponse;
    expect(ok.status).toBe("created");
    // File must be inside globalRoot, not projRoot
    expect(ok.filePath.startsWith(globalRoot)).toBe(true);
    expect(ok.filePath.startsWith(projRoot)).toBe(false);
    expect(fs.existsSync(ok.filePath)).toBe(true);

    // FTS5 index must be rebuilt for the "personal" bucket, not the
    // project-local default — regression test for issue-15.
    expect(rebuildIndex).toHaveBeenCalledWith(globalRoot, "personal", "personal");
  });

  test("skips CWD check when targetKg provided — writes even from mismatched CWD", async () => {
    const projRoot = makeTempDir("multi-proj-cwd");
    const globalRoot = makeTempDir("multi-global-cwd");
    const unrelatedDir = makeTempDir("unrelated");
    tempDirs.push(projRoot, globalRoot, unrelatedDir);
    scaffoldKg(projRoot);
    scaffoldKg(globalRoot);
    mockMultiKgConfig(projRoot, globalRoot);

    // CWD is completely unrelated — would trigger KG_MISMATCH without targetKg
    const origCwd = process.cwd;
    process.cwd = () => unrelatedDir;

    const request: CaptureRequest = {
      content: "## Problem\n\nGlobal lesson.\n",
      type: "lesson",
      metadata: { title: "Global Pattern", category: "patterns" },
    };

    // ADR-067 Task 6.3: writing to a personal-type KG now requires
    // confirmPersonalScopeAccess (spec §11) -- see the previous test's note.
    const result = await handleCapture(request, "personal", undefined, undefined, { confirmPersonalScope: true });
    process.cwd = origCwd;

    // Should succeed, not KG_MISMATCH
    expect("error" in result).toBe(false);
    expect((result as CaptureResponse).status).toBe("created");
  });

  test("returns VALIDATION_ERROR for unknown targetKg name", async () => {
    const projRoot = makeTempDir("multi-unknown");
    const globalRoot = makeTempDir("multi-unknown-g");
    tempDirs.push(projRoot, globalRoot);
    scaffoldKg(projRoot);
    mockMultiKgConfig(projRoot, globalRoot);

    const origCwd = process.cwd;
    process.cwd = () => projRoot;

    const request: CaptureRequest = {
      content: "content",
      type: "lesson",
      metadata: { title: "Test" },
    };

    const result = await handleCapture(request, "nonexistent-kg");
    process.cwd = origCwd;

    expect("error" in result).toBe(true);
    expect((result as CaptureError).error).toBe("VALIDATION_ERROR");
    expect((result as CaptureError).message).toContain("nonexistent-kg");
  });

  test("returns KMG_INPUT_REQUIRED (reason fuzzy_match) with candidate list for ambiguous/fuzzy targetKg name (automated mode)", async () => {
    const webRoot = makeTempDir("multi-fuzzy-web");
    const apiRoot = makeTempDir("multi-fuzzy-api");
    tempDirs.push(webRoot, apiRoot);
    scaffoldKg(webRoot);
    scaffoldKg(apiRoot);
    (readConfig as jest.Mock).mockReturnValue({
      version: "1.0.0",
      graphs: {
        "kmgraph-web": {
          name: "kmgraph-web",
          path: webRoot,
          type: "project-local",
          categories: [],
          createdAt: new Date().toISOString(),
          status: "active",
          statusChangedAt: new Date().toISOString(),
          graphId: "test-graph-id-kmgraph-web",
        },
        "kmgraph-api": {
          name: "kmgraph-api",
          path: apiRoot,
          type: "project-local",
          categories: [],
          createdAt: new Date().toISOString(),
          status: "active",
          statusChangedAt: new Date().toISOString(),
          graphId: "test-graph-id-kmgraph-api",
        },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });

    const origCwd = process.cwd;
    process.cwd = () => webRoot;

    const request: CaptureRequest = {
      content: "content",
      type: "lesson",
      metadata: { title: "Test" },
    };

    const result = await handleCapture(request, "kmgraph", "automated");
    process.cwd = origCwd;

    expect("error" in result).toBe(true);
    const err = result as CaptureError;
    expect(err.error).toBe("KMG_INPUT_REQUIRED");
    expect(err.reason).toBe("fuzzy_match");
    expect(err.resolveWith?.accepts).toEqual(expect.arrayContaining(["kmgraph-web", "kmgraph-api"]));
  });

  test("without targetKg still enforces CWD check — returns KG_MISMATCH from unrelated CWD", async () => {
    const projRoot = makeTempDir("multi-cwd-check");
    const globalRoot = makeTempDir("multi-cwd-check-g");
    const unrelatedDir = makeTempDir("unrelated-cwd");
    tempDirs.push(projRoot, globalRoot, unrelatedDir);
    scaffoldKg(projRoot);
    mockMultiKgConfig(projRoot, globalRoot);

    const origCwd = process.cwd;
    process.cwd = () => unrelatedDir;

    const request: CaptureRequest = {
      content: "content",
      type: "lesson",
      metadata: { title: "Test" },
    };

    const result = await handleCapture(request); // no targetKg
    process.cwd = origCwd;

    expect("error" in result).toBe(true);
    expect((result as CaptureError).error).toBe("KG_MISMATCH");
  });
});

describe("kg_capture — scope param (consistency with kg_search/kg_config_add_category/kg_fts5_*/kg_upgrade)", () => {
  function mockScopeConfig(projRoot: string, globalRoot: string): void {
    (readConfig as jest.Mock).mockReturnValue({
      version: "1.0.0",
      graphs: {
        "my-project": {
          name: "my-project",
          path: projRoot,
          type: "project-local",
          categories: [],
          createdAt: new Date().toISOString(),
          status: "active",
          statusChangedAt: new Date().toISOString(),
          graphId: "test-graph-id-my-project",
        },
        personal: {
          name: "personal",
          path: globalRoot,
          type: "personal",
          categories: [],
          createdAt: new Date().toISOString(),
          status: "active",
          statusChangedAt: new Date().toISOString(),
          graphId: "test-graph-id-personal",
        },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });
  }

  test("scope:'user' writes to the personal KG, gated by confirmPersonalScopeAccess like the other 5 tools", async () => {
    const projRoot = makeTempDir("scope-proj");
    const globalRoot = makeTempDir("scope-global");
    tempDirs.push(projRoot, globalRoot);
    scaffoldKg(projRoot);
    scaffoldKg(globalRoot);
    mockScopeConfig(projRoot, globalRoot);

    const origCwd = process.cwd;
    process.cwd = () => projRoot; // cwd resolves to the project KG -- scope:"user" must override this

    const request: CaptureRequest = {
      content: "## Scope param test\n",
      type: "lesson",
      metadata: { title: "Scope Param Consistency" },
    };

    // Automated mode (default when unspecified), unconfirmed repo: same
    // KMG_INPUT_REQUIRED gate every other scope:"user" reachable tool uses.
    const unconfirmed = await handleCapture(request, undefined, undefined, undefined, { scope: "user" });
    expect("error" in unconfirmed).toBe(true);
    expect((unconfirmed as CaptureError).error).toBe("KMG_INPUT_REQUIRED");
    expect((unconfirmed as CaptureError).reason).toBe("personal_scope_unseen_repo");

    const confirmed = await handleCapture(request, undefined, undefined, undefined, {
      scope: "user",
      confirmPersonalScope: true,
    });
    process.cwd = origCwd;

    expect("error" in confirmed).toBe(false);
    const ok = confirmed as CaptureResponse;
    expect(ok.status).toBe("created");
    expect(ok.filePath.startsWith(globalRoot)).toBe(true);
    expect(ok.filePath.startsWith(projRoot)).toBe(false);
    expect(fs.existsSync(ok.filePath)).toBe(true);
  });

  test("scope:'project' (or omitted) resolves via cwd as before -- no behavior change for the default path", async () => {
    const projRoot = makeTempDir("scope-proj-default");
    const globalRoot = makeTempDir("scope-global-default");
    tempDirs.push(projRoot, globalRoot);
    scaffoldKg(projRoot);
    scaffoldKg(globalRoot);
    mockScopeConfig(projRoot, globalRoot);

    const origCwd = process.cwd;
    process.cwd = () => projRoot;

    const request: CaptureRequest = {
      content: "## Scope default test\n",
      type: "lesson",
      metadata: { title: "Scope Default" },
    };

    const result = await handleCapture(request, undefined, undefined, undefined, { scope: "project" });
    process.cwd = origCwd;

    expect("error" in result).toBe(false);
    const ok = result as CaptureResponse;
    expect(ok.filePath.startsWith(projRoot)).toBe(true);
  });

  test("explicit targetKg still wins over scope when both are somehow given", async () => {
    const projRoot = makeTempDir("scope-precedence-proj");
    const globalRoot = makeTempDir("scope-precedence-global");
    tempDirs.push(projRoot, globalRoot);
    scaffoldKg(projRoot);
    scaffoldKg(globalRoot);
    mockScopeConfig(projRoot, globalRoot);

    const origCwd = process.cwd;
    process.cwd = () => globalRoot; // cwd would resolve to nothing useful here; targetKg is explicit

    const request: CaptureRequest = {
      content: "## Precedence test\n",
      type: "lesson",
      metadata: { title: "TargetKg Wins" },
    };

    // targetKg="my-project" explicitly given alongside scope:"user" -- targetKg wins,
    // matching every other tool's targetKg-beats-scope precedent for explicit overrides.
    const result = await handleCapture(request, "my-project", undefined, undefined, { scope: "user" });
    process.cwd = origCwd;

    expect("error" in result).toBe(false);
    const ok = result as CaptureResponse;
    expect(ok.filePath.startsWith(projRoot)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkExistingFile
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Task 6.2: gate()-routed KG_MISMATCH outcomes (archived/fuzzy-match/
// ambiguous-tie/merged/$HOME-or-root)
// ---------------------------------------------------------------------------

describe("kg_capture — gate()-routed resolution outcomes", () => {
  function mockConfig(graphs: Record<string, unknown>): void {
    (readConfig as jest.Mock).mockReturnValue({
      version: "1.0.0",
      graphs,
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });
  }

  function graphEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      name: "test-kg",
      path: "/unused",
      type: "project-local",
      categories: [],
      createdAt: new Date().toISOString(),
      status: "active",
      statusChangedAt: new Date().toISOString(),
      graphId: "test-graph-id",
      ...overrides,
    };
  }

  test("automated mode: archived-entry capture attempt returns KMG_INPUT_REQUIRED with reason archived_entry", async () => {
    const kgRoot = makeTempDir("archived-automated");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockConfig({
      "archived-kg": graphEntry({ name: "archived-kg", path: kgRoot, status: "archived" }),
    });

    const origCwd = process.cwd;
    process.cwd = () => kgRoot;

    const result = await handleCapture(
      { content: "content", type: "lesson", metadata: { title: "Test" } },
      undefined,
      "automated"
    );
    process.cwd = origCwd;

    expect("error" in result).toBe(true);
    const err = result as CaptureError;
    expect(err.error).toBe("KMG_INPUT_REQUIRED");
    expect(err.reason).toBe("archived_entry");
    expect(err.resolveWith?.accepts).toEqual(expect.arrayContaining(["skip", "ignore", "restore"]));
  });

  test("interactive mode: fuzzy-match capture attempt proceeds against the gate()-answered candidate", async () => {
    const webRoot = makeTempDir("gate-fuzzy-web");
    const apiRoot = makeTempDir("gate-fuzzy-api");
    tempDirs.push(webRoot, apiRoot);
    scaffoldKg(webRoot);
    scaffoldKg(apiRoot);
    mockConfig({
      "kmgraph-web": graphEntry({ name: "kmgraph-web", path: webRoot, graphId: "web-id" }),
      "kmgraph-api": graphEntry({ name: "kmgraph-api", path: apiRoot, graphId: "api-id" }),
    });

    const interactionModule = require("../src/interaction.js") as typeof import("../src/interaction.js");
    const gateSpy = jest.spyOn(interactionModule, "gate").mockResolvedValue({ answer: "kmgraph-web" });

    const origCwd = process.cwd;
    process.cwd = () => webRoot;

    const result = await handleCapture(
      { content: "content", type: "lesson", metadata: { title: "Test" } },
      "kmgraph",
      "interactive"
    );
    process.cwd = origCwd;
    gateSpy.mockRestore();

    expect("error" in result).toBe(false);
    const ok = result as CaptureResponse;
    expect(ok.status).toBe("created");
    expect(ok.filePath.startsWith(webRoot)).toBe(true);
  });

  test("automated mode: capture from home directory with no graph/scope param returns KMG_INPUT_REQUIRED reason home_or_root_cwd and never checks ownership", async () => {
    mockConfig({});

    // Manual monkey-patch of the raw `require("fs")` module object instead of
    // jest.spyOn: TS's `import * as fs` namespace binding wraps the raw
    // module in a getter-only, non-configurable property, so neither
    // jest.spyOn nor direct assignment on that binding can intercept it. The
    // getter reads through to the raw module at access time, so patching the
    // raw module directly (which IS configurable/writable) is observable
    // through every `import * as fs` binding, including resolution.ts's.
    const rawFs = require("fs") as Record<string, unknown>;
    const originalStatSync = rawFs.statSync as typeof fs.statSync;
    const statCalls: unknown[][] = [];
    rawFs.statSync = (...args: Parameters<typeof fs.statSync>) => {
      statCalls.push(args);
      return (originalStatSync as (...a: Parameters<typeof fs.statSync>) => ReturnType<typeof fs.statSync>)(...args);
    };

    const origCwd = process.cwd;
    process.cwd = () => os.homedir();

    const result = await handleCapture(
      { content: "content", type: "lesson", metadata: { title: "Test" } },
      undefined,
      "automated"
    );
    process.cwd = origCwd;
    rawFs.statSync = originalStatSync;

    expect("error" in result).toBe(true);
    const err = result as CaptureError;
    expect(err.error).toBe("KMG_INPUT_REQUIRED");
    expect(err.reason).toBe("home_or_root_cwd");
    expect(err.resolveWith?.param).toBe("scope");
    // Ownership check is a fs.statSync call inside checkHomeOwnership -- it
    // must never fire in automated mode (spec §8: "skipped entirely, not
    // attempted"). Filter out unrelated statSync calls made elsewhere during
    // resolution (e.g. symlink/ancestor walks).
    expect(statCalls.some(([p]) => p === os.homedir())).toBe(false);
  });

  test("interactive mode: capture from root surfaces the home_or_root_cwd gate", async () => {
    mockConfig({});

    const interactionModule = require("../src/interaction.js") as typeof import("../src/interaction.js");
    const gateSpy = jest.spyOn(interactionModule, "gate").mockResolvedValue(
      require("../src/interaction.js").requireInput("home_or_root_cwd", "scope", ["personal"])
    );

    const origCwd = process.cwd;
    const rootDir = path.parse(origCwd()).root;
    process.cwd = () => rootDir;

    const result = await handleCapture(
      { content: "content", type: "lesson", metadata: { title: "Test" } },
      undefined,
      "interactive"
    );
    process.cwd = origCwd;

    expect(gateSpy).toHaveBeenCalledWith(expect.objectContaining({ reason: "home_or_root_cwd", param: "scope" }));
    gateSpy.mockRestore();

    expect("error" in result).toBe(true);
    const err = result as CaptureError;
    expect(err.error).toBe("KMG_INPUT_REQUIRED");
    expect(err.reason).toBe("home_or_root_cwd");
  });

  test("automated mode: ambiguous-tie (two registry entries at the identical resolved path) returns KMG_INPUT_REQUIRED with both names", async () => {
    const sharedRoot = makeTempDir("ambiguous-tie");
    tempDirs.push(sharedRoot);
    scaffoldKg(sharedRoot);
    mockConfig({
      "entry-a": graphEntry({ name: "entry-a", path: path.join(sharedRoot, "knowledge"), graphId: "a-id" }),
      "entry-b": graphEntry({ name: "entry-b", path: path.join(sharedRoot, "knowledge"), graphId: "b-id" }),
    });

    const origCwd = process.cwd;
    process.cwd = () => sharedRoot;

    const result = await handleCapture(
      { content: "content", type: "lesson", metadata: { title: "Test" } },
      undefined,
      "automated"
    );
    process.cwd = origCwd;

    expect("error" in result).toBe(true);
    const err = result as CaptureError;
    expect(err.error).toBe("KMG_INPUT_REQUIRED");
    expect(err.reason).toBe("ambiguous_path_tie");
    expect(err.resolveWith?.accepts).toEqual(expect.arrayContaining(["entry-a", "entry-b"]));
  });

  test("a mergedInto-set archived entry never offers restore and proceeds against the survivor with a merge notice", async () => {
    const survivorRoot = makeTempDir("merged-survivor");
    tempDirs.push(survivorRoot);
    scaffoldKg(survivorRoot);
    mockConfig({
      "old-name": graphEntry({
        name: "old-name",
        path: "/archived/old-name",
        status: "archived",
        mergedInto: "new-name",
        statusChangedAt: "2026-01-01T00:00:00.000Z",
      }),
      "new-name": graphEntry({ name: "new-name", path: survivorRoot, graphId: "survivor-id" }),
    });

    const interactionModule = require("../src/interaction.js") as typeof import("../src/interaction.js");
    const gateSpy = jest.spyOn(interactionModule, "gate");

    const result = await handleCapture(
      { content: "content", type: "lesson", metadata: { title: "Test" } },
      "old-name",
      "automated"
    );

    // "merged" is a plain notice, never a gate/question -- gate() must not
    // be called for this outcome, so "restore" (or any accepts list) can
    // never surface for a merged-away entry.
    expect(gateSpy).not.toHaveBeenCalled();
    gateSpy.mockRestore();

    expect("error" in result).toBe(false);
    const ok = result as CaptureResponse;
    expect(ok.status).toBe("created");
    expect(ok.filePath.startsWith(survivorRoot)).toBe(true);
    expect(ok.notice).toContain("'old-name' was merged into 'new-name' on 2026-01-01T00:00:00.000Z");
  });
});

describe("checkExistingFile", () => {
  test("returns null for lesson type (only sessions checked)", () => {
    const kgRoot = makeTempDir("check-lesson");
    tempDirs.push(kgRoot);
    const result = checkExistingFile("lesson", kgRoot, { title: "Something" });
    expect(result).toBeNull();
  });

  test("returns null when no session file exists for today", () => {
    const kgRoot = makeTempDir("check-no-session");
    tempDirs.push(kgRoot);
    const result = checkExistingFile("session", kgRoot, { title: "My Session" });
    expect(result).toBeNull();
  });

  test("returns file path when a session file for today exists", () => {
    const kgRoot = makeTempDir("check-session-exists");
    tempDirs.push(kgRoot);
    const today = new Date().toISOString().slice(0, 10);
    const ym = today.slice(0, 7);
    const sessionDir = path.join(kgRoot, "sessions", ym);
    fs.mkdirSync(sessionDir, { recursive: true });
    const existingFile = path.join(sessionDir, `${today}-my-work.md`);
    fs.writeFileSync(existingFile, "# Session\n", "utf-8");

    const result = checkExistingFile("session", kgRoot, { title: "My Session" });
    expect(result).toBe(existingFile);
  });
});

// ---------------------------------------------------------------------------
// issue-46: agent contract -- metadata.title must never carry a re-baked
// date/ADR-number prefix (Manifestation A regression guard)
// ---------------------------------------------------------------------------

describe("agent contract — no re-baked prefix in metadata.title (issue-46)", () => {
  const repoRoot = path.resolve(__dirname, "../..");
  const filesToCheck = [
    "agents/session-summary-agent.md",
    "agents/create-adr-agent.md",
    "commands/kmg-create-adr.md",
  ];

  test.each(filesToCheck)("%s never sends a dated or ADR-numbered metadata.title", (relPath) => {
    const filePath = path.join(repoRoot, relPath);
    const content = fs.readFileSync(filePath, "utf-8");
    const titleFieldPattern = /"title":\s*"([^"]*)"/g;
    let match: RegExpExecArray | null;
    let checked = 0;
    while ((match = titleFieldPattern.exec(content)) !== null) {
      checked++;
      expect(match[1]).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(match[1]).not.toMatch(/ADR-\d+/);
    }
    // commands/kmg-create-adr.md has no kg_capture JSON payload at all
    // (confirmed during issue-46 implementation -- it's a standalone
    // implementation, see issue-48) -- zero matches there is expected, not a
    // silently-vacuous test.
    if (relPath !== "commands/kmg-create-adr.md") {
      expect(checked).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// issue-46 Manifestation B: defensive frontmatter strip at both write sites
// ---------------------------------------------------------------------------

describe("kg_capture — defensive frontmatter strip (issue-46 Manifestation B)", () => {
  function fenceCount(content: string): number {
    return (content.match(/^---$/gm) || []).length;
  }

  test("strips a leading frontmatter block from content before writing (session, new file)", async () => {
    const kgRoot = makeTempDir("strip-session");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const origCwd = process.cwd;
    process.cwd = () => kgRoot;

    const result = await handleCapture({
      content: '---\ntitle: "stale"\n---\n\n## Body\n',
      type: "session",
      metadata: { title: "main" },
    });
    process.cwd = origCwd;

    expect("error" in result).toBe(false);
    const ok = result as CaptureResponse;
    const content = fs.readFileSync(ok.filePath, "utf-8");
    expect(fenceCount(content)).toBe(2);
    expect(content).toContain("## Body");
    expect(content).not.toContain("stale");
  });

  test("is a no-op when content has no embedded frontmatter (regression guard)", async () => {
    const kgRoot = makeTempDir("strip-noop");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const origCwd = process.cwd;
    process.cwd = () => kgRoot;

    const result = await handleCapture({
      content: "## Body only\n",
      type: "session",
      metadata: { title: "main" },
    });
    process.cwd = origCwd;

    expect("error" in result).toBe(false);
    const ok = result as CaptureResponse;
    const content = fs.readFileSync(ok.filePath, "utf-8");
    expect(fenceCount(content)).toBe(2);
    expect(content).toContain("## Body only");
  });

  test("strips a leading frontmatter block from content before writing (adr, new file)", async () => {
    const kgRoot = makeTempDir("strip-adr");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const origCwd = process.cwd;
    process.cwd = () => kgRoot;

    const result = await handleCapture({
      content: '---\ntitle: "ADR-001: stale"\n---\n\n# Decision\n',
      type: "adr",
      metadata: { title: "Real Decision" },
    });
    process.cwd = origCwd;

    expect("error" in result).toBe(false);
    const ok = result as CaptureResponse;
    const content = fs.readFileSync(ok.filePath, "utf-8");
    expect(fenceCount(content)).toBe(2);
    expect(content).toContain("# Decision");
    expect(content).not.toContain("stale");
  });

  test("strips embedded frontmatter at the update-in-place write site too", async () => {
    const kgRoot = makeTempDir("strip-update");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const origCwd = process.cwd;
    process.cwd = () => kgRoot;

    const existingPath = path.join(kgRoot, "sessions", "existing.md");
    fs.mkdirSync(path.dirname(existingPath), { recursive: true });
    fs.writeFileSync(existingPath, "---\ntitle: old\n---\nOld body\n", "utf-8");

    const result = await handleCapture({
      content: '---\ntitle: "stale-embedded"\n---\n\n## Updated body\n',
      type: "session",
      metadata: { title: "main", existingFile: existingPath },
    });
    process.cwd = origCwd;

    expect("error" in result).toBe(false);
    const content = fs.readFileSync(existingPath, "utf-8");
    expect(fenceCount(content)).toBe(2);
    expect(content).toContain("## Updated body");
    expect(content).not.toContain("stale-embedded");
  });

  // Opus review (2026-08-17), Important #5: stripLeadingFrontmatter had the
  // same false-positive class as upgrade.ts's detectDoubledFrontmatter
  // (CRITICAL #1) -- it stripped up to the next `\n---`-prefixed line with
  // no check the region in between was actually YAML. A body that merely
  // opens with a horizontal rule (no real content following it starts with
  // a `---`) must not be treated as embedded frontmatter to strip.
  test("does NOT strip a body that opens with a horizontal rule but has no real frontmatter fields", async () => {
    const kgRoot = makeTempDir("strip-false-positive");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const origCwd = process.cwd;
    process.cwd = () => kgRoot;

    const bodyContent = "---\n\n## Session Continuation\n\nReal content that must survive.\n\n---\n\n## Next\n";
    const result = await handleCapture({
      content: bodyContent,
      type: "session",
      metadata: { title: "main" },
    });
    process.cwd = origCwd;

    expect("error" in result).toBe(false);
    const ok = result as CaptureResponse;
    const content = fs.readFileSync(ok.filePath, "utf-8");
    expect(content).toContain("## Session Continuation");
    expect(content).toContain("Real content that must survive.");
    expect(content).toContain("## Next");
  });

  test("does NOT strip a body containing a colon-prefixed prose line between dividers (Fable review, 2026-08-18)", async () => {
    const kgRoot = makeTempDir("strip-prose-colon");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const origCwd = process.cwd;
    process.cwd = () => kgRoot;

    // A single stray "Note:"-shaped line at column 0 must not be enough to
    // treat the whole region as YAML -- every non-blank line must qualify.
    const bodyContent = "---\n\n## Summary\n\nNote: deferred X.\n\n---\n\n## Details\n";
    const result = await handleCapture({
      content: bodyContent,
      type: "session",
      metadata: { title: "main" },
    });
    process.cwd = origCwd;

    expect("error" in result).toBe(false);
    const ok = result as CaptureResponse;
    const content = fs.readFileSync(ok.filePath, "utf-8");
    expect(content).toContain("## Summary");
    expect(content).toContain("Note: deferred X.");
    expect(content).toContain("## Details");
  });

  test("does NOT mistake a longer dash run (----) for the frontmatter closing fence", async () => {
    const kgRoot = makeTempDir("strip-dash-run");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const origCwd = process.cwd;
    process.cwd = () => kgRoot;

    const bodyContent = '---\ntitle: "real"\n----\n\n## Body\n';
    const result = await handleCapture({
      content: bodyContent,
      type: "session",
      metadata: { title: "main" },
    });
    process.cwd = origCwd;

    expect("error" in result).toBe(false);
    const ok = result as CaptureResponse;
    const content = fs.readFileSync(ok.filePath, "utf-8");
    // No real closing "---" line exists in the input, so nothing should be
    // stripped -- the whole original body is preserved after the server's
    // own generated frontmatter.
    expect(content).toContain('title: "real"');
    expect(content).toContain("----");
    expect(content).toContain("## Body");
  });
});

// ---------------------------------------------------------------------------
// issue-46 Manifestation B: metadata plumbing (update-in-place header
// fields, ADR status honoring metadata.status)
// ---------------------------------------------------------------------------

describe("kg_capture — metadata plumbing for update-in-place (issue-46)", () => {
  test("as_of_commit and last_updated appear in the regenerated frontmatter", async () => {
    const kgRoot = makeTempDir("plumbing-session");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const origCwd = process.cwd;
    process.cwd = () => kgRoot;

    const existingPath = path.join(kgRoot, "sessions", "existing.md");
    fs.mkdirSync(path.dirname(existingPath), { recursive: true });
    fs.writeFileSync(existingPath, "---\ntitle: old\n---\nOld\n", "utf-8");

    const result = await handleCapture({
      content: "## Updated\n",
      type: "session",
      metadata: {
        title: "main",
        existingFile: existingPath,
        as_of_commit: "abc1234",
        last_updated: "2026-08-17 12:00",
      },
    });
    process.cwd = origCwd;

    expect("error" in result).toBe(false);
    const content = fs.readFileSync(existingPath, "utf-8");
    expect(content).toContain("as_of_commit: abc1234");
    expect(content).toContain("last_updated: 2026-08-17 12:00");
  });

  test("second same-day session capture via existingFile succeeds without CONFLICT", async () => {
    // Regression guard for the non-functional update-in-place path found
    // during issue-46 implementation: previously agents sent inert
    // "version": "append" instead of existingFile, so any second same-day
    // capture hit CONFLICT (see checkExistingFile test above). This confirms
    // the fixed path (existingFile set) bypasses that conflict branch.
    const kgRoot = makeTempDir("plumbing-no-conflict");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    mockActiveKg(kgRoot);

    const origCwd = process.cwd;
    process.cwd = () => kgRoot;

    const today = new Date().toISOString().slice(0, 10);
    const ym = today.slice(0, 7);
    const sessionDir = path.join(kgRoot, "sessions", ym);
    fs.mkdirSync(sessionDir, { recursive: true });
    const existingPath = path.join(sessionDir, `${today}-main.md`);
    fs.writeFileSync(existingPath, "---\ntitle: main\n---\nFirst capture\n", "utf-8");

    const result = await handleCapture({
      content: "## Second capture\n",
      type: "session",
      metadata: { title: "main", existingFile: existingPath, last_updated: "2026-08-17 13:00" },
    });
    process.cwd = origCwd;

    expect("error" in result).toBe(false);
    expect((result as CaptureResponse).status).toBe("updated");
    const content = fs.readFileSync(existingPath, "utf-8");
    expect(content).toContain("## Second capture");
    expect(content).not.toContain("First capture");
  });
});

// ---------------------------------------------------------------------------
// displayTitleFor -- README index display text (issue-46 solution-approach
// item 12: reconstruct from type + adrNumber/date rather than regress to a
// bare title now that metadata.title no longer carries the prefix)
// ---------------------------------------------------------------------------

describe("displayTitleFor", () => {
  test("adr: reconstructs 'ADR-NNN: Title' from bare title + adrNumber", () => {
    expect(displayTitleFor("adr", { title: "My Decision" }, 69)).toBe("ADR-069: My Decision");
  });

  test("session: reconstructs 'YYYY-MM-DD-title' from bare title", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(displayTitleFor("session", { title: "main" })).toBe(`${today}-main`);
  });

  test("lesson: returns bare title unchanged (never had a prefix)", () => {
    expect(displayTitleFor("lesson", { title: "Some Lesson" })).toBe("Some Lesson");
  });
});
