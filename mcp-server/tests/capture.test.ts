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
    active: "test-kg",
    graphs: {
      "test-kg": {
        name: "test-kg",
        path: kgRoot,
        type: "project-local",
        categories: [],
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
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
    expect(fm).toContain('title: "My Session"');
    expect(fm).toContain(`date: ${today}`);
    expect(fm).toContain("branch: dev");
    expect(fm).toContain("commit: abc1234");
    expect(fm).toContain("tags: [feature]");
  });

  test("adr frontmatter has status Proposed and date", () => {
    const today = new Date().toISOString().slice(0, 10);
    const fm = generateFrontmatter("adr", {
      title: "Use Postgres",
      tags: ["db"],
      git: { author: "alice" },
    });
    expect(fm).toContain('title: "Use Postgres"');
    expect(fm).toContain("status: Proposed");
    expect(fm).toContain(`date: ${today}`);
    expect(fm).toContain("deciders: alice");
    expect(fm).toContain("tags: [db]");
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
      active: "my-project",
      graphs: {
        "my-project": {
          name: "my-project",
          path: projRoot,
          type: "project-local",
          categories: [],
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
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
          lastUsed: new Date().toISOString(),
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

    const result = await handleCapture(request, "personal");
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

    const result = await handleCapture(request, "personal");
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

// ---------------------------------------------------------------------------
// checkExistingFile
// ---------------------------------------------------------------------------

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
