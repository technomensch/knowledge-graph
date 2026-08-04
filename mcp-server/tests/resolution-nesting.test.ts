import { resolveGraph, findTruePathTies } from "../src/resolution.js";
import { KgConfig, GraphConfig } from "../src/utils.js";

function g(overrides: Partial<GraphConfig>): GraphConfig {
  return { name: "g", path: "/g", type: "project-local", categories: [], createdAt: "x", status: "active", statusChangedAt: "x", graphId: "id", ...overrides };
}

describe("nested KG resolution", () => {
  it("does not false-match a sibling with a similar prefix (naive startsWith failure mode)", () => {
    const config: KgConfig = {
      version: "1.0.0",
      graphs: { proj: g({ name: "proj", path: "/home/user/proj/knowledge" }) },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    const result = resolveGraph(config, "/home/user/proj-other/src");
    expect(result.kind).toBe("no-graph-in-cwd");
  });

  it("resolves the deepest of 3+ nesting levels", () => {
    const config: KgConfig = {
      version: "1.0.0",
      graphs: {
        monorepo: g({ name: "monorepo", path: "/repo/knowledge" }),
        packages: g({ name: "packages", path: "/repo/packages/knowledge" }),
        api: g({ name: "api", path: "/repo/packages/api/knowledge" }),
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    const result = resolveGraph(config, "/repo/packages/api/src/handlers");
    expect(result.kind).toBe("resolved");
    if (result.kind === "resolved") expect(result.name).toBe("api");
  });

  it("an archived deepest match surfaces as archived, never silently falls back a level", () => {
    const config: KgConfig = {
      version: "1.0.0",
      graphs: {
        monorepo: g({ name: "monorepo", path: "/repo/knowledge" }),
        api: g({ name: "api", path: "/repo/packages/api/knowledge", status: "archived" }),
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    const result = resolveGraph(config, "/repo/packages/api/src");
    expect(result.kind).toBe("archived");
    if (result.kind === "archived") expect(result.name).toBe("api");
  });

  it("findTruePathTies detects two registry entries resolving to the identical path", () => {
    const config: KgConfig = {
      version: "1.0.0",
      graphs: {
        original: g({ name: "original", path: "/repo/knowledge" }),
        fork: g({ name: "fork", path: "/repo/knowledge" }),
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    expect(findTruePathTies(config, "/repo/knowledge").sort()).toEqual(["fork", "original"]);
  });
});
