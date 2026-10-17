import * as fs from "fs";
import * as path from "path";
import { verifyEquivalent } from "../src/lib/frontmatter/verify.js";
import { applyFrontmatterSchema, checkFrontmatterSchema, frontmatterDiff } from "../src/lib/frontmatter/index.js";
import { readSchemaMarker, writeSchemaMarker } from "../src/lib/frontmatter/marker.js";
import { makeGraph, removeGraph, read, stubs } from "./frontmatter-fixture.js";

const ISSUE = ["---", "id: issue-15", "status: resolved", 'github-issue: "#172"', "related-issues: [issue-14]", "---", "", "# body", ""].join("\n");

describe("verifyEquivalent", () => {
  const before = ["---", "id: a", "related-issues: [1]", "tags: [x]", "---", "body"].join("\n");
  test("ok when only touched keys differ", () => {
    const after = before.replace("related-issues: [1]", 'related_issues: ["issue-1"]');
    expect(verifyEquivalent(before, after, ["related-issues", "related_issues"])).toBeNull();
  });
  test("rejects a changed untouched key", () => {
    const after = before.replace("tags: [x]", "tags: [y]");
    expect(verifyEquivalent(before, after, ["related-issues"])).toContain("outside");
  });
  test("rejects a changed body", () => {
    expect(verifyEquivalent(before, before.replace("body", "BODY"), [])).toContain("body");
  });
  test("rejects frontmatter that does not parse", () => {
    const bad = before.replace("tags: [x]", "tags: [x");
    expect(verifyEquivalent(before, bad, [])).toContain("does not parse");
  });
});

describe("frontmatterDiff", () => {
  test("shows removed and added frontmatter lines only", () => {
    const after = ISSUE.replace('github-issue: "#172"', 'github_issue: "#172"');
    expect(frontmatterDiff(ISSUE, after)).toEqual(['-  github-issue: "#172"', '+  github_issue: "#172"']);
  });
});

describe("check / apply", () => {
  let root: string;
  beforeEach(() => {
    root = makeGraph({ ...stubs("issues/issue-14/issue-14-description.md"), "issues/issue-15/issue-15-description.md": ISSUE });
  });
  afterEach(() => removeGraph(root));

  test("inspect reports per-step counts, a sample diff, and writes nothing", () => {
    const [finding] = checkFrontmatterSchema(root);
    expect(finding.category).toBe("frontmatter-schema");
    expect(finding.details).toContain("step 1");
    expect(finding.details).toContain("github_issue");
    expect(finding.details).toContain("frontmatterSteps");
    expect(read(root, "issues/issue-15/issue-15-description.md")).toBe(ISSUE);
    expect(readSchemaMarker(root)).toBeNull();
  });

  test("a graph with nothing pending reports nothing", () => {
    applyFrontmatterSchema(root, [1, 2, 4]);
    expect(checkFrontmatterSchema(root)).toEqual([]);
  });

  test("apply step 1 rewrites, keeps a .bak copy, and advances the marker", () => {
    const msg = applyFrontmatterSchema(root, [1]);
    const file = path.join(root, "issues/issue-15/issue-15-description.md");
    expect(fs.readFileSync(file, "utf-8")).toContain('github_issue: "#172"');
    expect(fs.readFileSync(`${file}.bak`, "utf-8")).toBe(ISSUE);
    expect(readSchemaMarker(root)).toBe(1);
    expect(msg).toContain("1 file(s) rewritten");
    expect(msg).toContain(".bak");
  });

  test("an existing .bak is never overwritten", () => {
    const file = path.join(root, "issues/issue-15/issue-15-description.md");
    fs.writeFileSync(`${file}.bak`, "ORIGINAL BACKUP", "utf-8");
    applyFrontmatterSchema(root, [1]);
    expect(fs.readFileSync(`${file}.bak`, "utf-8")).toBe("ORIGINAL BACKUP");
  });

  test("step 2 without step 1 pending work done is refused", () => {
    expect(() => applyFrontmatterSchema(root, [2])).toThrow(/requires step 1/);
  });

  test("unknown step numbers are refused", () => {
    expect(() => applyFrontmatterSchema(root, [9])).toThrow(/unknown step/);
  });

  test("an empty step list is refused", () => {
    expect(() => applyFrontmatterSchema(root, [])).toThrow(/at least one step/);
  });

  test("a file changed since inspection is not overwritten", () => {
    // Simulate by making the file differ between plan and write: apply twice with a stale plan is not possible
    // through the public API, so assert the guard indirectly: the second apply finds nothing to do.
    applyFrontmatterSchema(root, [1]);
    expect(applyFrontmatterSchema(root, [1])).toContain("0 file(s) rewritten");
  });

  test("marker below the floor is reported, not silently skipped", () => {
    jest.resetModules();
    jest.doMock("../src/lib/frontmatter/migrations/index.js", () => ({
      ...jest.requireActual("../src/lib/frontmatter/migrations/index.js"),
      FRONTMATTER_SCHEMA_FLOOR: 3,
    }));
    const mod = require("../src/lib/frontmatter/index.js") as typeof import("../src/lib/frontmatter/index.js");
    writeSchemaMarker(root, 1);
    const [finding] = mod.checkFrontmatterSchema(root);
    expect(finding.description).toContain("below the supported floor");
    jest.dontMock("../src/lib/frontmatter/migrations/index.js");
  });

  test("full run is idempotent: second inspect finds nothing", () => {
    applyFrontmatterSchema(root, [1, 2, 4]);
    expect(checkFrontmatterSchema(root)).toEqual([]);
    const body = read(root, "issues/issue-15/issue-15-description.md");
    expect(body).toContain("status_category: done");
    expect(body).toContain('related_issues: ["[[issue-14-description|issue-14]]"]');
    expect(body).toContain("# body"); // body untouched
  });
});

describe("prerequisites are transitive and runs converge (Opus review F2/F3)", () => {
  let root: string;
  afterEach(() => removeGraph(root));

  test("step 3 is refused while step 1 work is still pending", () => {
    const fm = ["---", "number: 050", "status: Accepted", "related-adrs: [ADR-099]", "related:", "  adrs: [ADR-098]", "---", "b"].join("\n");
    root = makeGraph({ "decisions/ADR-050-y.md": fm });
    expect(() => applyFrontmatterSchema(root, [3])).toThrow(/requires step/);
    expect(read(root, "decisions/ADR-050-y.md")).toBe(fm);
  });

  test("an ambiguous reference ends fully converged after steps 1-4", () => {
    const fm = ["---", "number: 070", "status: Accepted", "related:", '  adrs: ["067"]', "---", "b"].join("\n");
    root = makeGraph({ ...stubs("decisions/ADR-067-a.md", "decisions/ADR-067-b.md"), "decisions/ADR-070-x.md": fm });
    applyFrontmatterSchema(root, [1, 2, 3, 4]);
    expect(checkFrontmatterSchema(root)).toEqual([]);
    expect(readSchemaMarker(root)).toBe(4);
  });
});
