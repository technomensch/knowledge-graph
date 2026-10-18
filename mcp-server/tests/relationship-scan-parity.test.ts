import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execFileSync } from "child_process";
import { scanRelationships } from "../src/lib/relationship-scan.js";

// Parity: run the REAL bash block from skills/kmg-paperwork-audit/SKILL.md Step 7 and the
// TypeScript port on the same graphs and require the same (a, b, shared path) list in the
// same order. Compared against each other, never against a fixed count (ADR-059).
// Deliberate differences (documented in the ENH-062 tool spec):
//   - the bash `pipefail`/SIGPIPE bug on very large frontmatter is NOT ported;
//   - the bash reads hubMax from a text env var; a non-numeric value is not expressible here.

jest.setTimeout(180000);

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SKILL = path.join(REPO_ROOT, "skills", "kmg-paperwork-audit", "SKILL.md");
const BEGIN = "<!-- relationship-scan:begin -->";
const END = "<!-- relationship-scan:end -->";

function extractBlock(): string {
  const text = fs.readFileSync(SKILL, "utf8");
  const count = (needle: string) => text.split(needle).length - 1;
  if (count(BEGIN) !== 1 || count(END) !== 1) {
    throw new Error(`expected exactly one begin and one end marker in ${SKILL}`);
  }
  const inner = text.slice(text.indexOf(BEGIN) + BEGIN.length, text.indexOf(END));
  const lines = inner.split("\n").filter((l) => !/^```/.test(l));
  const block = lines.join("\n").trim();
  if (block.length === 0) throw new Error("extracted relationship-scan block is empty");
  return block + "\n";
}

const BLOCK = extractBlock();

const LINE_RE = /^UNDECLARED: (\S+) <-> (\S+) \(shared: (.+)\)$/;

function runBash(bash: string, kg: string, hubMax?: number): string[] {
  const env: NodeJS.ProcessEnv = { ...process.env, KG: kg };
  delete env.REL_SCAN_HUB_MAX;
  if (hubMax !== undefined) env.REL_SCAN_HUB_MAX = String(hubMax);
  const out = execFileSync(bash, ["-s"], { input: BLOCK, env, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  return out
    .split("\n")
    .filter((l) => l.length > 0)
    .map((l) => {
      const m = LINE_RE.exec(l);
      if (!m) throw new Error(`unexpected bash output line: ${l}`);
      return `${m[1]}|${m[2]}|${m[3]}`;
    });
}

function runPort(kg: string, hubMax?: number): string[] {
  return scanRelationships(kg, hubMax === undefined ? {} : { hubMax }).pairs.map((p) => `${p.a}|${p.b}|${p.sharedPath}`);
}

// /bin/bash (macOS 3.2 on a Mac) and the first bash on the PATH; the same binary is run once.
// No bash at all (e.g. Windows): the suite is skipped with a message instead of failing.
function resolveBashes(): string[] {
  const found = new Set<string>();
  for (const candidate of ["/bin/bash", "bash"]) {
    try {
      const p = execFileSync("sh", ["-c", `command -v ${candidate}`], { encoding: "utf8" }).trim();
      if (p) found.add(fs.realpathSync(p));
    } catch {
      /* not available */
    }
  }
  return Array.from(found);
}
const bashes = resolveBashes();
if (bashes.length === 0) console.warn("skipping relationship-scan parity: no bash found");
const describeParity = bashes.length === 0 ? describe.skip.each([["none"]]) : describe.each(bashes);

const tempDirs: string[] = [];
function makeGraph(files: Record<string, string | Buffer | { link: string }>, name = "graph"): string {
  const wrapper = fs.mkdtempSync(path.join(os.tmpdir(), "relparity-"));
  tempDirs.push(wrapper);
  const root = path.join(wrapper, name);
  fs.mkdirSync(root);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    if (typeof content === "object" && !Buffer.isBuffer(content)) fs.symlinkSync(path.join(root, content.link), full);
    else fs.writeFileSync(full, content);
  }
  return root;
}
afterAll(() => {
  while (tempDirs.length) fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

const enh = (n: number | string) => `enhancements/ENH-${n}/ENH-${n}-specification.md`;
const iss = (n: number | string) => `issues/issue-${n}/issue-${n}-description.md`;
const m = (...paths: string[]) => paths.map((p) => `see \`${p}\``).join("\n") + "\n";
const fm = (front: string, body: string) => `---\n${front}\n---\n${body}`;

type Fixture = { name: string; files: Record<string, string | Buffer | { link: string }>; hubMax?: number[] };

const hubOf = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [enh(i + 1), m("a/hub.ts")]));

const FIXTURES: Fixture[] = [
  { name: "basic pair", files: { [enh(1)]: m("src/x.ts"), [iss(2)]: m("src/x.ts") } },
  { name: "three notes one path", files: { [enh(1)]: m("a/x.ts"), [enh(10)]: m("a/x.ts"), [iss(2)]: m("a/x.ts") } },
  { name: "hub of exactly 4", files: hubOf(4), hubMax: [0, 1, 2, 3, 4, 5] },
  { name: "hub of 5", files: hubOf(5), hubMax: [4, 5, 6] },
  { name: "cross-folder names", files: { "issues/x/ENH-7-specification.md": m("a/x.ts"), "enhancements/y/issue-8-description.md": m("a/x.ts") } },
  { name: "nested and hidden folders", files: { "enhancements/d/e/ENH-1/ENH-1-specification.md": m("a/x.ts"), "issues/.h/issue-2-description.md": m("a/x.ts") } },
  { name: "ignore list", files: { [enh(1)]: m("README.md", "CHANGELOG.md", "package.json", "CLAUDE.md", "AGENTS.md", "knowledge/rules.md", "docs/README.md"), [iss(2)]: m("README.md", "CHANGELOG.md", "package.json", "CLAUDE.md", "AGENTS.md", "knowledge/rules.md", "docs/README.md") } },
  { name: "bare filename", files: { [enh(1)]: m("x.ts"), [iss(2)]: m("x.ts") } },
  { name: "dot-slash prefix", files: { [enh(1)]: m("./b/y.ts"), [iss(2)]: m("b/y.ts") } },
  { name: "token in frontmatter", files: { [enh(1)]: fm("file: `a/x.ts`", ""), [iss(2)]: m("a/x.ts") } },
  { name: "declared by A", files: { [enh(62)]: fm("related_issues: [issue-7]", m("a/x.ts")), [iss(7)]: m("a/x.ts") } },
  { name: "declared by B", files: { [enh(62)]: m("a/x.ts"), [iss(7)]: fm("related_enhs: [ENH-62]", m("a/x.ts")) } },
  { name: "id boundary ENH-6 vs ENH-62", files: { [enh(62)]: m("a/x.ts"), [iss(7)]: fm("related_enhs: [ENH-6]", m("a/x.ts")) } },
  { name: "wikilink declaration", files: { [enh(62)]: fm('related_issues: ["[[issue-7-description|issue-7]]"]', m("a/x.ts")), [iss(7)]: m("a/x.ts") } },
  { name: "id only in body", files: { [enh(62)]: fm("title: a", "issue-7 related\n" + m("a/x.ts")), [iss(7)]: m("a/x.ts") } },
  { name: "unterminated frontmatter", files: { [enh(1)]: "---\ntitle: a\nissue-2 below\n" + m("a/x.ts"), [iss(2)]: m("a/x.ts") } },
  { name: "CRLF", files: { [enh(1)]: "---\r\nrelated_issues: [issue-2]\r\n---\r\n" + m("a/x.ts"), [iss(2)]: m("a/x.ts") } },
  { name: "closing CR line", files: { [enh(1)]: "---\ntitle: a\n---\r\nissue-2 in body\n" + m("a/x.ts"), [iss(2)]: m("a/x.ts") } },
  { name: "BOM", files: { [enh(1)]: Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("---\nrelated_issues: [issue-2]\n---\n" + m("a/x.ts"))]), [iss(2)]: m("a/x.ts") } },
  { name: "duplicate id, later file declares", files: { "enhancements/a/ENH-1-specification.md": m("a/x.ts"), "enhancements/b/ENH-1-specification.md": fm("related_issues: [issue-2]", m("a/x.ts")), [iss(2)]: m("a/x.ts") } },
  { name: "duplicate id, first file declares", files: { "enhancements/a/ENH-1-specification.md": fm("related_issues: [issue-2]", m("a/x.ts")), "enhancements/b/ENH-1-specification.md": m("a/x.ts"), [iss(2)]: m("a/x.ts") } },
  { name: "duplicate id counts twice for hubs", files: { "enhancements/a/ENH-1-specification.md": m("a/x.ts"), "enhancements/b/ENH-1-specification.md": m("a/x.ts"), [iss(2)]: m("a/x.ts") }, hubMax: [2, 3] },
  { name: "two shared paths, first wins", files: { [enh(1)]: m("z/b.ts", "a/a.ts"), [iss(2)]: m("z/b.ts", "a/a.ts") } },
  { name: "ENH-062 vs ENH-62", files: { [enh("062")]: m("a/x.ts"), [enh("62")]: m("a/x.ts") } },
  { name: "names without id", files: { "issues/issue-x-description.md": m("a/x.ts"), "enhancements/ENH-5-foo-specification.md": m("a/x.ts"), [iss(2)]: m("a/x.ts") } },
  { name: "only enhancements", files: { [enh(1)]: m("a/x.ts"), [enh(2)]: m("a/x.ts") } },
  { name: "only issues", files: { [iss(1)]: m("a/x.ts"), [iss(2)]: m("a/x.ts") } },
  { name: "neither folder", files: { "decisions/ADR-1.md": m("a/x.ts") } },
  { name: "non-matching file names", files: { "enhancements/ENH-1/notes.md": m("a/x.ts"), [iss(2)]: m("a/x.ts") } },
  { name: "graph not named knowledge", files: { [enh(1)]: m("a/x.ts"), [iss(2)]: m("a/x.ts") } },
  {
    name: "symlinked file and folder",
    files: {
      [iss(2)]: m("a/x.ts"),
      "elsewhere/ENH-1-specification.md": m("a/x.ts"),
      "elsewhere/sub/ENH-3-specification.md": m("a/x.ts"),
      "enhancements/ENH-1-specification.md": { link: "elsewhere/ENH-1-specification.md" },
      "enhancements/linked": { link: "elsewhere/sub" },
    },
  },
  { name: "symlinked issues folder", files: { "real/issue-2-description.md": m("a/x.ts"), [enh(1)]: m("a/x.ts"), issues: { link: "real" } } },
];

describeParity("parity with the skill's bash block (%s)", (bash) => {
  it.each(FIXTURES)("$name", ({ name, files, hubMax }) => {
    const g = makeGraph(files, name === "graph not named knowledge" ? "my-notes" : "graph");
    expect(runPort(g)).toEqual(runBash(bash, g));
    for (const h of hubMax ?? []) expect(runPort(g, h)).toEqual(runBash(bash, g, h));
  });

  const canChmod = process.platform !== "win32" && typeof process.getuid === "function" && process.getuid() !== 0;
  (canChmod ? it : it.skip)("an unreadable note is skipped by both (neither aborts)", () => {
    const g = makeGraph({ [enh(1)]: m("a/x.ts"), [enh(2)]: m("a/x.ts"), [iss(3)]: m("a/x.ts") });
    fs.chmodSync(path.join(g, enh(2)), 0o000);
    try {
      const fromBash = runBash(bash, g);
      expect(fromBash.length).toBeGreaterThan(0);
      expect(runPort(g)).toEqual(fromBash);
    } finally {
      fs.chmodSync(path.join(g, enh(2)), 0o644);
    }
  });

  it("produces output on at least one fixture (an empty extraction would pass trivially)", () => {
    const g = makeGraph(FIXTURES[0].files);
    expect(runBash(bash, g).length).toBeGreaterThan(0);
  });

  // mulberry32: small seeded PRNG so a failure is reproducible
  function rng(seed: number) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  it.each(Array.from({ length: 25 }, (_, i) => i + 1))("random graph, seed %i", (seed) => {
    const r = rng(seed);
    const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
    const pathPool = ["a/x.ts", "a/y.ts", "b/z.md", "c/d/e.json", "f.ts", "README.md", "docs/README.md", "g/h.yaml", "./a/x.ts", "knowledge/rules.md"];
    const files: Record<string, string> = {};
    const total = 4 + Math.floor(r() * 9);
    const ids: string[] = [];
    for (let i = 0; i < total; i++) {
      const isEnh = r() < 0.5;
      const num = 1 + Math.floor(r() * 14); // collisions on purpose: dup ids and ENH-1 vs ENH-10
      const dir = r() < 0.15 ? (isEnh ? "issues/x" : "enhancements/y") : isEnh ? `enhancements/ENH-${num}` : `issues/issue-${num}`;
      const file = isEnh ? `ENH-${num}-specification.md` : `issue-${num}-description.md`;
      const full = `${dir}/${r() < 0.2 ? `s${i}/` : ""}${file}`;
      ids.push(isEnh ? `ENH-${num}` : `issue-${num}`);
      const tokens = Array.from({ length: 1 + Math.floor(r() * 4) }, () => pick(pathPool));
      const declared = r() < 0.35 ? `related: [${pick(ids.concat(["ENH-3", "issue-9"]))}]\n` : "";
      const body = m(...tokens);
      const mode = r();
      files[full] = mode < 0.5 ? fm(declared + "title: t", body) : mode < 0.6 ? `---\n${declared}title: t\n${body}` : mode < 0.7 ? `${declared}\n${body}` : mode < 0.8 ? fm(declared, "ENH-3 issue-9 prose\n" + body) : body;
    }
    const g = makeGraph(files);
    expect(runPort(g)).toEqual(runBash(bash, g));
    expect(runPort(g, 2)).toEqual(runBash(bash, g, 2));
    expect(runPort(g, 6)).toEqual(runBash(bash, g, 6));
  });

  it("this repo's real graph", () => {
    const real = path.join(REPO_ROOT, "knowledge");
    if (!fs.existsSync(path.join(real, "issues")) && !fs.existsSync(path.join(real, "enhancements"))) {
      console.warn(`skipping real-graph parity: no ${real}/issues or enhancements (consumer checkout)`);
      return;
    }
    const fromBash = runBash(bash, real);
    const fromPort = runPort(real);
    console.log(`real graph pairs flagged (sanity look only, not asserted): ${fromPort.length}`);
    expect(fromPort).toEqual(fromBash);
    expect(runPort(real, 6)).toEqual(runBash(bash, real, 6));
  });
});

describe("documented divergence: the bash SIGPIPE bug is not ported", () => {
  // Needs a frontmatter large enough that grep -q exits before awk finishes (>= 1 MB, since the
  // threshold follows the platform's pipe buffer). The tool must answer correctly (declared);
  // the bash result is informational only because it depends on the platform.
  it("tool does not flag a pair declared on line 2 of a huge frontmatter", () => {
    const filler = Array.from({ length: 60000 }, (_, i) => `line ${i} ${"a".repeat(20)}`).join("\n");
    const g = makeGraph({ [enh(1)]: `---\nrelated_issues: [issue-2]\n${filler}\n---\n` + m("a/x.ts"), [iss(2)]: m("a/x.ts") });
    expect(runPort(g)).toEqual([]);
    for (const bash of bashes) {
      const bashResult = runBash(bash, g);
      console.log(`bash (${bash}) on the huge-frontmatter case flags ${bashResult.length} pair(s) (platform-dependent, informational)`);
    }
  });
});
