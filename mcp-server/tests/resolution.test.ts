jest.mock("../src/utils.js", () => {
  const actual = jest.requireActual("../src/utils.js") as Record<string, unknown>;
  return {
    ...actual,
    updateConfig: jest.fn(),
  };
});

import { resolveGraph, resolvePersonalGraph, resolveGraphOutcome } from "../src/resolution.js";
import { KgConfig, GraphConfig, updateConfig } from "../src/utils.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";

function g(overrides: Partial<GraphConfig>): GraphConfig {
  return { name: "g", path: "/g", type: "project-local", categories: [], createdAt: "x", status: "active", statusChangedAt: "x", graphId: "id", ...overrides };
}

describe("resolveGraph", () => {
  it("resolves by cwd match against a registered project-local path", () => {
    const config: KgConfig = {
      version: "1.0.0",
      graphs: { myproj: g({ name: "myproj", path: "/home/user/myproj/knowledge" }) },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    const result = resolveGraph(config, "/home/user/myproj/src/deep");
    expect(result.kind).toBe("resolved");
    if (result.kind === "resolved") expect(result.name).toBe("myproj");
  });

  it("returns no-graph-in-cwd when cwd matches nothing registered and no name given", () => {
    const config: KgConfig = { version: "1.0.0", graphs: {}, sanitization: { enabled: false, patterns: [], action: "warn" } };
    expect(resolveGraph(config, "/somewhere/random").kind).toBe("no-graph-in-cwd");
  });

  it("exact name match routes directly regardless of cwd", () => {
    const config: KgConfig = { version: "1.0.0", graphs: { myproj: g({ name: "myproj", path: "/x" }) }, sanitization: { enabled: false, patterns: [], action: "warn" } };
    const result = resolveGraph(config, "/unrelated", "myproj");
    expect(result.kind).toBe("resolved");
  });

  it("fuzzy-matches a partial name and returns candidates, never silently picks one", () => {
    const config: KgConfig = {
      version: "1.0.0",
      graphs: { "kmgraph-web": g({ name: "kmgraph-web", path: "/a" }), "kmgraph-api": g({ name: "kmgraph-api", path: "/b" }) },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    const result = resolveGraph(config, "/unrelated", "kmgraph");
    expect(result.kind).toBe("fuzzy-match");
    if (result.kind === "fuzzy-match") expect(result.candidates.sort()).toEqual(["kmgraph-api", "kmgraph-web"]);
  });

  it("returns not-registered for a name with zero matches, never searches the filesystem", () => {
    const config: KgConfig = { version: "1.0.0", graphs: {}, sanitization: { enabled: false, patterns: [], action: "warn" } };
    const result = resolveGraph(config, "/unrelated", "totally-unknown");
    expect(result.kind).toBe("not-registered");
  });

  it("returns archived when the cwd-resolved graph is archived, not resolved", () => {
    const config: KgConfig = {
      version: "1.0.0",
      graphs: { myproj: g({ name: "myproj", path: "/home/user/myproj/knowledge", status: "archived" }) },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    const result = resolveGraph(config, "/home/user/myproj/src");
    expect(result.kind).toBe("archived");
  });

  it("resolves via a symlinked cwd (findings doc #12)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "resolve-real-"));
    const realProj = path.join(dir, "real-proj");
    fs.mkdirSync(path.join(realProj, "knowledge"), { recursive: true });
    const symlinkedProj = path.join(dir, "linked-proj");
    fs.symlinkSync(realProj, symlinkedProj, "dir");

    const config: KgConfig = {
      version: "1.0.0",
      graphs: { proj: g({ name: "proj", path: path.join(realProj, "knowledge") }) },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    const result = resolveGraph(config, path.join(symlinkedProj, "src"));
    expect(result.kind).toBe("resolved");
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("resolves from a linked git worktree back to its main repo's registered entry (findings doc #12)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "resolve-worktree-"));
    const mainRepo = path.join(dir, "main-repo");
    fs.mkdirSync(path.join(mainRepo, "knowledge"), { recursive: true });
    execSync("git init -q", { cwd: mainRepo });
    execSync('git -c user.email=t@t -c user.name=t commit --allow-empty -q -m init', { cwd: mainRepo });
    const worktreeDir = path.join(dir, "wt");
    execSync(`git worktree add -q -b wt-branch "${worktreeDir}"`, { cwd: mainRepo });

    const config: KgConfig = {
      version: "1.0.0",
      graphs: { main: g({ name: "main", path: path.join(mainRepo, "knowledge") }) },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    const result = resolveGraph(config, worktreeDir);
    expect(result.kind).toBe("resolved");
    if (result.kind === "resolved") expect(result.name).toBe("main");
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("returns merged (not archived) when an archived entry has mergedInto set (findings doc #19)", () => {
    const config: KgConfig = {
      version: "1.0.0",
      graphs: {
        losing: g({ name: "losing", path: "/l/knowledge", status: "archived", statusChangedAt: "2026-08-01T00:00:00.000Z", mergedInto: "survivor" }),
        survivor: g({ name: "survivor", path: "/s/knowledge" }),
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    const byName = resolveGraph(config, "/unrelated", "losing");
    expect(byName.kind).toBe("merged");
    if (byName.kind === "merged") {
      expect(byName.into).toBe("survivor");
      expect(byName.at).toBe("2026-08-01T00:00:00.000Z");
    }
    const byCwd = resolveGraph(config, "/l/src");
    expect(byCwd.kind).toBe("merged");
  });

  it("returns archived (not resolved) when the cwd-matched graph has status deleted", () => {
    const config: KgConfig = {
      version: "1.0.0",
      graphs: { myproj: g({ name: "myproj", path: "/home/user/myproj/knowledge", status: "deleted" }) },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    const result = resolveGraph(config, "/home/user/myproj/src");
    expect(result.kind).toBe("archived");
  });

  it("resolves normally (not archived) when the cwd-matched graph has status pending", () => {
    const config: KgConfig = {
      version: "1.0.0",
      graphs: { myproj: g({ name: "myproj", path: "/home/user/myproj/knowledge", status: "pending" }) },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    const result = resolveGraph(config, "/home/user/myproj/src");
    expect(result.kind).toBe("resolved");
    if (result.kind === "resolved") expect(result.name).toBe("myproj");
  });

  it("excludes personal-type graphs from cwd resolution even when the path would otherwise match", () => {
    const config: KgConfig = {
      version: "1.0.0",
      graphs: { mypersonal: g({ name: "mypersonal", path: "/home/user/myproj/knowledge", type: "personal" }) },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    const result = resolveGraph(config, "/home/user/myproj/src");
    expect(result.kind).toBe("no-graph-in-cwd");
  });

  it("returns ambiguous-tie when two registry entries resolve to the identical deepest path (findings doc #13)", () => {
    const config: KgConfig = {
      version: "1.0.0",
      graphs: {
        original: g({ name: "original", path: "/repo/knowledge" }),
        fork: g({ name: "fork", path: "/repo/knowledge" }),
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    const result = resolveGraph(config, "/repo/src");
    expect(result.kind).toBe("ambiguous-tie");
    if (result.kind === "ambiguous-tie") expect(result.candidates.sort()).toEqual(["fork", "original"]);
  });
});

describe("resolvePersonalGraph", () => {
  it("finds the single personal-type entry", () => {
    const config = { version: "1.0.0", graphs: { p: { name: "p", path: "/p", type: "personal" as const, categories: [], createdAt: "x", status: "active" as const, statusChangedAt: "x", graphId: "id" } }, sanitization: { enabled: false, patterns: [], action: "warn" as const } };
    const result = resolvePersonalGraph(config as any);
    expect("name" in result && result.name).toBe("p");
  });
  it("errors cleanly when zero personal graphs are registered", () => {
    const config = { version: "1.0.0", graphs: {}, sanitization: { enabled: false, patterns: [], action: "warn" as const } };
    const result = resolvePersonalGraph(config as any);
    expect("error" in result).toBe(true);
  });
  it("errors cleanly when multiple personal graphs are registered (should never happen, but don't silently pick one)", () => {
    const config = { version: "1.0.0", graphs: {
      p1: { name: "p1", path: "/p1", type: "personal" as const, categories: [], createdAt: "x", status: "active" as const, statusChangedAt: "x", graphId: "id1" },
      p2: { name: "p2", path: "/p2", type: "personal" as const, categories: [], createdAt: "x", status: "active" as const, statusChangedAt: "x", graphId: "id2" },
    }, sanitization: { enabled: false, patterns: [], action: "warn" as const } };
    const result = resolvePersonalGraph(config as any);
    expect("error" in result).toBe(true);
  });
});

// ADR-067 sweep (fable review): Task 8.1's migration category refuses to
// auto-activate a graph whose path is unhealthy -- "NOT silently activated."
// A restore-from-archive answer carried the identical risk (the graph may
// have been archived because its directory moved or was deleted) but skipped
// checkGraphPathHealth entirely and always flipped status to "active" with no
// signal. These tests cover both the unchanged-behavior (healthy path) case
// and the new health-surfacing (unhealthy path) case.
describe("resolveGraphOutcome — archived entry, restore answer", () => {
  const interactionModule = require("../src/interaction.js") as typeof import("../src/interaction.js");
  const tempDirs: string[] = [];

  afterEach(() => {
    jest.restoreAllMocks();
    (updateConfig as jest.Mock).mockClear();
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it("restores a graph with a healthy path to active with no health notice (unchanged behavior)", async () => {
    const kgRoot = fs.mkdtempSync(path.join(os.tmpdir(), "resolve-restore-healthy-"));
    fs.mkdirSync(path.join(kgRoot, "lessons-learned"), { recursive: true });
    tempDirs.push(kgRoot);

    const graph = g({ name: "myproj", path: kgRoot, status: "archived" });
    const config: KgConfig = {
      version: "1.0.0",
      graphs: { myproj: graph },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    jest.spyOn(interactionModule, "gate").mockResolvedValue({ answer: "restore" });

    const outcome = await resolveGraphOutcome(
      config,
      { kind: "archived", name: "myproj", graph },
      "/unrelated",
      "interactive"
    );

    expect(outcome.kind).toBe("resolved");
    if (outcome.kind === "resolved") {
      expect(outcome.graph.status).toBe("active");
      expect(outcome.notice).toBeUndefined();
    }
    expect(updateConfig).toHaveBeenCalled();
  });

  it("restores a graph with an unhealthy (missing) path but surfaces a health notice instead of silently activating", async () => {
    const missingPath = path.join(os.tmpdir(), `resolve-restore-missing-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    // Deliberately never created -- checkGraphPathHealth must see it as missing.

    const graph = g({ name: "myproj", path: missingPath, status: "archived" });
    const config: KgConfig = {
      version: "1.0.0",
      graphs: { myproj: graph },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    jest.spyOn(interactionModule, "gate").mockResolvedValue({ answer: "restore" });

    const outcome = await resolveGraphOutcome(
      config,
      { kind: "archived", name: "myproj", graph },
      "/unrelated",
      "interactive"
    );

    expect(outcome.kind).toBe("resolved");
    if (outcome.kind === "resolved") {
      // The user explicitly asked to restore, so status still flips to active --
      // but the caller must be told the path looks unhealthy, not left to find out later.
      expect(outcome.graph.status).toBe("active");
      expect(outcome.notice).toBeDefined();
      expect(outcome.notice).toMatch(/myproj.*restored to active/);
      expect(outcome.notice).toMatch(/content-missing/);
    }
    expect(updateConfig).toHaveBeenCalled();
  });
});
