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
    getActiveGraphPath: jest.fn(),
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
import { readConfig, getActiveGraphPath } from "../src/utils.js";
import { rebuildIndex } from "../src/tools/fts5.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `capture-test-${prefix}-`));
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
  (readConfig as jest.Mock).mockReturnValue({ active: "test-kg", graphs: {} });
  (getActiveGraphPath as jest.Mock).mockReturnValue(kgRoot);
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

    expect(rebuildIndex).toHaveBeenCalledWith(kgRoot);
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
    expect(err.activeKgRoot).toBe(kgRoot);
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

    expect(rebuildIndex).toHaveBeenCalledWith(kgRoot);
  });
});
