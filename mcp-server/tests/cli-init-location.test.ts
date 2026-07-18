import * as path from "path";
import { resolveInitLocation } from "../src/cli.js";

// ---------------------------------------------------------------------------
// resolveInitLocation — storage-location menu resolution
// ---------------------------------------------------------------------------
//
// Covers the v0.6.20 fix: choice "2" (home) previously collided with a new
// named "global topic" KG because there was no dedicated location option
// that included the KG name in the path — any second KG created via "home"
// would overlay the personal KG's own directories at bare ~/.kmgraph/.

describe("resolveInitLocation", () => {
  test('choice "1" resolves to ./docs relative to cwd', () => {
    const resolved = resolveInitLocation("1", "my-kg");
    expect(resolved).toBe(path.resolve("docs"));
  });

  test('choice "2" (home/personal) resolves to bare ~/.kmgraph with no name subfolder', () => {
    const resolved = resolveInitLocation("2", "my-kg");
    expect(resolved).toBe(path.join("~", ".kmgraph"));
    expect(resolved).not.toContain("my-kg");
  });

  test('choice "3" (global topic) includes the KG name as its own subfolder, not overlaying the personal KG', () => {
    const resolved = resolveInitLocation("3", "ai-research");
    expect(resolved).toBe(path.join("~", ".kmgraph", "knowledge-graphs", "ai-research"));
    expect(resolved).not.toBe(path.join("~", ".kmgraph"));
  });

  test('choice "3" produces a distinct path per KG name (no collision between two global-topic KGs)', () => {
    const first = resolveInitLocation("3", "ai-research");
    const second = resolveInitLocation("3", "career-prism");
    expect(first).not.toBe(second);
  });

  test('choice "4" (custom) returns null, signaling the caller must prompt interactively', () => {
    expect(resolveInitLocation("4", "my-kg")).toBeNull();
  });

  test("unrecognized choice defaults to ./docs", () => {
    const resolved = resolveInitLocation("9", "my-kg");
    expect(resolved).toBe(path.resolve("docs"));
  });
});
