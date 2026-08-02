import { isHardBlockedRegistrationPath, findBroadAncestorWarning } from "../src/tools/config.js";
import * as os from "os";
import { KgConfig } from "../src/utils.js";

describe("isHardBlockedRegistrationPath", () => {
  it("blocks the user's home directory", () => {
    expect(isHardBlockedRegistrationPath(os.homedir())).toBe(true);
  });
  it("blocks the filesystem root", () => {
    expect(isHardBlockedRegistrationPath("/")).toBe(true);
  });
  it("allows an ordinary project subdirectory", () => {
    expect(isHardBlockedRegistrationPath("/home/user/some-project/knowledge")).toBe(false);
  });
});

describe("findBroadAncestorWarning", () => {
  function g(p: string, type: "project-local" | "personal" = "project-local") {
    return { name: p, path: p, type, categories: [], createdAt: "x", status: "active" as const, statusChangedAt: "x", graphId: "id" };
  }

  it("returns null when the candidate path is not an ancestor of anything registered", () => {
    const config: KgConfig = { version: "1.0.0", graphs: { a: g("/home/user/proj-a/knowledge") }, sanitization: { enabled: false, patterns: [], action: "warn" } } as any;
    expect(findBroadAncestorWarning(config, "/home/user/proj-b/knowledge")).toBeNull();
  });

  it("flags a candidate path that is an ancestor of an already-registered project", () => {
    const config: KgConfig = { version: "1.0.0", graphs: { a: g("/home/user/workspace/proj-a/knowledge") }, sanitization: { enabled: false, patterns: [], action: "warn" } } as any;
    const result = findBroadAncestorWarning(config, "/home/user/workspace");
    expect(result).not.toBeNull();
    expect(result!.isAncestorOfCount).toBe(1);
    expect(result!.ancestorOfNames).toEqual(["a"]);
  });

  it("does not consider personal-type graphs when checking ancestry (they intentionally live outside any project)", () => {
    const config: KgConfig = { version: "1.0.0", graphs: { p: g(process.env.HOME + "/kmgraph-personal", "personal") }, sanitization: { enabled: false, patterns: [], action: "warn" } } as any;
    expect(findBroadAncestorWarning(config, process.env.HOME!)).toBeNull(); // would also be hard-blocked separately, but this test isolates the ancestor-scan behavior
  });

  // M-7 (3): the filter excludes only status "deleted" -- pin that "archived"
  // entries still count toward the broad-ancestor trigger (consistent with
  // "active"/"pending"), since ADR-063's archive-never-delete means an
  // archived entry's on-disk content is still there and still worth warning
  // about.
  it("includes archived-status entries in the ancestor count (only 'deleted' is excluded)", () => {
    const archived = { ...g("/home/user/workspace/proj-a/knowledge"), status: "archived" as const };
    const config: KgConfig = { version: "1.0.0", graphs: { a: archived }, sanitization: { enabled: false, patterns: [], action: "warn" } } as any;
    const result = findBroadAncestorWarning(config, "/home/user/workspace");
    expect(result).not.toBeNull();
    expect(result!.isAncestorOfCount).toBe(1);
    expect(result!.ancestorOfNames).toEqual(["a"]);
  });
});
