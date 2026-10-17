import {
  locateFrontmatter, isDoubledFrontmatter, topLevelBlocks, contentEnd,
  readList, readScalar, renderList, replaceLines, unquote,
} from "../src/lib/frontmatter/parse.js";

const ADR = [
  "---",
  'title: "T"',
  "git:",
  "  branch: b",
  "  pr: null",
  "related:",
  "  adrs: []",
  "tags: [a, b]",
  "---",
  "body line",
];

describe("locateFrontmatter", () => {
  test("finds the closing delimiter", () => {
    expect(locateFrontmatter(ADR)).toEqual({ end: 8 });
  });
  test("returns null when the file does not start with ---", () => {
    expect(locateFrontmatter(["# Title", "---"])).toBeNull();
  });
  test("returns null when there is no closing delimiter", () => {
    expect(locateFrontmatter(["---", "a: 1"])).toBeNull();
  });
  test("CRLF files are not recognized", () => {
    expect(locateFrontmatter(["---\r", "a: 1\r", "---\r"])).toBeNull();
  });
});

describe("isDoubledFrontmatter", () => {
  test("detects a second block immediately after the first", () => {
    const lines = ["---", "title: a", "---", "---", "title: b", "---", "body"];
    expect(isDoubledFrontmatter(lines, 2)).toBe(true);
  });
  test("a body that starts with a horizontal rule is not doubled", () => {
    const lines = ["---", "title: a", "---", "---", "Some prose here", "---"];
    expect(isDoubledFrontmatter(lines, 2)).toBe(false);
  });
});

describe("topLevelBlocks", () => {
  test("nested lines belong to the preceding top-level key", () => {
    const blocks = topLevelBlocks(ADR, 8);
    expect(blocks.map((b) => b.key)).toEqual(["title", "git", "related", "tags"]);
    const git = blocks.find((b) => b.key === "git")!;
    expect([git.start, git.end]).toEqual([2, 5]);
  });
  test("contentEnd excludes trailing blank and comment lines", () => {
    const lines = ["---", "a:", "  - x", "", "# note", "b: 1", "---"];
    const a = topLevelBlocks(lines, 6)[0];
    expect(a.end).toBe(5);
    expect(contentEnd(lines, a)).toBe(3);
  });
});

describe("readList", () => {
  const fm = (line: string[]) => ["---", ...line, "---"];
  test("flow list of bare numbers", () => {
    const lines = fm(["related_adrs: [1, 19, 55]"]);
    const b = topLevelBlocks(lines, 2)[0];
    expect(readList(lines, b)).toEqual({ items: ["1", "19", "55"], style: "flow" });
  });
  test("flow list of quoted strings keeps commas inside quotes", () => {
    const lines = fm(['k: ["a, b", \'c\']']);
    expect(readList(lines, topLevelBlocks(lines, 2)[0])).toEqual({ items: ["a, b", "c"], style: "flow" });
  });
  test("block list", () => {
    const lines = fm(["k:", '  - "x"', "  - y"]);
    expect(readList(lines, topLevelBlocks(lines, 4)[0])).toEqual({ items: ["x", "y"], style: "block" });
  });
  test("empty and null are empty flow lists", () => {
    expect(readList(fm(["k: []"]), topLevelBlocks(fm(["k: []"]), 2)[0])).toEqual({ items: [], style: "flow" });
    expect(readList(fm(["k: null"]), topLevelBlocks(fm(["k: null"]), 2)[0])).toEqual({ items: [], style: "flow" });
  });
  test("a nested map is not a list", () => {
    const lines = fm(["k:", "  adrs: []"]);
    expect(readList(lines, topLevelBlocks(lines, 3)[0])).toBeNull();
  });
});

describe("readScalar / unquote", () => {
  test("reads and unquotes", () => {
    const lines = ["---", 'github_issue: "#172"', "---"];
    expect(readScalar(lines, topLevelBlocks(lines, 2)[0])).toBe("#172");
  });
  test("empty value is null", () => {
    const lines = ["---", "k:", "---"];
    expect(readScalar(lines, topLevelBlocks(lines, 2)[0])).toBeNull();
  });
  test("unquote handles single quotes", () => {
    expect(unquote("'it''s'")).toBe("it's");
  });
});

describe("renderList / replaceLines", () => {
  test("flow", () => {
    expect(renderList("k", ["a", "b"], "flow")).toEqual(['k: ["a", "b"]']);
  });
  test("block", () => {
    expect(renderList("k", ["a"], "block")).toEqual(["k:", '  - "a"']);
  });
  test("empty is always flow", () => {
    expect(renderList("k", [], "block")).toEqual(["k: []"]);
  });
  test("replaceLines splices", () => {
    expect(replaceLines(["a", "b", "c"], 1, 2, ["X", "Y"])).toEqual(["a", "X", "Y", "c"]);
  });
});
