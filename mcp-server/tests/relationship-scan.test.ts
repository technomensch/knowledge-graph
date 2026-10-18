import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { scanRelationships } from "../src/lib/relationship-scan.js";

// Port of the bash block in skills/kmg-paperwork-audit/SKILL.md Step 7 (ENH-062).
// Every case below states a behavior of that block; tests/relationship-scan-parity.test.ts
// runs the real block against the same fixtures.

const tempDirs: string[] = [];

function makeGraph(files: Record<string, string | Buffer>, name = "graph"): string {
  const wrapper = fs.mkdtempSync(path.join(os.tmpdir(), "relscan-"));
  tempDirs.push(wrapper);
  const root = path.join(wrapper, name);
  fs.mkdirSync(root);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return root;
}

afterEach(() => {
  while (tempDirs.length) fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

const enh = (n: number | string) => `enhancements/ENH-${n}/ENH-${n}-specification.md`;
const iss = (n: number | string) => `issues/issue-${n}/issue-${n}-description.md`;
const mentions = (...paths: string[]) => paths.map((p) => `see \`${p}\``).join("\n") + "\n";
const withFm = (fm: string, body: string) => `---\n${fm}\n---\n${body}`;

const pairIds = (r: ReturnType<typeof scanRelationships>) =>
  r.pairs.map((p) => `${p.a}|${p.b}|${p.sharedPath}`);

describe("scanRelationships: basic pairing", () => {
  it("flags two notes that mention the same file and declare nothing", () => {
    const g = makeGraph({
      [enh(1)]: mentions("src/x.ts"),
      [iss(2)]: mentions("src/x.ts"),
    });
    const r = scanRelationships(g);
    expect(r.scannable).toBe(true);
    expect(pairIds(r)).toEqual(["ENH-1|issue-2|src/x.ts"]);
    expect(r.pairs[0].fileA).toBe(enh(1));
    expect(r.pairs[0].fileB).toBe(iss(2));
  });

  it("works for a graph folder not named knowledge", () => {
    const g = makeGraph({ [enh(1)]: mentions("a/x.ts"), [iss(2)]: mentions("a/x.ts") }, "my-notes");
    expect(scanRelationships(g).pairs).toHaveLength(1);
  });

  it("counts scanned notes by folder, only those that yield an id", () => {
    const g = makeGraph({
      [enh(1)]: "",
      [enh(2)]: "",
      [iss(3)]: "",
      "issues/issue-x-description.md": "",
    });
    expect(scanRelationships(g).scanned).toEqual({ issues: 1, enhancements: 2 });
  });
});

describe("scanRelationships: which folders and files are read", () => {
  it("graph with neither issues/ nor enhancements/ is not scannable", () => {
    const g = makeGraph({ "decisions/ADR-001.md": "x" });
    const r = scanRelationships(g);
    expect(r.scannable).toBe(false);
    expect(r.pairs).toEqual([]);
  });

  it("graph folder that does not exist is not scannable", () => {
    const g = makeGraph({});
    expect(scanRelationships(path.join(g, "nope")).scannable).toBe(false);
  });

  it("a graph with only enhancements/ is scanned normally", () => {
    const g = makeGraph({ [enh(1)]: mentions("a/x.ts"), [enh(2)]: mentions("a/x.ts") });
    const r = scanRelationships(g);
    expect(r.scannable).toBe(true);
    expect(pairIds(r)).toEqual(["ENH-1|ENH-2|a/x.ts"]);
  });

  it("both name patterns apply in both folders (cross-folder files are scanned)", () => {
    const g = makeGraph({
      "issues/x/ENH-7-specification.md": mentions("a/x.ts"),
      "enhancements/y/issue-8-description.md": mentions("a/x.ts"),
    });
    expect(pairIds(scanRelationships(g))).toEqual(["ENH-7|issue-8|a/x.ts"]);
  });

  it("reads notes in nested folders and hidden folders", () => {
    const g = makeGraph({
      "enhancements/deep/er/ENH-1/ENH-1-specification.md": mentions("a/x.ts"),
      "issues/.hidden/issue-2-description.md": mentions("a/x.ts"),
    });
    expect(scanRelationships(g).pairs).toHaveLength(1);
  });

  it("ignores files that do not match either name pattern", () => {
    const g = makeGraph({
      "enhancements/ENH-1/notes.md": mentions("a/x.ts"),
      [iss(2)]: mentions("a/x.ts"),
    });
    expect(scanRelationships(g).pairs).toEqual([]);
  });

  it("skips matching names that carry no id", () => {
    const g = makeGraph({
      "issues/issue-x-description.md": mentions("a/x.ts"),
      [iss(2)]: mentions("a/x.ts"),
    });
    expect(scanRelationships(g).pairs).toEqual([]);
  });

  it("takes the leading id from a name like ENH-5-foo-specification.md", () => {
    const g = makeGraph({
      "enhancements/ENH-5-foo-specification.md": mentions("a/x.ts"),
      [iss(2)]: mentions("a/x.ts"),
    });
    expect(pairIds(scanRelationships(g))).toEqual(["ENH-5|issue-2|a/x.ts"]);
  });

  it("does not follow a symlinked file or a symlinked subfolder", () => {
    const g = makeGraph({
      [iss(2)]: mentions("a/x.ts"),
      "elsewhere/ENH-1-specification.md": mentions("a/x.ts"),
      "elsewhere/sub/ENH-3-specification.md": mentions("a/x.ts"),
    });
    fs.mkdirSync(path.join(g, "enhancements"));
    fs.symlinkSync(path.join(g, "elsewhere/ENH-1-specification.md"), path.join(g, "enhancements/ENH-1-specification.md"));
    fs.symlinkSync(path.join(g, "elsewhere/sub"), path.join(g, "enhancements/linked"));
    expect(scanRelationships(g).pairs).toEqual([]);
  });

  it("a symlinked issues/ folder yields nothing but still counts as scannable (no note)", () => {
    const g = makeGraph({ "real/issue-2-description.md": mentions("a/x.ts"), [enh(1)]: mentions("a/x.ts") });
    fs.symlinkSync(path.join(g, "real"), path.join(g, "issues"));
    const r = scanRelationships(g);
    expect(r.scannable).toBe(true);
    expect(r.pairs).toEqual([]);
  });
});

describe("scanRelationships: what counts as a mention", () => {
  it("takes only backtick-quoted tokens with a known extension", () => {
    const g = makeGraph({
      [enh(1)]: "a/x.ts and `a/y.txt` and `a/z.ts`\n",
      [iss(2)]: "`a/x.ts` `a/y.txt`\n",
    });
    expect(scanRelationships(g).pairs).toEqual([]);
    const g2 = makeGraph({ [enh(1)]: "`a/z.yaml`", [iss(2)]: "`a/z.yaml`" });
    expect(pairIds(scanRelationships(g2))).toEqual(["ENH-1|issue-2|a/z.yaml"]);
    for (const ext of ["yml", "json", "sh", "md", "ts"]) {
      const g3 = makeGraph({ [enh(1)]: `\`a/f.${ext}\``, [iss(2)]: `\`a/f.${ext}\`` });
      expect(pairIds(scanRelationships(g3))).toEqual([`ENH-1|issue-2|a/f.${ext}`]);
    }
  });

  it("counts a path once per note even when mentioned twice", () => {
    const g = makeGraph({
      [enh(1)]: mentions("a/x.ts", "a/x.ts"),
      [iss(2)]: mentions("a/x.ts"),
    });
    expect(scanRelationships(g).pairs).toHaveLength(1);
  });

  it("ignores README.md, CHANGELOG.md, package.json, CLAUDE.md, AGENTS.md and knowledge/rules.md", () => {
    const ignored = ["README.md", "CHANGELOG.md", "package.json", "CLAUDE.md", "AGENTS.md", "knowledge/rules.md"];
    const g = makeGraph({ [enh(1)]: mentions(...ignored), [iss(2)]: mentions(...ignored) });
    expect(scanRelationships(g).pairs).toEqual([]);
  });

  it("does not ignore a longer path that merely ends in an ignored name", () => {
    const g = makeGraph({ [enh(1)]: mentions("docs/README.md"), [iss(2)]: mentions("docs/README.md") });
    expect(pairIds(scanRelationships(g))).toEqual(["ENH-1|issue-2|docs/README.md"]);
  });

  it("never pairs on a bare filename with no directory", () => {
    const g = makeGraph({ [enh(1)]: mentions("x.ts"), [iss(2)]: mentions("x.ts") });
    expect(scanRelationships(g).pairs).toEqual([]);
  });

  it("does not normalize a ./ prefix", () => {
    const g = makeGraph({ [enh(1)]: mentions("./b/y.ts"), [iss(2)]: mentions("b/y.ts") });
    expect(scanRelationships(g).pairs).toEqual([]);
  });

  it("a token inside the frontmatter counts as a mention", () => {
    const g = makeGraph({
      [enh(1)]: withFm("file: `a/x.ts`", ""),
      [iss(2)]: mentions("a/x.ts"),
    });
    expect(scanRelationships(g).pairs).toHaveLength(1);
  });
});

describe("scanRelationships: hubs", () => {
  const sharedBy = (n: number) =>
    makeGraph(Object.fromEntries(Array.from({ length: n }, (_, i) => [enh(i + 1), mentions("a/hub.ts")])));

  it("a path shared by exactly hubMax notes still pairs (default 4)", () => {
    expect(scanRelationships(sharedBy(4)).pairs).toHaveLength(6);
  });

  it("a path shared by one more than hubMax is a hub and gives no pairs", () => {
    expect(scanRelationships(sharedBy(5)).pairs).toEqual([]);
  });

  it("honors a non-default hubMax", () => {
    expect(scanRelationships(sharedBy(5), { hubMax: 5 }).pairs).toHaveLength(10);
    expect(scanRelationships(sharedBy(3), { hubMax: 2 }).pairs).toEqual([]);
  });

  it("counts rows, so two files carrying the same id count twice", () => {
    const g = makeGraph({
      "enhancements/a/ENH-1-specification.md": mentions("a/x.ts"),
      "enhancements/b/ENH-1-specification.md": mentions("a/x.ts"),
      [iss(2)]: mentions("a/x.ts"),
    });
    // 3 rows on one path; with hubMax 2 that is a hub even though only 2 distinct ids exist
    expect(scanRelationships(g, { hubMax: 2 }).pairs).toEqual([]);
    expect(scanRelationships(g, { hubMax: 3 }).pairs).toHaveLength(1);
  });
});

describe("scanRelationships: pair identity, order and shared path", () => {
  it("orders each pair by byte order and the list by (a, b)", () => {
    const g = makeGraph({
      [iss(2)]: mentions("a/x.ts"),
      [enh(10)]: mentions("a/x.ts"),
      [enh(9)]: mentions("a/x.ts"),
    });
    expect(pairIds(scanRelationships(g))).toEqual([
      "ENH-10|ENH-9|a/x.ts",
      "ENH-10|issue-2|a/x.ts",
      "ENH-9|issue-2|a/x.ts",
    ]);
  });

  it("reports a pair once, with the alphabetically first shared path", () => {
    const g = makeGraph({
      [enh(1)]: mentions("z/b.ts", "a/a.ts"),
      [iss(2)]: mentions("z/b.ts", "a/a.ts"),
    });
    expect(pairIds(scanRelationships(g))).toEqual(["ENH-1|issue-2|a/a.ts"]);
  });

  it("treats ENH-62 and ENH-062 as two distinct notes that pair with each other", () => {
    const g = makeGraph({ [enh("062")]: mentions("a/x.ts"), [enh("62")]: mentions("a/x.ts") });
    expect(pairIds(scanRelationships(g))).toEqual(["ENH-062|ENH-62|a/x.ts"]);
  });
});

describe("scanRelationships: declared relationships suppress the pair", () => {
  const base = (fmA: string, fmB = "title: b") => ({
    [enh(62)]: withFm(fmA, mentions("a/x.ts")),
    [iss(7)]: withFm(fmB, mentions("a/x.ts")),
  });

  it("drops the pair when either note's frontmatter mentions the other's id", () => {
    expect(scanRelationships(makeGraph(base("related_issues: [issue-7]"))).pairs).toEqual([]);
    expect(scanRelationships(makeGraph(base("title: a", "related_enhs: [ENH-62]"))).pairs).toEqual([]);
  });

  it("respects id boundaries: ENH-6 in frontmatter does not declare ENH-62", () => {
    const g = makeGraph({
      [enh(62)]: withFm("title: a", mentions("a/x.ts")),
      [iss(7)]: withFm("related_enhs: [ENH-6]", mentions("a/x.ts")),
    });
    expect(scanRelationships(g).pairs).toHaveLength(1);
  });

  it("accepts the id inside a wikilink or after punctuation", () => {
    expect(scanRelationships(makeGraph(base('related_issues: ["[[issue-7-description|issue-7]]"]'))).pairs).toEqual([]);
  });

  it("an id mentioned only in the body does not declare anything", () => {
    const g = makeGraph({
      [enh(62)]: withFm("title: a", "issue-7 is related\n" + mentions("a/x.ts")),
      [iss(7)]: mentions("a/x.ts"),
    });
    expect(scanRelationships(g).pairs).toHaveLength(1);
  });

  it("a note with no frontmatter has empty frontmatter", () => {
    const g = makeGraph({ [enh(1)]: mentions("a/x.ts"), [iss(2)]: mentions("a/x.ts") });
    expect(scanRelationships(g).pairs).toHaveLength(1);
  });

  it("without a closing --- the frontmatter runs to the end of the file", () => {
    const g = makeGraph({
      [enh(1)]: "---\ntitle: a\n" + "issue-2 appears below\n" + mentions("a/x.ts"),
      [iss(2)]: mentions("a/x.ts"),
    });
    expect(scanRelationships(g).pairs).toEqual([]);
  });

  it("CRLF notes have empty frontmatter (the opening --- carries a carriage return)", () => {
    const g = makeGraph({
      [enh(1)]: "---\r\nrelated_issues: [issue-2]\r\n---\r\n" + mentions("a/x.ts"),
      [iss(2)]: mentions("a/x.ts"),
    });
    expect(scanRelationships(g).pairs).toHaveLength(1);
  });

  it("a closing line of ---\\r never closes the block", () => {
    const g = makeGraph({
      [enh(1)]: "---\ntitle: a\n---\r\nissue-2 in body\n" + mentions("a/x.ts"),
      [iss(2)]: mentions("a/x.ts"),
    });
    expect(scanRelationships(g).pairs).toEqual([]);
  });

  it("a UTF-8 byte-order mark before the opening --- means empty frontmatter", () => {
    const g = makeGraph({
      [enh(1)]: Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("---\nrelated_issues: [issue-2]\n---\n" + mentions("a/x.ts"))]),
      [iss(2)]: mentions("a/x.ts"),
    });
    expect(scanRelationships(g).pairs).toHaveLength(1);
  });
});

describe("scanRelationships: duplicate ids (two files carrying one id)", () => {
  // Duplicate pair rows are removed BEFORE the frontmatter check, so only the surviving
  // row's two files are checked, and fileA/fileB come from that row: the file path that
  // sorts first for each id.
  it("flags the pair when only the later file declares it (surviving row is the first file)", () => {
    const g = makeGraph({
      "enhancements/a/ENH-1-specification.md": mentions("a/x.ts"),
      "enhancements/b/ENH-1-specification.md": withFm("related_issues: [issue-2]", mentions("a/x.ts")),
      [iss(2)]: mentions("a/x.ts"),
    });
    const r = scanRelationships(g);
    expect(r.pairs).toHaveLength(1);
    expect(r.pairs[0].fileA).toBe("enhancements/a/ENH-1-specification.md");
  });

  it("drops the pair when the first file declares it", () => {
    const g = makeGraph({
      "enhancements/a/ENH-1-specification.md": withFm("related_issues: [issue-2]", mentions("a/x.ts")),
      "enhancements/b/ENH-1-specification.md": mentions("a/x.ts"),
      [iss(2)]: mentions("a/x.ts"),
    });
    expect(scanRelationships(g).pairs).toEqual([]);
  });
});

describe("scanRelationships: robustness", () => {
  const canChmod = process.platform !== "win32" && typeof process.getuid === "function" && process.getuid() !== 0;

  (canChmod ? it : it.skip)("skips an unreadable note instead of aborting the scan (bash skips it too)", () => {
    const g = makeGraph({
      [enh(1)]: mentions("a/x.ts"),
      [enh(2)]: mentions("a/x.ts"),
      [iss(3)]: mentions("a/x.ts"),
    });
    fs.chmodSync(path.join(g, enh(2)), 0o000);
    try {
      const r = scanRelationships(g);
      expect(pairIds(r)).toEqual(["ENH-1|issue-3|a/x.ts"]);
      expect(r.scanned).toEqual({ issues: 1, enhancements: 2 });
    } finally {
      fs.chmodSync(path.join(g, enh(2)), 0o644);
    }
  });

  it("reads each note's frontmatter at most once however many pairs it is in", () => {
    const g = makeGraph(Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [enh(n), mentions("a/hub.ts")])));
    // the namespace import has non-configurable bindings; spy on the real module object
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const spy = jest.spyOn(require("fs"), "readFileSync");
    try {
      const r = scanRelationships(g, { hubMax: 6 });
      expect(r.pairs).toHaveLength(15);
      // 6 notes: one read each for tokens, at most one more each for frontmatter
      expect(spy.mock.calls.length).toBeLessThanOrEqual(12);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("scanRelationships: documented divergence from the bash block", () => {
  // The bash block runs `frontmatter | grep -q` under `set -o pipefail`. Once the frontmatter
  // output is large enough, grep exits early, awk gets SIGPIPE, and the pipeline reports
  // "not declared", so a declared pair is flagged anyway. The tool does NOT port that bug
  // (decided by the user 2026-10-18). Threshold depends on the pipe buffer, so use >= 1 MB.
  it("does not flag a pair declared on line 2 of a very large frontmatter", () => {
    const filler = Array.from({ length: 60000 }, (_, i) => `line ${i} ${"a".repeat(20)}`).join("\n");
    const g = makeGraph({
      [enh(1)]: `---\nrelated_issues: [issue-2]\n${filler}\n---\n` + mentions("a/x.ts"),
      [iss(2)]: mentions("a/x.ts"),
    });
    expect(scanRelationships(g).pairs).toEqual([]);
  });
});
