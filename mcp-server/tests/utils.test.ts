import { getProjectRoot } from "../src/utils.js";

describe("getProjectRoot", () => {
  it("strips the last segment for a non-/docs content dir", () => {
    expect(getProjectRoot("/a/b/knowledge")).toBe("/a/b");
  });

  it("still strips the last segment when it is /docs", () => {
    expect(getProjectRoot("/a/b/docs")).toBe("/a/b");
  });

  it("handles a single-segment path by returning its parent", () => {
    expect(getProjectRoot("/knowledge")).toBe("/");
  });
});
