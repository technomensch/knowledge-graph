import { planMigrations } from "../src/lib/frontmatter/plan.js";
import { makeGraph, removeGraph, stubs } from "./frontmatter-fixture.js";

const ISSUE_15 = [
  "---", "id: issue-15", "type: Bug", "status: resolved", 'github-issue: "#172"',
  "created: 2026-07-16", "related-issues: [issue-14]", "target-release: null", "---", "", "# Issue 15", "",
].join("\n");

const ADR_067 = [
  "---",
  'title: "ADR-067 Implementation Spec: KG Resolution Model"',
  "status: Implemented (core model shipped v0.7.0, 2026-08-04; numbering-collision mechanism shipped v0.7.4.1, 2026-08-23) — 2 optional fold-ins remain unbuilt, see Implementation Status",
  "date: 2026-07-28",
  'supersedes_draft: "docs/specs/2026-07-26-adr-067-kg-resolution-v0.7-spec.md"',
  'source_adr: "knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md"',
  "related_adrs: [1, 19, 55, 60, 63, 66]",
  "related_enhs: [53, 54, 55]",
  "related_issues: [10, 14, 15, 27]",
  "---", "", "# ADR-067 spec", "",
].join("\n");

const TARGETS = stubs(
  "decisions/ADR-001-centralized-multi-kg-configuration.md",
  "decisions/ADR-019-write-guard-agent-instructions-vs-data-layer.md",
  "decisions/ADR-055-cross-platform-upgrade-triggering-version-sentinel-over-startup-notification.md",
  "decisions/ADR-060-narrow-kg-search-scope-away-from-raw-chat-history.md",
  "decisions/ADR-063-never-destroy-known-good-state-before-confirmed-write.md",
  "decisions/ADR-066-kg-content-storage-location-for-global-and-cowork-modes.md",
  "enhancements/ENH-053/ENH-053-specification.md",
  "enhancements/ENH-054/ENH-054-specification.md",
  "enhancements/ENH-055/ENH-055-specification.md",
  "issues/issue-10/issue-10-description.md",
  "issues/issue-14/issue-14-description.md",
  "issues/issue-27/issue-27-description.md",
);

const lineOf = (text: string, key: string): string => text.split("\n").find((l) => l.startsWith(`${key}:`)) ?? "";

describe("step 1: key spelling and string IDs", () => {
  let root: string;
  afterEach(() => removeGraph(root));

  test("issue-15: renames both keys and quotes the ID", () => {
    root = makeGraph({ "issues/issue-15/issue-15-description.md": ISSUE_15 });
    const plan = planMigrations(root, [1]);
    expect(plan.changes).toHaveLength(1);
    const after = plan.changes[0].after;
    expect(after).toContain('github_issue: "#172"');
    expect(after).toContain('related_issues: ["issue-14"]');
    expect(after).not.toContain("github-issue");
    expect(after).not.toContain("related-issues");
    expect(after).toContain("target-release: null"); // untouched
  });

  test("ADR-067 spec: bare numbers become string IDs, flow style kept", () => {
    root = makeGraph({ "decisions/ADR-067-implementation-spec.md": ADR_067 });
    const after = planMigrations(root, [1]).changes[0].after;
    expect(lineOf(after, "related_adrs")).toBe('related_adrs: ["ADR-001", "ADR-019", "ADR-055", "ADR-060", "ADR-063", "ADR-066"]');
    expect(lineOf(after, "related_enhs")).toBe('related_enhs: ["ENH-053", "ENH-054", "ENH-055"]');
    expect(lineOf(after, "related_issues")).toBe('related_issues: ["issue-10", "issue-14", "issue-15", "issue-27"]');
  });

  test("a file with both spellings is skipped, not rewritten", () => {
    const both = ISSUE_15.replace("related-issues: [issue-14]", 'related-issues: [issue-14]\nrelated_issues: ["issue-14"]');
    root = makeGraph({ "issues/issue-15/issue-15-description.md": both });
    const plan = planMigrations(root, [1]);
    expect(plan.changes).toHaveLength(0);
    expect(plan.skipped[0]).toMatchObject({ step: 1 });
    expect(plan.skipped[0].reason).toContain("both");
  });

  test("a doubled frontmatter file is skipped", () => {
    const doubled = ["---", "id: issue-9", "---", "---", "id: issue-9", "related-issues: [1]", "---", "body"].join("\n");
    root = makeGraph({ "issues/issue-9/issue-9-description.md": doubled });
    const plan = planMigrations(root, [1]);
    expect(plan.changes).toHaveLength(0);
    expect(plan.skipped[0].reason).toContain("doubled");
  });

  test("already-canonical files produce no change (idempotent)", () => {
    const ok = ["---", "id: ENH-005", 'github_issue: "#5"', 'related_enhs: ["ENH-004"]', "---", "body"].join("\n");
    root = makeGraph({ "enhancements/ENH-005/ENH-005-specification.md": ok });
    expect(planMigrations(root, [1]).changes).toHaveLength(0);
  });

  test("files outside the step scope are not scanned", () => {
    root = makeGraph({ "sessions/2026-10/2026-10-01-x.md": ISSUE_15 });
    const plan = planMigrations(root, [1]);
    expect(plan.scanned).toBe(0);
    expect(plan.changes).toHaveLength(0);
  });
});

describe("step 2: wikilinks", () => {
  let root: string;
  afterEach(() => removeGraph(root));

  test("steps 1+2 together: issue-15 links resolve to labeled wikilinks", () => {
    root = makeGraph({ ...TARGETS, "issues/issue-15/issue-15-description.md": ISSUE_15 });
    const change = planMigrations(root, [1, 2]).changes.find((c) => c.relPath === "issues/issue-15/issue-15-description")!;
    expect(change.steps).toEqual([1, 2]);
    expect(lineOf(change.after, "related_issues")).toBe('related_issues: ["[[issue-14-description|issue-14]]"]');
  });

  test("steps 1+2 together: ADR-067 spec links all resolve; other keys untouched", () => {
    root = makeGraph({ ...TARGETS, "decisions/ADR-067-implementation-spec.md": ADR_067 });
    const after = planMigrations(root, [1, 2]).changes.find((c) => c.relPath === "decisions/ADR-067-implementation-spec")!.after;
    expect(lineOf(after, "related_adrs")).toContain("[[ADR-001-centralized-multi-kg-configuration|ADR-001]]");
    expect(lineOf(after, "related_adrs")).toContain(
      "[[ADR-055-cross-platform-upgrade-triggering-version-sentinel-over-startup-notification|ADR-055]]"
    );
    expect(lineOf(after, "related_enhs")).toBe(
      'related_enhs: ["[[ENH-053-specification|ENH-053]]", "[[ENH-054-specification|ENH-054]]", "[[ENH-055-specification|ENH-055]]"]'
    );
    // issue-15 has no note in this fixture: kept as plain text and reported
    expect(lineOf(after, "related_issues")).toContain('"issue-15"');
    expect(lineOf(after, "related_issues")).toContain("[[issue-27-description|issue-27]]");
    expect(lineOf(after, "supersedes_draft")).toBe(
      'supersedes_draft: "docs/specs/2026-07-26-adr-067-kg-resolution-v0.7-spec.md"'
    );
  });

  test("unresolved references are reported, never turned into links", () => {
    root = makeGraph({ "enhancements/ENH-005/ENH-005-specification.md": ["---", "id: ENH-005", 'related_enhs: ["ENH-999"]', "---", "b"].join("\n") });
    const plan = planMigrations(root, [1, 2]);
    expect(plan.changes).toHaveLength(0);
    expect(plan.notes.join("\n")).toContain('unresolved "ENH-999"');
  });

  test("existing wikilinks are left alone (idempotent)", () => {
    const linked = ["---", "id: ENH-005", 'related_enhs: ["[[ENH-004-specification|ENH-004]]"]', "---", "b"].join("\n");
    root = makeGraph({ ...stubs("enhancements/ENH-004/ENH-004-specification.md"), "enhancements/ENH-005/ENH-005-specification.md": linked });
    expect(planMigrations(root, [1, 2]).changes).toHaveLength(0);
  });
});

const ADR_063 = [
  "---",
  'title: "ADR-063: Never destroy known-good state before the replacement is confirmed written"',
  "number: 063",
  "status: Accepted",
  "date: 2026-07-11",
  "author: technomensch",
  "git:",
  "  branch: v0.6.18-fix-extraction-regressions",
  "  commit: null",
  "  pr: null",
  "  issue: null",
  "implements: null",
  "related:",
  "  adrs: []",
  "  lessons:",
  "    - knowledge/issues/chat-extraction-reliability-saga/analysis/lessons-learned.md",
  "  kg_entries:",
  "    - knowledge/issues/chat-extraction-reliability-saga/README.md",
  "    - knowledge/issues/chat-extraction-reliability-saga/attempts/002-enh-043/specification.md",
  "    - knowledge/issues/kg-config-silent-overwrite/README.md",
  "tags: [write-safety, data-loss, cross-cutting, v0.6.18]",
  "---", "", "# ADR-063", "",
].join("\n");

const SAGA = stubs(
  "issues/chat-extraction-reliability-saga/analysis/lessons-learned.md",
  "issues/other-saga/analysis/lessons-learned.md",
  "issues/chat-extraction-reliability-saga/README.md",
  "issues/kg-config-silent-overwrite/README.md",
  "decisions/README.md",
  "issues/chat-extraction-reliability-saga/attempts/002-enh-043/specification.md",
  "issues/other-saga/attempts/001/specification.md",
);

describe("step 3: flatten nested related maps", () => {
  let root: string;
  afterEach(() => removeGraph(root));

  test("ADR-063: nested map becomes flat wikilink lists; everything else untouched", () => {
    root = makeGraph({ ...SAGA, "decisions/ADR-063-never-destroy-known-good-state-before-confirmed-write.md": ADR_063 });
    const plan = planMigrations(root, [1, 2, 3]);
    const change = plan.changes.find((c) => c.relPath.startsWith("decisions/ADR-063"))!;
    const after = change.after;
    expect(after).not.toMatch(/^related:/m);
    expect(after).toContain("related_adrs: []");
    expect(after).toContain(
      'related_lessons:\n  - "[[chat-extraction-reliability-saga/analysis/lessons-learned|lessons-learned]]"'
    );
    expect(after).toContain(
      'related_docs:\n  - "[[chat-extraction-reliability-saga/README|README]]"\n' +
      '  - "[[002-enh-043/specification|specification]]"\n' +
      '  - "[[kg-config-silent-overwrite/README|README]]"'
    );
    expect(after).toContain("implements: null");
    expect(after).toContain("tags: [write-safety, data-loss, cross-cutting, v0.6.18]");
    expect(after).toContain("  branch: v0.6.18-fix-extraction-regressions");
  });

  test("an ADR with an empty related map gets the three empty flat lists", () => {
    const empty = ["---", "number: 009", "status: Accepted", "related:", "  adrs: []", "  lessons: []", "  kg_entries: []", "---", "b"].join("\n");
    root = makeGraph({ "decisions/ADR-009-x.md": empty });
    const after = planMigrations(root, [3]).changes[0].after;
    expect(after).toContain("related_adrs: []");
    expect(after).toContain("related_lessons: []");
    expect(after).toContain("related_docs: []");
    expect(after).not.toMatch(/^related:/m);
  });

  test("unresolved entries are kept as plain text and reported", () => {
    const fm = ["---", "number: 010", "related:", "  adrs: []", "  lessons:", "    - Some_Missing_Lesson", "  kg_entries: []", "---", "b"].join("\n");
    root = makeGraph({ "decisions/ADR-010-x.md": fm });
    const plan = planMigrations(root, [3]);
    expect(plan.changes[0].after).toContain('  - "Some_Missing_Lesson"');
    expect(plan.notes.join("\n")).toContain('unresolved "Some_Missing_Lesson"');
  });

  test("flat keys already present next to related: skip the file", () => {
    const fm = ["---", "number: 011", "related:", "  adrs: []", 'related_adrs: ["ADR-001"]', "---", "b"].join("\n");
    root = makeGraph({ "decisions/ADR-011-x.md": fm });
    const plan = planMigrations(root, [3]);
    expect(plan.changes).toHaveLength(0);
    expect(plan.skipped[0].reason).toContain("already present");
  });

  test("lessons: only keys that existed in the map are emitted; empty related is left alone", () => {
    const lesson = ["---", "title: L", "related:", "  adrs: []", "  lessons: []", "tags: [a]", "---", "b"].join("\n");
    const emptyLesson = ["---", "title: M", "related:", "tags: [a]", "---", "b"].join("\n");
    root = makeGraph({ "lessons-learned/patterns/L.md": lesson, "lessons-learned/patterns/M.md": emptyLesson });
    const plan = planMigrations(root, [3]);
    expect(plan.changes).toHaveLength(1);
    const after = plan.changes[0].after;
    expect(after).toContain("related_adrs: []");
    expect(after).toContain("related_lessons: []");
    expect(after).not.toContain("related_docs");
  });
});

describe("step 4: status_category", () => {
  let root: string;
  afterEach(() => removeGraph(root));

  test("adds status_category directly after the status line", () => {
    root = makeGraph({ "issues/issue-15/issue-15-description.md": ISSUE_15 });
    const after = planMigrations(root, [4]).changes[0].after.split("\n");
    const i = after.indexOf("status: resolved");
    expect(after[i + 1]).toBe("status_category: done");
  });

  test("ADR-067 spec: long free-text status maps by its first word and is not rewritten", () => {
    root = makeGraph({ "decisions/ADR-067-implementation-spec.md": ADR_067 });
    const after = planMigrations(root, [4]).changes[0].after;
    expect(after).toContain("status_category: done");
    expect(lineOf(after, "status")).toContain("Implemented (core model shipped v0.7.0");
  });

  test("unrecognized status becomes pending and is reported", () => {
    const fm = ["---", "id: issue-3", "status: wat", "---", "b"].join("\n");
    root = makeGraph({ "issues/issue-3/issue-3-description.md": fm });
    const plan = planMigrations(root, [4]);
    expect(plan.changes[0].after).toContain("status_category: pending");
    expect(plan.notes.join("\n")).toContain("not recognized");
  });

  test("an existing different status_category is kept and reported, never overwritten", () => {
    const fm = ["---", "id: issue-4", "status: resolved", "status_category: started", "---", "b"].join("\n");
    root = makeGraph({ "issues/issue-4/issue-4-description.md": fm });
    const plan = planMigrations(root, [4]);
    expect(plan.changes).toHaveLength(0);
    expect(plan.notes.join("\n")).toContain("differs from computed");
  });

  test("idempotent: a file that already has the right category is unchanged", () => {
    const fm = ["---", "id: issue-5", "status: resolved", "status_category: done", "---", "b"].join("\n");
    root = makeGraph({ "issues/issue-5/issue-5-description.md": fm });
    expect(planMigrations(root, [4]).changes).toHaveLength(0);
  });

  test("a doc with no status is left alone", () => {
    root = makeGraph({ "issues/issue-6/issue-6-description.md": ["---", "id: issue-6", "---", "b"].join("\n") });
    expect(planMigrations(root, [4]).changes).toHaveLength(0);
  });
});

describe("step 3 normalizes unresolved IDs so the steps converge (Opus review F2)", () => {
  let root: string;
  afterEach(() => removeGraph(root));
  test("an ambiguous bare number becomes a plain canonical ID, not the raw number", () => {
    const fm = ["---", "number: 070", "status: Accepted", "related:", '  adrs: ["067"]', "---", "b"].join("\n");
    root = makeGraph({ ...stubs("decisions/ADR-067-a.md", "decisions/ADR-067-b.md"), "decisions/ADR-070-x.md": fm });
    const after = planMigrations(root, [1, 2, 3]).changes.find((c) => c.relPath === "decisions/ADR-070-x")!.after;
    expect(after).toContain('  - "ADR-067"');
    expect(after).not.toContain('  - "067"');
  });
});
