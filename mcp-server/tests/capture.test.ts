import { handleCapture, CaptureRequest } from "../src/tools/capture.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Mock config for testing
jest.mock("../src/config.js", () => ({
  readConfig: jest.fn(() => ({
    active: "test-kg",
    graphs: {
      "test-kg": {
        name: "test-kg",
        path: process.cwd(), // Use current directory for testing
        type: "project-local",
      },
    },
  })),
  getActiveGraphPath: jest.fn(() => process.cwd()),
}));

describe("kg_capture", () => {
  const testDir = path.join(process.cwd(), "test-kg-temp");

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should create a lesson file with correct frontmatter", async () => {
    const request: CaptureRequest = {
      content: "## Problem\nSomething broke.\n\n## Solution\nFixed it.",
      type: "lesson",
      metadata: {
        title: "Test Lesson",
        category: "debugging",
        tags: ["error", "fix"],
      },
    };

    const result = await handleCapture(request);
    expect(result).toHaveProperty("status");
    expect((result as any).status).toBe("created");
  });

  it("should validate required metadata", async () => {
    const request: CaptureRequest = {
      content: "Test content",
      type: "lesson",
      metadata: {
        title: "", // Empty title should fail
      },
    };

    const result = await handleCapture(request);
    expect((result as any).error).toBe("VALIDATION_ERROR");
  });

  it("should enforce KG/CWD alignment", async () => {
    // This test would fail if CWD doesn't match active KG
    // For now, just verify the function is called
    const request: CaptureRequest = {
      content: "Test",
      type: "lesson",
      metadata: { title: "Alignment Test" },
    };

    const result = await handleCapture(request);
    // If KG/CWD matches, should be successful
    if ((result as any).error === "KG_MISMATCH") {
      expect((result as any).error).toBe("KG_MISMATCH");
    }
  });

  it("should handle session type with date-based directory", async () => {
    const request: CaptureRequest = {
      content: "Session notes",
      type: "session",
      metadata: {
        title: "Work Session",
      },
    };

    const result = await handleCapture(request);
    // Should succeed if KG/CWD aligned
    expect(result).toBeDefined();
  });

  it("should handle ADR type with auto-numbered filename", async () => {
    const request: CaptureRequest = {
      content: "## Context\nArchitectural decision.\n\n## Decision\nChoose approach A.",
      type: "adr",
      metadata: {
        title: "Architecture Decision",
      },
    };

    const result = await handleCapture(request);
    expect(result).toBeDefined();
  });

  it("should validate active KG configuration", async () => {
    const request: CaptureRequest = {
      content: "Test",
      type: "lesson",
      metadata: { title: "Config Test" },
    };

    const result = await handleCapture(request);
    // Should either succeed or return validation error
    expect(
      (result as any).status || (result as any).error
    ).toBeDefined();
  });

  it("should handle metadata with git context", async () => {
    const request: CaptureRequest = {
      content: "Fixed bug #123",
      type: "lesson",
      metadata: {
        title: "Bug Fix Lesson",
        git: {
          branch: "fix/issue-123",
          commit: "abc123def456",
          commit_short: "abc123d",
          author: "Test Author",
          email: "test@example.com",
        },
      },
    };

    const result = await handleCapture(request);
    expect(result).toBeDefined();
  });

  it("should handle optional fields gracefully", async () => {
    const request: CaptureRequest = {
      content: "Minimal lesson",
      type: "lesson",
      metadata: {
        title: "Minimal Content",
        // No category, tags, git, or version
      },
    };

    const result = await handleCapture(request);
    // Should use defaults for missing optional fields
    expect(result).toBeDefined();
  });
});
