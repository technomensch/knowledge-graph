import { normalizeId } from "../src/lib/frontmatter/ids.js";
import { categoryFor, normalizeStatus } from "../src/lib/frontmatter/status.js";
import { buildNoteIndex, uniqueTarget, wikilink, resolveRef } from "../src/lib/frontmatter/links.js";
import { makeGraph, removeGraph, stubs } from "./frontmatter-fixture.js";

describe("normalizeId", () => {
  test("bare numbers become canonical IDs per kind", () => {
    expect(normalizeId("adr", "1")).toBe("ADR-001");
    expect(normalizeId("adr", "63")).toBe("ADR-063");
    expect(normalizeId("enh", "53")).toBe("ENH-053");
    expect(normalizeId("issue", "14")).toBe("issue-14");
  });
  test("existing IDs are re-canonicalized", () => {
    expect(normalizeId("enh", "enh-5")).toBe("ENH-005");
    expect(normalizeId("issue", "issue-014")).toBe("issue-14");
    expect(normalizeId("issue", "#172")).toBe("issue-172");
  });
  test("wikilinks, paths and prose are not plain IDs", () => {
    expect(normalizeId("adr", "[[ADR-001-x|ADR-001]]")).toBeNull();
    expect(normalizeId("adr", "ADR-063-never-destroy-known-good-state")).toBeNull();
    expect(normalizeId("enh", "see the spec")).toBeNull();
  });
});

describe("categoryFor (approved table)", () => {
  const cases: Array<[string, string]> = [
    ["proposed", "backlog"], ["Draft", "backlog"], ["stub", "backlog"], ["deferred", "backlog"],
    ["open", "pending"], ["OPEN", "pending"], ["tracked", "pending"], ["defined", "pending"],
    ["tracked-not-implemented", "pending"],
    ["in-progress", "started"], ["designed", "started"],
    ["partially-implemented", "started"], ["Partially Implemented", "started"],
    ["resolved", "done"], ["IMPLEMENTED", "done"], ["closed", "done"], ["fixed", "done"],
    ["Accepted", "done"], ['"Accepted"', "done"],
    ["withdrawn", "cancelled"], ["Superseded", "cancelled"],
  ];
  test.each(cases)("%s -> %s", (raw, cat) => {
    expect(categoryFor(raw)).toEqual({ category: cat, recognized: true });
  });
  test("long free-text status is cut at the first parenthesis", () => {
    const raw = "Implemented (core model shipped v0.7.0, 2026-08-04) — 2 optional fold-ins remain";
    expect(normalizeStatus(raw)).toBe("implemented");
    expect(categoryFor(raw).category).toBe("done");
  });
  test("unrecognized values default to pending and are flagged", () => {
    expect(categoryFor("tracked | in-progress | implemented | deferred")).toEqual({ category: "pending", recognized: false });
    expect(categoryFor("wat")).toEqual({ category: "pending", recognized: false });
  });
});

describe("links", () => {
  let root: string;
  beforeAll(() => {
    root = makeGraph({
      ...stubs(
        "issues/issue-14/issue-14-description.md",
        "issues/issue-15/issue-15-description.md",
        "enhancements/ENH-053/ENH-053-specification.md",
        "decisions/ADR-063-never-destroy-known-good-state-before-confirmed-write.md",
        "decisions/README.md",
        "issues/saga-a/README.md",
        "issues/saga-b/README.md",
        "issues/saga-a/analysis/lessons-learned.md",
        "issues/saga-b/analysis/lessons-learned.md",
      ),
      "chat-history/ignored.md": "# ignored\n",
      "plans/ignored-plan.md": "# ignored\n",
    });
  });
  afterAll(() => removeGraph(root));

  test("index skips chat-history and plans and strips .md", () => {
    const idx = buildNoteIndex(root);
    expect(idx.paths).toContain("issues/issue-14/issue-14-description");
    expect(idx.paths.some((p) => p.startsWith("chat-history/") || p.startsWith("plans/"))).toBe(false);
  });

  test("unique stem uses the bare name", () => {
    const idx = buildNoteIndex(root);
    expect(uniqueTarget(idx, "issues/issue-14/issue-14-description")).toBe("issue-14-description");
  });

  test("ambiguous names use the shortest unique trailing path", () => {
    const idx = buildNoteIndex(root);
    expect(uniqueTarget(idx, "issues/saga-a/README")).toBe("saga-a/README");
    expect(uniqueTarget(idx, "issues/saga-a/analysis/lessons-learned")).toBe("saga-a/analysis/lessons-learned");
  });

  test("unknown note has no target", () => {
    expect(uniqueTarget(buildNoteIndex(root), "issues/nope/nope")).toBeNull();
  });

  test("wikilink omits the label when it equals the target", () => {
    expect(wikilink("a", "a")).toBe("[[a]]");
    expect(wikilink("issue-14-description", "issue-14")).toBe("[[issue-14-description|issue-14]]");
  });

  test("resolveRef: IDs resolve to labeled wikilinks", () => {
    const idx = buildNoteIndex(root);
    expect(resolveRef(idx, "issue", "14")).toEqual({ link: "[[issue-14-description|issue-14]]" });
    expect(resolveRef(idx, "enh", "ENH-053")).toEqual({ link: "[[ENH-053-specification|ENH-053]]" });
    expect(resolveRef(idx, "adr", "63")).toEqual({
      link: "[[ADR-063-never-destroy-known-good-state-before-confirmed-write|ADR-063]]",
    });
  });

  test("resolveRef: missing note stays unresolved", () => {
    expect(resolveRef(buildNoteIndex(root), "enh", "ENH-999")).toEqual({ unresolved: "ENH-999" });
  });

  test("resolveRef: existing wikilinks are kept as they are", () => {
    expect(resolveRef(buildNoteIndex(root), "adr", "[[ADR-001-x|ADR-001]]")).toEqual({ link: "[[ADR-001-x|ADR-001]]" });
  });

  test("resolveRef: repo-style paths resolve with the knowledge/ prefix stripped", () => {
    const idx = buildNoteIndex(root);
    expect(resolveRef(idx, "path", "knowledge/issues/saga-b/README.md")).toEqual({ link: "[[saga-b/README|README]]" });
  });

  test("resolveRef: a bare ambiguous name is refused, never guessed", () => {
    expect(resolveRef(buildNoteIndex(root), "path", "README")).toEqual({ unresolved: "README" });
  });

  test("resolveRef: a full ADR note name resolves", () => {
    const idx = buildNoteIndex(root);
    expect(resolveRef(idx, "adr", "ADR-063-never-destroy-known-good-state-before-confirmed-write")).toEqual({
      link: "[[ADR-063-never-destroy-known-good-state-before-confirmed-write]]",
    });
  });
});
