jest.mock("../src/utils.js", () => {
  const actual = jest.requireActual("../src/utils.js") as Record<string, unknown>;
  return { ...actual, readConfig: jest.fn() };
});

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { z } from "zod";
import { pathToFileURL } from "url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  buildRelationshipScanReply,
  dismissalWarning,
  registerRelationshipScanTool,
  HUB_MAX_LIMIT,
} from "../src/tools/relationship-scan.js";
import { readConfig, KgConfig } from "../src/utils.js";

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  // Nest one level below a fresh mkdtemp wrapper (see resolve.test.ts for why).
  const wrapper = fs.mkdtempSync(path.join(os.tmpdir(), `relscan-tool-${prefix}-`));
  const dir = path.join(wrapper, "kg");
  fs.mkdirSync(dir);
  tempDirs.push(wrapper);
  return dir;
}

afterEach(() => {
  while (tempDirs.length) fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
  jest.clearAllMocks();
});

function makeConfig(projRoot: string): KgConfig {
  const now = new Date().toISOString();
  return {
    version: "1.0.0",
    graphs: {
      proj: {
        name: "proj",
        path: projRoot,
        type: "project-local",
        categories: [],
        createdAt: now,
        status: "active",
        statusChangedAt: now,
        graphId: "proj-id",
      },
    },
    sanitization: { enabled: false, patterns: [], action: "warn" },
  };
}

function write(root: string, files: Record<string, string>) {
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
}

const note = (...paths: string[]) => paths.map((p) => `\`${p}\``).join(" ") + "\n";
const ENH1 = "enhancements/ENH-1/ENH-1-specification.md";
const ISS2 = "issues/issue-2/issue-2-description.md";

describe("buildRelationshipScanReply", () => {
  it("returns the graph, counts, pairs and the dismissal warning when pairs are flagged", () => {
    const root = makeTempDir("pairs");
    write(root, { [ENH1]: note("a/x.ts"), [ISS2]: note("a/x.ts") });
    const reply = buildRelationshipScanReply(makeConfig(root), {}, root);
    expect(reply).toEqual({
      graph: { name: "proj", path: root },
      scanned: { issues: 1, enhancements: 1 },
      pairCount: 1,
      pairs: [{ a: "ENH-1", b: "issue-2", sharedPath: "a/x.ts", fileA: ENH1, fileB: ISS2 }],
      warning: dismissalWarning(1),
    });
  });

  it("warning text is the bash block's stderr line", () => {
    expect(dismissalWarning(3)).toBe(
      "relationship-scan: 3 pair(s) flagged. Dismissing a pair here does not save anything: the same pairs reappear on every audit until a relationship is declared in either note's frontmatter."
    );
  });

  it("has no warning and no note when nothing is flagged", () => {
    const root = makeTempDir("clean");
    write(root, { [ENH1]: note("a/x.ts"), [ISS2]: note("b/y.ts") });
    const reply = buildRelationshipScanReply(makeConfig(root), {}, root);
    expect(reply).toMatchObject({ pairCount: 0, pairs: [] });
    expect(reply).not.toHaveProperty("warning");
    expect(reply).not.toHaveProperty("note");
  });

  it("gives a note, not an error, when the graph has neither issues/ nor enhancements/", () => {
    const root = makeTempDir("empty");
    write(root, { "decisions/ADR-1.md": "x" });
    const reply = buildRelationshipScanReply(makeConfig(root), {}, root);
    expect(reply).toMatchObject({ pairCount: 0, pairs: [], scanned: { issues: 0, enhancements: 0 } });
    expect((reply as { note?: string }).note).toMatch(/nothing to scan/);
    expect(reply).not.toHaveProperty("warning");
  });

  it("honors hubMax", () => {
    const root = makeTempDir("hub");
    write(root, Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`enhancements/ENH-${n}/ENH-${n}-specification.md`, note("a/hub.ts")])));
    expect(buildRelationshipScanReply(makeConfig(root), {}, root)).toMatchObject({ pairCount: 0 });
    expect(buildRelationshipScanReply(makeConfig(root), { hubMax: 5 }, root)).toMatchObject({ pairCount: 10 });
  });

  it("returns an error when the current folder matches no graph, without pointing at a scope parameter", () => {
    const root = makeTempDir("graph");
    const elsewhere = makeTempDir("elsewhere");
    const reply = buildRelationshipScanReply(makeConfig(root), {}, elsewhere);
    expect(reply).toHaveProperty("error");
    const message = (reply as { error: string }).error;
    expect(message).toMatch(/No knowledge graph resolved/);
    expect(message).not.toMatch(/scope/);
  });

  it("never reads the personal graph", () => {
    const projRoot = makeTempDir("proj");
    const personalRoot = makeTempDir("personal");
    write(personalRoot, { [ENH1]: note("a/x.ts"), [ISS2]: note("a/x.ts") });
    const config = makeConfig(projRoot);
    config.graphs.personal = { ...config.graphs.proj, name: "personal", path: personalRoot, type: "personal", graphId: "personal-id" };
    const reply = buildRelationshipScanReply(config, {}, projRoot) as { graph: { name: string }; pairCount: number };
    expect(reply.graph.name).toBe("proj");
    expect(reply.pairCount).toBe(0);
  });

  it("writes nothing into the graph", () => {
    const root = makeTempDir("readonly");
    write(root, { [ENH1]: note("a/x.ts"), [ISS2]: note("a/x.ts") });
    const snapshot = () =>
      fs
        .readdirSync(root, { recursive: true })
        .map(String)
        .sort()
        .map((f) => {
          const full = path.join(root, f);
          return fs.statSync(full).isFile() ? `${f}:${fs.readFileSync(full, "utf8")}` : f;
        });
    const before = snapshot();
    buildRelationshipScanReply(makeConfig(root), {}, root);
    expect(snapshot()).toEqual(before);
  });
});

describe("kg_relationship_scan registration", () => {
  function capture() {
    const server = new McpServer({ name: "test", version: "0.0.0" });
    let args: any[] = [];
    jest.spyOn(server, "tool").mockImplementation((...a: any[]) => {
      args = a;
      return server as any;
    });
    registerRelationshipScanTool(server);
    return args;
  }

  it("registers under the name kg_relationship_scan with a read-only description", () => {
    const [name, description] = capture();
    expect(name).toBe("kg_relationship_scan");
    expect(description).toMatch(/Read-only/);
  });

  // The handler test above resolve.test.ts's pattern calls the handler directly, which SKIPS
  // zod. The schema is checked explicitly here so a bad hubMax really can fail.
  it("schema accepts 2..100 and omission, rejects everything else", () => {
    const schema = z.object(capture()[2]);
    for (const ok of [undefined, 2, 4, HUB_MAX_LIMIT]) expect(schema.safeParse({ hubMax: ok }).success).toBe(true);
    for (const bad of [1, 0, -3, 2.5, HUB_MAX_LIMIT + 1, "4"]) expect(schema.safeParse({ hubMax: bad }).success).toBe(false);
  });

  it("handler returns compact JSON on success", async () => {
    const root = makeTempDir("handler");
    write(root, { [ENH1]: note("a/x.ts"), [ISS2]: note("a/x.ts") });
    (readConfig as jest.Mock).mockReturnValue(makeConfig(root));
    const handler = capture()[3];
    const origCwd = process.cwd;
    process.cwd = () => root;
    let result: any;
    try {
      result = await handler({});
    } finally {
      process.cwd = origCwd;
    }
    expect(result.isError).toBeUndefined();
    const text: string = result.content[0].text;
    expect(text).not.toMatch(/\n/); // compact: no pretty-print
    expect(JSON.parse(text)).toMatchObject({ pairCount: 1, graph: { name: "proj", path: root } });
  });

  it("handler resolves the graph from the client's _meta.sandboxCwd, not the process cwd", async () => {
    const root = makeTempDir("sandbox");
    const elsewhere = makeTempDir("elsewhere");
    write(root, { [ENH1]: note("a/x.ts"), [ISS2]: note("a/x.ts") });
    (readConfig as jest.Mock).mockReturnValue(makeConfig(root));
    const handler = capture()[3];
    const origCwd = process.cwd;
    process.cwd = () => elsewhere; // would resolve to no graph
    let result: any;
    try {
      result = await handler({}, { _meta: { sandboxCwd: pathToFileURL(root).href } });
    } finally {
      process.cwd = origCwd;
    }
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text)).toMatchObject({ pairCount: 1 });
  });

  it("handler returns isError with an Error: prefix when no graph resolves", async () => {
    const root = makeTempDir("graph");
    const elsewhere = makeTempDir("elsewhere");
    (readConfig as jest.Mock).mockReturnValue(makeConfig(root));
    const handler = capture()[3];
    const origCwd = process.cwd;
    process.cwd = () => elsewhere;
    let result: any;
    try {
      result = await handler({});
    } finally {
      process.cwd = origCwd;
    }
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/^Error: No knowledge graph resolved/);
  });
});
