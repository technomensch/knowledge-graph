import { changeGraphStatus, isWritable, KgConfig, GraphConfig } from "../src/utils.js";

function makeGraph(overrides: Partial<GraphConfig> = {}): GraphConfig {
  return {
    name: "test-kg",
    path: "/tmp/test-kg",
    type: "project-local",
    categories: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "active",
    statusChangedAt: "2026-01-01T00:00:00.000Z",
    graphId: "abc123",
    ...overrides,
  };
}

describe("graph status lifecycle", () => {
  it("changeGraphStatus flips status and stamps statusChangedAt without touching other fields", () => {
    const config: KgConfig = { version: "1.0.0", graphs: { "test-kg": makeGraph() }, sanitization: { enabled: false, patterns: [], action: "warn" } };
    const before = config.graphs["test-kg"].statusChangedAt;
    const updated = changeGraphStatus(config, "test-kg", "archived");
    expect(updated.graphs["test-kg"].status).toBe("archived");
    expect(updated.graphs["test-kg"].statusChangedAt).not.toBe(before);
    expect(updated.graphs["test-kg"].path).toBe("/tmp/test-kg");
  });

  it("changeGraphStatus records githubUser when provided", () => {
    const config: KgConfig = { version: "1.0.0", graphs: { "test-kg": makeGraph() }, sanitization: { enabled: false, patterns: [], action: "warn" } };
    const updated = changeGraphStatus(config, "test-kg", "archived", { githubUser: "technomensch" });
    expect(updated.graphs["test-kg"].githubUser).toBe("technomensch");
  });

  it("isWritable is true only for status=active", () => {
    expect(isWritable(makeGraph({ status: "active" }))).toBe(true);
    expect(isWritable(makeGraph({ status: "pending" }))).toBe(false);
    expect(isWritable(makeGraph({ status: "archived" }))).toBe(false);
    expect(isWritable(makeGraph({ status: "deleted" }))).toBe(false);
  });
});
